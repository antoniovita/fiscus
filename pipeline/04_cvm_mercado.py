"""Etapa 4: dados contábeis (CVM Dados Abertos) e de mercado (B3) para múltiplos.

Fontes oficiais
  - CVM Dados Abertos: ITR 2026, ITR 2025, DFP 2025 e cadastro de companhias abertas
      https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr
      https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp
      https://dados.cvm.gov.br/dataset/cia_aberta-cad
  - B3 Séries Históricas (COTAHIST diário), preço de fechamento oficial (PREULT)
      https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_DDDMMAAAA.ZIP
  - Yahoo Finance chart API: usado só como conferência do preço da B3 (não é fonte primária)

Saídas
  data/raw/cvm/*.zip, cad_cia_aberta.csv (+ .meta.json com URL, data da consulta, sha256)
  data/raw/mercado/COTAHIST_D*.ZIP, yahoo_*.json (+ .meta.json)
  data/processed/financeiro.json
  data/processed/mercado.json

Uso
  .venv/bin/python pipeline/04_cvm_mercado.py            # reaproveita arquivos brutos já baixados
  .venv/bin/python pipeline/04_cvm_mercado.py --refresh  # baixa tudo de novo

Convenções
  - Demonstrações CONSOLIDADAS (arquivos *_con_*), maior VERSAO de cada (CNPJ, DT_REFER).
  - Valores monetários normalizados para R$ mil conforme ESCALA_MOEDA (MIL -> x1; UNIDADE -> /1000).
  - 12 meses (12m) = acumulado do ano até a data-base + exercício anterior (DFP) − acumulado
    até a mesma data do ano anterior (coluna PENÚLTIMO do ITR corrente).
  - Médias de saldo = (saldo na data-base + saldo 12 meses antes) / 2.
"""
import argparse
import hashlib
import io
import json
import sys
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW_CVM = ROOT / "data" / "raw" / "cvm"
RAW_MKT = ROOT / "data" / "raw" / "mercado"
OUT = ROOT / "data" / "processed"

CVM_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA"
ARQUIVOS_CVM = {
    "itr_cia_aberta_2026.zip": f"{CVM_BASE}/DOC/ITR/DADOS/itr_cia_aberta_2026.zip",
    "itr_cia_aberta_2025.zip": f"{CVM_BASE}/DOC/ITR/DADOS/itr_cia_aberta_2025.zip",
    "dfp_cia_aberta_2025.zip": f"{CVM_BASE}/DOC/DFP/DADOS/dfp_cia_aberta_2025.zip",
    "cad_cia_aberta.csv": f"{CVM_BASE}/CAD/DADOS/cad_cia_aberta.csv",
}

DATA_ALVO = "2026-09-30"          # 3T26
HOJE = date(2026, 11, 6)          # data de execução de referência do projeto
ALIQUOTA_IR = 0.34

EMPRESAS = {
    # ticker principal -> busca no cadastro (CNPJ conferido contra DENOM_SOCIAL)
    "GGBR4": {"cnpj": "33.611.500/0001-19", "denom_esperada": "GERDAU S.A.",
              "tickers": {"ON": "GGBR3", "PN": "GGBR4"}},
    "USIM5": {"cnpj": "60.894.730/0001-05", "denom_esperada": "USIMINAS",
              "tickers": {"ON": "USIM3", "PN": "USIM5"}},
    "CSNA3": {"cnpj": "33.042.730/0001-04", "denom_esperada": "SIDERURGICA NACIONAL",
              "tickers": {"ON": "CSNA3"}},
}
TICKERS_PRECO = ["GGBR4", "GGBR3", "GOAU4", "USIM5", "USIM3", "CSNA3"]

PENDENCIAS = []


# ----------------------------------------------------------------------------- utilidades
def agora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def baixar(url: str, destino: Path, refresh: bool, headers=None) -> dict:
    """Baixa url para destino (bytes intactos) e grava destino.meta.json. Reaproveita se já existir."""
    meta_path = destino.with_name(destino.name + ".meta.json")
    if destino.exists() and meta_path.exists() and not refresh:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    r = requests.get(url, timeout=300, headers=headers or {"User-Agent": "Mozilla/5.0"})
    meta = {"url": url, "consultado_em": agora(), "http_status": r.status_code,
            "last_modified": r.headers.get("Last-Modified"), "content_type": r.headers.get("Content-Type")}
    if r.status_code != 200:
        meta["erro"] = r.text[:300]
        return meta
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(r.content)
    meta.update({"arquivo": str(destino.relative_to(ROOT)), "bytes": len(r.content), "sha256": sha256(destino)})
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return meta


# ----------------------------------------------------------------------------- CVM
def ler_zip(nome_zip: str, demonstracao: str, cnpjs) -> pd.DataFrame:
    prefixo, _, _, ano = nome_zip.replace(".zip", "").split("_")
    interno = (f"{prefixo}_cia_aberta_{demonstracao}_{ano}.csv")
    with zipfile.ZipFile(RAW_CVM / nome_zip) as z:
        df = pd.read_csv(z.open(interno), sep=";", encoding="latin1", dtype=str)
    df = df[df.CNPJ_CIA.isin(cnpjs)].copy()
    df["ARQUIVO"] = f"data/raw/cvm/{nome_zip}::{interno}"
    if "VL_CONTA" in df:
        df["VL"] = df.VL_CONTA.astype(float)
        escala = df.ESCALA_MOEDA.str.upper().map({"MIL": 1.0, "UNIDADE": 1 / 1000})
        if escala.isna().any():
            raise ValueError(f"ESCALA_MOEDA inesperada em {interno}: {df.ESCALA_MOEDA.unique()}")
        df["VL"] = df.VL * escala  # sempre R$ mil
    # versão mais recente de cada (CNPJ, DT_REFER)
    df["VERSAO_N"] = df.VERSAO.astype(int)
    vmax = df.groupby(["CNPJ_CIA", "DT_REFER"]).VERSAO_N.transform("max")
    return df[df.VERSAO_N == vmax]


class Base:
    """Acesso às demonstrações consolidadas das três empresas."""

    def __init__(self, cnpjs):
        self.d = {}
        for z in ["itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"]:
            for dem in ["DRE_con", "BPA_con", "BPP_con", "DFC_MI_con", "DFC_MD_con", "composicao_capital"]:
                self.d[(z, dem)] = ler_zip(z, dem, cnpjs)

    def linha(self, z, dem, cnpj, dt_refer, conta=None, ordem="ÚLTIMO", dt_ini=None, dt_fim=None,
              desc_regex=None, prefixo=None):
        df = self.d[(z, dem)]
        df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt_refer) & (df.ORDEM_EXERC == ordem)]
        if conta is not None:
            df = df[df.CD_CONTA == conta]
        if prefixo is not None:
            df = df[df.CD_CONTA.str.startswith(prefixo)]
        if desc_regex is not None:
            df = df[df.DS_CONTA.str.contains(desc_regex, case=False, regex=True, na=False)]
        if dt_ini is not None:
            df = df[df.DT_INI_EXERC == dt_ini]
        if dt_fim is not None:
            df = df[df.DT_FIM_EXERC == dt_fim]
        if len(df) != 1:
            raise LookupError(f"{z}/{dem}/{cnpj}/{dt_refer}/{conta or desc_regex}/{ordem}/{dt_ini}: {len(df)} linhas")
        return df.iloc[0]

    def dfs_disponiveis(self, z, cnpj):
        df = self.d[(z, "DRE_con")]
        return sorted(df[df.CNPJ_CIA == cnpj].DT_REFER.unique())


def fim_trimestre_anterior(dt: str) -> str:
    y, m, _ = map(int, dt.split("-"))
    m -= 3
    if m <= 0:
        return None  # 1º trimestre: acumulado = trimestre
    ultimo = {3: 31, 6: 30, 9: 30}[m]
    return f"{y}-{m:02d}-{ultimo}"


def menos_um_ano(dt: str) -> str:
    return f"{int(dt[:4]) - 1}{dt[4:]}"


def rotulo_tri(dt: str) -> str:
    return f"{int(dt[5:7]) // 3}T{dt[2:4]}"


# ----------------------------------------------------------------------------- métricas
class Metricas:
    def __init__(self):
        self.m = {}

    def add(self, mid, valor, unidade, periodo, fonte, arquivo=None, conta=None, descricao_conta=None,
            formula=None, insumos=None, obs=None):
        item = {"valor": None if valor is None else round(float(valor), 6), "unidade": unidade,
                "periodo": periodo, "fonte": fonte}
        if arquivo is not None:
            item["arquivo"] = arquivo
        if conta is not None:
            item["conta"] = conta
        if descricao_conta is not None:
            item["descricao_conta"] = descricao_conta
        if formula is not None:
            item["formula"] = formula
        if insumos is not None:
            item["insumos"] = insumos
        if obs is not None:
            item["obs"] = obs
        self.m[mid] = item
        return item["valor"]

    def v(self, mid):
        return self.m[mid]["valor"]


def fonte_cvm(z):
    tipo = "DFP" if z.startswith("dfp") else "ITR"
    ds = "cia_aberta-doc-dfp" if tipo == "DFP" else "cia_aberta-doc-itr"
    return f"CVM Dados Abertos — {tipo} ({ds}), {ARQUIVOS_CVM[z]}"


def add_linha(M, mid, row, periodo, z, obs=None):
    return M.add(mid, row.VL, "R$ mil", periodo, fonte_cvm(z), row.ARQUIVO, row.CD_CONTA, row.DS_CONTA,
                 obs=(obs or "") + f" [ESCALA_MOEDA={row.ESCALA_MOEDA}; VERSAO={row.VERSAO}; "
                                   f"ORDEM_EXERC={row.ORDEM_EXERC}; DT_REFER={row.DT_REFER}; "
                                   f"{('DT_INI_EXERC=' + row.DT_INI_EXERC + '; ') if isinstance(row.get('DT_INI_EXERC'), str) else ''}"
                                   f"DT_FIM_EXERC={row.DT_FIM_EXERC}]")


def soma(M, mid, ids, formula, periodo, unidade="R$ mil", sinais=None, obs=None):
    sinais = sinais or [1] * len(ids)
    vals = [M.v(i) for i in ids]
    if any(x is None for x in vals):
        return M.add(mid, None, unidade, periodo, "calculado", formula=formula, insumos=ids, obs=obs)
    return M.add(mid, sum(s * x for s, x in zip(sinais, vals)), unidade, periodo, "calculado",
                 formula=formula, insumos=ids, obs=obs)


def razao(M, mid, num, den, formula, periodo, unidade="x", obs=None, fator=1.0):
    a, b = M.v(num), M.v(den)
    val = None if (a is None or b in (None, 0)) else a / b * fator
    return M.add(mid, val, unidade, periodo, "calculado", formula=formula, insumos=[num, den], obs=obs)


def achar_da(B, z, dem, cnpj, dt_refer, ordem, dt_ini):
    """Depreciação/amortização na DFC (método indireto), grupo 6.01.01.*: procura pela descrição."""
    return B.linha(z, dem, cnpj, dt_refer, ordem=ordem, dt_ini=dt_ini, prefixo="6.01.01.",
                   desc_regex=r"deprecia")


DRE_CONTAS = {"receita": "3.01", "ebit": "3.05", "lucro_consolidado": "3.11", "lucro_controladores": "3.11.01",
              "lucro_nao_controladores": "3.11.02"}


def financeiro_empresa(B, tk, cnpj):
    M = Metricas()
    disp = B.dfs_disponiveis("itr_cia_aberta_2026.zip", cnpj)
    if DATA_ALVO in disp:
        R = DATA_ALVO
    else:
        R = max(d for d in disp if d <= DATA_ALVO)
        PENDENCIAS.append({
            "empresa": tk, "item": "ITR 3T26 (DT_REFER 2026-09-30)",
            "motivo": f"O ITR de 30/09/2026 ainda não consta em itr_cia_aberta_2026.zip "
                      f"(Last-Modified {ARQUIVOS_META['itr_cia_aberta_2026.zip'].get('last_modified')}); "
                      f"DT_REFER disponíveis: {disp}. Métricas calculadas na última data-base disponível "
                      f"({R}, {rotulo_tri(R)}) e marcadas no campo 'periodo'. Rodar de novo com --refresh "
                      f"quando a CVM atualizar o zip.",
        })
    R1 = menos_um_ano(R)                 # mesma data, ano anterior
    tri, tri_ant = rotulo_tri(R), rotulo_tri(R1)
    ini_ano, ini_tri = f"{R[:4]}-01-01", f"{R[:4]}-{int(R[5:7]) - 2:02d}-01"
    ini_ano1, ini_tri1 = menos_um_ano(ini_ano), menos_um_ano(ini_tri)
    Z26, Z25, D25 = "itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"
    ltm = f"12m até {R}"

    # ---------------- DRE: trimestre, acumulado e 12m
    for nome, conta in DRE_CONTAS.items():
        r_t = B.linha(Z26, "DRE_con", cnpj, R, conta, "ÚLTIMO", dt_ini=ini_tri)
        r_t1 = B.linha(Z26, "DRE_con", cnpj, R, conta, "PENÚLTIMO", dt_ini=ini_tri1)
        r_a = B.linha(Z26, "DRE_con", cnpj, R, conta, "ÚLTIMO", dt_ini=ini_ano)
        r_a1 = B.linha(Z26, "DRE_con", cnpj, R, conta, "PENÚLTIMO", dt_ini=ini_ano1)
        r_fy = B.linha(D25, "DRE_con", cnpj, "2025-12-31", conta, "ÚLTIMO")
        add_linha(M, f"{nome}_{tri}", r_t, f"trimestre {tri} ({ini_tri} a {R})", Z26)
        add_linha(M, f"{nome}_{tri_ant}", r_t1, f"trimestre {tri_ant} ({ini_tri1} a {R1}), comparativo do ITR {tri}", Z26)
        add_linha(M, f"{nome}_acum_{R[:4]}", r_a, f"acumulado {ini_ano} a {R}", Z26)
        add_linha(M, f"{nome}_acum_{R1[:4]}", r_a1, f"acumulado {ini_ano1} a {R1}, comparativo do ITR {tri}", Z26)
        add_linha(M, f"{nome}_2025", r_fy, "exercício 2025 (2025-01-01 a 2025-12-31)", D25)
        soma(M, f"{nome}_12m", [f"{nome}_acum_{R[:4]}", f"{nome}_2025", f"{nome}_acum_{R1[:4]}"],
             f"{nome}_acum_{R[:4]} + {nome}_2025 − {nome}_acum_{R1[:4]}", ltm, sinais=[1, 1, -1])
        # conferência: comparativo do ITR corrente vs. ITR original do ano anterior (reapresentação)
        try:
            orig = B.linha(Z25, "DRE_con", cnpj, R1, conta, "ÚLTIMO", dt_ini=ini_ano1)
            if abs(orig.VL - r_a1.VL) > 0.5:
                PENDENCIAS.append({"empresa": tk, "item": f"{nome} acumulado {R1}",
                                   "motivo": f"comparativo no ITR {tri} ({r_a1.VL:,.0f}) difere do ITR {tri_ant} "
                                             f"original ({orig.VL:,.0f}): possível reapresentação; usado o comparativo."})
        except LookupError:
            pass

    # ---------------- D&A (DFC): só acumulado no ano; trimestre = acumulado − acumulado do tri anterior
    dfc = "DFC_MI_con"
    r_da = achar_da(B, Z26, dfc, cnpj, R, "ÚLTIMO", ini_ano)
    r_da1 = achar_da(B, Z26, dfc, cnpj, R, "PENÚLTIMO", ini_ano1)
    r_dafy = achar_da(B, D25, dfc, cnpj, "2025-12-31", "ÚLTIMO", "2025-01-01")
    add_linha(M, f"da_acum_{R[:4]}", r_da, f"acumulado {ini_ano} a {R}", Z26,
              obs="D&A localizada na DFC método indireto (6.01.01.*) pela descrição; valor positivo = despesa.")
    add_linha(M, f"da_acum_{R1[:4]}", r_da1, f"acumulado {ini_ano1} a {R1}, comparativo do ITR {tri}", Z26)
    add_linha(M, "da_2025", r_dafy, "exercício 2025", D25)
    soma(M, "da_12m", [f"da_acum_{R[:4]}", "da_2025", f"da_acum_{R1[:4]}"],
         f"da_acum_{R[:4]} + da_2025 − da_acum_{R1[:4]}", ltm, sinais=[1, 1, -1])
    prev = fim_trimestre_anterior(R)
    if prev is None:
        M.add(f"da_{tri}", r_da.VL, "R$ mil", f"trimestre {tri}", "calculado", formula=f"= da_acum_{R[:4]} (1º tri)",
              insumos=[f"da_acum_{R[:4]}"])
    else:
        r_p = achar_da(B, Z26, dfc, cnpj, prev, "ÚLTIMO", ini_ano)
        add_linha(M, f"da_acum_ate_{prev}", r_p, f"acumulado {ini_ano} a {prev}", Z26)
        soma(M, f"da_{tri}", [f"da_acum_{R[:4]}", f"da_acum_ate_{prev}"],
             f"da_acum_{R[:4]} − da_acum_ate_{prev}", f"trimestre {tri}", sinais=[1, -1])
        prev1 = menos_um_ano(prev)
        r_p1 = achar_da(B, Z25, dfc, cnpj, prev1, "ÚLTIMO", ini_ano1)
        r_o1 = achar_da(B, Z25, dfc, cnpj, R1, "ÚLTIMO", ini_ano1)
        add_linha(M, f"da_acum_ate_{prev1}", r_p1, f"acumulado {ini_ano1} a {prev1} (ITR {rotulo_tri(prev1)} original)", Z25)
        add_linha(M, f"da_acum_ate_{R1}_itr_original", r_o1, f"acumulado {ini_ano1} a {R1} (ITR {tri_ant} original)", Z25)
        soma(M, f"da_{tri_ant}", [f"da_acum_ate_{R1}_itr_original", f"da_acum_ate_{prev1}"],
             f"da_acum_ate_{R1}_itr_original − da_acum_ate_{prev1}", f"trimestre {tri_ant}", sinais=[1, -1])

    # ---------------- EBITDA contábil (ICVM 527 / Res. CVM 156): EBIT + D&A
    aviso = ("EBITDA contábil (Resolução CVM 156: lucro antes de resultado financeiro e tributos + D&A da DFC). "
             "NÃO é o EBITDA ajustado divulgado pela companhia.")
    for p in [tri, tri_ant, "12m"]:
        soma(M, f"ebitda_{p}", [f"ebit_{p}", f"da_{p}"], f"ebit_{p} + da_{p}",
             ltm if p == "12m" else f"trimestre {p}", obs=aviso)

    # ---------------- Balanço em R (ITR 2026) e R1 (ITR 2025 original)
    def balanco(sufixo, z, dt):
        lin = {
            "ativo_total": ("BPA_con", "1"), "caixa_equivalentes": ("BPA_con", "1.01.01"),
            "aplicacoes_financeiras_cp": ("BPA_con", "1.01.02"),
            "emprestimos_cp": ("BPP_con", "2.01.04"), "emprestimos_lp": ("BPP_con", "2.02.01"),
            "pl_total": ("BPP_con", "2.03"), "pl_nao_controladores": ("BPP_con", "2.03.09"),
        }
        for nome, (dem, conta) in lin.items():
            add_linha(M, f"{nome}_{sufixo}", B.linha(z, dem, cnpj, dt, conta, "ÚLTIMO"), f"saldo em {dt}", z)
        per = f"saldo em {dt}"
        soma(M, f"pl_controladores_{sufixo}", [f"pl_total_{sufixo}", f"pl_nao_controladores_{sufixo}"],
             f"pl_total_{sufixo} (2.03) − pl_nao_controladores_{sufixo} (2.03.09)", per, sinais=[1, -1])
        soma(M, f"divida_bruta_{sufixo}", [f"emprestimos_cp_{sufixo}", f"emprestimos_lp_{sufixo}"],
             f"emprestimos_cp (2.01.04) + emprestimos_lp (2.02.01)", per,
             obs="Empréstimos e financiamentos + debêntures, circulante e não circulante. Não inclui "
                 "arrendamentos (IFRS 16) nem derivativos, que no padrão CVM ficam em 'Outras obrigações'.")
        soma(M, f"caixa_aplicacoes_{sufixo}", [f"caixa_equivalentes_{sufixo}", f"aplicacoes_financeiras_cp_{sufixo}"],
             f"caixa_equivalentes (1.01.01) + aplicacoes_financeiras_cp (1.01.02)", per,
             obs="Só aplicações financeiras do ativo circulante.")
        soma(M, f"divida_liquida_{sufixo}", [f"divida_bruta_{sufixo}", f"caixa_aplicacoes_{sufixo}"],
             f"divida_bruta_{sufixo} − caixa_aplicacoes_{sufixo}", per, sinais=[1, -1])
        soma(M, f"capital_investido_{sufixo}", [f"pl_total_{sufixo}", f"divida_liquida_{sufixo}"],
             f"pl_total_{sufixo} + divida_liquida_{sufixo}", per)

    balanco(tri, Z26, R)
    balanco(tri_ant, Z25, R1)

    # ---------------- Indicadores
    soma(M, "pl_controladores_medio", [f"pl_controladores_{tri}", f"pl_controladores_{tri_ant}"],
         f"(pl_controladores_{tri} + pl_controladores_{tri_ant}) / 2", f"média {R1} e {R}")
    M.m["pl_controladores_medio"]["valor"] = round(M.v("pl_controladores_medio") / 2, 6)
    soma(M, "capital_investido_medio", [f"capital_investido_{tri}", f"capital_investido_{tri_ant}"],
         f"(capital_investido_{tri} + capital_investido_{tri_ant}) / 2", f"média {R1} e {R}")
    M.m["capital_investido_medio"]["valor"] = round(M.v("capital_investido_medio") / 2, 6)

    razao(M, "roe_12m", "lucro_controladores_12m", "pl_controladores_medio",
          "lucro_controladores_12m (3.11.01) / pl_controladores_medio × 100", ltm, unidade="%", fator=100)
    M.add("nopat_12m", M.v("ebit_12m") * (1 - ALIQUOTA_IR), "R$ mil", ltm, "calculado",
          formula=f"ebit_12m × (1 − {ALIQUOTA_IR:.0%})", insumos=["ebit_12m"],
          obs="Alíquota nominal de IR/CS de 34%, não a efetiva.")
    razao(M, "roic_12m", "nopat_12m", "capital_investido_medio",
          "ebit_12m × (1 − 34%) / média(pl_total + divida_liquida) × 100", ltm, unidade="%", fator=100,
          obs="Aproximação: capital investido = PL total (com não controladores) + dívida líquida (sem arrendamentos).")
    razao(M, "divida_liquida_ebitda_12m", f"divida_liquida_{tri}", "ebitda_12m",
          f"divida_liquida_{tri} / ebitda_12m", f"dívida em {R}; EBITDA {ltm}", obs=aviso)
    return M, R


# ----------------------------------------------------------------------------- mercado
COTAHIST_URL = "https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{d:%d%m%Y}.ZIP"


def ultimo_pregao(refresh):
    """Último pregão com arquivo COTAHIST diário publicado, antes de HOJE (o pregão de hoje não terminou)."""
    tent = []
    d = HOJE
    for _ in range(10):
        d -= timedelta(days=1)
        if d.weekday() >= 5:
            continue
        url = COTAHIST_URL.format(d=d)
        dest = RAW_MKT / f"COTAHIST_D{d:%d%m%Y}.ZIP"
        meta = baixar(url, dest, refresh)
        tent.append((str(d), meta.get("http_status")))
        if meta.get("http_status") == 200:
            return d, dest, meta, tent
    raise RuntimeError(f"Nenhum COTAHIST encontrado: {tent}")


def parse_cotahist(path: Path):
    with zipfile.ZipFile(path) as z:
        txt = z.read(z.namelist()[0]).decode("latin1")
    out = {}
    for ln in txt.splitlines():
        if not ln.startswith("01"):
            continue
        codbdi, codneg, tpmerc = ln[10:12], ln[12:24].strip(), ln[24:27]
        if codbdi != "02" or tpmerc != "010":   # lote padrão, mercado à vista
            continue
        out[codneg] = {"data_pregao": f"{ln[2:6]}-{ln[6:8]}-{ln[8:10]}", "nomres": ln[27:39].strip(),
                       "especi": ln[39:49].strip(), "preabe": int(ln[56:69]) / 100,
                       "premax": int(ln[69:82]) / 100, "premin": int(ln[82:95]) / 100,
                       "preult": int(ln[108:121]) / 100, "quatot": int(ln[152:170]),
                       "voltot": int(ln[170:188]) / 100, "fatcot": int(ln[210:217]), "codisi": ln[230:242]}
    return out


def yahoo(tk, refresh):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{tk}.SA?range=1mo&interval=1d"
    dest = RAW_MKT / f"yahoo_chart_{tk}.json"
    meta = baixar(url, dest, refresh)
    if meta.get("http_status") != 200:
        return None, meta
    j = json.loads(dest.read_text())
    res = j["chart"]["result"][0]
    ts = res["timestamp"]
    closes = res["indicators"]["quote"][0]["close"]
    serie = {datetime.fromtimestamp(t, timezone(timedelta(hours=-3))).date().isoformat(): c for t, c in zip(ts, closes)}
    return serie, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="baixa novamente todos os arquivos brutos")
    a = ap.parse_args()

    global ARQUIVOS_META
    ARQUIVOS_META = {}
    for nome, url in ARQUIVOS_CVM.items():
        meta = baixar(url, RAW_CVM / nome, a.refresh)
        if meta.get("http_status") != 200:
            sys.exit(f"Falha ao baixar {url}: {meta}")
        ARQUIVOS_META[nome] = meta
        print(f"{nome}: sha256 {meta['sha256'][:12]}… (consultado {meta['consultado_em']}, Last-Modified {meta['last_modified']})")

    # cadastro
    cad = pd.read_csv(RAW_CVM / "cad_cia_aberta.csv", sep=";", encoding="latin1", dtype=str)
    cad_fonte = f"CVM Dados Abertos — cadastro (cia_aberta-cad), {ARQUIVOS_CVM['cad_cia_aberta.csv']}"
    info = {}
    for tk, e in EMPRESAS.items():
        c = cad[(cad.CNPJ_CIA == e["cnpj"]) & (cad.SIT == "ATIVO")]
        if c.empty or e["denom_esperada"].upper() not in c.DENOM_SOCIAL.iloc[0].upper():
            sys.exit(f"Cadastro não confere para {tk}: {c[['DENOM_SOCIAL']].to_dict('records')}")
        info[tk] = {"nome": c.DENOM_SOCIAL.iloc[0], "cnpj": e["cnpj"], "cd_cvm": c.CD_CVM.iloc[0],
                    "situacao_cvm": c.SIT.iloc[0], "fonte_cadastro": cad_fonte,
                    "arquivo_cadastro": "data/raw/cvm/cad_cia_aberta.csv"}

    B = Base([e["cnpj"] for e in EMPRESAS.values()])
    fin = {"gerado_em": agora(), "script": "pipeline/04_cvm_mercado.py",
           "convencoes": {
               "demonstracoes": "consolidadas (_con_), maior VERSAO por (CNPJ, DT_REFER)",
               "unidade_monetaria": "R$ mil (ESCALA_MOEDA respeitada: MIL ×1; UNIDADE ÷1000)",
               "12m": "acumulado do ano corrente + exercício 2025 (DFP) − acumulado do mesmo período de 2025 (PENÚLTIMO do ITR corrente)",
               "medias": "(saldo na data-base + saldo 12 meses antes, do ITR original do ano anterior) / 2",
               "aliquota_roic": ALIQUOTA_IR,
               "ebitda": "contábil, Resolução CVM 156 (EBIT 3.05 + D&A da DFC); não é o EBITDA ajustado"},
           "arquivos_brutos": ARQUIVOS_META, "empresas": {}, "pendencias": PENDENCIAS}
    datas_base = {}
    for tk, e in EMPRESAS.items():
        M, R = financeiro_empresa(B, tk, e["cnpj"])
        datas_base[tk] = R
        fin["empresas"][tk] = {**info[tk], "data_base": R, "trimestre": rotulo_tri(R), "metricas": M.m}

    # ---------------- cruzamento com PDFs (R$ mil)
    pdf = {"GGBR4": {"receita_3T26": 18690518, "receita_3T25": 17983143,
                     "lucro_consolidado_3T26": 1563097, "lucro_consolidado_3T25": 1089880},
           "USIM5": {"receita_3T26": 6202422, "receita_3T25": 6604238,
                     "lucro_consolidado_3T26": 243441, "lucro_consolidado_3T25": -3503338}}
    cruz = []
    for tk, itens in pdf.items():
        for mid, v_pdf in itens.items():
            v_cvm = fin["empresas"][tk]["metricas"].get(mid, {}).get("valor")
            ok = v_cvm is not None and abs(v_cvm - v_pdf) < 0.5
            cruz.append({"empresa": tk, "metrica": mid, "pdf_itr": v_pdf, "csv_cvm": v_cvm,
                         "diferenca": None if v_cvm is None else v_cvm - v_pdf, "confere": ok})
            if not ok:
                PENDENCIAS.append({"empresa": tk, "item": f"cruzamento {mid}",
                                   "motivo": f"PDF {v_pdf} vs CSV CVM {v_cvm}"})
    fin["cruzamento_pdf_itr"] = cruz

    # ---------------- mercado
    d_preg, cot_path, cot_meta, tent = ultimo_pregao(a.refresh)
    cot = parse_cotahist(cot_path)
    mkt = {"gerado_em": agora(), "script": "pipeline/04_cvm_mercado.py",
           "data_referencia": str(d_preg),
           "criterio_data": f"último pregão encerrado com arquivo COTAHIST diário publicado pela B3 antes de {HOJE} "
                            f"(o pregão de {HOJE} ainda estava em andamento na consulta). Tentativas: {tent}",
           "fonte_preco": "B3 — Séries Históricas, COTAHIST diário, campo PREULT (preço de fechamento), "
                          "CODBDI 02 (lote padrão), TPMERC 010 (à vista). Preço nominal, sem ajuste por proventos.",
           "arquivo_bruto": cot_meta, "precos": {}, "empresas": {}, "pendencias": []}
    for tk in TICKERS_PRECO:
        c = cot.get(tk)
        if c is None:
            mkt["pendencias"].append({"ticker": tk, "motivo": f"não encontrado no COTAHIST de {d_preg}"})
            continue
        serie, ymeta = yahoo(tk, a.refresh)
        y = serie.get(str(d_preg)) if serie else None
        mkt["precos"][tk] = {
            "preco_fechamento": c["preult"], "unidade": "R$/ação", "data_pregao": c["data_pregao"],
            "fonte": "B3 COTAHIST diário (PREULT)", "url": cot_meta["url"], "consultado_em": cot_meta["consultado_em"],
            "arquivo": cot_meta["arquivo"], "especificacao": c["especi"], "isin": c["codisi"],
            "fator_cotacao": c["fatcot"], "abertura": c["preabe"], "maxima": c["premax"], "minima": c["premin"],
            "volume_rs": c["voltot"],
            "conferencia_yahoo": {"close": None if y is None else round(y, 4), "url": ymeta.get("url"),
                                  "consultado_em": ymeta.get("consultado_em"), "arquivo": ymeta.get("arquivo"),
                                  "confere": None if y is None else abs(y - c["preult"]) < 0.005},
        }
        if c["fatcot"] != 1:
            mkt["pendencias"].append({"ticker": tk, "motivo": f"FATCOT={c['fatcot']} (preço por lote)"})

    # ações (composição do capital do ITR na data-base) e múltiplos
    for tk, e in EMPRESAS.items():
        R = datas_base[tk]
        cc = B.d[("itr_cia_aberta_2026.zip", "composicao_capital")]
        cc = cc[(cc.CNPJ_CIA == e["cnpj"]) & (cc.DT_REFER == R)].iloc[0]
        arq_cc = cc.ARQUIVO
        F = fin["empresas"][tk]["metricas"]
        tri = rotulo_tri(R)
        M = Metricas()
        src = fonte_cvm("itr_cia_aberta_2026.zip") + " — composição do capital"
        ids_mc = []
        for classe, col in [("ON", "ORDIN"), ("PN", "PREF")]:
            tot, tes = int(cc[f"QT_ACAO_{col}_CAP_INTEGR"]), int(cc[f"QT_ACAO_{col}_TESOURO"])
            if tot == 0:
                continue
            M.add(f"acoes_{classe}_total", tot, "ações", f"posição em {R}", src, arq_cc,
                  f"QT_ACAO_{col}_CAP_INTEGR", f"Quantidade de ações {classe} do capital integralizado")
            M.add(f"acoes_{classe}_tesouraria", tes, "ações", f"posição em {R}", src, arq_cc,
                  f"QT_ACAO_{col}_TESOURO", f"Quantidade de ações {classe} em tesouraria")
            M.add(f"acoes_{classe}_circulacao", tot - tes, "ações", f"posição em {R}", "calculado",
                  formula=f"acoes_{classe}_total − acoes_{classe}_tesouraria",
                  insumos=[f"acoes_{classe}_total", f"acoes_{classe}_tesouraria"])
            ptk = e["tickers"].get(classe)
            p = mkt["precos"].get(ptk)
            if p is None:
                PENDENCIAS.append({"empresa": tk, "item": f"preço {classe}", "motivo": f"sem preço para {ptk}"})
                continue
            M.add(f"preco_{ptk}", p["preco_fechamento"], "R$/ação", f"fechamento {p['data_pregao']}",
                  p["fonte"], p["arquivo"], obs=p["url"])
            obs = None
            if tk == "USIM5" and classe == "PN":
                obs = ("O capital PN da Usiminas reúne PNA (USIM5) e PNB; a composição do capital da CVM não separa "
                       "as classes, então todas as PN foram precificadas por USIM5 (PNB é residual).")
            M.add(f"valor_mercado_{classe}", (tot - tes) * p["preco_fechamento"] / 1000, "R$ mil",
                  f"preço {p['data_pregao']}; ações {R}", "calculado",
                  formula=f"acoes_{classe}_circulacao × preco_{ptk} / 1000",
                  insumos=[f"acoes_{classe}_circulacao", f"preco_{ptk}"], obs=obs)
            ids_mc.append(f"valor_mercado_{classe}")
        soma(M, "valor_mercado", ids_mc, " + ".join(ids_mc), f"preço {d_preg}; ações {R}")
        # insumos contábeis copiados do financeiro.json
        for k in ["lucro_controladores_12m", f"pl_controladores_{tri}", f"divida_liquida_{tri}",
                  f"pl_nao_controladores_{tri}", "ebitda_12m"]:
            M.m[k] = {**F[k], "obs": (F[k].get("obs") or "") + " (copiado de financeiro.json)"}
        per = f"preço {d_preg}; contábil {fin['empresas'][tk]['trimestre']}"
        razao(M, "p_l", "valor_mercado", "lucro_controladores_12m",
              "valor_mercado / lucro_controladores_12m", per,
              obs="Equivale a preço / LPA 12m ponderado pelas classes (ações em circulação).")
        razao(M, "p_vp", "valor_mercado", f"pl_controladores_{tri}", f"valor_mercado / pl_controladores_{tri}", per)
        soma(M, "ev", ["valor_mercado", f"divida_liquida_{tri}", f"pl_nao_controladores_{tri}"],
             f"valor_mercado + divida_liquida_{tri} + pl_nao_controladores_{tri}", per,
             obs="Participação de não controladores a valor contábil (BPP 2.03.09).")
        razao(M, "ev_ebitda", "ev", "ebitda_12m", "ev / ebitda_12m", per,
              obs="EBITDA contábil CVM 156 de 12 meses, não o ajustado.")
        mkt["empresas"][tk] = {"nome": info[tk]["nome"], "cnpj": e["cnpj"], "cd_cvm": info[tk]["cd_cvm"],
                               "data_base_contabil": R, "data_preco": str(d_preg), "metricas": M.m}
        if R != DATA_ALVO:
            mkt["pendencias"].append({"empresa": tk, "motivo": f"múltiplos usam contábil de {R} ({rotulo_tri(R)}), "
                                                               f"pois o ITR 3T26 ainda não está na base da CVM."})

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "financeiro.json").write_text(json.dumps(fin, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "mercado.json").write_text(json.dumps(mkt, indent=2, ensure_ascii=False), encoding="utf-8")

    # resumo no terminal
    print(f"\nPreço: B3 COTAHIST {d_preg}")
    for tk in EMPRESAS:
        F, K = fin["empresas"][tk]["metricas"], mkt["empresas"][tk]["metricas"]
        t = fin["empresas"][tk]["trimestre"]
        f = lambda m, k: None if m[k]["valor"] is None else round(m[k]["valor"], 2)
        print(tk, t, {"receita_12m": f(F, "receita_12m"), "ebitda_12m": f(F, "ebitda_12m"),
                      "lucro_contr_12m": f(F, "lucro_controladores_12m"), f"pl_contr_{t}": f(F, f"pl_controladores_{t}"),
                      f"dl_{t}": f(F, f"divida_liquida_{t}"), "roe%": f(F, "roe_12m"), "roic%": f(F, "roic_12m"),
                      "dl/ebitda": f(F, "divida_liquida_ebitda_12m"), "vm": f(K, "valor_mercado"),
                      "p_l": f(K, "p_l"), "p_vp": f(K, "p_vp"), "ev_ebitda": f(K, "ev_ebitda")})
    for c in cruz:
        print("cruzamento", c)
    for p in PENDENCIAS + mkt["pendencias"]:
        print("PENDÊNCIA", p)


if __name__ == "__main__":
    main()

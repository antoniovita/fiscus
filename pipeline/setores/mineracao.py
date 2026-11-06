"""Setor Mineração: métricas 12m a partir dos arquivos CVM já baixados + COTAHIST 05/11/2026.

Reaproveita a lógica de pipeline/04_cvm_mercado.py (12m = acum ano + FY2025 − acum ano anterior;
D&A pela descrição na DFC 6.01.01.*; ações em circulação = capital integralizado − tesouraria).
Holdings sem demonstração consolidada (Bradespar, Litel) usam a individual (*_ind_*), marcado.
"""
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CVM = ROOT / "data" / "raw" / "cvm"
COTAHIST = ROOT / "data" / "raw" / "mercado" / "COTAHIST_D05112026.ZIP"
OUT = ROOT / "data" / "processed" / "setores" / "mineracao.json"
Z26, Z25, D25 = "itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"

EMPRESAS = [
    {"ticker": "VALE3", "nome": "Vale", "cnpj": "33.592.510/0001-54", "tickers": {"ON": "VALE3"}, "holding": False},
    {"ticker": "CMIN3", "nome": "CSN Mineração", "cnpj": "08.902.291/0001-15", "tickers": {"ON": "CMIN3"}, "holding": False},
    {"ticker": "CBAV3", "nome": "Companhia Brasileira de Alumínio (CBA)", "cnpj": "61.409.892/0001-73",
     "tickers": {"ON": "CBAV3"}, "holding": False},
    {"ticker": "BRAP4", "nome": "Bradespar (holding — participação na Vale)", "cnpj": "03.847.461/0001-92",
     "tickers": {"ON": "BRAP3", "PN": "BRAP4"}, "holding": True},
    {"ticker": "LTEL3B", "nome": "Litel Participações (holding — participação na Vale)", "cnpj": "00.743.065/0001-27",
     "tickers": {"ON": "LTEL3B"}, "holding": True},
]
PEND = []


def ler(zname, dem, cnpjs):
    pre, _, _, ano = zname.replace(".zip", "").split("_")
    interno = f"{pre}_cia_aberta_{dem}_{ano}.csv"
    with zipfile.ZipFile(CVM / zname) as z:
        df = pd.read_csv(z.open(interno), sep=";", encoding="latin1", dtype=str)
    df = df[df.CNPJ_CIA.isin(cnpjs)].copy()
    df["ARQ"] = f"data/raw/cvm/{zname}::{interno}"
    if "VL_CONTA" in df:
        esc = df.ESCALA_MOEDA.str.upper().map({"MIL": 1.0, "UNIDADE": 1 / 1000})
        df["VL"] = df.VL_CONTA.astype(float) * esc / 1000.0  # R$ milhões
    df["V"] = df.VERSAO.astype(int)
    return df[df.V == df.groupby(["CNPJ_CIA", "DT_REFER"]).V.transform("max")]


cnpjs = [e["cnpj"] for e in EMPRESAS]
D = {}
for z in (Z26, Z25, D25):
    for s in ("con", "ind"):
        for d in ("DRE", "BPA", "BPP", "DFC_MI", "DFC_MD"):
            D[(z, f"{d}_{s}")] = ler(z, f"{d}_{s}", cnpjs)
    D[(z, "composicao_capital")] = ler(z, "composicao_capital", cnpjs)


def linha(z, dem, cnpj, dt, conta=None, ordem="ÚLTIMO", dt_ini=None, prefixo=None, regex=None):
    df = D[(z, dem)]
    df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & (df.ORDEM_EXERC == ordem)]
    if conta:
        df = df[df.CD_CONTA == conta]
    if prefixo:
        df = df[df.CD_CONTA.str.startswith(prefixo)]
    if regex:
        df = df[df.DS_CONTA.str.contains(regex, case=False, regex=True, na=False)]
    if dt_ini and "DT_INI_EXERC" in df:
        df = df[df.DT_INI_EXERC == dt_ini]
    if len(df) == 0:
        raise LookupError(f"{dem} {cnpj} {dt} {conta or regex} {ordem} {dt_ini}: 0 linhas")
    return df


def cotahist():
    with zipfile.ZipFile(COTAHIST) as z:
        txt = z.read(z.namelist()[0]).decode("latin1")
    out = {}
    for ln in txt.splitlines():
        if ln.startswith("01") and ln[10:12] == "02" and ln[24:27] == "010":
            out[ln[12:24].strip()] = int(ln[108:121]) / 100
    return out


PRECOS = cotahist()


def m(valor, unidade="R$ mi", conta=None, formula=None, motivo=None, **kw):
    it = {"valor": None if valor is None else round(float(valor), 4), "unidade": unidade}
    if conta:
        it["conta"] = conta
    if formula:
        it["formula"] = formula
    if valor is None:
        it["motivo"] = motivo or "insumo ausente"
    it.update(kw)
    return it


def div(a, b, f=1.0):
    return None if a is None or b in (None, 0) else a / b * f


def empresa(e):
    cnpj, tk = e["cnpj"], e["ticker"]
    s = "con" if (D[(Z26, "DRE_con")].CNPJ_CIA == cnpj).any() else "ind"
    disp = sorted(D[(Z26, f"DRE_{s}")].query("CNPJ_CIA == @cnpj").DT_REFER.unique())
    R = max(disp)
    if R != "2026-09-30":
        PEND.append({"empresa": tk, "item": "ITR 3T26", "motivo": f"3T26 não consta em {Z26}; usado {R}"})
    R1 = f"{int(R[:4]) - 1}{R[4:]}"
    ini_a, ini_t = f"{R[:4]}-01-01", f"{R[:4]}-{int(R[5:7]) - 2:02d}-01"
    ini_a1 = f"{int(R[:4]) - 1}-01-01"
    tri = f"{int(R[5:7]) // 3}T{R[2:4]}"
    M = {}
    fonte_dem = "consolidado" if s == "con" else "individual (sem consolidado na CVM)"
    v = {}
    for nome, conta in [("receita", "3.01"), ("ebit", "3.05"), ("lucro_consolidado", "3.11"),
                        ("lucro_controladores", "3.11.01")]:
        try:
            if s == "ind" and nome == "lucro_controladores":
                conta = "3.11"  # individual: lucro do período = lucro atribuível aos controladores
            dre = f"DRE_{s}"
            t = linha(Z26, dre, cnpj, R, conta, dt_ini=ini_t).VL.iloc[0]
            a = linha(Z26, dre, cnpj, R, conta, dt_ini=ini_a).VL.iloc[0]
            a1 = linha(Z26, dre, cnpj, R, conta, "PENÚLTIMO", dt_ini=ini_a1).VL.iloc[0]
            fy = linha(D25, dre, cnpj, "2025-12-31", conta).VL.iloc[0]
            v[nome] = a + fy - a1
            M[f"{nome}_tri"] = m(t, conta=f"{conta} ({dre}, {tri})")
            M[f"{nome}_12m"] = m(v[nome], conta=f"{conta} ({dre})",
                                 formula=f"acum {R} + FY2025 − acum {R1} ({a:.1f} + {fy:.1f} − {a1:.1f})")
        except LookupError as ex:
            v[nome] = None
            M[f"{nome}_tri"] = m(None, motivo=str(ex))
            M[f"{nome}_12m"] = m(None, motivo=str(ex))
    # D&A
    da = None
    for dfc in (f"DFC_MI_{s}", f"DFC_MD_{s}"):
        try:
            g = lambda z, dt, o, i: linha(z, dfc, cnpj, dt, None, o, i, "6.01.01.", r"deprecia|amortiza|exaust").VL.sum()
            a = g(Z26, R, "ÚLTIMO", ini_a); a1 = g(Z26, R, "PENÚLTIMO", ini_a1); fy = g(D25, "2025-12-31", "ÚLTIMO", "2025-01-01")
            da = a + fy - a1
            M["da_12m"] = m(da, conta=f"6.01.01.* com descrição deprecia/amortiza/exaust ({dfc})",
                            formula=f"acum {R} + FY2025 − acum {R1} ({a:.1f} + {fy:.1f} − {a1:.1f})")
            break
        except LookupError:
            continue
    if da is None:
        M["da_12m"] = m(None, motivo="D&A não localizada na DFC 6.01.01.*")
    ebitda = None if (v["ebit"] is None or da is None) else v["ebit"] + da
    if e["holding"]:
        M["ebitda_12m"] = m(None, motivo="holding: resultado vem de equivalência patrimonial (Vale); EBITDA não se aplica")
        ebitda = None
    else:
        M["ebitda_12m"] = m(ebitda, formula="EBIT 12m (3.05) + D&A 12m (DFC) — EBITDA CVM 156, não o ajustado")
    # Balanço
    b = {}
    for nome, dem, conta in [("caixa", "BPA", "1.01.01"), ("aplic", "BPA", "1.01.02"), ("emp_cp", "BPP", "2.01.04"),
                             ("emp_lp", "BPP", "2.02.01"), ("pl_total", "BPP", "2.03"), ("pl_nc", "BPP", "2.03.09")]:
        for k, z, dt in (("", Z26, R), ("_1", Z25, R1)):
            try:
                b[nome + k] = linha(z, f"{dem}_{s}", cnpj, dt, conta).VL.iloc[0]
            except LookupError:
                b[nome + k] = 0.0 if nome in ("pl_nc", "aplic") or s == "ind" and nome == "pl_nc" else None
    plc = lambda k: None if b["pl_total" + k] is None else b["pl_total" + k] - (b["pl_nc" + k] or 0)
    pl, pl1 = plc(""), plc("_1")
    M["pl_controladores"] = m(pl, conta=f"2.03 − 2.03.09 ({s}) em {R}")
    db = None if None in (b["emp_cp"], b["emp_lp"]) else b["emp_cp"] + b["emp_lp"]
    cx = None if b["caixa"] is None else b["caixa"] + (b["aplic"] or 0)
    dl = None if None in (db, cx) else db - cx
    M["divida_bruta"] = m(db, conta="2.01.04 + 2.02.01", formula="empréstimos/financiamentos/debêntures CP + LP (sem IFRS 16)")
    M["caixa_aplicacoes"] = m(cx, conta="1.01.01 + 1.01.02")
    M["divida_liquida"] = m(dl, formula="dívida bruta − caixa e aplicações")
    M["margem_ebitda_12m"] = m(div(ebitda, v["receita"], 100), "%", formula="EBITDA 12m / receita 12m",
                               motivo="holding: sem EBITDA/receita operacional" if e["holding"] else None)
    M["margem_liquida_12m"] = m(None if e["holding"] else div(v["lucro_controladores"], v["receita"], 100), "%",
                                formula="lucro controladores 12m / receita 12m",
                                motivo="holding: receita é equivalência patrimonial, margem não comparável" if e["holding"] else None)
    plm = None if None in (pl, pl1) else (pl + pl1) / 2
    M["roe_12m"] = m(div(v["lucro_controladores"], plm, 100), "%",
                     formula=f"lucro controladores 12m / média PL controladores ({R1}, {R})")
    M["divida_liquida_ebitda"] = m(div(dl, ebitda), "x", formula="dívida líquida / EBITDA 12m",
                                   motivo="holding: sem EBITDA" if e["holding"] else None)
    # Ações e mercado
    cc = D[(Z26, "composicao_capital")]
    cc = cc[(cc.CNPJ_CIA == cnpj) & (cc.DT_REFER == R)]
    vm, faltou = 0.0, False
    acoes_tot = 0
    for classe, col in (("ON", "ORDIN"), ("PN", "PREF")):
        if cc.empty:
            faltou = True
            break
        tot, tes = int(cc.iloc[0][f"QT_ACAO_{col}_CAP_INTEGR"]), int(cc.iloc[0][f"QT_ACAO_{col}_TESOURO"])
        if tot == 0:
            continue
        fator, nota = 1, None
        if int(cc.iloc[0]["QT_ACAO_TOTAL_CAP_INTEGR"]) < 10_000_000:
            fator = 1000
            nota = ("composicao_capital não traz unidade; total < 10 milhões indica quantidade em milhares "
                    "(padrão do formulário ITR) — multiplicado por 1.000")
            if classe == "ON" or e["tickers"].get("ON") is None:
                PEND.append({"empresa": tk, "item": "ações em circulação", "motivo": nota})
        circ = (tot - tes) * fator
        acoes_tot += circ
        M[f"acoes_{classe}_circulacao"] = m(circ, "ações", conta=f"QT_ACAO_{col}_CAP_INTEGR − QT_ACAO_{col}_TESOURO (composicao_capital {R})",
                                            **({"obs": nota} if nota else {}))
        ptk = e["tickers"].get(classe)
        p = PRECOS.get(ptk)
        M[f"preco_{ptk}"] = m(p, "R$/ação", conta=f"COTAHIST 05/11/2026 {ptk} PREULT (CODBDI 02, TPMERC 010)",
                              motivo=f"{ptk} sem negociação no lote padrão do COTAHIST 05/11/2026")
        if p is None:
            faltou = True
        else:
            vm += circ * p / 1e6
    vm = None if faltou else vm
    if faltou:
        PEND.append({"empresa": tk, "item": "valor de mercado", "motivo": "sem preço no COTAHIST 05/11/2026 para ao menos uma classe"})
    M["valor_mercado"] = m(vm, formula="Σ ações em circulação × preço de fechamento 05/11/2026 (por classe)")
    M["p_l"] = m(div(vm, v["lucro_controladores"]), "x", formula="valor de mercado / lucro controladores 12m")
    M["p_vp"] = m(div(vm, pl), "x", formula="valor de mercado / PL controladores")
    ev = None if None in (vm, dl) else vm + dl + (b["pl_nc"] or 0)
    M["ev"] = m(ev, formula="valor de mercado + dívida líquida + PL não controladores")
    M["ev_ebitda"] = m(div(ev, ebitda), "x", formula="EV / EBITDA 12m",
                       motivo="holding: sem EBITDA" if e["holding"] else None)
    return {"ticker": tk, "nome": e["nome"], "cd_cvm": None, "cnpj": cnpj, "data_base": R,
            "periodo": f"{tri} (trimestre) e 12m até {R}", "demonstracao": fonte_dem, "holding": e["holding"],
            "metricas": M}


def main():
    cad = pd.read_csv(CVM / "cad_cia_aberta.csv", sep=";", encoding="latin1", dtype=str)
    out = []
    for e in EMPRESAS:
        r = empresa(e)
        r["cd_cvm"] = cad[cad.CNPJ_CIA == e["cnpj"]].CD_CVM.iloc[0]
        out.append(r)
    PEND.append({"empresa": "AURA33", "item": "Aura Minerals", "motivo": "BDR de emissor estrangeiro: sem ITR/DFP no CVM Dados Abertos (só Aura Almas Mineração, Cat. B, sem ações negociadas)."})
    PEND.append({"empresa": "CMOC/Taboca", "item": "Mineração Taboca", "motivo": "não consta como companhia aberta ativa em cad_cia_aberta.csv."})
    PEND.append({"empresa": "PMAM3", "item": "Paranapanema", "motivo": "fora do escopo: setor CVM Metalurgia (cobre), em recuperação judicial (CODBDI 08)."})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"setor": "mineracao", "nome": "Mineração", "gerado_em": datetime.now(timezone.utc).isoformat(),
                               "fonte": "CVM Dados Abertos + B3 COTAHIST 05/11/2026", "empresas": out,
                               "pendencias": PEND}, ensure_ascii=False, indent=1))
    for r in out:
        g = lambda k: r["metricas"].get(k, {}).get("valor")
        print(r["ticker"], r["data_base"], r["demonstracao"][:3], g("receita_12m"), g("margem_ebitda_12m"), g("lucro_controladores_12m"),
              g("roe_12m"), g("divida_liquida_ebitda"), g("p_l"), g("p_vp"), g("ev_ebitda"), g("valor_mercado"))
    print(json.dumps(PEND, ensure_ascii=False, indent=0))


if __name__ == "__main__":
    main()

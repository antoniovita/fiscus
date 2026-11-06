"""Setor Energia elétrica: métricas CVM (ITR 2026/2025, DFP 2025) + preço B3 COTAHIST 05/11/2026.
Uso: .venv/bin/python pipeline/setores/energia.py"""
import json, zipfile
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "cvm"
COT = ROOT / "data" / "raw" / "mercado" / "COTAHIST_D05112026.ZIP"
OUT = ROOT / "data" / "processed" / "setores" / "energia.json"

EMP = [  # ticker principal, cnpj, tickers por classe (preço usado p/ valor de mercado)
    ("AXIA3", "00.001.180/0001-26", {"ON": "AXIA3", "PN": "AXIA7"}),
    ("EQTL3", "03.220.438/0001-73", {"ON": "EQTL3"}),
    ("EGIE3", "02.474.103/0001-19", {"ON": "EGIE3"}),
    ("CPFE3", "02.429.144/0001-93", {"ON": "CPFE3"}),
    ("CPLE3", "76.483.817/0001-20", {"ON": "CPLE3"}),
    ("CMIG4", "17.155.730/0001-64", {"ON": "CMIG3", "PN": "CMIG4"}),
    ("TAEE11", "07.859.971/0001-30", {"ON": "TAEE3", "PN": "TAEE4"}),
    ("ENGI11", "00.864.214/0001-06", {"ON": "ENGI3", "PN": "ENGI4"}),
    ("ISAE4", "02.998.611/0001-04", {"ON": "ISAE3", "PN": "ISAE4"}),
    ("AURE3", "28.594.234/0001-23", {"ON": "AURE3"}),
    ("NEOE3", "01.083.200/0001-18", {"ON": "NEOE3"}),
]
CNPJS = [e[1] for e in EMP]
Z26, Z25, D25 = "itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"
PEND = []


def ler(nome, dem):
    pre, _, _, ano = nome.replace(".zip", "").split("_")
    with zipfile.ZipFile(RAW / nome) as z:
        df = pd.read_csv(z.open(f"{pre}_cia_aberta_{dem}_{ano}.csv"), sep=";", encoding="latin1", dtype=str)
    df = df[df.CNPJ_CIA.isin(CNPJS)].copy()
    if "VL_CONTA" in df:
        df["VL"] = df.VL_CONTA.astype(float) * df.ESCALA_MOEDA.str.upper().map({"MIL": 1.0, "UNIDADE": 1e-3})
    df["V"] = df.VERSAO.astype(int)
    return df[df.V == df.groupby(["CNPJ_CIA", "DT_REFER"]).V.transform("max")]


D = {(z, d): ler(z, d) for z in [Z26, Z25, D25] for d in ["DRE_con", "BPA_con", "BPP_con", "DFC_MI_con", "composicao_capital"] if not (z == D25 and d == "composicao_capital")}


def linha(z, dem, cnpj, dt, conta=None, ordem="ÚLTIMO", ini=None, da=False):
    df = D[(z, dem)]
    df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & (df.ORDEM_EXERC == ordem)]
    if conta: df = df[df.CD_CONTA == conta]
    if da:
        df = df[df.CD_CONTA.str.startswith("6.01.01.") & df.DS_CONTA.str.contains("deprec|amortiz", case=False, na=False)]
    if ini: df = df[df.DT_INI_EXERC == ini]
    if da:
        return df.VL.sum() / 1000 if len(df) else None, ";".join(df.CD_CONTA + " " + df.DS_CONTA)
    if len(df) != 1: raise LookupError(f"{z}/{dem}/{cnpj}/{dt}/{conta}/{ordem}/{ini}: {len(df)}")
    return df.iloc[0].VL / 1000


def precos():
    with zipfile.ZipFile(COT) as z:
        t = z.read(z.namelist()[0]).decode("latin1")
    return {l[12:24].strip(): int(l[108:121]) / 100 for l in t.splitlines()
            if l[:2] == "01" and l[10:12] == "02" and l[24:27] == "010"}


def m(v, u, conta=None, formula=None, motivo=None):
    d = {"valor": None if v is None else round(v, 4), "unidade": u}
    if conta: d["conta"] = conta
    if formula: d["formula"] = formula
    if v is None: d["motivo"] = motivo or "insumo ausente"
    return d


def div(a, b, f=1):
    return None if a is None or b in (None, 0) else a / b * f


cad = pd.read_csv(RAW / "cad_cia_aberta.csv", sep=";", encoding="latin1", dtype=str)
P = precos()
emps = []
for tk, cnpj, cls in EMP:
    c = cad[(cad.CNPJ_CIA == cnpj) & (cad.SIT == "ATIVO")].iloc[0]
    disp = sorted(D[(Z26, "DRE_con")].query("CNPJ_CIA == @cnpj").DT_REFER.unique())
    if not disp:
        PEND.append({"empresa": tk, "motivo": "sem ITR 2026 consolidado na base CVM"}); continue
    R = max(disp); R1 = f"{int(R[:4])-1}{R[4:]}"
    ini_t = f"{R[:4]}-{int(R[5:7])-2:02d}-01"; ini_a = f"{R[:4]}-01-01"; ini_a1 = f"{int(R[:4])-1}-01-01"
    tri = f"{int(R[5:7])//3}T{R[2:4]}"
    M = {}
    try:
        for nome, conta in [("receita", "3.01"), ("ebit", "3.05"), ("lucro_consolidado", "3.11"), ("lucro_controladores", "3.11.01")]:
            t = linha(Z26, "DRE_con", cnpj, R, conta, "ÚLTIMO", ini_t)
            a = linha(Z26, "DRE_con", cnpj, R, conta, "ÚLTIMO", ini_a)
            a1 = linha(Z26, "DRE_con", cnpj, R, conta, "PENÚLTIMO", ini_a1)
            fy = linha(D25, "DRE_con", cnpj, "2025-12-31", conta)
            M[f"{nome}_tri"] = m(t, "R$ mi", f"DRE {conta} ({tri})")
            M[f"{nome}_12m"] = m(a + fy - a1, "R$ mi", f"DRE {conta}", f"acum {R} + DFP 2025 − acum {R1}")
        da, ca = linha(Z26, "DFC_MI_con", cnpj, R, ini=ini_a, da=True)
        da1, _ = linha(Z26, "DFC_MI_con", cnpj, R, ordem="PENÚLTIMO", ini=ini_a1, da=True)
        dafy, _ = linha(D25, "DFC_MI_con", cnpj, "2025-12-31", ini="2025-01-01", da=True)
        da12 = None if None in (da, da1, dafy) else da + dafy - da1
        M["da_12m"] = m(da12, "R$ mi", f"DFC {ca}", f"acum {R} + DFP 2025 − acum {R1}", "D&A não localizada na DFC 6.01.01.xx")
        e12 = M["ebit_12m"]["valor"]
        ebitda = None if da12 is None else e12 + da12
        M["ebitda_12m"] = m(ebitda, "R$ mi", None, "ebit_12m + da_12m (EBITDA CVM 156, não ajustado)")
        pl = linha(Z26, "BPP_con", cnpj, R, "2.03") - linha(Z26, "BPP_con", cnpj, R, "2.03.09")
        pl1 = linha(Z25, "BPP_con", cnpj, R1, "2.03") - linha(Z25, "BPP_con", cnpj, R1, "2.03.09")
        nc = linha(Z26, "BPP_con", cnpj, R, "2.03.09")
        db = linha(Z26, "BPP_con", cnpj, R, "2.01.04") + linha(Z26, "BPP_con", cnpj, R, "2.02.01")
        cx = linha(Z26, "BPA_con", cnpj, R, "1.01.01") + linha(Z26, "BPA_con", cnpj, R, "1.01.02")
        dl = db - cx
        M["pl_controladores"] = m(pl, "R$ mi", "BPP 2.03 − 2.03.09", f"saldo em {R}")
        M["divida_bruta"] = m(db, "R$ mi", "BPP 2.01.04 + 2.02.01", "empréstimos/financiamentos/debêntures CP+LP (sem arrendamentos)")
        M["caixa_aplicacoes"] = m(cx, "R$ mi", "BPA 1.01.01 + 1.01.02")
        M["divida_liquida"] = m(dl, "R$ mi", None, "divida_bruta − caixa_aplicacoes")
        rec, lc = M["receita_12m"]["valor"], M["lucro_controladores_12m"]["valor"]
        M["margem_ebitda_12m"] = m(div(ebitda, rec, 100), "%", None, "ebitda_12m / receita_12m × 100")
        M["margem_liquida_12m"] = m(div(M["lucro_consolidado_12m"]["valor"], rec, 100), "%", None, "lucro_consolidado_12m / receita_12m × 100")
        M["roe_12m"] = m(div(lc, (pl + pl1) / 2, 100), "%", None, f"lucro_controladores_12m / média(PL controladores {R1}, {R}) × 100")
        M["divida_liquida_ebitda"] = m(div(dl, ebitda), "x", None, "divida_liquida / ebitda_12m")
        cc = D[(Z26, "composicao_capital")].query("CNPJ_CIA == @cnpj and DT_REFER == @R")
        cc = cc.iloc[0]
        vm, partes, ok = 0.0, [], True
        fator = 1000 if int(cc.QT_ACAO_TOTAL_CAP_INTEGR) < 100_000_000 else 1
        if fator > 1:
            PEND.append({"empresa": tk, "motivo": "composicao_capital do ITR informada em milhares de ações (total < 100 mi); multiplicada por 1.000 (não há coluna de escala no arquivo)"})
        for classe, col in [("ON", "ORDIN"), ("PN", "PREF")]:
            q = (int(cc[f"QT_ACAO_{col}_CAP_INTEGR"]) - int(cc[f"QT_ACAO_{col}_TESOURO"])) * fator
            if int(cc[f"QT_ACAO_{col}_CAP_INTEGR"]) == 0: continue
            M[f"acoes_{classe}_circulacao"] = m(q, "ações", f"composicao_capital QT_ACAO_{col}_CAP_INTEGR − QT_ACAO_{col}_TESOURO ({R})",
                                                "× 1.000 (arquivo em milhares)" if fator > 1 else None)
            if q < 1000 and classe not in cls:
                M[f"acoes_{classe}_circulacao"]["obs"] = "classe residual (ex.: golden share), sem cotação; ignorada no valor de mercado"
                continue
            ptk = cls.get(classe); p = P.get(ptk) if ptk else None
            if p is None:
                ok = False; PEND.append({"empresa": tk, "motivo": f"sem preço B3 em 05/11/2026 para classe {classe} ({ptk})"}); continue
            M[f"preco_{ptk}"] = m(p, "R$/ação", "COTAHIST 05/11/2026 PREULT (CODBDI 02, TPMERC 010)")
            vm += q * p / 1e6; partes.append(f"acoes_{classe}×preco_{ptk}")
        if ok:
            M["valor_mercado"] = m(vm, "R$ mi", None, " + ".join(partes))
            M["p_l"] = m(div(vm, lc), "x", None, "valor_mercado / lucro_controladores_12m")
            M["p_vp"] = m(div(vm, pl), "x", None, "valor_mercado / pl_controladores")
            ev = vm + dl + nc
            M["ev"] = m(ev, "R$ mi", "BPP 2.03.09 (não controladores)", "valor_mercado + divida_liquida + nao_controladores")
            M["ev_ebitda"] = m(div(ev, ebitda), "x", None, "ev / ebitda_12m")
        else:
            for k in ["valor_mercado", "p_l", "p_vp", "ev", "ev_ebitda"]:
                M[k] = m(None, "R$ mi" if k in ("valor_mercado", "ev") else "x", motivo="sem cotação B3 em 05/11/2026 (ação não negociada/deslistada)")
    except LookupError as ex:
        PEND.append({"empresa": tk, "motivo": f"conta não encontrada: {ex}"}); continue
    if R != "2026-09-30":
        PEND.append({"empresa": tk, "motivo": f"ITR 3T26 indisponível; usada data-base {R} ({tri})"})
    emps.append({"ticker": tk, "nome": c.DENOM_SOCIAL, "cd_cvm": c.CD_CVM, "cnpj": cnpj, "data_base": R,
                 "periodo": f"{tri}; 12m até {R}", "metricas": M})

PEND += [
    {"empresa": "AXIA3", "motivo": "Eletrobras renomeada AXIA Energia S.A. (ticker AXIA3, ex-ELET3). Composição do capital não separa PN por classe: todas as PN precificadas por AXIA7 (único PN em lote padrão em 05/11/2026)."},
    {"empresa": "CPLE3", "motivo": "Copel migrou para ON única (CPLE3; CPLE6 não negocia em 05/11/2026). 1 ação PN residual ignorada no valor de mercado."},
    {"empresa": "AURE3", "motivo": "lucro 12m negativo: P/L negativo, não interpretável."},
    {"empresa": "geral", "motivo": "EBITDA = EBIT + D&A da DFC (CVM 156), não o ajustado; dívida bruta sem arrendamentos; para TAEE11/ENGI11/ISAE4/CMIG4 o valor de mercado soma ON e PN pelos preços de cada classe."},
]
OUT.write_text(json.dumps({"setor": "energia", "nome": "Energia elétrica",
    "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "fonte": "CVM Dados Abertos + B3 COTAHIST 05/11/2026", "empresas": emps, "pendencias": PEND},
    ensure_ascii=False, indent=1), encoding="utf-8")
for e in emps:
    g = lambda k: e["metricas"].get(k, {}).get("valor")
    print(e["ticker"], e["data_base"], *(None if g(k) is None else round(g(k), 2) for k in ["receita_12m", "margem_ebitda_12m", "lucro_controladores_12m", "divida_liquida_ebitda", "p_l", "p_vp", "ev_ebitda", "roe_12m"]))
print(json.dumps(PEND, ensure_ascii=False, indent=1))

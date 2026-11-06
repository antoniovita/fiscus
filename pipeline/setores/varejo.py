"""Setor Varejo: métricas CVM (ITR 2026 + DFP 2025 + ITR 2025) e múltiplos com B3 COTAHIST 05/11/2026."""
import json, re, zipfile
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "cvm"
COT = ROOT / "data" / "raw" / "mercado" / "COTAHIST_D05112026.ZIP"
OUT = ROOT / "data" / "processed" / "setores" / "varejo.json"
Z26, Z25, D25 = "itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"
EMP = {  # ticker: cnpj
    "LREN3": "92.754.738/0001-62", "MGLU3": "47.960.950/0001-21", "ASAI3": "06.057.223/0001-71",
    "GMAT3": "24.990.777/0001-09", "RADL3": "61.585.865/0001-51", "AZZA3": "16.590.234/0001-76",
    "CEAB3": "45.242.914/0001-05", "BHIA3": "33.041.260/0652-90", "VIVA3": "33.839.910/0001-11",
    "PGMN3": "06.626.253/0001-51",
}
PEND = []
DA_RE = r"deprecia|amortiza|exaust"
DA_EXCL = r"juros|empr[ée]st|financiament|deb[êe]nt|capta[çc]|desconto|ajuste a valor presente"


def ler(zn, dem):
    pre, _, _, ano = zn.replace(".zip", "").split("_")
    nome = f"{pre}_cia_aberta_{dem}_{ano}.csv"
    with zipfile.ZipFile(RAW / zn) as z:
        df = pd.read_csv(z.open(nome), sep=";", encoding="latin1", dtype=str)
    df = df[df.CNPJ_CIA.isin(EMP.values())].copy()
    df["ARQ"] = f"data/raw/cvm/{zn}::{nome}"
    if "VL_CONTA" in df:
        esc = df.ESCALA_MOEDA.str.upper().map({"MIL": 1.0, "UNIDADE": 1 / 1000})
        df["VL"] = df.VL_CONTA.astype(float) * esc / 1000.0  # R$ mi
    df["V"] = df.VERSAO.astype(int)
    return df[df.V == df.groupby(["CNPJ_CIA", "DT_REFER"]).V.transform("max")]


D = {(z, d): ler(z, d) for z in [Z26, Z25, D25]
     for d in ["DRE_con", "BPA_con", "BPP_con", "DFC_MI_con", "composicao_capital"] if not (z == D25 and d == "composicao_capital")}


def sel(z, dem, cnpj, dt, ordem="ÚLTIMO", conta=None, dt_ini=None):
    df = D[(z, dem)]
    df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & (df.ORDEM_EXERC == ordem)]
    if conta:
        df = df[df.CD_CONTA == conta]
    if dt_ini and "DT_INI_EXERC" in df:
        df = df[df.DT_INI_EXERC == dt_ini]
    return df


def one(*a, **k):
    df = sel(*a, **k)
    if len(df) != 1:
        raise LookupError(f"{a} {k}: {len(df)} linhas")
    return float(df.iloc[0].VL)


def da(z, cnpj, dt, ordem, dt_ini):
    df = sel(z, "DFC_MI_con", cnpj, dt, ordem, dt_ini=dt_ini)
    df = df[df.CD_CONTA.str.startswith("6.01.01.") & df.DS_CONTA.str.contains(DA_RE, case=False, na=False)
            & ~df.DS_CONTA.str.contains(DA_EXCL, case=False, na=False)]
    if df.empty:
        raise LookupError(f"D&A não encontrada {cnpj} {dt}")
    return float(df.VL.sum()), [f"{r.CD_CONTA} {r.DS_CONTA}" for r in df.itertuples()]


def m(v, un, conta=None, formula=None, motivo=None):
    d = {"valor": None if v is None else round(v, 4), "unidade": un}
    if conta: d["conta"] = conta
    if formula: d["formula"] = formula
    if v is None: d["motivo"] = motivo or "insumo ausente"
    return d


def dv(a, b, f=1.0):
    return None if a is None or b in (None, 0) else a / b * f


def cotahist():
    with zipfile.ZipFile(COT) as z:
        txt = z.read(z.namelist()[0]).decode("latin1")
    out = {}
    for ln in txt.splitlines():
        if ln.startswith("01") and ln[10:12] == "02" and ln[24:27] == "010":
            out[ln[12:24].strip()] = {"preco": int(ln[108:121]) / 100, "data": f"{ln[2:6]}-{ln[6:8]}-{ln[8:10]}",
                                      "fatcot": int(ln[210:217])}
    return out


def empresa(tk, cnpj, cad, cot):
    disp = sorted(D[(Z26, "DRE_con")].query("CNPJ_CIA == @cnpj").DT_REFER.unique())
    if not disp:
        raise LookupError("sem ITR 2026")
    R = max(disp)
    R1 = f"{int(R[:4]) - 1}{R[4:]}"
    tri = f"{int(R[5:7]) // 3}T{R[2:4]}"
    ia, it = f"{R[:4]}-01-01", f"{R[:4]}-{int(R[5:7]) - 2:02d}-01"
    ia1 = f"{int(R[:4]) - 1}-01-01"
    if R != "2026-09-30":
        PEND.append({"empresa": tk, "item": "data-base", "motivo": f"ITR 3T26 ausente; usado {tri} ({R})"})
    M = {}
    f12 = f"acum {ia}..{R} + DFP 2025 − acum {ia1}..{R1} (comparativo PENÚLTIMO do ITR {tri})"
    v = {}
    for nome, conta in {"receita": "3.01", "ebit": "3.05", "lucro_consolidado": "3.11", "lucro_controladores": "3.11.01"}.items():
        try:
            q = one(Z26, "DRE_con", cnpj, R, "ÚLTIMO", conta, it)
        except LookupError as e:
            q = None
        M[f"{nome}_tri"] = m(q, "R$ mi", conta, motivo=f"linha não encontrada no ITR {tri}")
        try:
            x = one(Z26, "DRE_con", cnpj, R, "ÚLTIMO", conta, ia) + one(D25, "DRE_con", cnpj, "2025-12-31", "ÚLTIMO", conta) \
                - one(Z26, "DRE_con", cnpj, R, "PENÚLTIMO", conta, ia1)
        except LookupError as e:
            x = None
        v[nome] = x
        M[f"{nome}_12m"] = m(x, "R$ mi", conta, f12, motivo="linha ausente em algum dos 3 períodos")
    try:
        a, l1 = da(Z26, cnpj, R, "ÚLTIMO", ia)
        b, l2 = da(D25, cnpj, "2025-12-31", "ÚLTIMO", "2025-01-01")
        c, l3 = da(Z26, cnpj, R, "PENÚLTIMO", ia1)
        v["da"] = a + b - c
        M["da_12m"] = m(v["da"], "R$ mi", "DFC 6.01.01.xx: " + "; ".join(sorted(set(l1 + l2 + l3))), f12 +
                        " (soma das linhas de depreciação/amortização, inclui direito de uso IFRS 16 quando reportado)")
    except LookupError as e:
        v["da"] = None
        M["da_12m"] = m(None, "R$ mi", motivo=str(e))
    v["ebitda"] = None if v["ebit"] is None or v["da"] is None else v["ebit"] + v["da"]
    M["ebitda_12m"] = m(v["ebitda"], "R$ mi", "3.05 + D&A", "ebit_12m + da_12m (EBITDA contábil Res. CVM 156, não ajustado)")

    def bal(z, dt):
        g = lambda dem, c: one(z, dem, cnpj, dt, "ÚLTIMO", c)
        pl = g("BPP_con", "2.03")
        try:
            nc = g("BPP_con", "2.03.09")
        except LookupError:
            nc = 0.0
        return {"pl_total": pl, "pl_nc": nc, "pl": pl - nc, "db": g("BPP_con", "2.01.04") + g("BPP_con", "2.02.01"),
                "cx": g("BPA_con", "1.01.01") + g("BPA_con", "1.01.02")}
    b0 = bal(Z26, R)
    try:
        b1 = bal(Z25, R1)
    except LookupError:
        b1 = None
    dl = b0["db"] - b0["cx"]
    M["pl_controladores"] = m(b0["pl"], "R$ mi", "2.03 − 2.03.09", "pl_total − não controladores")
    M["divida_bruta"] = m(b0["db"], "R$ mi", "2.01.04 + 2.02.01", "empréstimos/financiamentos CP + LP (sem arrendamentos IFRS 16)")
    M["caixa_aplicacoes"] = m(b0["cx"], "R$ mi", "1.01.01 + 1.01.02", "caixa e equivalentes + aplicações financeiras CP")
    M["divida_liquida"] = m(dl, "R$ mi", formula="divida_bruta − caixa_aplicacoes")
    M["margem_ebitda_12m"] = m(dv(v["ebitda"], v["receita"], 100), "%", formula="ebitda_12m / receita_12m × 100")
    M["margem_liquida_12m"] = m(dv(v["lucro_consolidado"], v["receita"], 100), "%", formula="lucro_consolidado_12m / receita_12m × 100")
    plm = None if b1 is None else (b0["pl"] + b1["pl"]) / 2
    roe = dv(v["lucro_controladores"], plm, 100)
    M["roe_12m"] = m(roe, "%", formula=f"lucro_controladores_12m / média(PL controladores {R1}, {R}) × 100",
                     motivo=None if plm is None or plm > 0 else "PL médio negativo")
    if plm is not None and plm <= 0:
        M["roe_12m"] = m(None, "%", motivo="PL médio dos controladores não positivo")
    M["divida_liquida_ebitda"] = m(dv(dl, v["ebitda"]) if v["ebitda"] and v["ebitda"] > 0 else None, "x",
                                   formula="divida_liquida / ebitda_12m", motivo="EBITDA 12m ausente ou não positivo")
    # ações e preço
    cc = D[(Z26, "composicao_capital")].query("CNPJ_CIA == @cnpj and DT_REFER == @R")
    vm = None
    if cc.empty:
        M["acoes_circulacao"] = m(None, "ações", motivo=f"composição do capital ausente em {R}")
    else:
        r = cc.iloc[0]
        on = int(r.QT_ACAO_ORDIN_CAP_INTEGR) - int(r.QT_ACAO_ORDIN_TESOURO)
        pn = int(r.QT_ACAO_PREF_CAP_INTEGR) - int(r.QT_ACAO_PREF_TESOURO)
        M["acoes_circulacao"] = {"valor": on, "unidade": "ações", "conta": "composicao_capital QT_ACAO_ORDIN_CAP_INTEGR − QT_ACAO_ORDIN_TESOURO",
                                 "formula": "ON integralizadas − ON em tesouraria"}
        if pn:
            PEND.append({"empresa": tk, "item": "ações PN", "motivo": f"{pn} PN em circulação não precificadas"})
        p = cot.get(tk)
        if p is None or p["fatcot"] != 1:
            M["preco"] = m(None, "R$/ação", motivo=f"{tk} ausente no COTAHIST 05/11/2026 ou FATCOT≠1")
        else:
            M["preco"] = {"valor": p["preco"], "unidade": "R$/ação", "conta": f"COTAHIST PREULT {tk} {p['data']}"}
            vm = on * p["preco"] / 1e6
    M["valor_mercado"] = m(vm, "R$ mi", formula="acoes_circulacao × preco / 1e6")
    lc = v["lucro_controladores"]
    M["p_l"] = m(dv(vm, lc) if lc and lc > 0 else None, "x", formula="valor_mercado / lucro_controladores_12m",
                 motivo="lucro 12m dos controladores negativo ou ausente")
    M["p_vp"] = m(dv(vm, b0["pl"]) if b0["pl"] > 0 else None, "x", formula="valor_mercado / pl_controladores",
                  motivo="PL dos controladores não positivo")
    ev = None if vm is None else vm + dl + b0["pl_nc"]
    M["ev"] = m(ev, "R$ mi", formula="valor_mercado + divida_liquida + não controladores (2.03.09)")
    M["ev_ebitda"] = m(dv(ev, v["ebitda"]) if v["ebitda"] and v["ebitda"] > 0 else None, "x",
                       formula="ev / ebitda_12m (EBITDA CVM 156; dívida sem arrendamentos)", motivo="EBITDA 12m ausente ou não positivo")
    c = cad[cad.CNPJ_CIA == cnpj].iloc[0]
    return {"ticker": tk, "nome": c.DENOM_SOCIAL, "cd_cvm": c.CD_CVM, "cnpj": cnpj, "data_base": R,
            "periodo": f"{tri}; 12m até {R}", "metricas": M}


def main():
    cad = pd.read_csv(RAW / "cad_cia_aberta.csv", sep=";", encoding="latin1", dtype=str)
    cad = cad[cad.SIT == "ATIVO"]
    cot = cotahist()
    emps = []
    for tk, cnpj in EMP.items():
        try:
            emps.append(empresa(tk, cnpj, cad, cot))
        except Exception as e:
            PEND.append({"empresa": tk, "item": "empresa", "motivo": f"não processada: {e}"})
    out = {"setor": "varejo", "nome": "Varejo", "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "fonte": "CVM Dados Abertos + B3 COTAHIST 05/11/2026", "script": "pipeline/setores/varejo.py",
           "convencoes": "Demonstrações consolidadas, maior VERSAO; R$ milhões; EBITDA = EBIT (3.05) + D&A da DFC "
                         "(Res. CVM 156, não ajustado); dívida bruta sem arrendamentos IFRS 16.",
           "empresas": emps, "pendencias": PEND}
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    for e in emps:
        g = lambda k: e["metricas"][k]["valor"]
        r = lambda x: None if x is None else round(x, 1 if abs(x) > 50 else 2)
        print(e["ticker"], e["data_base"], *[r(g(k)) for k in ["receita_12m", "margem_ebitda_12m", "lucro_controladores_12m",
              "divida_liquida_ebitda", "p_l", "p_vp", "ev_ebitda", "roe_12m"]], "|", e["metricas"]["da_12m"].get("conta"))
    for p in PEND:
        print("PEND", p)


if __name__ == "__main__":
    main()

"""Setor Petróleo e gás: métricas CVM (ITR 2026 + DFP 2025 + ITR 2025) e B3 COTAHIST 05/11/2026.
Lógica de 12m, D&A e ações em circulação reaproveitada de pipeline/04_cvm_mercado.py."""
import json, zipfile
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CVM = ROOT / "data" / "raw" / "cvm"
COTA = ROOT / "data" / "raw" / "mercado" / "COTAHIST_D05112026.ZIP"
OUT = ROOT / "data" / "processed" / "setores" / "petroleo.json"
Z26, Z25, D25 = "itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"

EMPRESAS = [  # ticker principal, nome, CNPJ, tickers por classe
    ("PETR4", "Petrobras", "33.000.167/0001-01", {"ON": "PETR3", "PN": "PETR4"}),
    ("PRIO3", "PRIO", "10.629.105/0001-68", {"ON": "PRIO3"}),
    ("VBBR3", "Vibra Energia", "34.274.233/0001-02", {"ON": "VBBR3"}),
    ("UGPA3", "Ultrapar", "33.256.439/0001-39", {"ON": "UGPA3"}),
    ("CSAN3", "Cosan", "50.746.577/0001-15", {"ON": "CSAN3"}),
    ("BRAV3", "Brava Energia", "12.091.809/0001-55", {"ON": "BRAV3"}),
    ("RECV3", "PetroReconcavo", "03.342.704/0001-30", {"ON": "RECV3"}),
    ("PASS3", "Compass Gás e Energia", "21.389.501/0001-81", {"ON": "PASS3"}),
]
CNPJS = [e[2] for e in EMPRESAS]
PEND = []
D = {}


def ler(zn, dem):
    pre, _, _, ano = zn.replace(".zip", "").split("_")
    nome = f"{pre}_cia_aberta_{dem}_{ano}.csv"
    with zipfile.ZipFile(CVM / zn) as z:
        df = pd.read_csv(z.open(nome), sep=";", encoding="latin1", dtype=str)
    df = df[df.CNPJ_CIA.isin(CNPJS)].copy()
    df["ARQ"] = f"data/raw/cvm/{zn}::{nome}"
    if "VL_CONTA" in df:
        esc = df.ESCALA_MOEDA.str.upper().map({"MIL": 1.0, "UNIDADE": 1 / 1000})
        df["VL"] = df.VL_CONTA.astype(float) * esc / 1000.0  # R$ milhões
    df["V"] = df.VERSAO.astype(int)
    return df[df.V == df.groupby(["CNPJ_CIA", "DT_REFER"]).V.transform("max")]


for zn in [Z26, Z25, D25]:
    for dem in ["DRE_con", "BPA_con", "BPP_con", "DFC_MI_con"] + (["composicao_capital"] if zn == Z26 else []):
        D[(zn, dem)] = ler(zn, dem)


def sel(zn, dem, cnpj, dt, ordem="ÚLTIMO", conta=None, dt_ini=None):
    df = D[(zn, dem)]
    df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & (df.ORDEM_EXERC == ordem)]
    if conta:
        df = df[df.CD_CONTA == conta]
    if dt_ini:
        df = df[df.DT_INI_EXERC == dt_ini]
    return df


def um(*a, **k):
    df = sel(*a, **k)
    if len(df) != 1:
        raise LookupError(f"{a} {k}: {len(df)} linhas")
    return float(df.iloc[0].VL), df.iloc[0]


def da(zn, cnpj, dt, ordem, dt_ini):
    df = sel(zn, "DFC_MI_con", cnpj, dt, ordem, dt_ini=dt_ini)
    df = df[df.CD_CONTA.str.startswith("6.01.01.") & df.DS_CONTA.str.contains("deprecia", case=False, na=False)]
    if df.empty:
        raise LookupError(f"D&A não encontrada {zn} {dt}")
    return float(df.VL.sum()), "; ".join(f"{r.CD_CONTA} {r.DS_CONTA}" for r in df.itertuples())


def cotahist():
    with zipfile.ZipFile(COTA) as z:
        txt = z.read(z.namelist()[0]).decode("latin1")
    out = {}
    for ln in txt.splitlines():
        if ln.startswith("01") and ln[10:12] == "02" and ln[24:27] == "010":
            out[ln[12:24].strip()] = (int(ln[108:121]) / 100, int(ln[210:217]), f"{ln[2:6]}-{ln[6:8]}-{ln[8:10]}")
    return out


def it(v, un="R$ mi", conta=None, formula=None, motivo=None, **x):
    d = {"valor": None if v is None else round(v, 4), "unidade": un}
    if conta: d["conta"] = conta
    if formula: d["formula"] = formula
    if v is None: d["motivo"] = motivo or "insumo ausente"
    d.update(x)
    return d


def dv(a, b, f=1.0):
    return None if a is None or b in (None, 0) else a / b * f


def empresa(tk, nome, cnpj, classes, px):
    disp = sorted(D[(Z26, "DRE_con")].query("CNPJ_CIA == @cnpj").DT_REFER.unique())
    R = max(disp)
    R1 = f"{int(R[:4]) - 1}{R[4:]}"
    tri = f"{int(R[5:7]) // 3}T{R[2:4]}"
    ini_a, ini_t = f"{R[:4]}-01-01", f"{R[:4]}-{int(R[5:7]) - 2:02d}-01"
    ini_a1 = f"{int(R[:4]) - 1}-01-01"
    if R != "2026-09-30":
        PEND.append({"empresa": tk, "item": "ITR 3T26", "motivo": f"ITR de 30/09/2026 ausente em {Z26}; usada data-base {R} ({tri})."})
    M = {}
    V = {}
    ltm = f"acum. {ini_a}..{R} + DFP 2025 − acum. {ini_a1}..{R1} (comparativo do ITR {tri})"
    for k, c in [("receita", "3.01"), ("ebit", "3.05"), ("lucro_consolidado", "3.11"), ("lucro_controladores", "3.11.01")]:
        try:
            vt, _ = um(Z26, "DRE_con", cnpj, R, "ÚLTIMO", c, ini_t)
            M[f"{k}_tri"] = it(vt, conta=f"DRE {c} ({ini_t} a {R})")
        except LookupError as e:
            M[f"{k}_tri"] = it(None, conta=c, motivo=str(e))
        try:
            a, _ = um(Z26, "DRE_con", cnpj, R, "ÚLTIMO", c, ini_a)
            a1, _ = um(Z26, "DRE_con", cnpj, R, "PENÚLTIMO", c, ini_a1)
            fy, _ = um(D25, "DRE_con", cnpj, "2025-12-31", "ÚLTIMO", c)
            V[k] = a + fy - a1
            M[f"{k}_12m"] = it(V[k], conta=f"DRE {c}", formula=ltm)
        except LookupError as e:
            V[k] = None
            M[f"{k}_12m"] = it(None, conta=c, motivo=str(e))
    try:
        a, ds = da(Z26, cnpj, R, "ÚLTIMO", ini_a)
        a1, _ = da(Z26, cnpj, R, "PENÚLTIMO", ini_a1)
        fy, ds_fy = da(D25, cnpj, "2025-12-31", "ÚLTIMO", "2025-01-01")
        V["da"] = a + fy - a1
        M["da_12m"] = it(V["da"], conta=f"DFC {ds} (DFP 2025: {ds_fy})", formula=ltm,
                         obs="Linhas 6.01.01.* cuja descrição contém 'deprecia'.")
    except LookupError as e:
        V["da"] = None
        M["da_12m"] = it(None, motivo=str(e))
    V["ebitda"] = None if None in (V["ebit"], V["da"]) else V["ebit"] + V["da"]
    M["ebitda_12m"] = it(V["ebitda"], formula="ebit_12m (3.05) + da_12m", obs="EBITDA contábil Res. CVM 156; não é o EBITDA ajustado da companhia.")

    def bal(zn, dt):
        g = lambda dem, c: um(zn, dem, cnpj, dt, "ÚLTIMO", c)[0]
        pl, nc = g("BPP_con", "2.03"), g("BPP_con", "2.03.09")
        db = g("BPP_con", "2.01.04") + g("BPP_con", "2.02.01")
        cx = g("BPA_con", "1.01.01") + g("BPA_con", "1.01.02")
        return {"pl_c": pl - nc, "nc": nc, "db": db, "cx": cx, "dl": db - cx}
    b = bal(Z26, R)
    try:
        b1 = bal(Z25, R1)
    except LookupError:
        b1 = None
    M["pl_controladores"] = it(b["pl_c"], conta="2.03 − 2.03.09", data=R)
    M["pl_nao_controladores"] = it(b["nc"], conta="2.03.09", data=R)
    M["divida_bruta"] = it(b["db"], conta="2.01.04 + 2.02.01", data=R, obs="Sem arrendamentos IFRS 16 e derivativos.")
    M["caixa_aplicacoes"] = it(b["cx"], conta="1.01.01 + 1.01.02", data=R)
    M["divida_liquida"] = it(b["dl"], formula="divida_bruta − caixa_aplicacoes", data=R)
    r = V["receita"]
    M["margem_ebitda_12m"] = it(dv(V["ebitda"], r, 100), "%", formula="ebitda_12m / receita_12m × 100")
    M["margem_liquida_12m"] = it(dv(V["lucro_controladores"], r, 100), "%", formula="lucro_controladores_12m / receita_12m × 100")
    plm = None if b1 is None else (b["pl_c"] + b1["pl_c"]) / 2
    M["roe_12m"] = it(dv(V["lucro_controladores"], plm, 100), "%",
                      formula=f"lucro_controladores_12m / média(PL controladores {R1}, {R}) × 100")
    M["divida_liquida_ebitda"] = it(dv(b["dl"], V["ebitda"]), "x", formula="divida_liquida / ebitda_12m")

    cc = D[(Z26, "composicao_capital")].query("CNPJ_CIA == @cnpj and DT_REFER == @R").iloc[0]
    mc, partes = 0.0, []
    for classe, col in [("ON", "ORDIN"), ("PN", "PREF")]:
        tot, tes = int(cc[f"QT_ACAO_{col}_CAP_INTEGR"]), int(cc[f"QT_ACAO_{col}_TESOURO"])
        if tot == 0:
            continue
        escala_obs = None
        if tk == "VBBR3":  # composição do capital informada em milhares de ações (1.198.563 = ~1,2 bi)
            tot, tes = tot * 1000, tes * 1000
            escala_obs = "Vibra informa a composição do capital em milhares de ações (QT_ACAO_ORDIN_CAP_INTEGR=1.198.563); multiplicado por 1.000."
            PEND.append({"empresa": tk, "item": "ações em circulação", "motivo": escala_obs + " Confirmar no formulário do ITR."})
        circ = tot - tes
        M[f"acoes_{classe}_circulacao"] = it(circ, "ações", conta=f"composicao_capital QT_ACAO_{col}_CAP_INTEGR − QT_ACAO_{col}_TESOURO", data=R)
        if escala_obs: M[f"acoes_{classe}_circulacao"]["obs"] = escala_obs
        ptk = classes.get(classe)
        if ptk not in px:
            PEND.append({"empresa": tk, "item": f"preço {classe}", "motivo": f"{ptk} sem cotação no COTAHIST 05/11/2026"})
            mc = None
            break
        p, fat, dpr = px[ptk]
        M[f"preco_{ptk}"] = it(p / fat, "R$/ação", conta="COTAHIST PREULT/100", data=dpr)
        mc += circ * p / fat / 1e6
        partes.append(f"acoes_{classe}_circulacao × preco_{ptk}")
    M["valor_mercado"] = it(mc, formula=" + ".join(partes) + " / 1e6")
    M["p_l"] = it(dv(mc, V["lucro_controladores"]), "x", formula="valor_mercado / lucro_controladores_12m")
    M["p_vp"] = it(dv(mc, b["pl_c"]), "x", formula="valor_mercado / pl_controladores")
    ev = None if mc is None else mc + b["dl"] + b["nc"]
    M["ev"] = it(ev, formula="valor_mercado + divida_liquida + pl_nao_controladores")
    M["ev_ebitda"] = it(dv(ev, V["ebitda"]), "x", formula="ev / ebitda_12m")
    for k in ("p_l", "ev_ebitda"):
        if M[k]["valor"] is not None and M[k]["valor"] < 0:
            M[k]["obs"] = "Negativo: denominador (lucro/EBITDA 12m) negativo; múltiplo não interpretável."
    return {"ticker": tk, "nome": nome, "cd_cvm": D[(Z26, "DRE_con")].query("CNPJ_CIA == @cnpj").CD_CVM.iloc[0].lstrip("0"), "cnpj": cnpj,
            "data_base": R, "periodo": f"{tri} (trimestre) / 12m até {R}", "metricas": M}


px = cotahist()
emp = []
for tk, nome, cnpj, cl in EMPRESAS:
    try:
        emp.append(empresa(tk, nome, cnpj, cl, px))
    except Exception as e:
        PEND.append({"empresa": tk, "item": "empresa inteira", "motivo": repr(e)})
PEND.append({"empresa": "RAIZ4", "item": "Raízen S.A. (CNPJ 33.453.598/0001-23)", "motivo":
             "Exercício social termina em 31/03; os 12m até 30/06/2026 exigem a DFP de 31/03/2026 (dfp_cia_aberta_2026.zip), não baixada; e RAIZ4 não aparece no COTAHIST 05/11/2026 (CODBDI 02/TPMERC 010). Fora da amostra."})
PEND.append({"empresa": "PRIO3", "item": "D&A DFP 2025", "motivo": "D&A 2025 soma 6.01.01.02 e 6.01.01.16 'Ajuste de depreciação do Campo de Frade D&M' (ambas com 'deprecia'); revisar se o ajuste deve compor o EBITDA."})
PEND.append({"empresa": "CSAN3/PASS3", "item": "classificação", "motivo":
             "Cosan é holding diversificada (Rumo, Moove, Compass, Radar, participação na Raízen) e Compass é distribuidora de gás natural; incluídas por exposição a petróleo/gás, mas comparabilidade é limitada."})
OUT.write_text(json.dumps({"setor": "petroleo", "nome": "Petróleo e gás",
                           "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                           "fonte": "CVM Dados Abertos + B3 COTAHIST 05/11/2026", "empresas": emp, "pendencias": PEND},
                          ensure_ascii=False, indent=1))
for e in emp:
    m = e["metricas"]; g = lambda k: m.get(k, {}).get("valor")
    print(e["ticker"], e["data_base"], *[None if g(k) is None else round(g(k), 2) for k in
          ["receita_12m", "margem_ebitda_12m", "lucro_controladores_12m", "divida_liquida_ebitda", "p_l", "p_vp", "ev_ebitda", "roe_12m", "valor_mercado"]])
print(json.dumps(PEND, ensure_ascii=False, indent=0))

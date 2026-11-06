"""Setor Bancos — métricas de instituições financeiras (CVM Dados Abertos + B3 COTAHIST 05/11/2026).

Bancos usam o plano de contas de instituição financeira: não se calcula EBITDA, dívida líquida nem EV/EBITDA.
Contas localizadas por código de nível 1 + descrição (o código do lucro/PL varia entre empresas).
Saída: data/processed/setores/bancos.json
"""
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/cvm"
COT = ROOT / "data/raw/mercado/COTAHIST_D05112026.ZIP"
OUT = ROOT / "data/processed/setores/bancos.json"

# ticker principal, CNPJ, ticker ON, ticker PN (preço usado para cada classe), observação de preço
EMPRESAS = [
    ("ITUB4", "60.872.504/0001-23", "ITUB3", "ITUB4", None),
    ("BBDC4", "60.746.948/0001-12", "BBDC3", "BBDC4", None),
    ("BBAS3", "00.000.000/0001-91", "BBAS3", None, None),
    ("SANB11", "90.400.888/0001-42", "SANB3", "SANB4", "valor de mercado por classe (SANB3/SANB4); SANB11 = 1 ON + 1 PN"),
    ("BPAC11", "30.306.294/0001-45", "BPAC3", "BPAC5",
     "valor de mercado por classe: ON a BPAC3 e todas as PN (PNA+PNB, não segregadas na composição do capital) a BPAC5"),
    ("BRSR6", "92.702.067/0001-96", "BRSR3", "BRSR6",
     "PN (PNA+PNB, não segregadas na composição do capital) precificadas a BRSR6"),
    ("BMGB4", "61.186.680/0001-74", "BMGB4", "BMGB4", "ON sem negociação no COTAHIST: precificadas a BMGB4"),
    ("BMEB4", "17.184.037/0001-10", "BMEB3", "BMEB4", None),
    ("BEES3", "28.127.603/0001-78", "BEES3", "BEES4", None),
    ("PINE4", "62.144.175/0001-20", "PINE3", "PINE4", None),
]
CNPJS = [e[1] for e in EMPRESAS]


def ler(zip_nome, dem):
    pref, _, _, ano = zip_nome.replace(".zip", "").split("_")
    interno = f"{pref}_cia_aberta_{dem}_{ano}.csv"
    with zipfile.ZipFile(RAW / zip_nome) as z:
        df = pd.read_csv(z.open(interno), sep=";", encoding="latin1", dtype=str)
    df = df[df.CNPJ_CIA.isin(CNPJS)].copy()
    df["ARQ"] = f"data/raw/cvm/{zip_nome}::{interno}"
    if "VL_CONTA" in df:
        esc = df.ESCALA_MOEDA.str.upper().map({"MIL": 1.0, "UNIDADE": 1 / 1000})
        df["VL"] = df.VL_CONTA.astype(float) * esc / 1000.0  # R$ milhões
    df["VN"] = df.VERSAO.astype(int)
    df = df[df.VN == df.groupby(["CNPJ_CIA", "DT_REFER"]).VN.transform("max")]
    if "ORDEM_EXERC" in df:
        df = df[df.ORDEM_EXERC == "ÚLTIMO"]
    return df


ZIPS = ["itr_cia_aberta_2026.zip", "itr_cia_aberta_2025.zip", "dfp_cia_aberta_2025.zip"]
D = {(z, d): ler(z, d) for z in ZIPS for d in ["DRE_con", "BPP_con"]}
CC = ler("itr_cia_aberta_2026.zip", "composicao_capital")
CAD = pd.read_csv(RAW / "cad_cia_aberta.csv", sep=";", encoding="latin1", dtype=str)


def cotahist():
    with zipfile.ZipFile(COT) as z:
        txt = z.read(z.namelist()[0]).decode("latin1")
    out = {}
    for ln in txt.splitlines():
        if ln.startswith("01") and ln[10:12] == "02" and ln[24:27] == "010":
            out[ln[12:24].strip()] = {"data": f"{ln[2:6]}-{ln[6:8]}-{ln[8:10]}", "preult": int(ln[108:121]) / 100,
                                      "fatcot": int(ln[210:217])}
    return out


PX = cotahist()


def achar(z, dem, cnpj, dt, conta_re, desc_re, dt_ini=None):
    df = D[(z, dem)]
    df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & df.CD_CONTA.str.fullmatch(conta_re)]
    if desc_re:
        df = df[df.DS_CONTA.str.contains(desc_re, case=False, regex=True, na=False)]
    if dt_ini:
        df = df[df.DT_INI_EXERC == dt_ini]
    if len(df) != 1:
        raise LookupError(f"{z}/{dem}/{cnpj}/{dt}/{conta_re}/{desc_re}/{dt_ini}: {len(df)} linhas")
    return df.iloc[0]


def conta_dre(z, cnpj, dt, kind):
    """Resolve o código da conta na DRE do período (descrição varia)."""
    if kind == "receita":
        return "3.01", None
    if kind == "margem_fin":
        return r"3\.\d\d", r"Resultado Bruto"
    if kind == "lair":
        return r"3\.\d\d", r"Antes d[oe]s? (?:Tributos|Imposto)"
    if kind == "lucro":
        return r"3\.\d\d", r"Consolidado"
    if kind == "lucro_ctrl":
        r = achar(z, "DRE_con", cnpj, dt, r"3\.\d\d", r"Consolidado", dt_ini=f"{dt[:4]}-01-01")
        return re.escape(r.CD_CONTA) + r"\.\d\d", r"Controlador"


def dre(z, cnpj, dt, kind, dt_ini):
    c, d = conta_dre(z, cnpj, dt, kind)
    if kind == "lucro_ctrl":
        df = D[(z, "DRE_con")]
        df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & df.CD_CONTA.str.fullmatch(c)
                & (df.DT_INI_EXERC == dt_ini)]
        df = df[df.DS_CONTA.str.contains("Controlador", case=False) & ~df.DS_CONTA.str.contains("Não", case=False)]
        if len(df) != 1:
            raise LookupError(f"lucro_ctrl {cnpj} {dt}: {len(df)}")
        return df.iloc[0]
    return achar(z, "DRE_con", cnpj, dt, re.escape(c) if d is None else c, d, dt_ini=dt_ini)


def m(valor, unidade, conta=None, formula=None, motivo=None, **kw):
    o = {"valor": None if valor is None else round(float(valor), 4), "unidade": unidade}
    if conta:
        o["conta"] = conta
    if formula:
        o["formula"] = formula
    if motivo:
        o["motivo"] = motivo
    o.update(kw)
    return o


def ref(r):
    return f"{r.CD_CONTA} {r.DS_CONTA} [{r.ARQ}; DT_REFER={r.DT_REFER}; VERSAO={r.VERSAO}]"


NA_BANCO = "não aplicável a instituição financeira (plano de contas de banco; captação é atividade-fim, sem EBITDA)"


def empresa(tk, cnpj, tk_on, tk_pn, obs_px, pend):
    datas = sorted(D[("itr_cia_aberta_2026.zip", "DRE_con")].query("CNPJ_CIA == @cnpj").DT_REFER.unique())
    if not datas:
        pend.append({"ticker": tk, "motivo": "sem ITR 2026 consolidado na CVM"})
        return None
    dt = datas[-1]
    y = dt[:4]
    tri = f"{int(dt[5:7]) // 3}T{dt[2:4]}"
    ini_tri = f"{y}-{int(dt[5:7]) - 2:02d}-01"
    dt_ant = f"{int(y) - 1}{dt[4:]}"
    z26, z25, zf = ZIPS
    cad = CAD[(CAD.CNPJ_CIA == cnpj) & (CAD.SIT == "ATIVO")].iloc[0]
    M = {}
    for kind, mid in [("receita", "receita_intermediacao"), ("margem_fin", "resultado_bruto_intermediacao"),
                      ("lair", "lucro_antes_ir"), ("lucro", "lucro_consolidado"), ("lucro_ctrl", "lucro_controladores")]:
        try:
            rq = dre(z26, cnpj, dt, kind, ini_tri)
            ra = dre(z26, cnpj, dt, kind, f"{y}-01-01")
            rf = dre(zf, cnpj, f"{int(y) - 1}-12-31", kind, f"{int(y) - 1}-01-01")
            rp = dre(z25, cnpj, dt_ant, kind, f"{int(y) - 1}-01-01")
        except LookupError as e:
            M[f"{mid}_tri"] = m(None, "R$ mi", motivo=f"conta não localizada: {e}")
            M[f"{mid}_12m"] = m(None, "R$ mi", motivo=f"conta não localizada: {e}")
            pend.append({"ticker": tk, "metrica": mid, "motivo": str(e)})
            continue
        M[f"{mid}_tri"] = m(rq.VL, "R$ mi", conta=ref(rq), periodo=tri)
        M[f"{mid}_12m"] = m(ra.VL + rf.VL - rp.VL, "R$ mi", conta=f"{rq.CD_CONTA} {rq.DS_CONTA}",
                            formula=f"acumulado {dt} + DFP {int(y) - 1}-12-31 − acumulado {dt_ant}",
                            insumos={"acum_atual": ra.VL, "dfp_anual": rf.VL, "acum_ano_anterior": rp.VL},
                            periodo=f"12m até {dt}")
    if "receita_intermediacao_tri" in M and M["receita_intermediacao_tri"]["valor"] is not None:
        M["receita_intermediacao_tri"]["nota"] = "3.01 em banco = receitas da intermediação financeira (não é receita líquida)"
    M["resultado_bruto_intermediacao_12m"]["nota"] = (
        "proxy de margem financeira: resultado bruto da intermediação, já líquido de perdas de crédito (PDD)")
    # PL
    try:
        pl = achar(z26, "BPP_con", cnpj, dt, r"2\.\d\d", r"Patrim[oô]nio L[ií]quido")
        bpp = D[(z26, "BPP_con")]
        nci = bpp[(bpp.CNPJ_CIA == cnpj) & (bpp.DT_REFER == dt)
                  & bpp.CD_CONTA.str.fullmatch(re.escape(pl.CD_CONTA) + r"\.\d\d")
                  & bpp.DS_CONTA.str.contains("N[ãa]o Controladores", case=False, regex=True)]
        v_nci = nci.VL.sum() if len(nci) else 0.0
        M["pl_consolidado"] = m(pl.VL, "R$ mi", conta=ref(pl))
        M["pl_controladores"] = m(pl.VL - v_nci, "R$ mi", conta=ref(pl),
                                  formula=f"{pl.CD_CONTA} − participação de não controladores"
                                          f" ({', '.join(nci.CD_CONTA) or 'inexistente = 0'})",
                                  insumos={"pl_consolidado": pl.VL, "nao_controladores": v_nci})
    except LookupError as e:
        M["pl_controladores"] = m(None, "R$ mi", motivo=str(e))
        pend.append({"ticker": tk, "metrica": "pl", "motivo": str(e)})
    L = M.get("lucro_controladores_12m", {}).get("valor")
    PL = M.get("pl_controladores", {}).get("valor")
    R12 = M.get("receita_intermediacao_12m", {}).get("valor")
    M["roe_12m"] = m(None if not (L is not None and PL) else L / PL * 100, "%",
                     formula="lucro_controladores_12m / pl_controladores (fim do período) × 100")
    M["margem_liquida_12m"] = m(None if not (L is not None and R12) else L / R12 * 100, "%",
                                formula="lucro_controladores_12m / receita_intermediacao_12m × 100",
                                nota="sobre receita bruta da intermediação; pouco comparável com não-financeiras")
    for k in ["ebitda_12m", "margem_ebitda_12m", "divida_bruta", "caixa_aplicacoes", "divida_liquida",
              "divida_liquida_ebitda", "ev", "ev_ebitda"]:
        M[k] = m(None, "x" if k in ("divida_liquida_ebitda", "ev_ebitda") else ("%" if "margem" in k else "R$ mi"),
                 motivo=NA_BANCO)
    # ações e preço
    cc = CC[(CC.CNPJ_CIA == cnpj) & (CC.DT_REFER == dt)]
    vm, insumos, ok, motivo_vm = 0.0, {}, True, "faltam ações ou preço"
    if len(cc) != 1:
        ok = False
        pend.append({"ticker": tk, "metrica": "acoes", "motivo": f"composição do capital {dt}: {len(cc)} linhas"})
    else:
        cc = cc.iloc[0]
        # escala da composição do capital: algumas cias reportam em milhares de ações (sem campo de escala).
        # Detecta comparando o total com ações implícitas = lucro controladores acumulado / LPA básico (DRE 3.99.01.xx).
        fator, nota_esc = 1, None
        dre26 = D[(z26, "DRE_con")]
        lpa, lacum, dt_lpa = [], None, None
        for dtx in reversed(datas):  # LPA pode vir zerado na data-base (ex.: Santander 3T26): usa data anterior
            l = dre26[(dre26.CNPJ_CIA == cnpj) & (dre26.DT_REFER == dtx) & dre26.CD_CONTA.str.startswith("3.99.01")
                      & (dre26.DT_INI_EXERC == f"{y}-01-01") & (dre26.VL_CONTA.astype(float) != 0)]
            if len(l):
                try:
                    lacum = dre(z26, cnpj, dtx, "lucro_ctrl", f"{y}-01-01").VL
                    lpa, dt_lpa = l, dtx
                    break
                except LookupError:
                    pass
        if not len(lpa):  # fallback: LPA básico do DFP do ano anterior (contra a composição na data-base)
            dfp = D[(zf, "DRE_con")]
            dfy = f"{int(y) - 1}-12-31"
            l = dfp[(dfp.CNPJ_CIA == cnpj) & (dfp.DT_REFER == dfy) & dfp.CD_CONTA.str.startswith("3.99.01")
                    & (dfp.VL_CONTA.astype(float) != 0)]
            if len(l):
                try:
                    lacum = dre(zf, cnpj, dfy, "lucro_ctrl", f"{int(y) - 1}-01-01").VL
                    lpa, dt_lpa = l, f"DFP {dfy}"
                except LookupError:
                    pass
        cc_lpa = CC[(CC.CNPJ_CIA == cnpj) & (CC.DT_REFER == dt_lpa)]
        tot_cc = int(cc_lpa.iloc[0].QT_ACAO_TOTAL_CAP_INTEGR) if len(cc_lpa) else int(cc.QT_ACAO_TOTAL_CAP_INTEGR)
        if len(lpa) and lacum:
            implicitas = lacum * 1e6 / float(lpa.iloc[0].VL_CONTA)
            ratio = implicitas / tot_cc
            if 300 < ratio < 3000:
                fator = 1000
                nota_esc = (f"composição do capital reportada em milhares de ações: ações implícitas pelo LPA básico "
                            f"({lpa.iloc[0].CD_CONTA}={lpa.iloc[0].VL_CONTA} em {dt_lpa}) ≈ {implicitas:,.0f} vs total {tot_cc:,}; "
                            f"quantidades multiplicadas por 1.000")
            elif not 0.3 < ratio < 3:  # noqa
                pend.append({"ticker": tk, "metrica": "acoes", "motivo": f"razão ações implícitas/composição = {ratio:.2f}"})
        else:
            pend.append({"ticker": tk, "metrica": "acoes", "motivo": "sem LPA não-nulo para validar escala da composição do capital"})
            if tot_cc < 10_000_000:
                ok = False
                motivo_vm = (f"composição do capital informa só {tot_cc:,} ações e não há LPA não-nulo (ITR 2026 nem DFP 2025) "
                             "para confirmar se a escala é milhares; valor de mercado não calculado para não inventar escala")
                pend.append({"ticker": tk, "metrica": "valor_mercado", "motivo": motivo_vm})
        for classe, col, ptk in [("ON", "ORDIN", tk_on), ("PN", "PREF", tk_pn)]:
            tot, tes = int(cc[f"QT_ACAO_{col}_CAP_INTEGR"]) * fator, int(cc[f"QT_ACAO_{col}_TESOURO"]) * fator
            if tot == 0:
                continue
            circ = tot - tes
            M[f"acoes_{classe}_circulacao"] = m(circ, "ações", conta=f"QT_ACAO_{col}_CAP_INTEGR − QT_ACAO_{col}_TESOURO [{cc.ARQ}; DT_REFER={dt}]",
                                                insumos={"total": tot, "tesouraria": tes}, nota=nota_esc)
            p = PX.get(ptk) if ptk else None
            if p is None:
                ok = False
                pend.append({"ticker": tk, "metrica": f"preco_{classe}", "motivo": f"sem preço para {ptk} no COTAHIST 05/11/2026"})
                continue
            M[f"preco_{ptk}"] = m(p["preult"], "R$/ação", conta=f"COTAHIST_D05112026 PREULT {ptk} ({p['data']}; FATCOT={p['fatcot']})")
            vm += circ * p["preult"] / 1e6
            insumos[f"{classe}×{ptk}"] = round(circ * p["preult"] / 1e6, 4)
    if tk in PX:
        M["preco_ticker_principal"] = m(PX[tk]["preult"], "R$", conta=f"COTAHIST_D05112026 PREULT {tk}")
    M["valor_mercado"] = m(vm if ok else None, "R$ mi", formula="Σ ações em circulação por classe × PREULT da classe",
                           insumos=insumos, motivo=None if ok else motivo_vm, nota=obs_px)
    VM = M["valor_mercado"]["valor"]
    mv = None if VM else "sem valor de mercado"
    M["p_l"] = m(None if not (VM and L) else VM / L, "x", formula="valor_mercado / lucro_controladores_12m", motivo=mv)
    M["p_vp"] = m(None if not (VM and PL) else VM / PL, "x", formula="valor_mercado / pl_controladores", motivo=mv)
    return {"ticker": tk, "nome": cad.DENOM_SOCIAL, "cd_cvm": cad.CD_CVM, "cnpj": cnpj, "data_base": dt,
            "periodo": tri, "metricas": M}


def main():
    pend = [{"ticker": "ABCB4", "motivo": "BANCO ABC BRASIL (CD_CVM 20958) sem DRE consolidada no ITR 2026 da CVM"},
            {"ticker": "BPAN4/INTR", "motivo": "Banco Pan e Inter não constam como companhias ativas no cad_cia_aberta.csv"}]
    emps = [e for e in (empresa(*x, pend) for x in EMPRESAS) if e]
    out = {"setor": "bancos", "nome": "Bancos", "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "fonte": "CVM Dados Abertos + B3 COTAHIST 05/11/2026",
           "nota": "Instituições financeiras: EBITDA, dívida líquida e EV/EBITDA não se aplicam (null com motivo). "
                   "Receita = 3.01 receitas da intermediação financeira; margem financeira ≈ resultado bruto da intermediação.",
           "empresas": emps, "pendencias": pend}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    for e in emps:
        g = lambda k: e["metricas"].get(k, {}).get("valor")
        f = lambda v, d=1: "null" if v is None else f"{v:,.{d}f}"
        print(f"{e['ticker']:7} {e['periodo']} rec12={f(g('receita_intermediacao_12m'),0)} "
              f"lucro12={f(g('lucro_controladores_12m'),0)} PL={f(g('pl_controladores'),0)} ROE={f(g('roe_12m'))} "
              f"VM={f(g('valor_mercado'),0)} P/L={f(g('p_l'),2)} P/VP={f(g('p_vp'),2)}")
    print(json.dumps(pend, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

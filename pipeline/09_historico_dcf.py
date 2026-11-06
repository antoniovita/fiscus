"""Etapa 9: série histórica anual (DFP 2021–2025) e base de 12 meses para um DCF simples.

Fonte: CVM Dados Abertos (https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/ e ITR/DADOS/).
Reaproveita as funções de pipeline/04_cvm_mercado.py (download com .meta.json, leitura dos zips,
normalização por ESCALA_MOEDA, maior VERSAO por (CNPJ, DT_REFER)). Não altera o 04 nem seus JSONs.

Saídas
  data/raw/cvm/dfp_cia_aberta_AAAA.zip (+ .meta.json: URL, data da consulta, sha256), AAAA = 2021..2024
  data/processed/historico.json       série anual 2021–2025, consolidado, coluna ÚLTIMO, R$ milhões
  data/processed/valuation_base.json  base 12m até a data-base mais recente de cada empresa

Contas
  receita 3.01; EBIT 3.05; lucro consolidado 3.11; lucro controladores 3.11.01
  D&A: linha(s) 6.01.01.* da DFC indireta cuja descrição contém "deprecia" (como no 04); se houver
       mais de uma, soma-se e registra-se a observação.
  capex: linhas 6.02.* cuja descrição começa por "Adições/Compras/Aquisição de" + imobilizado,
       intangível ou software (Gerdau 6.02.01 + 6.02.03; Usiminas compras de imobilizado + intangíveis
       + softwares; CSN 6.02.02 "Aquisição de ativos imobilizados, intangível e propriedade para
       investimento"). Valor negativo (saída de caixa). As contas efetivamente usadas ficam no JSON.
  FCF = caixa operacional (6.01) + capex.
  EBITDA (Res. CVM 156) = EBIT + D&A — não é o EBITDA ajustado das companhias.
  PL controladores = 2.03 − 2.03.09; dívida bruta = 2.01.04 + 2.02.01 (sem arrendamentos);
  caixa + aplicações = 1.01.01 + 1.01.02; dívida líquida = bruta − caixa.
  ROE = lucro controladores / média(PL controladores no fim do ano, no fim do ano anterior), com o
       saldo do ano anterior tirado da coluna PENÚLTIMO do mesmo DFP.
  12m = acumulado do ano até a data-base + exercício 2025 (DFP) − acumulado do mesmo período de 2025
       (coluna PENÚLTIMO do ITR 2026), igual ao 04.

Uso: .venv/bin/python pipeline/09_historico_dcf.py [--refresh]
"""
import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("cvm04", ROOT / "pipeline" / "04_cvm_mercado.py")
m4 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m4)

ANOS = [2021, 2022, 2023, 2024, 2025]
DEMS = ["DRE_con", "BPA_con", "BPP_con", "DFC_MI_con"]
CAPEX_RE = (r"^\s*(adi[çc][õo]es|compras?|aquisi[çc][ãa]o)\s+de\s+(ativos\s+|outros\s+ativos\s+)?"
            r"(imobilizad|intang|software)")
PENDENCIAS = []
MI = 1000.0  # R$ mil -> R$ milhões


def zip_dfp(ano):
    return f"dfp_cia_aberta_{ano}.zip"


def url_zip(nome):
    tipo = "DFP" if nome.startswith("dfp") else "ITR"
    return f"{m4.CVM_BASE}/DOC/{tipo}/DADOS/{nome}"


def fonte(nome):
    return f"CVM Dados Abertos — {'DFP' if nome.startswith('dfp') else 'ITR'}, {url_zip(nome)}"


def item(valor, conta, row_or_arquivo, periodo=None, unidade="R$ mi", **extra):
    arq = row_or_arquivo if isinstance(row_or_arquivo, (str, type(None))) else row_or_arquivo.ARQUIVO
    out = {"valor": None if valor is None else round(float(valor), 4), "unidade": unidade, "conta": conta,
           "arquivo": arq}
    if periodo:
        out["periodo"] = periodo
    out.update({k: v for k, v in extra.items() if v is not None})
    return out


def calc(valor, formula, unidade="R$ mi", periodo=None):
    out = {"valor": None if valor is None else round(float(valor), 4), "unidade": unidade,
           "conta": "calculado", "formula": formula, "arquivo": None}
    if periodo:
        out["periodo"] = periodo
    return out


def linhas_desc(B, z, dem, cnpj, dt, ordem, prefixo, regex, dt_ini=None):
    df = B.d[(z, dem)]
    df = df[(df.CNPJ_CIA == cnpj) & (df.DT_REFER == dt) & (df.ORDEM_EXERC == ordem)
            & df.CD_CONTA.str.startswith(prefixo)
            & df.DS_CONTA.str.contains(regex, case=False, regex=True, na=False)]
    if dt_ini is not None:
        df = df[df.DT_INI_EXERC == dt_ini]
    return df


def soma_desc(B, z, cnpj, dt, ordem, prefixo, regex, dt_ini, nome, tk, rotulo):
    df = linhas_desc(B, z, "DFC_MI_con", cnpj, dt, ordem, prefixo, regex, dt_ini)
    if df.empty:
        PENDENCIAS.append({"empresa": tk, "item": f"{nome} {rotulo}",
                           "motivo": f"nenhuma linha {prefixo}* com descrição /{regex}/ em {z} ({dt}, {ordem})"})
        return None, None, None
    contas = [f"{r.CD_CONTA} {r.DS_CONTA.strip()}" for r in df.itertuples()]
    return df.VL.sum(), contas, df.iloc[0].ARQUIVO


def safe(fn, tk, rotulo):
    try:
        return fn()
    except Exception as e:  # noqa: BLE001 — qualquer falha vira pendência
        PENDENCIAS.append({"empresa": tk, "item": rotulo, "motivo": f"{type(e).__name__}: {e}"})
        return None


def div(a, b):
    return None if a is None or b in (None, 0) else a / b


def add(*xs, sinais=None):
    sinais = sinais or [1] * len(xs)
    return None if any(x is None for x in xs) else sum(s * x for s, x in zip(sinais, xs))


# ----------------------------------------------------------------------------- histórico
def historico_ano(B, tk, cnpj, ano):
    z, dt, ini = zip_dfp(ano), f"{ano}-12-31", f"{ano}-01-01"
    A = {}
    V = {}

    def dre(nome, conta):
        r = safe(lambda: B.linha(z, "DRE_con", cnpj, dt, conta, "ÚLTIMO"), tk, f"{nome} {ano}")
        V[nome] = None if r is None else r.VL / MI
        A[nome] = item(V[nome], conta, r, descricao_conta=None if r is None else r.DS_CONTA)

    for nome, conta in [("receita", "3.01"), ("ebit", "3.05"), ("lucro_consolidado", "3.11"),
                        ("lucro_controladores", "3.11.01")]:
        dre(nome, conta)

    da, contas_da, arq = soma_desc(B, z, cnpj, dt, "ÚLTIMO", "6.01.01.", r"deprecia", ini, "D&A", tk, str(ano))
    V["da"] = None if da is None else da / MI
    A["da"] = item(V["da"], contas_da, arq, obs=("soma de mais de uma linha" if contas_da and len(contas_da) > 1 else None))
    V["ebitda"] = add(V["ebit"], V["da"])
    A["ebitda"] = calc(V["ebitda"], "ebit (3.05) + da (DFC 6.01.01.* 'deprecia') — EBITDA Res. CVM 156, não ajustado")
    A["margem_ebitda"] = calc(None if div(V["ebitda"], V["receita"]) is None else div(V["ebitda"], V["receita"]) * 100,
                              "ebitda / receita × 100", "%")
    A["margem_liquida"] = calc(None if div(V["lucro_consolidado"], V["receita"]) is None
                               else div(V["lucro_consolidado"], V["receita"]) * 100,
                               "lucro_consolidado (3.11) / receita × 100", "%")

    r = safe(lambda: B.linha(z, "DFC_MI_con", cnpj, dt, "6.01", "ÚLTIMO", dt_ini=ini), tk, f"caixa operacional {ano}")
    V["caixa_operacional"] = None if r is None else r.VL / MI
    A["caixa_operacional"] = item(V["caixa_operacional"], "6.01", r)
    cx, contas_cx, arq = soma_desc(B, z, cnpj, dt, "ÚLTIMO", "6.02.", CAPEX_RE, ini, "capex", tk, str(ano))
    V["capex"] = None if cx is None else cx / MI
    A["capex"] = item(V["capex"], contas_cx, arq, obs="saída de caixa (negativo); imobilizado + intangível")
    V["fcf"] = add(V["caixa_operacional"], V["capex"])
    A["fcf"] = calc(V["fcf"], "caixa_operacional (6.01) + capex")

    def saldo(ordem, dem, conta, rot):
        rr = safe(lambda: B.linha(z, dem, cnpj, dt, conta, ordem), tk, f"{rot} {conta} {ano} {ordem}")
        return (None if rr is None else rr.VL / MI), rr

    pl, r_pl = saldo("ÚLTIMO", "BPP_con", "2.03", "PL")
    nci, r_nci = saldo("ÚLTIMO", "BPP_con", "2.03.09", "não controladores")
    V["pl_controladores"] = add(pl, nci, sinais=[1, -1])
    A["pl_controladores"] = calc(V["pl_controladores"], f"2.03 ({pl}) − 2.03.09 ({nci}), saldo em {dt}")
    A["pl_controladores"]["arquivo"] = None if r_pl is None else r_pl.ARQUIVO
    cp, r_cp = saldo("ÚLTIMO", "BPP_con", "2.01.04", "empréstimos CP")
    lp, _ = saldo("ÚLTIMO", "BPP_con", "2.02.01", "empréstimos LP")
    V["divida_bruta"] = add(cp, lp)
    A["divida_bruta"] = calc(V["divida_bruta"], "2.01.04 + 2.02.01 (sem arrendamentos)")
    A["divida_bruta"]["arquivo"] = None if r_cp is None else r_cp.ARQUIVO
    c1, r_c1 = saldo("ÚLTIMO", "BPA_con", "1.01.01", "caixa")
    c2, _ = saldo("ÚLTIMO", "BPA_con", "1.01.02", "aplicações")
    V["caixa_aplicacoes"] = add(c1, c2)
    A["caixa_aplicacoes"] = calc(V["caixa_aplicacoes"], "1.01.01 + 1.01.02")
    A["caixa_aplicacoes"]["arquivo"] = None if r_c1 is None else r_c1.ARQUIVO
    V["divida_liquida"] = add(V["divida_bruta"], V["caixa_aplicacoes"], sinais=[1, -1])
    A["divida_liquida"] = calc(V["divida_liquida"], "divida_bruta − caixa_aplicacoes")

    pl0, _ = saldo("PENÚLTIMO", "BPP_con", "2.03", "PL")
    nci0, _ = saldo("PENÚLTIMO", "BPP_con", "2.03.09", "não controladores")
    plc0 = add(pl0, nci0, sinais=[1, -1])
    med = None if plc0 is None or V["pl_controladores"] is None else (plc0 + V["pl_controladores"]) / 2
    roe = div(V["lucro_controladores"], med)
    A["pl_controladores_medio"] = calc(med, f"(PL ctrl {ano - 1}-12-31 [PENÚLTIMO do DFP {ano}] = {plc0} + PL ctrl {dt}) / 2")
    A["roe"] = calc(None if roe is None else roe * 100, "lucro_controladores (3.11.01) / pl_controladores_medio × 100", "%")
    dle = div(V["divida_liquida"], V["ebitda"]) if (V["ebitda"] or 0) > 0 else None
    A["divida_liquida_ebitda"] = calc(dle, "divida_liquida / ebitda (CVM 156); nulo se EBITDA <= 0 (razão sem sentido)", "x")
    for k in A:
        A[k].setdefault("periodo", f"exercício {ano}" if k in V and k not in (
            "pl_controladores", "divida_bruta", "caixa_aplicacoes", "divida_liquida") else f"saldo/indicador {ano}")
    return A


# ----------------------------------------------------------------------------- base 12m
def base_12m(B, tk, e, mercado, financeiro):
    cnpj = e["cnpj"]
    R = financeiro["empresas"][tk]["data_base"]
    R1 = m4.menos_um_ano(R)
    ini, ini1 = f"{R[:4]}-01-01", f"{R1[:4]}-01-01"
    Z26, D25 = "itr_cia_aberta_2026.zip", "dfp_cia_aberta_2025.zip"
    ltm = f"12m até {R} ({m4.rotulo_tri(R)})"
    out = {"data_base": R, "trimestre": m4.rotulo_tri(R), "periodo_12m": ltm}

    def tres(get, nome, conta_desc):
        partes = {}
        for rot, z, dt, ordem, di in [("acum_atual", Z26, R, "ÚLTIMO", ini), ("exercicio_2025", D25, "2025-12-31", "ÚLTIMO", "2025-01-01"),
                                      ("acum_ano_anterior", Z26, R, "PENÚLTIMO", ini1)]:
            partes[rot] = get(z, dt, ordem, di, rot)
        vals = [p[0] for p in partes.values()]
        v12 = add(*vals, sinais=[1, 1, -1])
        out[f"{nome}_12m"] = {
            "valor": None if v12 is None else round(v12 / MI, 4), "unidade": "R$ mi", "periodo": ltm,
            "conta": conta_desc,
            "formula": f"acum {ini}..{R} + exercício 2025 − acum {ini1}..{R1} (PENÚLTIMO do ITR 2026)",
            "insumos": {k: {"valor": None if p[0] is None else round(p[0] / MI, 4), "contas": p[1], "arquivo": p[2]}
                        for k, p in partes.items()}}
        return v12

    def g_conta(dem, conta):
        def f(z, dt, ordem, di, rot):
            r = safe(lambda: B.linha(z, dem, cnpj, dt, conta, ordem, dt_ini=di), tk, f"{conta} {rot} 12m")
            return (None, None, None) if r is None else (r.VL, [f"{r.CD_CONTA} {r.DS_CONTA.strip()}"], r.ARQUIVO)
        return f

    def g_desc(prefixo, regex, nome):
        def f(z, dt, ordem, di, rot):
            return soma_desc(B, z, cnpj, dt, ordem, prefixo, regex, di, nome, tk, f"12m {rot}")
        return f

    ebit = tres(g_conta("DRE_con", "3.05"), "ebit", "3.05")
    da = tres(g_desc("6.01.01.", r"deprecia", "D&A"), "da", "DFC 6.01.01.* descrição 'deprecia'")
    tres(g_conta("DRE_con", "3.01"), "receita", "3.01")
    cfo = tres(g_conta("DFC_MI_con", "6.01"), "caixa_operacional", "6.01")
    capex = tres(g_desc("6.02.", CAPEX_RE, "capex"), "capex", "DFC 6.02.* aquisição de imobilizado + intangível")
    out["ebitda_12m"] = calc(None if add(ebit, da) is None else add(ebit, da) / MI, "ebit_12m + da_12m (CVM 156)", periodo=ltm)
    out["fcf_12m"] = calc(None if add(cfo, capex) is None else add(cfo, capex) / MI, "caixa_operacional_12m + capex_12m", periodo=ltm)

    sal = {}
    for nome, dem, conta in [("caixa_equivalentes", "BPA_con", "1.01.01"), ("aplicacoes_financeiras_cp", "BPA_con", "1.01.02"),
                             ("emprestimos_cp", "BPP_con", "2.01.04"), ("emprestimos_lp", "BPP_con", "2.02.01"),
                             ("pl_total", "BPP_con", "2.03"), ("participacao_nao_controladores", "BPP_con", "2.03.09")]:
        r = safe(lambda: B.linha(Z26, dem, cnpj, R, conta, "ÚLTIMO"), tk, f"{conta} {R}")
        sal[nome] = None if r is None else r.VL / MI
        out[nome] = item(sal[nome], conta, r, periodo=f"saldo em {R}")
    db = add(sal["emprestimos_cp"], sal["emprestimos_lp"])
    cx = add(sal["caixa_equivalentes"], sal["aplicacoes_financeiras_cp"])
    out["divida_bruta"] = calc(db, "2.01.04 + 2.02.01 (sem arrendamentos IFRS 16)", periodo=f"saldo em {R}")
    out["caixa_aplicacoes"] = calc(cx, "1.01.01 + 1.01.02", periodo=f"saldo em {R}")
    out["divida_liquida"] = calc(add(db, cx, sinais=[1, -1]), "divida_bruta − caixa_aplicacoes", periodo=f"saldo em {R}")

    mk = mercado["empresas"][tk]["metricas"]
    for k, v in mk.items():
        if k.startswith("acoes_") and k.endswith("_circulacao"):
            classe = k.split("_")[1]
            tot, tes = mk.get(f"acoes_{classe}_total", {}), mk.get(f"acoes_{classe}_tesouraria", {})
            out[k] = {"valor": v["valor"], "unidade": "ações", "periodo": v["periodo"],
                      "conta": f"{tot.get('conta')} − {tes.get('conta')}", "arquivo": tot.get("arquivo"),
                      "obs": "copiado de data/processed/mercado.json (composição do capital do ITR)"}
        if k.startswith("preco_"):
            out[k] = {"valor": v["valor"], "unidade": v["unidade"], "periodo": v["periodo"],
                      "conta": "B3 COTAHIST PREULT", "arquivo": v.get("arquivo"),
                      "obs": "copiado de data/processed/mercado.json"}
    if not any(k.startswith("preco_") for k in out):
        PENDENCIAS.append({"empresa": tk, "item": "preço", "motivo": "sem preço em mercado.json"})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()
    metas = {}
    for ano in ANOS:
        n = zip_dfp(ano)
        metas[n] = m4.baixar(url_zip(n), m4.RAW_CVM / n, args.refresh and ano != 2025)
        if metas[n].get("http_status") != 200:
            PENDENCIAS.append({"empresa": None, "item": n, "motivo": f"download falhou: {metas[n]}"})
    cnpjs = [e["cnpj"] for e in m4.EMPRESAS.values()]
    B = m4.Base.__new__(m4.Base)
    B.d = {}
    zips = [zip_dfp(a) for a in ANOS if metas[zip_dfp(a)].get("http_status") == 200] + ["itr_cia_aberta_2026.zip"]
    for z in zips:
        for dem in DEMS:
            B.d[(z, dem)] = m4.ler_zip(z, dem, cnpjs)

    fin = json.loads((m4.OUT / "financeiro.json").read_text(encoding="utf-8"))
    mkt = json.loads((m4.OUT / "mercado.json").read_text(encoding="utf-8"))

    hist = {"gerado_em": m4.agora(), "script": "pipeline/09_historico_dcf.py",
            "fonte": "CVM Dados Abertos — DFP consolidado (DFC método indireto), coluna ÚLTIMO; " +
                     ", ".join(url_zip(zip_dfp(a)) for a in ANOS),
            "convencoes": __doc__, "arquivos_brutos": metas, "empresas": {}, "conferencia_financeiro_json": {},
            "pendencias": PENDENCIAS}
    for tk, e in m4.EMPRESAS.items():
        hist["empresas"][tk] = {"cnpj": e["cnpj"], "anos": {}}
        for ano in ANOS:
            if (zip_dfp(ano), "DRE_con") in B.d:
                hist["empresas"][tk]["anos"][str(ano)] = historico_ano(B, tk, e["cnpj"], ano)
        # conferência 2025 vs. financeiro.json
        F = fin["empresas"][tk]["metricas"]
        h25 = hist["empresas"][tk]["anos"].get("2025", {})
        conf = {}
        for k in ["receita", "ebit", "lucro_consolidado", "lucro_controladores", "da"]:
            a = h25.get(k, {}).get("valor")
            b = F.get(f"{k}_2025", {}).get("valor")
            b = None if b is None else b / MI
            ok = None if a is None or b is None else abs(a - b) < 0.001
            conf[k] = {"historico": a, "financeiro_json": b, "confere": ok}
            if ok is False:
                PENDENCIAS.append({"empresa": tk, "item": f"conferência {k} 2025",
                                   "motivo": f"historico {a} ≠ financeiro.json {b}"})
        hist["conferencia_financeiro_json"][tk] = conf

    val = {"gerado_em": m4.agora(), "script": "pipeline/09_historico_dcf.py",
           "descricao": ("Base plana para DCF simples: fluxos de 12m até a data-base mais recente de cada empresa "
                         "(acum. ano atual + exercício 2025 − acum. mesmo período 2025), saldos de balanço na "
                         "data-base (ITR 2026, consolidado), ações em circulação por classe e preços de "
                         "fechamento (copiados de mercado.json). Valores monetários em R$ milhões; capex negativo."),
           "empresas": {}, "pendencias": PENDENCIAS}
    for tk, e in m4.EMPRESAS.items():
        val["empresas"][tk] = base_12m(B, tk, e, mkt, fin)

    for nome, obj in [("historico.json", hist), ("valuation_base.json", val)]:
        (m4.OUT / nome).write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")
        print("gravado", m4.OUT / nome)
    print("pendências:", len(PENDENCIAS))


if __name__ == "__main__":
    main()

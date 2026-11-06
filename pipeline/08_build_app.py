"""Etapa 8: empacota os dados verificados dentro do app Fiscus.

Lê data/processed/*.json e gera:
  app/data.json   — o bloco de dados que o app usa (com a origem de cada número)
  app/index.html  — app/template.html com os dados embutidos (é o que vai publicado)

Regra: o app não tem número próprio. Tudo que ele mostra sai daqui, e cada valor
carrega a origem (página do ITR, conta da CVM, arquivo da B3 ou fórmula).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data" / "processed"
APP = ROOT / "app"


def load(nome):
    return json.loads((P / nome).read_text(encoding="utf-8"))


ITR = load("metricas_itr.json")["metricas"]
FIN = load("financeiro.json")["empresas"]
MER = load("mercado.json")
SET = load("setor.json")
SEN = load("sensibilidade.json")
VER = load("verificacao.json")
TIA = load("teste_ia.json")
TIC = load("teste_ia_completo.json")
MACRO = load("macro.json")

EMP_KEYS = {"g": "GGBR4", "u": "USIM5", "c": "CSNA3"}
PER = {"g": ("3T26", "3T25"), "u": ("3T26", "3T25"), "c": ("2T26", "2T25")}
NOME_ITR = {"g": "ITR Gerdau 3T26", "u": "ITR Usiminas 3T26"}
ARQ_ITR = {"g": "gerdau_ITR_3T26.pdf", "u": "usiminas_ITR_3T26.pdf"}


def r(v, d=2):
    return None if v is None else round(v, d)


def src_itr(mid):
    m = ITR[mid]
    if m["tipo"] == "calculado":
        return {"tipo": "calculado", "formula": m["formula"], "insumos": [f"{ITR[i]['metrica']} {ITR[i]['periodo']} · pág. {ITR[i].get('pagina', '—')}" for i in m["insumos"]]}
    return {"tipo": "verificado", "fonte": m["fonte"], "pagina": m["pagina"], "trecho": m["trecho"], "como": m["valor_como_aparece"],
            "unOrig": m["unidade_original"], "crit": m["criterio"], "arquivo": m["arquivo"]}


def src_cvm(tk, key, crit):
    m = FIN[tk]["metricas"][key]
    s = {"tipo": "cvm", "fonte": "CVM Dados Abertos", "crit": crit, "arquivo": m.get("arquivo", ""), "periodo": m.get("periodo", "")}
    if m.get("conta"):
        s["conta"] = f"{m['conta']} · {m.get('descricao_conta', '')}"
    if m.get("formula"):
        s["formula"] = m["formula"]
    return s


def cvm(tk, key):
    return FIN[tk]["metricas"][key]["valor"]


def src_mer(tk, key, formula):
    return {"tipo": "mercado", "fonte": f"B3 COTAHIST de {MER['data_referencia']} + CVM Dados Abertos", "formula": formula,
            "crit": "Preço de fechamento × ações em circulação; contábil de 12 meses"}


MET_DEF = {
    "receita": dict(nome="Receita líquida", g="Crescimento e resultado", un="R$ mi", porque="Tamanho e direção do negócio"),
    "ebitda": dict(nome="EBITDA (CVM 156)", g="Crescimento e resultado", un="R$ mi", porque="Mesmo critério para as três empresas; inclui efeitos pontuais"),
    "ebitda_aj": dict(nome="EBITDA ajustado", g="Crescimento e resultado", un="R$ mi", porque="Sem efeitos pontuais, como a empresa reporta"),
    "lucro": dict(nome="Lucro líquido", g="Crescimento e resultado", un="R$ mi", porque="Resultado final; sensível a efeitos pontuais"),
    "margem": dict(nome="Margem EBITDA (CVM 156)", g="Rentabilidade", un="%", rel=1, porque="Em commodity, margem mostra quem tem custo menor"),
    "margem_aj": dict(nome="Margem EBITDA ajustada", g="Rentabilidade", un="%", rel=1, porque="Margem recorrente, sem efeitos pontuais"),
    "roe": dict(nome="ROE 12m", g="Rentabilidade", un="%", porque="Retorno ao acionista; compare com a Selic"),
    "roic": dict(nome="ROIC 12m", g="Rentabilidade", un="%", rel=1, porque="Retorno sobre todo o capital investido"),
    "alav": dict(nome="Dívida líquida / EBITDA 12m", g="Balanço", un="x", lb=1, rel=1, porque="Em setor cíclico, balanço decide quem atravessa a crise"),
    "ev": dict(nome="EV / EBITDA", g="Múltiplos", un="x", lb=1, mult=1, rel=1, porque="Múltiplo mais justo para empresas cíclicas"),
    "pvp": dict(nome="P / VP", g="Múltiplos", un="x", lb=1, mult=1, porque="Preço contra patrimônio; útil em ativo pesado"),
    "pl": dict(nome="P / L", g="Múltiplos", un="x", lb=1, mult=1, porque="Distorce no ciclo: o lucro oscila com efeitos pontuais"),
    "volume": dict(nome="Volume de vendas de aço", g="Operacional", un="mil t", porque="Escala da operação de aço"),
    "rpt": dict(nome="Receita por tonelada (siderurgia)", g="Operacional", un="R$/t", porque="Preço médio realizado"),
}
MET = {k: {**v, "vals": {}} for k, v in MET_DEF.items()}
PROV = {}
ND = {}  # motivo de "não disponível"


def put(k, e, v, p, sv, sp=None):
    MET[k]["vals"][e] = [r(v), r(p)]
    PROV[f"{k}|{e}|0"] = sv
    if p is not None:
        PROV[f"{k}|{e}|1"] = sp or sv


def nd(k, e, motivo):
    MET[k]["vals"][e] = [None, None]
    ND[f"{k}|{e}"] = motivo


for e, tk in EMP_KEYS.items():
    a, b = PER[e]
    A, B = a, b  # sufixos da CVM
    if e in ("g", "u"):
        x = e
        put("receita", e, ITR[f"{x}_receita_3t26"]["valor"], ITR[f"{x}_receita_3t25"]["valor"], src_itr(f"{x}_receita_3t26"), src_itr(f"{x}_receita_3t25"))
        put("ebitda_aj", e, ITR[f"{x}_ebitda_aj_3t26"]["valor"], ITR[f"{x}_ebitda_aj_3t25"]["valor"], src_itr(f"{x}_ebitda_aj_3t26"), src_itr(f"{x}_ebitda_aj_3t25"))
        put("margem_aj", e, ITR[f"{x}_margem_aj_3t26"]["valor"], ITR[f"{x}_margem_aj_3t25"]["valor"], src_itr(f"{x}_margem_aj_3t26"), src_itr(f"{x}_margem_aj_3t25"))
        put("lucro", e, ITR[f"{x}_lucro_3t26"]["valor"], ITR[f"{x}_lucro_3t25"]["valor"], src_itr(f"{x}_lucro_3t26"), src_itr(f"{x}_lucro_3t25"))
    else:
        put("receita", e, cvm(tk, f"receita_{A}") / 1000, cvm(tk, f"receita_{B}") / 1000, src_cvm(tk, f"receita_{A}", "Consolidado · DRE"), src_cvm(tk, f"receita_{B}", "Consolidado · DRE"))
        put("lucro", e, cvm(tk, f"lucro_consolidado_{A}") / 1000, cvm(tk, f"lucro_consolidado_{B}") / 1000,
            src_cvm(tk, f"lucro_consolidado_{A}", "Consolidado · DRE"), src_cvm(tk, f"lucro_consolidado_{B}", "Consolidado · DRE"))
        nd("ebitda_aj", e, "A CSN não publicou o release do 3T26; o EBITDA ajustado dela não está no mesmo critério.")
        nd("margem_aj", e, "A CSN não publicou o release do 3T26; o EBITDA ajustado dela não está no mesmo critério.")
    eb, ebp = cvm(tk, f"ebitda_{A}") / 1000, cvm(tk, f"ebitda_{B}") / 1000
    put("ebitda", e, eb, ebp, src_cvm(tk, f"ebitda_{A}", "EBITDA CVM 156 = EBIT + D&A"), src_cvm(tk, f"ebitda_{B}", "EBITDA CVM 156 = EBIT + D&A"))
    rec, recp = MET["receita"]["vals"][e]
    put("margem", e, eb / rec * 100, ebp / recp * 100,
        {"tipo": "calculado", "formula": "EBITDA (CVM 156) ÷ Receita líquida", "insumos": [f"EBITDA CVM 156 {a}", f"Receita líquida {a}"]},
        {"tipo": "calculado", "formula": "EBITDA (CVM 156) ÷ Receita líquida", "insumos": [f"EBITDA CVM 156 {b}", f"Receita líquida {b}"]})
    put("roe", e, cvm(tk, "roe_12m"), None, src_cvm(tk, "roe_12m", "12 meses · lucro dos controladores ÷ PL médio"))
    put("roic", e, cvm(tk, "roic_12m"), None, src_cvm(tk, "roic_12m", "12 meses · EBIT × (1 − 34%) ÷ capital investido médio"))
    put("alav", e, cvm(tk, "divida_liquida_ebitda_12m"), None, src_cvm(tk, "divida_liquida_ebitda_12m", "Dívida líquida ÷ EBITDA CVM 156 de 12 meses"))
    me = MER["empresas"][tk].get("metricas", MER["empresas"][tk])
    put("ev", e, me["ev_ebitda"]["valor"] if isinstance(me["ev_ebitda"], dict) else me["ev_ebitda"], None,
        src_mer(tk, "ev_ebitda", "(valor de mercado + dívida líquida + não controladores) ÷ EBITDA 12m"))
    put("pvp", e, me["p_vp"]["valor"] if isinstance(me["p_vp"], dict) else me["p_vp"], None, src_mer(tk, "p_vp", "valor de mercado ÷ PL dos controladores"))
    plv = me["p_l"]["valor"] if isinstance(me["p_l"], dict) else me["p_l"]
    if plv is None or plv < 0:
        nd("pl", e, "Lucro de 12 meses negativo: P/L não se aplica.")
    else:
        put("pl", e, plv, None, src_mer(tk, "p_l", "valor de mercado ÷ lucro 12m dos controladores"))

put("volume", "u", ITR["u_vol_aco_3t26"]["valor"], ITR["u_vol_aco_3t25"]["valor"], src_itr("u_vol_aco_3t26"), src_itr("u_vol_aco_3t25"))
nd("volume", "g", "O volume da Gerdau sai no release de resultados, que não faz parte do ITR.")
nd("volume", "c", "A CSN ainda não publicou o 3T26.")
put("rpt", "u", ITR["u_receita_t_sid_3t26"]["valor"], None, src_itr("u_receita_t_sid_3t26"))
nd("rpt", "g", "Depende do volume, que não está no ITR da Gerdau.")
nd("rpt", "c", "A CSN ainda não publicou o 3T26.")

# ---------------- empresas
MN = SET["modelos_negocio"]
seg_g = [("América do Norte", ITR["g_ebitda_an_3t26"]["valor"]), ("Brasil", ITR["g_ebitda_br_3t26"]["valor"]), ("América do Sul", ITR["g_ebitda_as_3t26"]["valor"])]
seg_u = [("Siderurgia", ITR["u_ebitda_sid_3t26"]["valor"]), ("Mineração", ITR["u_ebitda_min_3t26"]["valor"])]


def mix(segs):
    t = sum(v for _, v in segs)
    return [[n, round(v / t * 100)] for n, v in segs]


def fontes_mn(tk):
    return [{"t": f.get("fonte", ""), "u": f.get("url", ""), "p": f.get("pagina")} for f in MN[tk].get("fontes", [])][:3]


f1 = lambda v: f"{v:.1f}".replace(".", ",").replace("-", "−")
EMP = {
    "g": {"nome": "Gerdau", "tk": "GGBR4", "cor": "var(--c-g)", "desc": "Aço longo · Brasil e América do Norte", "ok": True, "per": PER["g"],
          "resumo": MN["GGBR4"]["resumo"], "fontes": fontes_mn("GGBR4"), "mix": mix(seg_g), "mixFonte": "Participação na soma dos segmentos, antes das eliminações · ITR pág. 72",
          "quali": {"f": [f"América do Norte gera {f1(ITR['g_peso_an_ebitda_3t26']['valor'])}% do EBITDA, com margem de {f1(ITR['g_margem_an_3t26']['valor'])}%",
                          "Rota a sucata (forno elétrico) dá flexibilidade de custo", f"Balanço leve: dívida líquida de {f1(cvm('GGBR4','divida_liquida_ebitda_12m'))}x o EBITDA"],
                    "fr": [f"No Brasil, margem de {f1(ITR['g_margem_br_3t26']['valor'])}% e receita {f1(ITR['g_receita_br_var_aa']['valor'])}% contra o 3T25",
                           f"ROE de 12 meses de {f1(cvm('GGBR4','roe_12m'))}%, abaixo da Selic"],
                    "r": ["Mudança na política tarifária dos EUA", "Demanda de construção nos EUA", "Avanço do aço importado no Brasil"]}},
    "u": {"nome": "Usiminas", "tk": "USIM5", "cor": "var(--c-u)", "desc": "Aço plano · siderurgia e mineração", "ok": True, "per": PER["u"],
          "resumo": MN["USIM5"]["resumo"], "fontes": fontes_mn("USIM5"), "mix": mix(seg_u), "mixFonte": "Participação na soma das unidades, antes dos ajustes · ITR pág. 33",
          "quali": {"f": ["Caixa líquido: mais caixa que dívida", f"Margem ajustada subiu {f1(ITR['u_margem_aj_var_aa']['valor'])} p.p. contra o 3T25"],
                    "fr": [f"Volume de aço {f1(ITR['u_vol_aco_var_aa']['valor'])}% e minério {f1(ITR['u_vol_min_var_aa']['valor'])}% contra o 3T25",
                           f"Siderurgia com margem de {f1(ITR['u_margem_sid_3t26']['valor'])}%; mineração quase não gera caixa",
                           "Operação só no Brasil, em aço plano, onde a importação pesa mais"],
                    "r": ["Proteção comercial contra o aço importado", "Preço do minério", "Integração com o novo controlador"]}},
    "c": {"nome": "CSN", "tk": "CSNA3", "cor": "var(--c-c)", "desc": "Aço plano · mineração, cimento e logística", "ok": True, "per": PER["c"], "aviso": "Dados do 2T26: o ITR do 3T26 ainda não está na CVM.",
          "resumo": MN["CSNA3"]["resumo"], "fontes": fontes_mn("CSNA3"), "mix": None, "mixFonte": "Segmentos do 3T26 ainda não publicados",
          "quali": {"f": ["Integração de mina, usina, porto, ferrovia e cimento", "Mineração diversifica a fonte de caixa"],
                    "fr": [f"Alavancagem alta: dívida líquida de {f1(cvm('CSNA3','divida_liquida_ebitda_12m'))}x o EBITDA", "Prejuízo nos últimos 12 meses"],
                    "r": ["Refinanciamento da dívida com juros altos", "Ciclo do minério", "Resultado do 3T26 ainda não publicado"]}},
    "f": {"nome": "Ferbasa", "tk": "FESA4", "cor": "#9aa0a9", "desc": "Ferroligas", "ok": False},
}

# ---------------- setor
res = SEN["resultados"]["siderurgia_24.2"]


def corr(x, lag, amostra):
    return res[x][f"lag_{lag}"][amostra]["pearson"]


def ptos(t, n=4):
    return [{"x": p["texto"], "tipo": p.get("tipo", "fato"), "f": p.get("fonte", ""), "u": p.get("url", ""), "p": p.get("pagina")} for p in t["pontos"][:n]]


selic = MACRO["series"]["selic_meta"]["dados"][-1]
roes = [cvm(tk, "roe_12m") for tk in EMP_KEYS.values()]
roics = [cvm(tk, "roic_12m") for tk in EMP_KEYS.values()]
fin_top = {"t": "Análise financeira", "tese": "Nenhuma das três remunera o capital acima da Selic; em setor cíclico, compare EV/EBITDA com ROIC, não P/L.",
           "pts": [{"x": f"ROE de 12 meses entre {f1(min(roes))}% e {f1(max(roes))}%, e ROIC entre {f1(min(roics))}% e {f1(max(roics))}%, contra Selic de {f1(selic['valor'])}% ao ano.",
                    "tipo": "fato", "f": "CVM Dados Abertos · BCB SGS 432", "u": "https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr", "p": None},
                   {"x": "P/VP abaixo de 1x nas três: o mercado precifica retorno abaixo do custo de capital.", "tipo": "interpretacao", "f": f"B3 COTAHIST {MER['data_referencia']} · CVM", "u": "", "p": None},
                   {"x": "O P/L da Gerdau parece alto porque o lucro de 12 meses inclui um 4T25 fraco; o da Usiminas parece baixo porque já não inclui o prejuízo do 3T25.", "tipo": "interpretacao", "f": "CVM Dados Abertos", "u": "", "p": None},
                   {"x": "A alavancagem separa as três: caixa líquido na Usiminas, menos de 1x na Gerdau e cerca de 5x na CSN.", "tipo": "fato", "f": "CVM Dados Abertos", "u": "", "p": None}]}
NOMES = {"introducao": "Introdução ao setor", "estrutura": "Estrutura competitiva", "cadeia": "Cadeia de valor", "drivers": "Drivers de crescimento",
         "moats": "Vantagens competitivas", "regulacao": "Regulação", "riscos": "Riscos"}
topicos = [{"t": NOMES[k], "tese": SET["topicos"][k]["tese"], "pts": ptos(SET["topicos"][k])} for k in ["introducao", "estrutura", "cadeia", "drivers", "moats", "regulacao"]]
topicos.append(fin_top)
topicos.append({"t": NOMES["riscos"], "tese": SET["topicos"]["riscos"]["tese"], "pts": ptos(SET["topicos"]["riscos"])})

c2 = lambda v: f"{v:+.2f}".replace(".", ",").replace("+", "+").replace("-", "−")
SENS = [
    {"d": "Juros (Selic)", "n": 3, "dado": f"Produção 6 meses depois de alta de juros: r = {c2(corr('selic_dif12m_pp', 6, 'amostra_completa'))} ({c2(corr('selic_dif12m_pp', 6, 'sem_pandemia'))} sem a pandemia)", "f": "BCB SGS 432 · IBGE PIM 8885"},
    {"d": "Importações", "n": 3, "dado": "20,8% do consumo aparente em 2025, 61,9% vindo da China", "f": "Aço Brasil · Estatística Mensal dez/2025"},
    {"d": "Câmbio", "n": 2, "dado": f"Dólar 6 meses antes: r = {c2(corr('cambio_var12m_pct', 6, 'amostra_completa'))}; real fraco encarece o importado", "f": "BCB SGS 3698 · IBGE PIM 8885"},
    {"d": "Atividade (IBC-Br)", "n": 2, "dado": f"r = {c2(corr('ibcbr_var12m_pct', 0, 'amostra_completa'))} no mesmo mês, mas {c2(corr('ibcbr_var12m_pct', 0, 'sem_pandemia'))} sem a pandemia", "f": "BCB SGS 24363 · IBGE PIM 8885"},
    {"d": "Minério de ferro", "n": 1, "dado": f"r = {c2(corr('minerio_var12m_pct', 0, 'amostra_completa'))}, mas o sinal some sem a pandemia ({c2(corr('minerio_var12m_pct', 0, 'sem_pandemia'))})", "f": "Banco Mundial · Pink Sheet"},
]
FATOS = [{"v": p["dado"].get("valor"), "u": p["dado"].get("unidade", ""), "t": p["texto"], "f": p.get("fonte", ""), "p": p.get("pagina"), "top": tk}
         for tk, tt in SET["topicos"].items() for p in tt["pontos"] if p.get("dado") and p["dado"].get("valor") is not None]
SETOR = {
    "veredito": {"nivel": "Seletivo",
                 "frase": "Hoje o setor não paga o custo de capital: produção parada há uma década, um terço da capacidade ociosa e o importado limitando o preço. Vale só onde há proteção fora do Brasil.",
                 "escolha": "g",
                 "porque": f"No Brasil, a margem da Gerdau ({f1(ITR['g_margem_br_3t26']['valor'])}%) é parecida com a da siderurgia da Usiminas ({f1(ITR['u_margem_sid_3t26']['valor'])}%). A diferença está nos EUA, que geram {f1(ITR['g_peso_an_ebitda_3t26']['valor'])}% do EBITDA da Gerdau sob tarifa de 50% sobre o aço importado."},
    "sens": SENS, "sensNota": SEN.get("nota", ""), "topicos": topicos, "fatos": FATOS,
}

vr = VER["resumo"]
VERIF = {"metricas": vr["metricas"], "aprovadas": vr["aprovadas"], "cruz": vr["cruzamentos"], "cruzOk": vr["cruzamentos_ok"],
         "arm": vr["armadilhas"], "armOk": vr["armadilhas_barradas"], "armadilhas": [{"caso": a["caso"], "exp": a["explicacao"]} for a in VER["armadilhas"]],
         "cruzamentos": [{"c": c["checagem"], "ok": c["ok"], "f": c["fonte"]} for c in VER["cruzamentos"]],
         "cvm": (lambda c: f"{sum(x['confere'] for x in c)} de {len(c)} números dos PDFs batem com a base da CVM"
                 + (", diferença zero" if all(x['diferenca'] == 0 for x in c) else ""))(load("financeiro.json")["cruzamento_pdf_itr"]),
         "ia": {"curado": f"{TIA['acertos_valor']}/{TIA['total']}", "completo": f"{TIC['acertos_valor']}/{TIC['total']}"},
         "dataPreco": MER["data_referencia"], "selic": selic["valor"],
         "cruzDet": [{"c": c["checagem"], "calc": c["calculado"], "pub": c["publicado"], "ok": c["ok"], "f": c["fonte"]} for c in VER["cruzamentos"]]}
# séries para os gráficos dos slides (BCB SGS 432 e IBGE PIM-PF 8885), mensais desde 2019
SERIES = {k2: [[d["data"], d["valor"]] for d in MACRO["series"][k2]["dados"] if d["data"] >= "2019-01"] for k2 in ["selic_meta", "pim_siderurgia_var_12m", "pim_siderurgia_indice"]}

# logotipos (Wikimedia Commons, domínio público) embutidos como data URI; ver data/raw/logos/fontes.json
import base64
LOGOS = ROOT / "data" / "raw" / "logos"
for e, arq in {"g": "gerdau.svg", "u": "usiminas.svg", "c": "csn.svg"}.items():
    f = LOGOS / arq
    if f.exists():
        EMP[e]["logo"] = "data:image/svg+xml;base64," + base64.b64encode(f.read_bytes()).decode()

# ícones Iconoir 7.11.1 (MIT), baixados de cdn.jsdelivr.net/npm/iconoir e embutidos
import re as _re
ICONS = {}
for f in sorted((APP / "icons").glob("*.svg")):
    svg = f.read_text(encoding="utf-8")
    svg = _re.sub(r'\s(width|height)="[^"]*"', "", svg, count=2).replace("<svg ", '<svg class="ico" aria-hidden="true" ', 1)
    ICONS[f.stem] = " ".join(svg.split())

# marca Fiscus (app/brand/*.png) embutida como data URI
BRAND = {}
for nome, arq in {"logo": "fiscus-logo.png", "logoWhite": "fiscus-logo-white.png", "mark": "fiscus-mark.png", "markWhite": "fiscus-mark-white.png"}.items():
    BRAND[nome] = "data:image/png;base64," + base64.b64encode((APP / "brand" / arq).read_bytes()).decode()

# ---------------- base do valuation (DCF simples; premissas são do usuário)
import csv as _csv
_rows = list(_csv.DictReader(open(ROOT / "data/raw/treasury/yield_curve_2026.csv", encoding="utf-8")))
_t10 = _rows[0]  # mais recente primeiro
_tmeta = json.loads((ROOT / "data/raw/treasury/yield_curve_2026.csv.meta.json").read_text(encoding="utf-8"))
_vb = json.loads((P / "valuation_base.json").read_text(encoding="utf-8")) if (P / "valuation_base.json").exists() else None


def _vbget(tk, *chaves):
    if not _vb:
        return None
    e = _vb.get(tk) or _vb.get("empresas", {}).get(tk) or {}
    for c in chaves:
        v = e.get(c)
        if isinstance(v, dict):
            v = v.get("valor")
        if isinstance(v, (int, float)):
            return v
    return None


VAL = {"rf": {"valor": float(_t10["10 Yr"]), "data": _t10["Date"], "fonte": _tmeta["fonte"], "url": "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve"},
       "selic": selic["valor"], "ipca12m": MACRO["series"]["ipca_acum_12m"]["dados"][-1]["valor"] if "ipca_acum_12m" in MACRO["series"] else None,
       "empresas": {}}
for e, tk in EMP_KEYS.items():
    fm = FIN[tk]["metricas"]
    me = MER["empresas"][tk].get("metricas", MER["empresas"][tk])
    v = lambda k: (me[k]["valor"] if isinstance(me.get(k), dict) else me.get(k))
    acoes = sum(x for x in [v("acoes_ON_circulacao"), v("acoes_PN_circulacao")] if isinstance(x, (int, float)))
    capex = _vbget(tk, "capex_12m", "capex")
    if capex is not None and abs(capex) > 1e5:  # veio em R$ mil
        capex = capex / 1000
    pl = sorted([k for k in me if k.startswith("pl_controladores_")])
    VAL["empresas"][e] = {
        "ebit12m": fm["ebit_12m"]["valor"] / 1000, "da12m": fm["da_12m"]["valor"] / 1000,
        "dl": cvm(tk, [k for k in fm if k.startswith("divida_liquida_") and "ebitda" not in k and not k.endswith("3T25") and not k.endswith("2T25")][0]) / 1000,
        "minor": cvm(tk, [k for k in fm if k.startswith("pl_nao_controladores_") and not k.endswith("3T25") and not k.endswith("2T25")][0]) / 1000,
        "acoes": acoes, "preco": v("preco_" + tk), "ticker": tk, "dataPreco": MER["data_referencia"],
        "capex12m": abs(capex) if capex is not None else None,
        "fonteCapex": "CVM Dados Abertos · DFC, 12 meses" if capex is not None else None,
    }

# ---------------- histórico anual 2021–2025 (DFP, CVM Dados Abertos)
HIST = {}
if (P / "historico.json").exists():
    _h = load("historico.json")["empresas"]
    for e, tk in EMP_KEYS.items():
        anos = _h.get(tk, {}).get("anos", {})
        HIST[e] = {a: {m: (anos[a].get(m) or {}).get("valor") for m in ["receita", "margem_ebitda", "lucro_consolidado", "fcf", "roe", "divida_liquida_ebitda"]} for a in sorted(anos)}

# ---------------- panorama de outros setores (CVM Dados Abertos + B3; sem verificação por página)
SETX = {}
_SXM = ["receita_12m", "margem_ebitda_12m", "lucro_controladores_12m", "roe_12m", "divida_liquida_ebitda", "p_l", "p_vp", "ev_ebitda", "valor_mercado",
        "receita_intermediacao_12m", "resultado_bruto_intermediacao_12m", "margem_liquida_12m", "pl_controladores"]
for f in sorted((P / "setores").glob("*.json")):
    d = json.loads(f.read_text(encoding="utf-8"))
    emps = []
    for e in d.get("empresas", []):
        m = e.get("metricas", {})
        emps.append({"tk": e.get("ticker"), "nome": e.get("nome"), "db": e.get("data_base"), "per": e.get("periodo"),
                     "v": {x: (m.get(x) or {}).get("valor") for x in _SXM},
                     "o": {x: {kk: (m.get(x) or {}).get(kk) for kk in ("conta", "formula", "motivo", "unidade")} for x in _SXM}})
    SETX[d["setor"]] = {"nome": d.get("nome"), "fonte": d.get("fonte"), "empresas": emps, "pend": d.get("pendencias", [])[:6]}

DATA = {"gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"), "SETOR": SETOR, "EMP": EMP, "MET": MET, "PROV": PROV, "ND": ND, "VERIF": VERIF, "ICONS": ICONS, "BRAND": BRAND, "VAL": VAL, "HIST": HIST, "SERIES": SERIES, "ITRX": {m: ITR[m]["valor"] for m in ["g_margem_an_3t26", "g_margem_br_3t26", "u_margem_sid_3t26", "g_peso_an_ebitda_3t26"]}, "SETX": SETX}


def main():
    APP.mkdir(exist_ok=True)
    js = json.dumps(DATA, ensure_ascii=False, separators=(",", ":"))
    (APP / "data.json").write_text(json.dumps(DATA, ensure_ascii=False, indent=1), encoding="utf-8")
    tpl = (APP / "template.html").read_text(encoding="utf-8")
    app_js = (APP / "app.js").read_text(encoding="utf-8")
    if "/*__APP__*/" not in tpl or "/*__DATA__*/null" not in app_js:
        sys.exit("marcadores ausentes: /*__APP__*/ no template ou /*__DATA__*/null no app.js")
    html = tpl.replace("/*__APP__*/", app_js.replace("/*__DATA__*/null", js.replace("</", "<\\/")))
    (APP / "index.html").write_text(html, encoding="utf-8")
    print(f"app/index.html gerado · {len(PROV)} números com origem · {len(ND)} indisponíveis com motivo · {len(js)//1024} KB de dados")


if __name__ == "__main__":
    main()

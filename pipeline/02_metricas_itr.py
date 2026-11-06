"""Etapa 2: extrai as métricas dos ITRs de forma declarativa.

Cada métrica é definida pela página do PDF e pelo trecho (linha) onde o número aparece.
O valor é LIDO do texto da página, nunca digitado. Quem escolheu a página e a linha
foi a análise (com o Claude); quem lê o número é o código.

Entrada: data/interim/itr/<empresa>/pagina_NNN.txt
Saída:   data/processed/metricas_itr.json
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERIM = ROOT / "data" / "interim" / "itr"
OUT = ROOT / "data" / "processed" / "metricas_itr.json"

NUM = re.compile(r"\(?-?\d{1,3}(?:\.\d{3})*(?:,\d+)?\)?%?x?")

EMPRESAS = {
    "gerdau": {"ticker": "GGBR4", "nome": "Gerdau S.A.", "arquivo": "gerdau_ITR_3T26.pdf"},
    "usiminas": {"ticker": "USIM5", "nome": "Usiminas", "arquivo": "usiminas_ITR_3T26.pdf"},
}

# (id, empresa, métrica, período, página, início da linha, índice do número na linha, unidade original, critério)
# Colunas da DRE: 0 = 3T26, 1 = 9M26, 2 = 3T25, 3 = 9M25.  Colunas do BP: 0 = 30/09/2026, 1 = 31/12/2025.
SPECS = [
    # ---------------- Gerdau: DRE consolidada (pág. 29-30)
    ("g_receita_3t26", "gerdau", "Receita líquida", "3T26", 29, "3.01 Receita de Venda", 0, "R$ mil", "Consolidado · DRE"),
    ("g_receita_3t25", "gerdau", "Receita líquida", "3T25", 29, "3.01 Receita de Venda", 2, "R$ mil", "Consolidado · DRE"),
    ("g_ebit_3t26", "gerdau", "EBIT", "3T26", 29, "3.05 Resultado Antes do Resultado Financeiro", 0, "R$ mil", "Consolidado · DRE"),
    ("g_ebit_3t25", "gerdau", "EBIT", "3T25", 29, "3.05 Resultado Antes do Resultado Financeiro", 2, "R$ mil", "Consolidado · DRE"),
    ("g_lucro_3t26", "gerdau", "Lucro líquido consolidado", "3T26", 29, "3.11 Lucro/Prejuízo Consolidado", 0, "R$ mil", "Consolidado · DRE"),
    ("g_lucro_3t25", "gerdau", "Lucro líquido consolidado", "3T25", 29, "3.11 Lucro/Prejuízo Consolidado", 2, "R$ mil", "Consolidado · DRE"),
    ("g_lucro_ctrl_3t26", "gerdau", "Lucro atribuído aos controladores", "3T26", 30, "3.11.01 Atribuído a Sócios da Empresa Controladora", 0, "R$ mil", "Consolidado · DRE"),
    ("g_lucro_ctrl_3t25", "gerdau", "Lucro atribuído aos controladores", "3T25", 30, "3.11.01 Atribuído a Sócios da Empresa Controladora", 2, "R$ mil", "Consolidado · DRE"),
    # ---------------- Gerdau: EBITDA ajustado e segmentos (nota 22, pág. 72). Linhas: 3T26 3T25
    ("g_ebitda_aj_3t26", "gerdau", "EBITDA ajustado", "3T26", 72, "3.770.176 2.736.858", 0, "R$ mil", "Ajustado · nota 22, consolidado"),
    ("g_ebitda_aj_3t25", "gerdau", "EBITDA ajustado", "3T25", 72, "3.770.176 2.736.858", 1, "R$ mil", "Ajustado · nota 22, consolidado"),
    ("g_da_3t26", "gerdau", "Depreciação e amortização", "3T26", 72, "937.901 937.554", 0, "R$ mil", "Consolidado · nota 22"),
    ("g_ebitda_an_3t26", "gerdau", "EBITDA ajustado América do Norte", "3T26", 72, "2.911.292 1.819.947", 0, "R$ mil", "Ajustado · segmento"),
    ("g_ebitda_an_3t25", "gerdau", "EBITDA ajustado América do Norte", "3T25", 72, "2.911.292 1.819.947", 1, "R$ mil", "Ajustado · segmento"),
    ("g_ebitda_br_3t26", "gerdau", "EBITDA ajustado Brasil", "3T26", 72, "741.422 762.364", 0, "R$ mil", "Ajustado · segmento"),
    ("g_ebitda_br_3t25", "gerdau", "EBITDA ajustado Brasil", "3T25", 72, "741.422 762.364", 1, "R$ mil", "Ajustado · segmento"),
    ("g_ebitda_as_3t26", "gerdau", "EBITDA ajustado América do Sul", "3T26", 72, "159.873 234.408", 0, "R$ mil", "Ajustado · segmento"),
    ("g_receita_an_3t26", "gerdau", "Receita América do Norte", "3T26", 72, "10.512.390 9.184.613", 0, "R$ mil", "Segmento"),
    ("g_receita_an_3t25", "gerdau", "Receita América do Norte", "3T25", 72, "10.512.390 9.184.613", 1, "R$ mil", "Segmento"),
    ("g_receita_br_3t26", "gerdau", "Receita Brasil", "3T26", 72, "6.948.113 7.696.303", 0, "R$ mil", "Segmento"),
    ("g_receita_br_3t25", "gerdau", "Receita Brasil", "3T25", 72, "6.948.113 7.696.303", 1, "R$ mil", "Segmento"),
    ("g_receita_as_3t26", "gerdau", "Receita América do Sul", "3T26", 72, "1.439.580 1.376.294", 0, "R$ mil", "Segmento"),
    # ---------------- Gerdau: BP consolidado (pág. 26-28)
    ("g_caixa", "gerdau", "Caixa e equivalentes", "30/09/2026", 26, "1.01.01 Caixa e Equivalentes", 0, "R$ mil", "Consolidado · BP"),
    ("g_aplic", "gerdau", "Aplicações financeiras", "30/09/2026", 26, "1.01.02 Aplicações Financeiras", 0, "R$ mil", "Consolidado · BP"),
    ("g_div_cp", "gerdau", "Empréstimos e debêntures CP", "30/09/2026", 27, "2.01.04 Empréstimos e Financiamentos", 0, "R$ mil", "Consolidado · BP"),
    ("g_div_lp", "gerdau", "Empréstimos e debêntures LP", "30/09/2026", 27, "2.02.01 Empréstimos e Financiamentos", 0, "R$ mil", "Consolidado · BP"),
    ("g_pl", "gerdau", "Patrimônio líquido consolidado", "30/09/2026", 28, "2.03 Patrimônio Líquido Consolidado", 0, "R$ mil", "Consolidado · BP"),
    ("g_minor", "gerdau", "Participação de não controladores", "30/09/2026", 28, "2.03.09 Participação dos Acionistas Não", 0, "R$ mil", "Consolidado · BP"),
    # ---------------- Usiminas: DRE consolidada (pág. 14)
    ("u_receita_3t26", "usiminas", "Receita líquida", "3T26", 14, "3.01 Receita de Venda", 0, "R$ mil", "Consolidado · DRE"),
    ("u_receita_3t25", "usiminas", "Receita líquida", "3T25", 14, "3.01 Receita de Venda", 2, "R$ mil", "Consolidado · DRE"),
    ("u_ebit_3t26", "usiminas", "EBIT", "3T26", 14, "3.05 Resultado Antes do Resultado Financeiro", 0, "R$ mil", "Consolidado · DRE"),
    ("u_ebit_3t25", "usiminas", "EBIT", "3T25", 14, "3.05 Resultado Antes do Resultado Financeiro", 2, "R$ mil", "Consolidado · DRE"),
    ("u_lucro_3t26", "usiminas", "Lucro líquido consolidado", "3T26", 14, "3.11 Lucro/Prejuízo Consolidado", 0, "R$ mil", "Consolidado · DRE"),
    ("u_lucro_3t25", "usiminas", "Lucro líquido consolidado", "3T25", 14, "3.11 Lucro/Prejuízo Consolidado", 2, "R$ mil", "Consolidado · DRE"),
    ("u_lucro_ctrl_3t26", "usiminas", "Lucro atribuído aos controladores", "3T26", 14, "3.11.01 Atribuído a Sócios da Empresa Controladora", 0, "R$ mil", "Consolidado · DRE"),
    ("u_lucro_ctrl_3t25", "usiminas", "Lucro atribuído aos controladores", "3T25", 14, "3.11.01 Atribuído a Sócios da Empresa Controladora", 2, "R$ mil", "Consolidado · DRE"),
    # ---------------- Usiminas: EBITDA ajustado (release, pág. 28). Colunas: 3T26 2T26 3T25
    ("u_ebitda_aj_3t26", "usiminas", "EBITDA ajustado", "3T26", 28, "EBITDA Ajustado 558.017", 0, "R$ mil", "Ajustado · release, consolidado"),
    ("u_ebitda_aj_3t25", "usiminas", "EBITDA ajustado", "3T25", 28, "EBITDA Ajustado 558.017", 2, "R$ mil", "Ajustado · release, consolidado"),
    ("u_da_3t26", "usiminas", "Depreciação, amortização e exaustão", "3T26", 28, "Depreciação, amortização e exaustão", 0, "R$ mil", "Consolidado · release"),
    ("u_impairment_3t25", "usiminas", "Impairment (ajuste não recorrente)", "3T25", 28, "(-) Impairment de ativos não financeiros", 0, "R$ mil", "Ajuste do EBITDA · release"),
    # ---------------- Usiminas: operacional (pág. 24 e 36) e segmentos (pág. 33, R$ milhão: Min 3T26, Min 2T26, Sid 3T26, Sid 2T26, Aj, Aj, Cons, Cons)
    ("u_vol_aco_3t26", "usiminas", "Volume de vendas de aço", "3T26", 24, "Volume de Vendas Aço (mil t)", 0, "mil t", "Consolidado · release"),
    ("u_vol_aco_3t25", "usiminas", "Volume de vendas de aço", "3T25", 24, "Volume de Vendas Aço (mil t)", 3, "mil t", "Consolidado · release"),
    ("u_vol_min_3t26", "usiminas", "Volume de vendas de minério", "3T26", 24, "Volume de Vendas Minério (mil t)", 0, "mil t", "Consolidado · release"),
    ("u_vol_min_3t25", "usiminas", "Volume de vendas de minério", "3T25", 24, "Volume de Vendas Minério (mil t)", 3, "mil t", "Consolidado · release"),
    ("u_vol_mi_3t26", "usiminas", "Vendas de aço no mercado interno", "3T26", 36, "Mercado Interno 979", 0, "mil t", "Siderurgia · release"),
    ("u_vol_exp_3t26", "usiminas", "Exportações de aço", "3T26", 36, "Exportações 55", 0, "mil t", "Siderurgia · release"),
    ("u_receita_sid_3t26", "usiminas", "Receita Siderurgia", "3T26", 33, "Receita Líquida de Vendas 668", 2, "R$ milhão", "Segmento · release"),
    ("u_receita_min_3t26", "usiminas", "Receita Mineração", "3T26", 33, "Receita Líquida de Vendas 668", 0, "R$ milhão", "Segmento · release"),
    ("u_ebitda_sid_3t26", "usiminas", "EBITDA ajustado Siderurgia", "3T26", 33, "EBITDA AJUSTADO 19 71", 2, "R$ milhão", "Ajustado · segmento"),
    ("u_ebitda_min_3t26", "usiminas", "EBITDA ajustado Mineração", "3T26", 33, "EBITDA AJUSTADO 19 71", 0, "R$ milhão", "Ajustado · segmento"),
    ("u_dl_reportada", "usiminas", "Dívida líquida (reportada)", "30/09/2026", 24, "Dívida Líquida (471)", 0, "R$ milhão", "Conforme a companhia · release"),
    # ---------------- Usiminas: BP consolidado (pág. 12-13)
    ("u_caixa", "usiminas", "Caixa e equivalentes", "30/09/2026", 12, "1.01.01 Caixa e Equivalentes", 0, "R$ mil", "Consolidado · BP"),
    ("u_aplic", "usiminas", "Aplicações financeiras", "30/09/2026", 12, "1.01.02 Aplicações Financeiras", 0, "R$ mil", "Consolidado · BP"),
    ("u_div_cp", "usiminas", "Empréstimos e debêntures CP", "30/09/2026", 13, "2.01.04 Empréstimos e Financiamentos", 0, "R$ mil", "Consolidado · BP"),
    ("u_div_lp", "usiminas", "Empréstimos e debêntures LP", "30/09/2026", 13, "2.02.01 Empréstimos e Financiamentos", 0, "R$ mil", "Consolidado · BP"),
    ("u_pl", "usiminas", "Patrimônio líquido consolidado", "30/09/2026", 13, "2.03 Patrimônio Líquido Consolidado", 0, "R$ mil", "Consolidado · BP"),
    ("u_minor", "usiminas", "Participação de não controladores", "30/09/2026", 13, "2.03.09 Participação dos Acionistas Não", 0, "R$ mil", "Consolidado · BP"),
]

# Métricas derivadas: fórmula sobre os ids acima. Tudo em R$ milhões ou %.
DERIVADAS = [
    ("g_margem_aj_3t26", "gerdau", "Margem EBITDA ajustada", "3T26", "%", "g_ebitda_aj_3t26 / g_receita_3t26"),
    ("g_margem_aj_3t25", "gerdau", "Margem EBITDA ajustada", "3T25", "%", "g_ebitda_aj_3t25 / g_receita_3t25"),
    ("g_margem_liq_3t26", "gerdau", "Margem líquida", "3T26", "%", "g_lucro_3t26 / g_receita_3t26"),
    ("g_margem_an_3t26", "gerdau", "Margem EBITDA América do Norte", "3T26", "%", "g_ebitda_an_3t26 / g_receita_an_3t26"),
    ("g_margem_br_3t26", "gerdau", "Margem EBITDA Brasil", "3T26", "%", "g_ebitda_br_3t26 / g_receita_br_3t26"),
    ("g_peso_an_ebitda_3t26", "gerdau", "Peso da América do Norte no EBITDA", "3T26", "%", "g_ebitda_an_3t26 / g_ebitda_aj_3t26"),
    ("g_div_bruta", "gerdau", "Dívida bruta", "30/09/2026", "R$ mi", "g_div_cp + g_div_lp"),
    ("g_dl", "gerdau", "Dívida líquida", "30/09/2026", "R$ mi", "g_div_cp + g_div_lp - g_caixa - g_aplic"),
    ("u_margem_aj_3t26", "usiminas", "Margem EBITDA ajustada", "3T26", "%", "u_ebitda_aj_3t26 / u_receita_3t26"),
    ("u_margem_aj_3t25", "usiminas", "Margem EBITDA ajustada", "3T25", "%", "u_ebitda_aj_3t25 / u_receita_3t25"),
    ("u_margem_liq_3t26", "usiminas", "Margem líquida", "3T26", "%", "u_lucro_3t26 / u_receita_3t26"),
    ("u_margem_sid_3t26", "usiminas", "Margem EBITDA Siderurgia", "3T26", "%", "u_ebitda_sid_3t26 / u_receita_sid_3t26"),
    ("u_receita_t_sid_3t26", "usiminas", "Receita por tonelada (siderurgia)", "3T26", "R$/t", "u_receita_sid_3t26 / u_vol_aco_3t26 * 1000"),
    ("u_div_bruta", "usiminas", "Dívida bruta", "30/09/2026", "R$ mi", "u_div_cp + u_div_lp"),
    ("u_dl", "usiminas", "Dívida líquida", "30/09/2026", "R$ mi", "u_div_cp + u_div_lp - u_caixa - u_aplic"),
]
VARIACOES = [  # (id, base_3t26, base_3t25, tipo)
    ("g_receita", "pct"), ("g_ebitda_aj", "pct"), ("g_lucro", "pct"), ("g_ebitda_an", "pct"), ("g_ebitda_br", "pct"),
    ("g_receita_an", "pct"), ("g_receita_br", "pct"), ("g_margem_aj", "pp"),
    ("u_receita", "pct"), ("u_ebitda_aj", "pct"), ("u_lucro", "pct_ns"), ("u_vol_aco", "pct"), ("u_vol_min", "pct"), ("u_margem_aj", "pp"),
]


def parse_br(s: str) -> float:
    neg = s.startswith("(") or s.startswith("-")
    s = s.strip("()%x").lstrip("-").replace(".", "").replace(",", ".")
    v = float(s)
    return -v if neg else v


def numeros_da_linha(linha: str, prefixo: str) -> list:
    """Tokens numéricos da linha, a partir do início do prefixo.
    Códigos de conta (3.01, 2.03.09) não casam com o padrão de número brasileiro e ficam de fora."""
    return [t for t in linha[linha.index(prefixo):].split() if NUM.fullmatch(t)]


def para_milhoes(valor: float, unidade: str) -> float:
    return valor / 1000 if unidade == "R$ mil" else valor


def main():
    paginas = {}
    out = {"gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"), "fontes": {}, "metricas": {}, "pendencias": []}
    for emp, info in EMPRESAS.items():
        man = json.loads((INTERIM / emp / "manifest.json").read_text(encoding="utf-8"))
        out["fontes"][emp] = {**info, "sha256": man["sha256"], "paginas": man["paginas"]}

    for (mid, emp, nome, per, pag, prefixo, col, un, crit) in SPECS:
        key = (emp, pag)
        if key not in paginas:
            paginas[key] = (INTERIM / emp / f"pagina_{pag:03d}.txt").read_text(encoding="utf-8")
        linhas = [l for l in paginas[key].splitlines() if prefixo in l]
        if len(linhas) != 1:
            out["pendencias"].append(f"{mid}: prefixo encontrado {len(linhas)} vezes na pág. {pag}")
            continue
        linha = linhas[0].strip()
        nums = numeros_da_linha(linha, prefixo)
        if col >= len(nums):
            out["pendencias"].append(f"{mid}: coluna {col} inexistente em '{linha}'")
            continue
        como = nums[col]
        bruto = parse_br(como)
        valor = para_milhoes(bruto, un) if un in ("R$ mil", "R$ milhão") else bruto
        out["metricas"][mid] = {
            "empresa": EMPRESAS[emp]["ticker"], "metrica": nome, "periodo": per,
            "valor": round(valor, 3), "unidade": "R$ mi" if un.startswith("R$ mil") else un,
            "valor_como_aparece": como, "unidade_original": un,
            "fonte": f"ITR {EMPRESAS[emp]['nome']} 3T26", "arquivo": EMPRESAS[emp]["arquivo"], "pagina": pag,
            "trecho": linha, "criterio": crit, "tipo": "extraido",
        }

    M = out["metricas"]
    for (mid, emp, nome, per, un, formula) in DERIVADAS:
        ids = re.findall(r"[gu]_[a-z0-9_]+", formula)
        if any(i not in M for i in ids):
            out["pendencias"].append(f"{mid}: insumo ausente ({formula})")
            continue
        v = eval(formula, {}, {i: M[i]["valor"] for i in ids})  # fórmula fixa definida acima
        if un == "%":
            v *= 100
        M[mid] = {"empresa": EMPRESAS[emp]["ticker"], "metrica": nome, "periodo": per, "valor": round(v, 2), "unidade": un,
                  "formula": formula, "insumos": ids, "tipo": "calculado"}

    for (base, tipo) in VARIACOES:
        a, b = M.get(base + "_3t26"), M.get(base + "_3t25")
        if not a or not b:
            out["pendencias"].append(f"{base}: variação sem insumo")
            continue
        if tipo == "pp":
            v, un = a["valor"] - b["valor"], "p.p."
        elif b["valor"] <= 0:
            v, un = None, "n.s."  # base negativa: variação percentual não faz sentido
        else:
            v, un = (a["valor"] / b["valor"] - 1) * 100, "%"
        M[base + "_var_aa"] = {"empresa": a["empresa"], "metrica": f"Variação A/A · {a['metrica']}", "periodo": "3T26 vs 3T25",
                                "valor": None if v is None else round(v, 2), "unidade": un,
                                "formula": f"{base}_3t26 vs {base}_3t25", "insumos": [base + "_3t26", base + "_3t25"], "tipo": "calculado"}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{len(M)} métricas · {len(out['pendencias'])} pendências → {OUT.relative_to(ROOT)}")
    for p in out["pendencias"]:
        print("  PENDÊNCIA:", p)


if __name__ == "__main__":
    main()

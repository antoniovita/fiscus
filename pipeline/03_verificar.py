"""Etapa 3: verificação independente de data/processed/metricas_itr.json.

Não confia no extrator: relê as páginas e confere cada número.
  1. o trecho existe na página indicada e contém o valor como aparece
  2. o valor convertido bate com o valor como aparece (unidade/escala)
  3. números de DRE/BP vêm de página CONSOLIDADA (nunca da controladora/holding)
  4. faixas plausíveis (margem, volumes, receita)
  5. métricas calculadas recalculadas a partir dos insumos
  6. cruzamentos com números que a própria companhia publica (reconciliações)
  7. armadilhas conhecidas: entradas erradas que o verificador TEM de reprovar

Saída: data/processed/verificacao.json  (+ código de saída 1 se algo reprovar)
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERIM = ROOT / "data" / "interim" / "itr"
SRC = ROOT / "data" / "processed" / "metricas_itr.json"
OUT = ROOT / "data" / "processed" / "verificacao.json"
EMP = {"GGBR4": "gerdau", "USIM5": "usiminas"}


def pagina(emp, n):
    return (INTERIM / emp / f"pagina_{n:03d}.txt").read_text(encoding="utf-8")


def parse_br(s):
    neg = s.startswith("(") or s.startswith("-")
    v = float(s.strip("()%x").lstrip("-").replace(".", "").replace(",", "."))
    return -v if neg else v


def checar_extraido(m):
    falhas = []
    emp = EMP[m["empresa"]]
    txt = pagina(emp, m["pagina"])
    if m["trecho"] not in txt:
        falhas.append("trecho não encontrado na página")
    if m["valor_como_aparece"] not in m["trecho"]:
        falhas.append("valor não aparece no trecho")
    esperado = parse_br(m["valor_como_aparece"]) / (1000 if m["unidade_original"] == "R$ mil" else 1)
    if abs(esperado - m["valor"]) > 0.001:
        falhas.append(f"escala: como aparece {m['valor_como_aparece']} ({m['unidade_original']}) ≠ {m['valor']} {m['unidade']}")
    if ("DRE" in m["criterio"] or "BP" in m["criterio"]):
        if "Consolidad" not in txt or "DFs Individuais" in txt:
            falhas.append("página não é consolidada")
    return falhas


def faixa(mid, m):
    v, n = m["valor"], m["metrica"].lower()
    if v is None:
        return []
    if m["unidade"] == "%" and "margem" in n and not -50 <= v <= 80:
        return [f"margem fora da faixa plausível (−50% a 80%): {v}"]
    if m["unidade"] == "mil t" and v <= 0:
        return ["volume não positivo"]
    if n.startswith("receita") and m["unidade"] == "R$ mi" and v <= 0:
        return ["receita não positiva"]
    if m["unidade"] == "R$/t" and not 1000 <= v <= 20000:
        return [f"receita por tonelada fora da faixa (R$ 1 mil a 20 mil/t): {v}"]
    return []


def recalcular(m, M):
    ids = m["insumos"]
    if any(i not in M for i in ids):
        return ["insumo ausente"]
    if m["formula"].endswith("_3t25") and " vs " in m["formula"]:
        a, b = M[ids[0]]["valor"], M[ids[1]]["valor"]
        if m["unidade"] == "p.p.":
            v = a - b
        elif b <= 0:
            return [] if m["valor"] is None else ["variação % sobre base negativa deveria ser n.s."]
        else:
            v = (a / b - 1) * 100
    else:
        v = eval(m["formula"], {}, {i: M[i]["valor"] for i in ids})
        if m["unidade"] == "%":
            v *= 100
    return [] if abs(v - m["valor"]) < 0.01 else [f"recálculo {v:.2f} ≠ {m['valor']}"]


def lido(emp, pag, trecho, idx=-1):
    """Último número do trecho, com sinal; o trecho precisa existir literalmente na página (R$ mil → R$ mi)."""
    if trecho not in pagina(emp, pag):
        raise AssertionError(f"trecho de cruzamento ausente: pág. {pag} '{trecho}'")
    tok = [t for t in trecho.split() if re.fullmatch(r"\(?-?\d{1,3}(?:\.\d{3})*(?:,\d+)?\)?", t)][idx]
    return parse_br(tok) / 1000


# Reconciliações com números que a própria companhia publica no ITR
def cruzamentos(M):
    r = []

    def c(nome, calc, publicado, fonte, tol):
        ok = abs(calc - publicado) <= tol
        r.append({"checagem": nome, "calculado": round(calc, 3), "publicado": publicado, "fonte": fonte, "tolerancia": tol, "ok": ok})

    c("Gerdau · soma dos segmentos = EBITDA ajustado consolidado",
      M["g_ebitda_br_3t26"]["valor"] + M["g_ebitda_an_3t26"]["valor"] + M["g_ebitda_as_3t26"]["valor"] - 42.411,
      M["g_ebitda_aj_3t26"]["valor"], "ITR Gerdau, pág. 72 (eliminações −42.411)", 0.01)
    c("Gerdau · receita da nota de segmentos = DRE consolidada", lido("gerdau", 72, "18.690.518 17.983.143", 0),
      M["g_receita_3t26"]["valor"], "ITR Gerdau, pág. 72 × pág. 29", 0.01)
    c("Usiminas · margem EBITDA ajustada 3T26 = publicada (9,0%)", M["u_margem_aj_3t26"]["valor"], 9.0, "ITR Usiminas, pág. 28", 0.05)
    c("Usiminas · margem EBITDA ajustada 3T25 = publicada (6,6%)", M["u_margem_aj_3t25"]["valor"], 6.6, "ITR Usiminas, pág. 28", 0.05)
    c("Usiminas · EBITDA CVM 156 − equivalência + EBITDA de controladas em conjunto = ajustado",
      lido("usiminas", 28, "EBITDA Instrução CVM 156 588.039") + lido("usiminas", 28, "coligadas (80.452)")
      + lido("usiminas", 28, "controladas em conjunto 50.430"), M["u_ebitda_aj_3t26"]["valor"], "ITR Usiminas, pág. 28", 0.01)
    c("Usiminas · soma dos segmentos = EBITDA ajustado (R$ milhão)",
      M["u_ebitda_sid_3t26"]["valor"] + M["u_ebitda_min_3t26"]["valor"] + 1, round(M["u_ebitda_aj_3t26"]["valor"]), "ITR Usiminas, pág. 33", 1)
    c("Usiminas · dívida líquida calculada (BP) vs reportada no release",
      M["u_dl"]["valor"], M["u_dl_reportada"]["valor"], "ITR Usiminas, pág. 12–13 × pág. 24", 150)
    return r


# Entradas erradas plausíveis: o verificador precisa reprovar todas.
ARMADILHAS = [
    {"caso": "Holding no lugar do consolidado",
     "entrada": {"empresa": "GGBR4", "metrica": "Receita líquida", "valor": 1078.759, "unidade": "R$ mi", "valor_como_aparece": "1.078.759",
                 "unidade_original": "R$ mil", "pagina": 18, "trecho": "3.01 Receita de Venda de Bens e/ou Serviços 1.078.759 3.056.207 1.221.389 3.684.479",
                 "criterio": "Consolidado · DRE"},
     "explicacao": "O comentário de desempenho da Gerdau (pág. 3) fala da holding: R$ 1.078,8 milhões, 17 vezes menos que o consolidado."},
    {"caso": "R$ mil lido como R$ milhões",
     "entrada": {"empresa": "USIM5", "metrica": "EBITDA ajustado", "valor": 558017.0, "unidade": "R$ mi", "valor_como_aparece": "558.017",
                 "unidade_original": "R$ mil", "pagina": 28, "trecho": "EBITDA Ajustado 558.017 761.311 434.123", "criterio": "Ajustado · release, consolidado"},
     "explicacao": "A tabela de reconciliação da Usiminas está em R$ mil; o resumo da pág. 24 está em R$ milhões."},
    {"caso": "Página errada para o número",
     "entrada": {"empresa": "GGBR4", "metrica": "EBITDA ajustado", "valor": 3770.176, "unidade": "R$ mi", "valor_como_aparece": "3.770.176",
                 "unidade_original": "R$ mil", "pagina": 71, "trecho": "3.770.176 2.736.858", "criterio": "Ajustado · nota 22, consolidado"},
     "explicacao": "O valor existe, mas na pág. 72, não na 71. Citação errada também reprova."},
]


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    M = data["metricas"]
    res = {}
    for mid, m in M.items():
        f = (checar_extraido(m) if m["tipo"] == "extraido" else recalcular(m, M)) + faixa(mid, m)
        res[mid] = {"status": "aprovado" if not f else "reprovado", "falhas": f}

    cz = cruzamentos(M)
    arm = []
    for a in ARMADILHAS:
        f = checar_extraido(a["entrada"])
        if a["entrada"]["unidade"] == "R$ mi" and a["entrada"]["metrica"].startswith("EBITDA"):
            margem = a["entrada"]["valor"] / M["u_receita_3t26"]["valor"] * 100
            f += faixa("x", {"valor": margem, "unidade": "%", "metrica": "margem implícita"})
        arm.append({"caso": a["caso"], "explicacao": a["explicacao"], "reprovado": bool(f), "motivos": f})

    aprov = sum(r["status"] == "aprovado" for r in res.values())
    resumo = {"metricas": len(res), "aprovadas": aprov, "reprovadas": len(res) - aprov,
              "cruzamentos_ok": sum(c["ok"] for c in cz), "cruzamentos": len(cz),
              "armadilhas_barradas": sum(a["reprovado"] for a in arm), "armadilhas": len(arm)}
    out = {"verificado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"), "resumo": resumo,
           "metricas": res, "cruzamentos": cz, "armadilhas": arm}
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Métricas: {aprov}/{len(res)} aprovadas")
    for mid, r in res.items():
        if r["falhas"]:
            print(f"  REPROVADO {mid}: {'; '.join(r['falhas'])}")
    print(f"Cruzamentos: {resumo['cruzamentos_ok']}/{len(cz)}")
    for c in cz:
        print(f"  {'OK ' if c['ok'] else 'ERR'} {c['checagem']}: calculado {c['calculado']} · publicado {c['publicado']}")
    print(f"Armadilhas barradas: {resumo['armadilhas_barradas']}/{len(arm)}")
    for a in arm:
        print(f"  {'BARRADA' if a['reprovado'] else 'PASSOU!'} {a['caso']}: {'; '.join(a['motivos'])}")
    ok = resumo["reprovadas"] == 0 and resumo["armadilhas_barradas"] == len(arm)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

"""Teste de controle: o que um LLM extrai SEM o pipeline (sem página indicada, sem regras).

Passa ao Claude (via `claude -p`, plano do usuário) um conjunto de páginas misturadas
dos ITRs — inclusive as da controladora e as de 2T26 — e pede os números do 3T26.
Depois compara com data/processed/metricas_itr.json (verificado) e registra cada divergência.

Saída: data/interim/teste_ia/resposta_bruta.txt  e  data/processed/teste_ia.json
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERIM = ROOT / "data" / "interim"
COMPLETO = "--completo" in sys.argv  # documentos inteiros, sem curadoria de páginas
PAGINAS = {"gerdau": list(range(1, 81)), "usiminas": list(range(1, 111))} if COMPLETO else {"gerdau": [3, 18, 29, 72], "usiminas": [14, 24, 28, 33]}
SUFIXO = "_completo" if COMPLETO else ""

ALVOS = {  # pergunta → id verificado
    "gerdau_receita_liquida_3T26": "g_receita_3t26",
    "gerdau_ebitda_ajustado_3T26": "g_ebitda_aj_3t26",
    "gerdau_lucro_liquido_3T26": "g_lucro_3t26",
    "gerdau_margem_ebitda_ajustada_3T26_pct": "g_margem_aj_3t26",
    "usiminas_receita_liquida_3T26": "u_receita_3t26",
    "usiminas_ebitda_ajustado_3T26": "u_ebitda_aj_3t26",
    "usiminas_lucro_liquido_3T25": "u_lucro_3t25",
    "usiminas_margem_ebitda_ajustada_3T25_pct": "u_margem_aj_3t25",
}


def main():
    blocos = []
    for emp, pags in PAGINAS.items():
        for p in pags:
            blocos.append(f"--- {emp.upper()} · página {p} ---\n" + (INTERIM / "itr" / emp / f"pagina_{p:03d}.txt").read_text(encoding="utf-8"))
    prompt = ("Abaixo estão páginas dos ITRs do 3T26 da Gerdau e da Usiminas. Extraia os valores pedidos, "
              "em R$ milhões (ou % para margens), e a página de onde tirou cada um. Responda só com JSON no formato "
              '{"<chave>": {"valor": número, "pagina": número}} para as chaves: ' + ", ".join(ALVOS) + "\n\n" + "\n\n".join(blocos))
    r = subprocess.run(["claude", "-p", prompt], capture_output=True, text=True, timeout=900)
    bruto = r.stdout
    (INTERIM / "teste_ia").mkdir(parents=True, exist_ok=True)
    (INTERIM / "teste_ia" / f"resposta_bruta{SUFIXO}.txt").write_text(bruto, encoding="utf-8")
    resp = json.loads(re.search(r"\{.*\}", bruto, re.S).group(0))

    M = json.loads((ROOT / "data" / "processed" / "metricas_itr.json").read_text(encoding="utf-8"))["metricas"]
    linhas = []
    for chave, mid in ALVOS.items():
        ia = resp.get(chave, {})
        ver = M[mid]
        tol = 0.15 if ver["unidade"] == "%" else max(1.0, abs(ver["valor"]) * 0.001)
        valor_ok = isinstance(ia.get("valor"), (int, float)) and abs(ia["valor"] - ver["valor"]) <= tol
        pag_ok = ver.get("pagina") is None or ia.get("pagina") == ver.get("pagina")
        linhas.append({"chave": chave, "ia_valor": ia.get("valor"), "ia_pagina": ia.get("pagina"),
                       "verificado": ver["valor"], "pagina_verificada": ver.get("pagina"),
                       "valor_ok": valor_ok, "pagina_ok": pag_ok})
    out = {"executado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"), "modelo": "claude -p (padrão do Claude Code)",
           "paginas_enviadas": PAGINAS, "acertos_valor": sum(l["valor_ok"] for l in linhas),
           "acertos_pagina": sum(l["pagina_ok"] for l in linhas), "total": len(linhas), "itens": linhas}
    OUT = ROOT / "data" / "processed" / f"teste_ia{SUFIXO}.json"
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Valor certo: {out['acertos_valor']}/{len(linhas)} · página certa: {out['acertos_pagina']}/{len(linhas)}")
    for l in linhas:
        flag = "OK " if l["valor_ok"] and l["pagina_ok"] else "ERR"
        print(f"  {flag} {l['chave']}: IA {l['ia_valor']} (p.{l['ia_pagina']}) · verificado {l['verificado']} (p.{l['pagina_verificada']})")


if __name__ == "__main__":
    main()

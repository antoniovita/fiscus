"""Etapa 6: sinais simples de sensibilidade da produção siderúrgica a variáveis macro.

Entrada: data/processed/macro.json (gerado por pipeline/05_macro.py)
Saída:   data/processed/sensibilidade.json

Método (também gravado no JSON):
  - Variável setorial (y): variação mês/mesmo mês do ano anterior (M/M-12, %) da PIM-PF,
    publicada pelo IBGE (não recalculada): 24.2 Siderurgia (principal), 3.24 Metalurgia e
    Indústria geral (comparação).
  - Variáveis macro (x), todas na mesma transformação de 12 meses, calculadas aqui:
      IBC-Br (SGS 24363, sem ajuste): variação % sobre o mesmo mês do ano anterior;
      câmbio (SGS 3698): variação % sobre o mesmo mês do ano anterior (alta = real mais fraco);
      Selic meta (SGS 432, fim do mês): variação em pontos percentuais em 12 meses; e o nível;
      minério de ferro (Banco Mundial, US$/t): variação % sobre o mesmo mês do ano anterior.
  - Janela: jan/2019 até o último mês comum a cada par. Defasagens de 0, 3 e 6 meses
    (x no mês t-k contra y no mês t).
  - Estatísticas: Pearson e Spearman (Pearson dos postos); n de observações; n efetivo
    aproximado pela correção de Bartlett para autocorrelação de 1ª ordem,
    n_eff = n (1 - r1x r1y) / (1 + r1x r1y); intervalo de 95% via Fisher-z com n_eff.
  - Robustez: mesma conta excluindo mar/2020 a dez/2021 (choque e efeito-base da pandemia).
"""
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"
INICIO = "2019-01"
LAGS = (0, 3, 6)
EXCLUIR = ("2020-03", "2021-12")


def serie(macro, sid) -> pd.Series:
    d = macro["series"][sid]["dados"]
    return pd.Series({pd.Period(x["data"], "M"): x["valor"] for x in d}).sort_index()


def var12_pct(s):
    s = s.asfreq("M")
    return (s / s.shift(12) - 1) * 100


def dif12(s):
    s = s.asfreq("M")
    return s - s.shift(12)


def pearson(a, b):
    return float(a.corr(b))


def spearman(a, b):
    return float(a.rank().corr(b.rank()))


def ac1(s):
    return float(s.autocorr(1))


def estat(y, x, lag, excluir=False):
    df = pd.concat({"y": y, "x": x.shift(lag)}, axis=1).dropna()
    df = df[df.index >= pd.Period(INICIO, "M")]
    if excluir:
        a, b = (pd.Period(v, "M") for v in EXCLUIR)
        df = df[(df.index < a) | (df.index > b)]
    n = len(df)
    if n < 12:
        return {"n": n, "erro": "observações insuficientes"}
    r = pearson(df["y"], df["x"])
    r1x, r1y = ac1(df["x"]), ac1(df["y"])
    neff = n * (1 - r1x * r1y) / (1 + r1x * r1y)
    out = {"periodo": f"{df.index[0]}..{df.index[-1]}", "n": n,
           "pearson": round(r, 3), "spearman": round(spearman(df["y"], df["x"]), 3),
           "autocorr_lag1_y": round(r1y, 3), "autocorr_lag1_x": round(r1x, 3),
           "n_efetivo_aprox": round(neff, 1)}
    if neff > 3 and abs(r) < 1:
        z, se = math.atanh(r), 1 / math.sqrt(neff - 3)
        out["ic95_pearson_aprox"] = [round(math.tanh(z - 1.96 * se), 3), round(math.tanh(z + 1.96 * se), 3)]
    return out


def main():
    macro = json.loads((PROC / "macro.json").read_text(encoding="utf-8"))
    ys = {
        "siderurgia_24.2": "pim_siderurgia_var_12m",
        "metalurgia_3.24": "pim_metalurgia_var_12m",
        "industria_geral": "pim_industria_geral_var_12m",
    }
    xs = {
        "ibcbr_var12m_pct": (var12_pct(serie(macro, "ibcbr")), "IBC-Br (SGS 24363), variação % 12 meses"),
        "cambio_var12m_pct": (var12_pct(serie(macro, "usdbrl_ptax_venda_media_mensal")),
                              "USD/BRL PTAX venda média mensal (SGS 3698), variação % 12 meses"),
        "selic_dif12m_pp": (dif12(serie(macro, "selic_meta")), "Selic meta fim do mês (SGS 432), variação em p.p. em 12 meses"),
        "selic_nivel": (serie(macro, "selic_meta").asfreq("M"), "Selic meta fim do mês (SGS 432), nível % a.a."),
        "minerio_var12m_pct": (var12_pct(serie(macro, "minerio_ferro_62fe_cfr_china")),
                               "Minério de ferro 62% Fe CFR China, Banco Mundial (US$/t), variação % 12 meses"),
    }
    # o mês corrente da Selic é parcial: não entra
    hoje = pd.Period(datetime.now().strftime("%Y-%m"), "M")
    for k in ("selic_dif12m_pp", "selic_nivel"):
        s, d = xs[k]
        xs[k] = (s[s.index < hoje], d)

    resultados = {}
    for yk, ysid in ys.items():
        y = serie(macro, ysid).asfreq("M")
        resultados[yk] = {}
        for xk, (x, _) in xs.items():
            resultados[yk][xk] = {
                f"lag_{L}": {"amostra_completa": estat(y, x, L), "sem_pandemia": estat(y, x, L, excluir=True)}
                for L in LAGS
            }

    saida = {
        "gerado_em": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "script": "pipeline/06_sensibilidade.py",
        "entrada": "data/processed/macro.json",
        "entrada_gerada_em": macro["gerado_em"],
        "metodo": (
            "Correlação de Pearson e de Spearman entre a variação mês/mesmo mês do ano anterior (M/M-12, %) "
            "da produção física da PIM-PF/IBGE (y; 24.2 Siderurgia como série principal, tabela 8885; "
            "3.24 Metalurgia e Indústria geral, tabela 8888, para comparação) e variáveis macro transformadas "
            "em 12 meses (x): IBC-Br sem ajuste sazonal (SGS 24363) em variação % 12m; câmbio USD/BRL PTAX "
            "venda média mensal (SGS 3698) em variação % 12m; Selic meta de fim de mês (SGS 432) em variação "
            "de p.p. em 12m e em nível; minério de ferro 62% Fe CFR China (Banco Mundial, US$/t) em variação "
            "% 12m. Janela mensal de jan/2019 até o último mês comum a cada par (o mês corrente da Selic, "
            "parcial, é excluído). Defasagens de 0, 3 e 6 meses (x em t-k contra y em t). n = número de "
            "meses pareados. Como variações de 12 meses se sobrepõem, as séries são muito autocorrelacionadas; "
            "por isso é informado um n efetivo aproximado (Bartlett, AR(1): n(1-r1x*r1y)/(1+r1x*r1y)) e um "
            "intervalo de 95% aproximado via Fisher-z usando esse n efetivo. Robustez: mesma conta excluindo "
            "mar/2020 a dez/2021 (choque e efeito-base da pandemia)."
        ),
        "variaveis_x": {k: d for k, (_, d) in xs.items()},
        "variaveis_y": {k: macro["series"][v]["nome"] for k, v in ys.items()},
        "resultados": resultados,
        "nota": (
            "Correlação não é causalidade. São associações estatísticas descritivas em uma amostra curta "
            "(cerca de 7 anos de dados mensais) e dominada por um choque único (pandemia, 2020-2021), com "
            "séries de 12 meses sobrepostas, o que reduz muito a informação efetiva (ver n_efetivo_aprox). "
            "Foram testadas várias combinações (3 setores x 5 variáveis x 3 defasagens x 2 amostras), então "
            "algumas correlações 'fortes' podem surgir por acaso. Variáveis como câmbio, Selic e atividade se "
            "movem juntas e respondem a fatores comuns; uma correlação com uma delas não isola o efeito dela. "
            "A produção física de siderurgia mede volume no Brasil, não receita, preço ou margem de Gerdau "
            "ou Usiminas, que dependem também de preços de aço, importações, custos e operações no exterior "
            "(no caso da Gerdau). Use como contexto, não como modelo de previsão."
        ),
    }
    (PROC / "sensibilidade.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    for yk in ys:
        print(f"== {yk}")
        for xk in xs:
            row = []
            for L in LAGS:
                a = resultados[yk][xk][f"lag_{L}"]["amostra_completa"]
                b = resultados[yk][xk][f"lag_{L}"]["sem_pandemia"]
                row.append(f"L{L}: r={a.get('pearson')} n={a['n']} neff={a.get('n_efetivo_aprox')} "
                           f"ic={a.get('ic95_pearson_aprox')} | s/pand r={b.get('pearson')} n={b['n']}")
            print(f"  {xk:20s} " + " || ".join(row))


if __name__ == "__main__":
    main()

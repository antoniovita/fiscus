# Roteiro de narração · Fiscus

Vídeo de entrega · Claude Lab PUC-Rio 2026 · Case 3 · duração 1:58 (118 s).

O vídeo já tem estas falas como legenda, nos mesmos tempos. Para gravar a voz: leia cada fala dentro da janela indicada (ritmo calmo, ~2,5 palavras por segundo). Gerado a partir de `src/captions.json` — se mudar o texto lá, rode `npm run roteiro` para atualizar este arquivo.

## Cena 1 · O problema

- **0:00–0:05** — Amanhã tem comitê. O diretor de research precisa comparar Gerdau e Usiminas no 3T26.
- **0:05–0:10** — Na mesa, dois ITRs: 80 páginas de um lado, 110 do outro.
- **0:10–0:15.5** — O erro clássico de IA em finanças não é ficar sem resposta. É o número errado, escrito com confiança.
- **0:15.5–0:20** — Como ler a holding no lugar do consolidado: um número 17 vezes menor, sem aviso nenhum.

## Cena 2 · A solução

- **0:20–0:23.5** — Fiscus: um painel que responde em etapas, e você aprova cada uma.
- **0:23.5–0:26.5** — No botão “+”, escolha o setor e as empresas: Gerdau e Usiminas viram etiquetas na pergunta.
- **0:26.5–0:34** — Etapa 1, a tese do setor. Veredito: Seletivo. O setor não paga o custo de capital; vale só onde há proteção fora do Brasil.
- **0:34–0:38.5** — Lado a lado, no mesmo critério: margem EBITDA ajustada de 20,2% na Gerdau e 9,0% na Usiminas.
- **0:38.5–0:43** — A América do Norte gera 77,2% do EBITDA da Gerdau, com margem de 27,7%. Na Usiminas, o prejuízo do 3T25 veio de um impairment de R$ 2.226 mi.
- **0:43–0:49** — Na aba de gráficos: a margem do 3T25 contra o 3T26 e a margem EBITDA anual de 2021 a 2025, da CVM.
- **0:49–0:51** — O diferencial: clique em qualquer número.
- **0:51–0:56** — EBITDA ajustado da Gerdau, R$ 3.770 mi: ITR página 72, trecho “3.770.176 2.736.858”, em R$ mil, consolidado.
- **0:56–1:01** — E um panorama de outros setores: nos bancos, a tabela da CVM e o ROE de 12 meses de cada um.
- **1:01–1:08** — Etapa 3, tese e preço-alvo: você ajusta as premissas e o Fiscus monta a recomendação.
- **1:08–1:14** — Etapa 4: a apresentação no formato research report, pronta para o comitê e exportada em PDF.
- **1:14–1:20** — Do PDF do ITR ao slide, sem nenhum número digitado à mão.

## Cena 3 · Como verificamos

- **1:20–1:26** — Como verificamos: um segundo programa relê cada página e confere trecho, unidade e critério consolidado.
- **1:26–1:32** — 85 de 85 números conferidos. 7 de 7 cruzamentos batem: a soma dos segmentos da Gerdau dá os mesmos R$ 3.770,2 mi.
- **1:32–1:36** — 3 de 3 armadilhas barradas: holding no lugar do consolidado, R$ mil lido como milhões, página errada.
- **1:36–1:40** — E o Claude, lendo os ITRs inteiros, acertou 8 de 8 valores e páginas.

## Cena 4 · Impacto e próximos passos

- **1:40–1:46** — Para quem leva um comparativo ao comitê e precisa defender cada número na hora da pergunta.
- **1:46–1:52** — Com mais um dia: a CSN assim que o ITR do 3T26 chegar à CVM, a Ferbasa e novos setores no mesmo pipeline.
- **1:52–1:58** — Fiscus. Cada número, até a página. Exercício acadêmico, não é recomendação de investimento.

## Fontes dos números ditos

- 80 e 110 páginas: `data/processed/teste_ia_completo.json` → `paginas_enviadas`.
- Holding 17 vezes menor (pág. 3): `data/processed/verificacao.json` → `armadilhas[0]`.
- Veredito “Seletivo” e frase: `app/data.json` → `SETOR.veredito`.
- Margem EBITDA ajustada 20,2% (Gerdau) e 9,0% / 6,6% (Usiminas): `app/data.json` → `MET.margem_aj`.
- 77,2% do EBITDA e margem de 27,7% na América do Norte: `data/processed/metricas_itr.json` → `g_peso_an_ebitda_3t26`, `g_margem_an_3t26`.
- Impairment de R$ 2.226 mi no 3T25 (pág. 28): `metricas_itr.json` → `u_impairment_3t25`; prejuízo de R$ 3.503 mi: `app/data.json` → `MET.lucro`.
- EBITDA ajustado R$ 3.770 mi, pág. 72, trecho “3.770.176 2.736.858”, R$ mil: `app/data.json` → `PROV["ebitda_aj|g|0"]`.
- 85/85, 7/7, 3/3: `verificacao.json` → `resumo`; soma dos segmentos = R$ 3.770,2 mi: `cruzamentos[0]`.
- Claude 8/8: `teste_ia_completo.json` → `acertos_valor`, `acertos_pagina`, `total`.
- Gráfico de margem EBITDA anual 2021–2025 (GGBR4, USIM5): `data/processed/historico.json` → `empresas.*.anos.*.margem_ebitda`.
- Menu “+” (contagem de empresas por setor) e panorama de bancos (tickers, P/L, P/VP, ROE 12m): `data/processed/setores/*.json` → `empresas`, `metricas.roe_12m`.
- Capa da apresentação sem recomendação, preço-alvo e potencial: dependem das premissas do usuário e não estão em JSON.
- CSN com dados do 2T26: `app/data.json` → `EMP.c.aviso`.

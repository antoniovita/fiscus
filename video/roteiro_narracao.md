# Roteiro de narração · Balanço Lado a Lado

Vídeo de entrega · Claude Lab PUC-Rio 2026 · Case 3 · duração 1:58 (118 s).

O vídeo já tem estas falas como legenda, nos mesmos tempos. Para gravar a voz: leia cada fala dentro da janela indicada (ritmo calmo, ~2,5 palavras por segundo). Gerado a partir de `src/captions.json` — se mudar o texto lá, rode `npm run roteiro` para atualizar este arquivo.

## Cena 1 · O problema

- **0:00–0:05** — Amanhã tem comitê. O diretor de research precisa comparar Gerdau e Usiminas no 3T26.
- **0:05–0:10** — Na mesa, dois ITRs: 80 páginas de um lado, 110 do outro.
- **0:10–0:15.5** — O erro clássico de IA em finanças não é ficar sem resposta. É o número errado, escrito com confiança.
- **0:15.5–0:20** — Como ler a holding no lugar do consolidado: um número 17 vezes menor, sem aviso nenhum.

## Cena 2 · A solução

- **0:20–0:24** — Balanço Lado a Lado: um painel que responde em etapas, e você aprova cada uma.
- **0:24–0:33** — Etapa 1, a tese do setor. Veredito: Seletivo. O setor não paga o custo de capital; vale só onde há proteção fora do Brasil.
- **0:33–0:42** — Etapa 2: das siderúrgicas listadas na B3, escolhemos duas, Gerdau e Usiminas.
- **0:42–0:48** — Lado a lado, no mesmo critério: margem EBITDA ajustada de 20,2% na Gerdau e 9,0% na Usiminas.
- **0:48–0:56** — A América do Norte gera 77,2% do EBITDA da Gerdau, com margem de 27,7%. Na Usiminas, o prejuízo do 3T25 veio de um impairment de R$ 2.226 mi.
- **0:56–1:01** — O diferencial: clique em qualquer número.
- **1:01–1:10** — EBITDA ajustado da Gerdau, R$ 3.770 mi: ITR página 72, trecho “3.770.176 2.736.858”, em R$ mil, consolidado.
- **1:10–1:15** — Etapa 3: dez slides prontos para o comitê, exportados em PDF.
- **1:15–1:20** — Do PDF do ITR ao slide, sem nenhum número digitado à mão.

## Cena 3 · Como verificamos

- **1:20–1:26** — Como verificamos: um segundo programa relê cada página e confere trecho, unidade e critério consolidado.
- **1:26–1:32** — 85 de 85 números conferidos. 7 de 7 cruzamentos batem: a soma dos segmentos da Gerdau dá os mesmos R$ 3.770,2 mi.
- **1:32–1:36** — 3 de 3 armadilhas barradas: holding no lugar do consolidado, R$ mil lido como milhões, página errada.
- **1:36–1:40** — E o Claude, lendo os ITRs inteiros, acertou 8 de 8 valores e páginas.

## Cena 4 · Impacto e próximos passos

- **1:40–1:46** — Para quem leva um comparativo ao comitê e precisa defender cada número na hora da pergunta.
- **1:46–1:52** — Com mais um dia: a CSN assim que o ITR do 3T26 chegar à CVM, a Ferbasa e novos setores no mesmo pipeline.
- **1:52–1:58** — Balanço Lado a Lado. Cada número, até a página. Exercício acadêmico, não é recomendação de investimento.

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
- CSN com dados do 2T26: `app/data.json` → `EMP.c.aviso`.

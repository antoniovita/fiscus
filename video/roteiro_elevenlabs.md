# Roteiro para o ElevenLabs · Fiscus

O vídeo `out/fiscus.mp4` tem 1:58. O texto abaixo foi escrito para o ElevenLabs ler em português do Brasil, em cerca de 1:55.

**Como usar**
- Escolha uma voz em português do Brasil, masculina ou feminina, com tom de apresentador sóbrio.
- Modelo: **Eleven Multilingual v2**. Ajustes sugeridos: Stability 50%, Similarity 75%, Style 15%, Speaker boost ligado.
- Cole o **texto corrido** (seção 1) de uma vez. As tags `<break time="…"/>` são pausas que o ElevenLabs entende.
- Se o áudio passar de 1:58, aumente a velocidade em 5% ou apague uma das pausas longas.
- Os números estão por extenso de propósito, para a leitura sair natural. Todos vêm dos dados verificados (veja `roteiro_narracao.md`).
- Siglas: se a voz soletrar mal, crie um dicionário de pronúncia com ITR = "i tê érre", CVM = "cê vê ême" e Ebitda = "ebítida".

---

## 1. Texto corrido (cole este)

Amanhã tem comitê. O diretor de research precisa comparar Gerdau e Usiminas no terceiro trimestre de 2026. <break time="0.4s"/> Na mesa, dois relatórios trimestrais: oitenta páginas de um lado, cento e dez do outro. <break time="0.5s"/> O erro clássico da inteligência artificial em finanças não é ficar sem resposta. <break time="0.3s"/> É o número errado, escrito com confiança. <break time="0.3s"/> Ler a holding no lugar do consolidado, por exemplo, dá um número dezessete vezes menor, sem aviso nenhum.

<break time="0.8s"/>

Este é o Fiscus. <break time="0.3s"/> Um painel que responde em etapas, e você aprova cada uma. <break time="0.3s"/> No botão de mais, você escolhe o setor e as empresas. <break time="0.4s"/> Primeiro, a tese do setor. O veredito para a siderurgia é seletivo: o setor não paga o custo de capital, e só vale onde há proteção fora do Brasil. <break time="0.5s"/> Depois, o comparativo, no mesmo critério contábil. A margem Ebitda ajustada é de vinte vírgula dois por cento na Gerdau e de nove por cento na Usiminas. <break time="0.3s"/> A América do Norte gera setenta e sete por cento do Ebitda da Gerdau. <break time="0.3s"/> E os gráficos mostram como as margens mudaram de 2021 até hoje. <break time="0.5s"/> O diferencial é que qualquer número pode ser clicado. <break time="0.3s"/> O Ebitda ajustado da Gerdau, de três bilhões e setecentos e setenta milhões de reais, abre a página setenta e dois do ITR, com o trecho exato do documento. <break time="0.5s"/> O Fiscus também mostra o panorama de outros setores, como bancos, energia e varejo. <break time="0.4s"/> Na etapa de valuation, você escolhe as premissas e o Fiscus calcula o preço-alvo e a recomendação. <break time="0.3s"/> No fim, a apresentação sai pronta para o comitê, em formato de research report, e é exportada em PDF. <break time="0.4s"/> Do documento oficial ao slide, sem nenhum número digitado à mão.

<break time="0.8s"/>

Como sabemos que está certo? <break time="0.3s"/> Um segundo programa relê cada página e confere o trecho, a unidade e o critério. <break time="0.3s"/> Foram oitenta e cinco de oitenta e cinco números conferidos e sete de sete cruzamentos com os números publicados pelas próprias empresas. <break time="0.3s"/> As três armadilhas clássicas foram barradas: holding no lugar do consolidado, milhar lido como milhão e página errada. <break time="0.3s"/> E o Claude, lendo os relatórios inteiros, acertou oito de oito valores.

<break time="0.8s"/>

O Fiscus é para quem leva um comparativo ao comitê e precisa defender cada número na hora da pergunta. <break time="0.4s"/> Com mais tempo, ele cobre novos setores no mesmo pipeline verificado. <break time="0.5s"/> Fiscus: cada número, até a página. <break time="0.4s"/> Exercício acadêmico. Não é recomendação de investimento.

---

## 2. Por cena, com o tempo de cada trecho no vídeo

Use esta versão se preferir gerar um áudio por cena e alinhar no editor.

| Tempo | Cena | Fala |
|---|---|---|
| 0:00–0:20 | 1 · O problema | "Amanhã tem comitê… sem aviso nenhum." |
| 0:20–0:34 | 2 · Fiscus e a tese do setor | "Este é o Fiscus… só vale onde há proteção fora do Brasil." |
| 0:34–0:49 | 2 · Comparativo e gráficos | "Depois, o comparativo… de 2021 até hoje." |
| 0:49–0:56 | 2 · Clique no número | "O diferencial… com o trecho exato do documento." |
| 0:56–1:01 | 2 · Outros setores | "O Fiscus também mostra o panorama… energia e varejo." |
| 1:01–1:20 | 2 · Valuation e apresentação | "Na etapa de valuation… sem nenhum número digitado à mão." |
| 1:20–1:40 | 3 · Como verificamos | "Como sabemos que está certo?… acertou oito de oito valores." |
| 1:40–1:58 | 4 · Impacto | "O Fiscus é para quem… Não é recomendação de investimento." |

## 3. Fontes dos números falados

- **Oitenta e cento e dez páginas:** `data/processed/teste_ia_completo.json`.
- **Dezessete vezes menor:** `data/processed/verificacao.json`, armadilha da holding.
- **Vinte vírgula dois e nove por cento:** `app/data.json`, `MET.margem_aj`.
- **Setenta e sete por cento:** `metricas_itr.json`, `g_peso_an_ebitda_3t26`, que vale 77,2.
- **Três bilhões e setecentos e setenta milhões, página setenta e dois:** `app/data.json`, `PROV["ebitda_aj|g|0"]`.
- **Oitenta e cinco de oitenta e cinco, sete de sete e três de três:** `verificacao.json`.
- **Oito de oito:** `teste_ia_completo.json`.

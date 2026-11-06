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

Amanhã tem comitê. O diretor de research precisa comparar Gerdau e Usiminas no terceiro trimestre. <break time="0.3s"/> Na mesa, dois relatórios: oitenta páginas de um lado, cento e dez do outro. <break time="0.3s"/> O erro clássico da inteligência artificial em finanças é o número errado, escrito com confiança. Ler a holding no lugar do consolidado dá um número dezessete vezes menor.

<break time="0.6s"/>

Este é o Fiscus. <break time="0.2s"/> Você escolhe o setor e as empresas, e o painel responde em etapas. <break time="0.2s"/> Primeiro, a tese: a siderurgia é seletiva. O setor não paga o custo de capital, e só vale onde há proteção fora do Brasil. <break time="0.3s"/> Depois, o comparativo no mesmo critério: margem Ebitda ajustada de vinte vírgula dois por cento na Gerdau e de nove por cento na Usiminas. A América do Norte gera setenta e sete por cento do Ebitda da Gerdau. <break time="0.3s"/> E qualquer número pode ser clicado: o Ebitda da Gerdau abre a página setenta e dois do ITR, com o trecho exato. <break time="0.3s"/> Outros setores, como bancos e energia, já têm panorama. <break time="0.2s"/> No valuation, você escolhe as premissas e o Fiscus calcula o preço-alvo. <break time="0.2s"/> No fim, a apresentação sai pronta para o comitê, em PDF.

<break time="0.6s"/>

Como sabemos que está certo? <break time="0.2s"/> Um segundo programa relê cada página. Foram oitenta e cinco de oitenta e cinco números conferidos, sete de sete cruzamentos com as empresas e três de três armadilhas barradas. <break time="0.2s"/> E o Claude, lendo os relatórios inteiros, acertou oito de oito.

<break time="0.6s"/>

O Fiscus é para quem precisa defender cada número na hora da pergunta. <break time="0.3s"/> Fiscus: cada número, até a página. <break time="0.3s"/> Exercício acadêmico, não é recomendação de investimento.

---

## 2. Por cena, com o tempo de cada trecho no vídeo

Use esta versão se preferir gerar um áudio por cena e alinhar no editor.

| Tempo | Cena | Fala |
|---|---|---|
| 0:00–0:20 | 1 · O problema | "Amanhã tem comitê… sem aviso nenhum." |
| 0:20–0:34 | 2 · Fiscus e a tese do setor | "Este é o Fiscus… proteção fora do Brasil." |
| 0:34–0:49 | 2 · Comparativo | "Depois, o comparativo… do Ebitda da Gerdau." |
| 0:49–0:56 | 2 · Clique no número | "E qualquer número pode ser clicado… com o trecho exato." |
| 0:56–1:01 | 2 · Outros setores | "Outros setores, como bancos e energia, já têm panorama." |
| 1:01–1:20 | 2 · Valuation e apresentação | "No valuation… pronta para o comitê, em PDF." |
| 1:20–1:40 | 3 · Como verificamos | "Como sabemos que está certo?… acertou oito de oito." |
| 1:40–1:58 | 4 · Impacto | "O Fiscus é para quem… não é recomendação de investimento." |

## 3. Fontes dos números falados

- **Oitenta e cento e dez páginas:** `data/processed/teste_ia_completo.json`.
- **Dezessete vezes menor:** `data/processed/verificacao.json`, armadilha da holding.
- **Vinte vírgula dois e nove por cento:** `app/data.json`, `MET.margem_aj`.
- **Setenta e sete por cento:** `metricas_itr.json`, `g_peso_an_ebitda_3t26`, que vale 77,2.
- **Página setenta e dois:** `app/data.json`, `PROV["ebitda_aj|g|0"]`.
- **Oitenta e cinco de oitenta e cinco, sete de sete e três de três:** `verificacao.json`.
- **Oito de oito:** `teste_ia_completo.json`.

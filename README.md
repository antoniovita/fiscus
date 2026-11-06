# Fiscus — Case 3: Comparativo de resultados (Gerdau × Usiminas, 3T26)

> Claude Lab · Economia & Finanças · PUC-Rio · 06/11/2026

**Artefato público:** https://claude.ai/artifact/D3PhJmUf6zBdb3waQL6mqh
**Vídeo (1:58, com narração):** [PREENCHER: link do YouTube não listado ou Drive] · arquivo no repositório: [`video/out/fiscus_com_narracao.mp4`](video/out/fiscus_com_narracao.mp4)
**Código:** https://github.com/antoniovita/fiscus

> **Atenção antes de enviar:** o artefato nasce privado. É preciso deixar o link **público** (compartilhamento de "qualquer pessoa com o link") e abrir numa aba anônima para confirmar que abre sem login.

## Equipe

| Nome | Curso / período | Papel no projeto | LinkedIn / GitHub |
|---|---|---|---|
| [PREENCHER] | [PREENCHER] | [PREENCHER] | [PREENCHER] |
| [PREENCHER] | [PREENCHER] | [PREENCHER] | [PREENCHER] |
| [PREENCHER] | [PREENCHER] | [PREENCHER] | [PREENCHER] |
| [PREENCHER] | [PREENCHER] | [PREENCHER] | [PREENCHER] |

## O problema

O diretor de Research precisa levar ao comitê de investimentos uma comparação entre Gerdau e Usiminas no 3T26. A fonte oficial são os ITRs: PDFs de 80 (Gerdau) e 110 (Usiminas) páginas, com demonstrações da holding e do consolidado misturadas, unidades diferentes (R$ mil e R$ milhões) e EBITDA "ajustado" com critérios próprios. Ler, conferir e montar slides com a página de cada número leva dias. Um número errado na frente do comitê custa a credibilidade do time.

## A solução

Um painel web com uma conversa guiada que termina numa apresentação pronta para o comitê. **Todo número que aparece na tela é clicável e mostra de onde saiu.**

O fluxo do usuário, numa conversa no estilo do Claude:

1. **Conta.** O usuário cria uma conta local, escolhendo nome, função, instituição e plano (Analista, R$ 110, ou Research Pro, R$ 150; tudo simulado, sem pagamento). Depois disso, ele entra pela lista de contas deste navegador. Cada conta tem seu próprio histórico de análises.
2. **Setor.** O painel pergunta o setor num card: siderurgia (análise completa) ou bancos, energia elétrica, petróleo e gás, mineração e varejo (panorama, com 44 empresas no total).
3. **Tese do setor.**
   - Na siderurgia: veredito ("Seletivo"), sensibilidade a juros, importação, câmbio, atividade e minério, e os 8 pontos da tese com fontes.
   - Nos outros setores: veredito preliminar calculado com as medianas do setor contra a Selic.
4. **Empresas.** Um card lista todas as empresas do setor que estão na base; o usuário escolhe duas. Também é possível usar o botão **+** da caixa de composição, que abre setores → empresas.
5. **Métricas e comparativo** (siderurgia), em abas:
   - Resumo, com gráficos;
   - KPIs;
   - Histórico 2021–2025, com linhas de margem e ROE;
   - Modelo de negócio;
   - Múltiplos;
   - Qualitativo.

   Nos outros setores, o comparativo é lado a lado, com os dados da CVM e da B3 e gráficos.
6. **Tese e preço-alvo** (siderurgia). DCF com as premissas do usuário: T-bond de 10 anos e Selic entram como dados; risco-país, prêmio de risco, beta, crescimento e capex de manutenção são sugestões ajustáveis. O painel mostra a sensibilidade WACC × g, a ponte do valor da empresa até o valor do acionista e a recomendação (compra, neutro ou venda).
7. **Apresentação de até 15 slides** no estilo research report, inspirada em relatórios do CFA Research Challenge e da Poli Finance, exportável em PDF:
   - capa com a recomendação e o preço-alvo;
   - tese em 3 pilares;
   - a empresa em uma página;
   - setor;
   - comparativo;
   - valuation;
   - verificação;
   - conclusão.

Outros recursos:

- **Origem de cada número.** Ao clicar num valor, abre um painel com a origem: página e trecho do ITR, unidade original e critério; ou conta da CVM e arquivo; ou arquivo da B3; ou a fórmula com os insumos.
- **O modelo nunca escreve números.** O Claude do próprio usuário (capability do Artifact) escolhe o que mostrar com a ferramenta `mostrar_metricas` e escreve títulos e argumentos sem dígitos. O app descarta qualquer texto do modelo que contenha números.
- **Histórico 1:1 com a conversa**, por conta. É possível editar e reenviar mensagens.
- **Modo demonstração:** sem a capability do Claude, o painel continua funcionando, com textos padrão e busca por palavra-chave.
- **Landing institucional** (`#inicio`), com problema, solução, diferenciais, para quem, metodologia, cobertura, fontes e planos. O painel fica em `#painel`.

[PREENCHER: prints da tela inicial, do painel de origem de um número e de um slide]

## Como funciona

```
PDFs dos ITRs ──► 01 texto por página ──► 02 métricas declarativas (página + linha) ──► 03 verificador independente ─┐
CVM Dados Abertos + B3 COTAHIST ──► 04 contábil 12m, ROE, ROIC, múltiplos (+ cruzamento com o PDF) ──────────────────┤
BCB SGS + IBGE SIDRA + Banco Mundial ──► 05 séries macro ──► 06 sensibilidade da produção siderúrgica ─────────────────┼──► 08 empacota no app (index.html)
Fontes setoriais (Aço Brasil, worldsteel, MDIC, SEC) ──► data/processed/setor.json ──────────────────────────────────┤
07 teste de controle: Claude extraindo sozinho, comparado ao verificado ───────────────────────────────────────────┘
```

A divisão de trabalho entre o Claude e o código é a ideia central:

- **O Claude decide onde olhar.** Com ele, o time escolheu a página e a linha de cada número (ex.: "Gerdau, pág. 29, linha `3.01 Receita de Venda`, coluna 0 = 3T26").
- **O código lê o número.** O script abre o texto daquela página, acha a linha e lê o valor. Nenhum valor é digitado.
- **Outro script confere.** O verificador relê as páginas sem confiar no extrator.
- **O app não tem número próprio.** Tudo vem dos JSONs verificados, com a origem anexada.

Detalhes técnicos e fórmulas: [docs/metodologia.md](docs/metodologia.md).

## Dados usados

| Dado | Fonte | Data dos dados | Arquivo |
|---|---|---|---|
| ITR 3T26 Gerdau (80 págs.) e Usiminas (110 págs.) | Repositório do case (empresas/CVM) | Trimestre até 30/09/2026 | `data/raw/itr/*.pdf` (sha256 em `metricas_itr.json`) |
| DRE, BP, DFC e composição do capital (Gerdau, Usiminas, CSN) | CVM Dados Abertos: ITR 2026, ITR 2025, DFP 2025, cadastro | Zips com Last-Modified 01/11/2026; consulta em 06/11/2026 | `data/raw/cvm/` |
| Preço de fechamento (GGBR4, GGBR3, GOAU4, USIM5, USIM3, CSNA3) | B3 Séries Históricas, COTAHIST diário (PREULT) | Pregão de 05/11/2026 | `data/raw/mercado/COTAHIST_D05112026.ZIP` |
| Conferência de preço | Yahoo Finance (só conferência, não é fonte primária) | 05/11/2026 | `data/raw/mercado/yahoo_*.json` |
| Selic meta, PTAX, IPCA, IBC-Br | BCB SGS (432, 3698, 433, 13522, 24363, 24364) | Jan/2018 até: Selic nov/2026; PTAX out/2026; IPCA set/2026; IBC-Br ago/2026 | `data/raw/bcb/` |
| Produção física (siderurgia 24.2, metalurgia, indústria geral) | IBGE SIDRA, PIM-PF (tabelas 8885 e 8888) | Jan/2018 a set/2026 | `data/raw/ibge/` |
| Minério de ferro 62% Fe CFR China | Banco Mundial, Pink Sheet mensal | Jan/2018 a out/2026 | `data/raw/mercado/worldbank_CMO-Historical-Data-Monthly.xlsx` |
| Setor: produção, capacidade, importações, regulação | Aço Brasil, worldsteel, MDIC/Gecex, DOU, Casa Branca, Comissão Europeia, releases na SEC | Consulta em 06/11/2026 | `data/raw/setor/`, lista completa em [docs/fontes_setor.md](docs/fontes_setor.md) |
| Logotipos | Wikimedia Commons (domínio público) | Consulta em 06/11/2026 | `data/raw/logos/fontes.json` |

Cada arquivo baixado tem um `.meta.json` com URL, data da consulta e sha256.

**Por que a CSN entrou:** como terceira opção do comparativo. Mas a CVM só tem o ITR da CSN até 30/06/2026 (2T26), e o release do 3T26 ainda não estava na SEC em 06/11/2026. O app avisa isso na tela e marca o período em cada número.

### Cuidados do case

| Cuidado | Como tratamos |
|---|---|
| 1. Holding ≠ consolidado | Todo número de DRE e BP vem das páginas consolidadas (Gerdau págs. 26–30; Usiminas págs. 12–14). O verificador reprova se a página não for consolidada. A armadilha "receita da holding" (R$ 1.078,8 mi na pág. 18, cerca de 17 vezes menor que o consolidado) é barrada. |
| 2. Contábil ≠ ajustado | Usamos os dois e dizemos qual é qual. "EBITDA ajustado" é o da companhia (Gerdau nota 22, pág. 72; Usiminas release, pág. 28). "EBITDA (CVM 156)" é contábil, calculado igual para as três: EBIT + D&A. Quando a CSN está no comparativo, o app usa só o CVM 156, porque não há ajustado da CSN no mesmo período. |
| 3. Efeitos pontuais | A Usiminas teve impairment de R$ 2.226,3 mi no 3T25 (pág. 28). Por isso o lucro do 3T25 foi prejuízo de R$ 3.503,3 mi (pág. 14), e a variação anual do lucro é marcada "n.s." (base negativa). O EBITDA ajustado exclui o impairment. No contábil (CVM 156), o EBITDA da Usiminas no 3T25 foi negativo (−R$ 1.747,2 mi). |
| 4. T/T ≠ A/A | Todas as variações calculadas são A/A (3T26 contra 3T25) e têm o rótulo "Variação A/A". Não calculamos T/T (ver limitações). Na CSN, a comparação é 2T26 contra 2T25. |
| 5. Unidades | Tudo é convertido para R$ milhões a partir da unidade original, que fica gravada em cada número (`unidade_original`, `valor_como_aparece`). O verificador confere a escala. A armadilha "R$ mil lido como R$ milhões" é barrada. |
| 6. Negócios diferentes | A Gerdau é separada por segmento (Brasil, América do Norte, América do Sul) e a Usiminas por unidade (siderurgia e mineração). A comparação justa no Brasil é Gerdau Brasil contra siderurgia da Usiminas. |
| 7. Não é recomendação | Aviso no rodapé de todos os slides e neste README. |

## Como verificamos os resultados

Resumo (de `data/processed/verificacao.json`, `financeiro.json`, `macro.json`, `teste_ia.json` e `teste_ia_completo.json`):

| Checagem | Resultado |
|---|---|
| Métricas do ITR aprovadas pelo verificador independente | **85 de 85** (56 extraídas + 29 calculadas) |
| Cruzamentos com números que a própria companhia publica | **7 de 7** |
| Armadilhas (entradas erradas plantadas) barradas | **3 de 3** |
| Números do PDF iguais aos da base da CVM | **8 de 8**, diferença zero |
| Validações das séries macro (PTAX e IPCA contra outra fonte) | **3 de 3** |
| Preços da B3 iguais à conferência do Yahoo | 6 de 6 tickers |
| Teste de controle: Claude sozinho, páginas curadas | 8 de 8 valores certos |
| Teste de controle: Claude sozinho, documentos inteiros | 8 de 8 valores certos |

### 1. O verificador independente (`pipeline/03_verificar.py`)

Ele não confia no extrator. Para cada número:

1. o trecho existe na página indicada e contém o valor;
2. o valor convertido bate com o valor como aparece no PDF (escala R$ mil → R$ mi);
3. números de DRE e BP vêm de página consolidada, nunca da controladora;
4. faixas plausíveis (margem entre −50% e 80%, volume positivo, receita por tonelada entre R$ 1 mil e R$ 20 mil);
5. toda métrica calculada é recalculada a partir dos insumos.

Se qualquer item reprova, o script sai com erro e o `make` para.

### 2. Cruzamentos com a própria companhia (7 de 7)

| Checagem | Calculado | Publicado | Fonte |
|---|---|---|---|
| Gerdau: soma dos segmentos menos eliminações = EBITDA ajustado consolidado | 3.770,2 | 3.770,2 | ITR Gerdau, pág. 72 |
| Gerdau: receita da nota de segmentos = receita da DRE consolidada | 18.690,5 | 18.690,5 | págs. 72 × 29 |
| Usiminas: margem EBITDA ajustada 3T26 | 9,00% | 9,0% | pág. 28 |
| Usiminas: margem EBITDA ajustada 3T25 | 6,57% | 6,6% | pág. 28 |
| Usiminas: EBITDA CVM 156 − equivalência + EBITDA de controladas em conjunto = ajustado | 558,0 | 558,0 | pág. 28 |
| Usiminas: siderurgia + mineração + ajustes = EBITDA ajustado | 558 | 558 | pág. 33 |
| Usiminas: dívida líquida calculada pelo BP vs. reportada no release | −566,0 | −471,0 | págs. 12–13 × 24 |

Valores em R$ milhões. O último cruzamento passa dentro da tolerância de R$ 150 mi, mas **a diferença de R$ 95 mi não foi reconciliada item a item**: nossa dívida líquida usa só empréstimos, debêntures, caixa e aplicações de curto prazo; a definição da companhia pode incluir outros itens. Por isso o app mostra a nossa conta e a da empresa separadas.

### 3. As armadilhas (3 de 3 barradas)

Para provar que o verificador funciona, plantamos três entradas erradas e plausíveis. Ele tinha de reprovar todas:

| Armadilha | Por que reprovou |
|---|---|
| Receita da holding da Gerdau (R$ 1.078,8 mi, pág. 18) no lugar do consolidado | "página não é consolidada" |
| EBITDA da Usiminas em R$ mil lido como R$ milhões (558.017 em vez de 558,0) | escala não bate e a margem implícita ficaria em torno de 8.997% |
| EBITDA ajustado da Gerdau citado na pág. 71 em vez da 72 | "trecho não encontrado na página" |

Essas armadilhas foram criadas pelo time, a partir dos erros mais comuns de leitura de ITR que o case aponta. Elas não são erros que o Claude cometeu neste projeto.

[PREENCHER: se o time anotou erros reais do Claude ou do extrator durante o dia (página errada, coluna trocada, unidade), descrevê-los aqui com o antes e o depois.]

### 4. Cruzamento ITR × CVM (8 de 8)

Receita e lucro consolidado do 3T26 e do 3T25 das duas empresas, lidos do PDF, foram comparados aos CSVs da CVM Dados Abertos. Diferença zero nos 8 (`financeiro.json`, campo `cruzamento_pdf_itr`). Exemplo: receita da Gerdau no 3T26 = 18.690.518 (R$ mil) nos dois.

Observação: o EBITDA CVM 156 da Usiminas no 3T26 calculado pela base da CVM (R$ 588.042 mil) difere em R$ 3 mil do publicado na pág. 28 (R$ 588.039 mil). A diferença vem da D&A (235.660 na CVM contra 235.657 no release) e não muda nenhuma conclusão.

### 5. Teste de controle: o Claude sozinho acerta? (`pipeline/07_teste_ia.py`)

Pedimos ao Claude (`claude -p`), **sem o pipeline**, os 8 números principais do 3T26, com a página de cada um. Fizemos duas versões:

- **páginas curadas:** 8 páginas misturadas, incluindo a da holding da Gerdau (pág. 3 e pág. 18) para tentar confundir;
- **documentos inteiros:** as 80 páginas da Gerdau e as 110 da Usiminas.

**Resultado honesto: o Claude acertou 8 de 8 valores nas duas versões.** Ele não caiu na armadilha da holding e citou a página certa nos 6 números extraídos. Nas duas margens, a página não foi testada, porque margem é cálculo e não tem página única (o script marca como certa por padrão).

O que isso significa: neste trimestre e com esses documentos, a IA leu bem. **Mesmo assim, o número que vai para o comitê não depende de a IA acertar.** Quem garante é o verificador, que confere cada número contra a página e para o processo se algo não bate. O teste mostra que a IA é boa para achar onde olhar; o verificador garante que o que foi achado está certo. Um teste com 8 números num trimestre não prova que a IA acerta sempre.

## Principais achados

Todos os valores em R$ milhões, consolidados, salvo indicação. Variações são A/A (3T26 contra 3T25).

| Métrica | Gerdau | Usiminas | Fonte |
|---|---|---|---|
| Receita líquida 3T26 | 18.690,5 (+3,9%) | 6.202,4 (−6,1%) | Gerdau pág. 29; Usiminas pág. 14 |
| EBITDA ajustado 3T26 | 3.770,2 (+37,8%) | 558,0 (+28,5%) | Gerdau pág. 72; Usiminas pág. 28 |
| Margem EBITDA ajustada 3T26 | 20,2% (+4,95 p.p.) | 9,0% (+2,43 p.p.) | cálculo sobre as págs. acima |
| Lucro líquido consolidado 3T26 | 1.563,1 (+43,4%) | 243,4 (3T25: −3.503,3; variação n.s.) | Gerdau pág. 29; Usiminas pág. 14 |
| Margem líquida 3T26 | 8,4% | 3,9% | cálculo |
| Dívida líquida em 30/09/2026 | 7.685,8 | −566,0 (caixa líquido) | Gerdau págs. 26–27; Usiminas págs. 12–13 |
| Dívida líquida / EBITDA 12m (CVM 156) | 0,79x | −0,23x | CVM Dados Abertos |

**1. Gerdau ganha em margem, não só em tamanho.** A margem EBITDA ajustada foi de 20,2% contra 9,0% da Usiminas. Os dois melhoraram contra o 3T25, mas a Gerdau mais (+4,95 p.p. contra +2,43 p.p.).

**2. O resultado da Gerdau vem dos EUA.** A América do Norte gerou 77,2% do EBITDA ajustado consolidado no 3T26 (R$ 2.911,3 mi), com margem de 27,7% e alta de 60,0% no EBITDA contra o 3T25 (ITR Gerdau, pág. 72). No Brasil, a receita caiu 9,7% e o EBITDA caiu 2,8%, com margem de 10,7%. No mix por segmento mostrado no app (soma dos segmentos, sem eliminações), a América do Norte aparece com 76%.

**3. No Brasil, as duas estão parecidas.** A margem da Gerdau Brasil (10,7%, pág. 72) é próxima da margem da siderurgia da Usiminas (9,6%: R$ 538 mi de EBITDA ajustado sobre R$ 5.610 mi de receita, pág. 33). A mineração da Usiminas quase não gerou caixa no trimestre (R$ 19 mi de EBITDA sobre R$ 668 mi de receita, pág. 33).

**4. A Usiminas vende menos.** Volume de aço de 1.034 mil t (−6,3%) e de minério de 2.014 mil t (−19,5%) contra o 3T25 (pág. 24). Quase tudo no mercado interno: 979 mil t, contra 55 mil t exportadas (pág. 36). Receita por tonelada na siderurgia: R$ 5.426/t (cálculo).

**5. O 3T25 da Usiminas engana.** O impairment de R$ 2.226,3 mi (pág. 28) derrubou o lucro do 3T25. Comparar o lucro do 3T26 com ele não faz sentido; por isso a variação aparece como "n.s.".

**6. Nenhuma remunera o capital acima da Selic.** Com a Selic meta em 13,75% ao ano (BCB SGS 432):

| 12 meses | Gerdau (até 30/09/2026) | Usiminas (até 30/09/2026) | CSN (até 30/06/2026) |
|---|---|---|---|
| ROE | 5,0% | 6,9% | −20,2% |
| ROIC | 6,4% | 4,0% | 4,3% |

**7. O mercado já precifica isso.** Preço de fechamento de 05/11/2026 (B3) e contábil de 12 meses (CVM):

| Múltiplo | Gerdau | Usiminas | CSN (contábil 2T26) |
|---|---|---|---|
| EV / EBITDA (CVM 156) | 5,4x | 3,3x | 6,2x |
| P / VP | 0,82x | 0,28x | 0,44x |
| P / L | 16,5x | 4,0x | não se aplica (prejuízo em 12m) |
| Dívida líquida / EBITDA | 0,79x | −0,23x | 5,06x |

O P/VP abaixo de 1x nas três é coerente com retorno abaixo do custo de capital (interpretação do time). O P/L engana em setor cíclico: o lucro de 12 meses da Gerdau inclui o 4T25, quando o lucro consolidado implícito foi negativo (exercício 2025 de R$ 1.418,4 mi menos 9M25 de R$ 2.712,2 mi, `financeiro.json`); o da Usiminas já não inclui o impairment do 3T25. Por isso o app destaca EV/EBITDA e ROIC, não P/L.

**8. A tese do setor (opinião do time, com fontes no app).** Veredito "Seletivo": a produção brasileira de aço está parada há uma década (33,4 Mt em 2025, Aço Brasil), cerca de um terço da capacidade está ociosa e o aço importado limita o preço (20,8% do consumo aparente em 2025). A proteção forte está nos EUA (Section 232, tarifa de 50% desde 04/06/2025), onde a Gerdau produz. Por isso a empresa sugerida para a próxima análise é a Gerdau.

## Como reproduzir

Requisitos: Python 3, `make`, internet (CVM, B3, BCB, IBGE, Banco Mundial). Para o teste de controle, o Claude Code instalado (`claude` no terminal).

```bash
make setup   # cria .venv e instala requirements.txt (pdfplumber, pandas, requests)
make tudo    # refaz o pipeline do PDF ao app: itr → verificar → mercado → historico → setores → macro → app
make teste-ia   # opcional: teste de controle com o Claude (não faz parte do "tudo")
```

Os PDFs dos ITRs precisam estar em `data/raw/itr/` (vêm do repositório do case, `data/case3_resultados/itrs/`).

| Alvo | Script | O que faz | Saída |
|---|---|---|---|
| `itr` | `01_extrair_itr.py` | Extrai o texto de cada página dos PDFs com pdfplumber e grava o sha256 de cada PDF | `data/interim/itr/<empresa>/pagina_NNN.txt`, `manifest.json` |
| `itr` | `02_metricas_itr.py` | Lê cada métrica da página e linha declaradas; calcula margens, dívida líquida e variações A/A | `data/processed/metricas_itr.json` |
| `verificar` | `03_verificar.py` | Verificação independente, cruzamentos e armadilhas; falha o build se algo reprovar | `data/processed/verificacao.json` |
| `mercado` | `04_cvm_mercado.py` | Baixa CVM Dados Abertos e COTAHIST da B3; calcula 12 meses, ROE, ROIC, dívida líquida/EBITDA, valor de mercado, EV/EBITDA, P/VP e P/L; cruza PDF × CVM. Use `--refresh` para baixar tudo de novo | `financeiro.json`, `mercado.json` |
| `macro` | `05_macro.py` | Baixa séries do BCB, IBGE e Banco Mundial; valida PTAX e IPCA contra outra fonte | `macro.json` |
| `macro` | `06_sensibilidade.py` | Correlações da produção siderúrgica com IBC-Br, câmbio, Selic e minério | `sensibilidade.json` |
| `teste-ia` | `07_teste_ia.py` (e `--completo`) | Pede os números ao Claude sem o pipeline e compara com o verificado | `teste_ia.json`, `teste_ia_completo.json` |
| `app` | `08_build_app.py` | Junta os JSONs verificados, com a origem de cada número, e embute no HTML | `app/data.json`, `app/index.html` |
| `historico` | `09_historico_dcf.py` | DFP 2021–2025 da CVM (receita, margens, lucro, FCF, ROE, alavancagem) e base de 12 meses para o DCF, com capex real | `historico.json`, `valuation_base.json` |
| `setores` | `setores/*.py` | Panorama de 44 empresas em 5 setores, a partir da CVM e da B3 | `data/processed/setores/*.json` |
| `video` | `video/` (Remotion) | Vídeo de 1:58 com legendas; a narração do ElevenLabs é juntada com ffmpeg | `video/out/fiscus_com_narracao.mp4` |

O `data/processed/setor.json` (tópicos do setor) foi montado com o Claude a partir das fontes listadas em [docs/fontes_setor.md](docs/fontes_setor.md), com cópia local de cada fonte em `data/raw/setor/`. Ele não é gerado por um script do pipeline.

O `app/index.html` é o arquivo publicado como Artifact no claude.ai.

### Estrutura de pastas

```
fiscus/
├── README.md · Makefile · requirements.txt
├── pipeline/                01–09, um script por etapa; setores/ com um script por setor
├── data/
│   ├── raw/                 fontes brutas, cada uma com .meta.json (URL, data, sha256)
│   │   ├── itr/             PDFs dos ITRs
│   │   ├── cvm/             cadastro e metadados da CVM (zips fora do git; o pipeline baixa)
│   │   ├── mercado/         COTAHIST da B3, conferência Yahoo, Pink Sheet do Banco Mundial
│   │   ├── bcb/ ibge/       séries macro
│   │   ├── treasury/        curva de juros do Tesouro dos EUA (T-bond de 10 anos)
│   │   ├── setor/           relatórios e normas do setor
│   │   └── logos/           logotipos das empresas (domínio público)
│   ├── interim/             texto por página dos ITRs; respostas brutas do teste de IA
│   └── processed/           JSONs verificados que o app usa (setores/ com o panorama)
├── app/
│   ├── template.html        layout e estilos
│   ├── app.js               conversa, comparativo, valuation, slides, contas e chat
│   ├── brand/               logotipo Fiscus
│   ├── icons/               ícones Iconoir 7.11.1 (MIT)
│   ├── data.json            dados empacotados (gerado)
│   └── index.html           app final publicado como Artifact (gerado)
├── video/                   projeto Remotion do vídeo, roteiros e MP4 final
└── docs/
    ├── SPEC.md              especificação e registro de decisões
    ├── metodologia.md       fórmulas, critérios e convenções
    └── fontes_setor.md      fontes do relatório setorial
```

### Principais prompts e padrões de uso do Claude

Usamos o Claude Code para escrever o pipeline e o app, e o Claude dentro do app para a conversa. Os padrões que funcionaram:

**1. Extração declarativa por página.** Em vez de "extraia a receita do PDF", pedimos ao Claude para apontar *onde* está cada número: página, início da linha e posição da coluna. O resultado virou a lista `SPECS` em `02_metricas_itr.py`. O código é quem lê o valor. Exemplo de entrada:

```python
("g_receita_3t26", "gerdau", "Receita líquida", "3T26", 29, "3.01 Receita de Venda", 0, "R$ mil", "Consolidado · DRE")
```

**2. Verificador que não confia no extrator.** Pedimos um segundo script que relê as páginas, refaz as contas, cruza com números que a empresa publica e é testado com armadilhas (entradas erradas que ele tem de reprovar).

**3. Regra "o modelo não escreve números".** Nos prompts do app, o Claude escreve só texto: o título do slide (até 12 palavras, com a conclusão), 3 conclusões (até 22 palavras cada) e respostas curtas no chat. O prompt diz "NÃO escreva números", e o código confere: se houver qualquer dígito na resposta, ela é descartada e o app usa o texto padrão ou só a tabela verificada.

**4. Chat com ferramenta.** Para mostrar números, o modelo chama `mostrar_metricas`, que aceita só nomes de métricas de uma lista fechada (até 3). O app desenha a tabela com os valores verificados e a origem de cada um. Trecho do prompt:

> "Responda sobre Gerdau e Usiminas usando só estes dados verificados. Para mostrar números, chame mostrar_metricas; nunca escreva números no texto. [...] Depois, responda em 1 ou 2 frases curtas em português, com opinião, sem números."

**5. Teste de controle.** Prompt usado em `07_teste_ia.py`:

> "Abaixo estão páginas dos ITRs do 3T26 da Gerdau e da Usiminas. Extraia os valores pedidos, em R$ milhões (ou % para margens), e a página de onde tirou cada um. Responda só com JSON [...]"

**6. Pesquisa setorial com fonte.** Cada ponto do `setor.json` é marcado como `fato` (dado com fonte e página) ou `interpretacao` (opinião do time apoiada na fonte).

[PREENCHER: outros prompts relevantes usados no Claude Code durante o dia, se o time quiser colar aqui ou num `prompts.md`.]

## Limitações e próximos passos

### Limitações e pendências

Tiradas dos campos `pendencias` dos JSONs e da revisão do código:

- **CSN só tem 2T26.** O ITR de 30/09/2026 da CSN ainda não estava no zip da CVM (Last-Modified 01/11/2026; datas-base disponíveis: 31/03 e 30/06/2026), e o release do 3T26 não estava na SEC em 06/11/2026. Os números da CSN são do 2T26 e os múltiplos usam o contábil do 2T26 com preço de 05/11/2026. EBITDA ajustado, volume e segmentos da CSN não estão no app.
- **Volume da Gerdau fora do ITR.** O volume vendido da Gerdau sai no release de resultados, que não faz parte do ITR. Por isso não há volume nem receita por tonelada da Gerdau.
- **Sem série aberta de preço do aço.** Não há série mensal aberta de HRC no Pink Sheet; o IPA-M/FGV de siderúrgicos não é aberto; o FRED bloqueou o download automatizado em 06/11/2026. Também faltam séries de sucata e carvão em fonte primária.
- **Correlações frágeis.** A sensibilidade usa cerca de 7 anos de dados mensais, séries de 12 meses sobrepostas (n efetivo entre 11 e 25 meses, contra cerca de 90 observações) e é dominada pela pandemia. Exemplos: IBC-Br r = 0,64 que cai para 0,18 sem a pandemia; minério r = 0,63 que vira −0,02. É contexto, não previsão. Ver [docs/metodologia.md](docs/metodologia.md).
- **IBC-Br só até ago/2026** (última observação na base do BCB na consulta).
- **Sem comparação T/T.** Só calculamos A/A. A pág. 28 da Usiminas tem a coluna do 2T26, mas ela não foi extraída.
- **Dívida líquida da Usiminas.** Nossa conta (−R$ 566,0 mi) difere da reportada (−R$ 471,0 mi) em R$ 95 mi; passou na tolerância, mas não foi reconciliada.
- **ROIC aproximado.** Usa alíquota nominal de 34% (não a efetiva) e capital investido sem arrendamentos (IFRS 16).
- **Preço da USIM5 para todas as PN da Usiminas.** A composição do capital da CVM não separa PNA e PNB.
- **Itens setoriais não levantados** (de `setor.json`): peso do setor no PIB industrial; peso das siderúrgicas no Ibovespa; número da Resolução Gecex da renovação de maio/2026; impacto quantitativo da Section 232 nas margens da Gerdau (a empresa não o isola; a relação é interpretação); ato de concentração no CADE da mudança de controle da Usiminas para a Ternium; participação por empresa separada em longos e planos.
- **Teste de IA pequeno.** 8 números, um trimestre. Não prova que a IA acerta sempre.

### Divergências encontradas no código (não corrigidas)

- O `Makefile` aponta para scripts que existem (`01` a `08`). Mas `make tudo` **não roda o `teste-ia`** (exige o Claude Code instalado), e o `06_sensibilidade.py` roda com `-`, ou seja, uma falha nele não para o build.
- Alguns textos de tese no `08_build_app.py` são escritos à mão pelo time: o veredito e os pesos de 1 a 3 de cada fator de sensibilidade. São interpretação, não dado; os números citados neles vêm dos JSONs.
- Nos cruzamentos de segmentos do verificador, as eliminações (−42.411 na Gerdau) e o ajuste (+1 na Usiminas) estão digitados no código, não lidos da página.
- Datas fixas: `DATA_ALVO = 2026-09-30` e `HOJE = 2026-11-06` em `04_cvm_mercado.py`; páginas e linhas fixas em `02_metricas_itr.py`.

### Próximos passos

- **Próximo trimestre trocando só os PDFs:** hoje é preciso refazer o mapa de páginas (`SPECS`). O passo seguinte é pedir ao Claude para propor o mapa a cada novo ITR e deixar o verificador aprovar ou reprovar.
- Rodar de novo `04_cvm_mercado.py --refresh` quando a CVM publicar o 3T26 da CSN e incluir o release dela.
- Adicionar o release da Gerdau para ter volume e receita por tonelada.
- Calcular T/T (3T26 contra 2T26).
- Reconciliar a dívida líquida da Usiminas item a item.
- Calcular o texto de verificação do app a partir dos JSONs, sem valores fixos.
- Estender o teste de controle para mais números e mais trimestres.

## Aviso

Projeto acadêmico desenvolvido no Claude Lab PUC-Rio 2026. **Não constitui recomendação de investimento.** As teses e interpretações são opinião do time, com as fontes indicadas.

**Feito com:** Claude (Claude Code e Claude no Artifact), Python, pdfplumber, pandas, requests, ícones Iconoir (MIT), logotipos do Wikimedia Commons (domínio público). Dados: CVM, B3, BCB, IBGE, Banco Mundial, Instituto Aço Brasil, worldsteel, MDIC/Gecex, SEC.

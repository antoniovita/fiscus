# Metodologia

Este documento descreve como cada número do projeto é obtido, calculado e conferido. As fórmulas foram copiadas do código (`pipeline/*.py`) e dos campos `formula` dos JSONs em `data/processed/`. Os exemplos numéricos vêm desses mesmos JSONs.

## 1. Visão geral do pipeline

| Etapa | Script | Entrada | Saída |
|---|---|---|---|
| 1. Texto por página | `01_extrair_itr.py` | `data/raw/itr/*.pdf` | `data/interim/itr/<empresa>/pagina_NNN.txt` e `manifest.json` (sha256, nº de páginas, versão do pdfplumber) |
| 2. Métricas do ITR | `02_metricas_itr.py` | texto por página | `metricas_itr.json` |
| 3. Verificação | `03_verificar.py` | `metricas_itr.json` + texto por página | `verificacao.json` (sai com código 1 se algo reprovar) |
| 4. CVM e mercado | `04_cvm_mercado.py` | CVM Dados Abertos, B3 COTAHIST, Yahoo (conferência) | `financeiro.json`, `mercado.json` |
| 5. Macro | `05_macro.py` | BCB SGS, IBGE SIDRA, Banco Mundial | `macro.json` |
| 6. Sensibilidade | `06_sensibilidade.py` | `macro.json` | `sensibilidade.json` |
| 7. Teste de controle | `07_teste_ia.py [--completo]` | texto por página + `claude -p` | `teste_ia.json`, `teste_ia_completo.json` |
| 8. App | `08_build_app.py` | todos os JSONs acima + `setor.json` | `app/data.json`, `app/index.html` |

Princípio: **quem escolhe onde olhar é a análise (com o Claude); quem lê o número é o código; quem confere é outro código.** O app não tem número próprio: tudo que ele mostra sai dos JSONs, com a origem anexada.

## 2. Extração declarativa (etapa 2)

Cada métrica do ITR é uma linha da lista `SPECS`:

```
(id, empresa, métrica, período, página, início da linha, índice do número na linha, unidade original, critério)
```

Exemplo: `("g_receita_3t26", "gerdau", "Receita líquida", "3T26", 29, "3.01 Receita de Venda", 0, "R$ mil", "Consolidado · DRE")`.

O script:

1. abre `pagina_029.txt` da Gerdau;
2. procura a linha que contém o prefixo. Se o prefixo aparecer 0 ou mais de 1 vez, a métrica vira pendência (não é lida);
3. separa os tokens numéricos da linha a partir do prefixo. O padrão aceita o formato brasileiro (`1.234.567`, `(471)`, `-2.069.853`, `9,0%`). Códigos de conta como `3.01` ou `2.03.09` não casam com o padrão e ficam de fora;
4. pega o token da coluna indicada e converte (`parse_br`: parênteses ou sinal de menos = negativo; ponto = milhar; vírgula = decimal);
5. grava o valor, o valor como aparece, a unidade original, a página, o trecho (a linha inteira) e o critério.

Colunas usadas:

- DRE (Gerdau págs. 29–30; Usiminas pág. 14): 0 = 3T26, 1 = 9M26, 2 = 3T25, 3 = 9M25.
- BP (Gerdau págs. 26–28; Usiminas págs. 12–13): 0 = 30/09/2026, 1 = 31/12/2025.
- Nota de segmentos da Gerdau (pág. 72): 0 = 3T26, 1 = 3T25.
- Reconciliação do EBITDA da Usiminas (pág. 28): 0 = 3T26, 1 = 2T26, 2 = 3T25.
- Segmentos da Usiminas (pág. 33, R$ milhão): mineração 3T26 na coluna 0, siderurgia 3T26 na coluna 2.

Resultado: 56 métricas extraídas e 29 calculadas, 0 pendências.

## 3. Convenções

### Unidade

- Os ITRs estão em **R$ mil** (demonstrações e reconciliação da Usiminas). O resumo e os segmentos do release da Usiminas (págs. 24 e 33) estão em **R$ milhões**.
- No `metricas_itr.json`, todo valor monetário é convertido para **R$ milhões** (`R$ mil ÷ 1000`; `R$ milhão × 1`). A unidade original e o valor como aparece ficam gravados em cada métrica.
- No `financeiro.json` e no `mercado.json`, os valores monetários ficam em **R$ mil**, respeitando o campo `ESCALA_MOEDA` da CVM (MIL × 1; UNIDADE ÷ 1000). O app divide por 1000 ao mostrar.
- Volumes em mil toneladas; preços em R$ por ação; receita por tonelada em R$/t.
- Margens e retornos em %; variações de margem em pontos percentuais (p.p.); múltiplos e alavancagem em "x".
- Arredondamento: valores extraídos com 3 casas em R$ mi; calculados com 2 casas.

### Período

- **3T26** = 01/07/2026 a 30/09/2026. **3T25** = 01/07/2025 a 30/09/2025.
- **A/A** = 3T26 contra 3T25. É a única variação calculada. Não há T/T (3T26 contra 2T26).
- **12 meses (12m)** = acumulado do ano até a data-base + exercício 2025 (DFP) − acumulado do mesmo período de 2025 (coluna "PENÚLTIMO" do ITR corrente). Para Gerdau e Usiminas: 12m até 30/09/2026. Para a CSN: 12m até 30/06/2026.
- **Saldos de balanço** na data-base (30/09/2026; CSN 30/06/2026). **Médias** = (saldo na data-base + saldo 12 meses antes, tirado do ITR original do ano anterior) ÷ 2.
- **CSN:** o ITR de 30/09/2026 não estava no zip da CVM na consulta. O script usa a última data-base disponível (30/06/2026, 2T26), registra a pendência e marca o período em cada número.

### Página

- "pág. N" é o índice do PDF, igual ao número do arquivo `pagina_NNN.txt`. No ITR da Usiminas o rodapé impresso ("PÁGINA: X de 109") fica uma unidade abaixo.

### Demonstração

- Sempre **consolidado**. No ITR: páginas consolidadas. Na CVM: arquivos `*_con_*`, maior `VERSAO` de cada par (CNPJ, data-base).
- O cadastro da CVM é conferido: o CNPJ de cada empresa precisa estar ativo e com a razão social esperada, senão o script para.

## 4. Fórmulas

### 4.1 Métricas do ITR (`02_metricas_itr.py`)

| Métrica | Fórmula (como no código) | Unidade |
|---|---|---|
| Margem EBITDA ajustada | `ebitda_aj / receita × 100` | % |
| Margem líquida | `lucro_consolidado / receita × 100` | % |
| Margem EBITDA por segmento (Gerdau AN e Brasil; Usiminas siderurgia) | `ebitda_segmento / receita_segmento × 100` | % |
| Peso da América do Norte no EBITDA (Gerdau) | `g_ebitda_an_3t26 / g_ebitda_aj_3t26 × 100` | % |
| Dívida bruta | `div_cp + div_lp` (contas 2.01.04 + 2.02.01, empréstimos e financiamentos com debêntures) | R$ mi |
| Dívida líquida | `div_cp + div_lp − caixa − aplic` (contas 2.01.04 + 2.02.01 − 1.01.01 − 1.01.02) | R$ mi |
| Receita por tonelada (Usiminas, siderurgia) | `u_receita_sid_3t26 / u_vol_aco_3t26 × 1000` | R$/t |
| Variação A/A (valores) | `(3T26 / 3T25 − 1) × 100`; se a base 3T25 for ≤ 0, o resultado é "n.s." | % |
| Variação A/A (margens) | `3T26 − 3T25` | p.p. |

Exemplos: margem EBITDA ajustada da Gerdau no 3T26 = 3.770,176 ÷ 18.690,518 = 20,17%. Dívida líquida da Gerdau = 554,745 + 13.174,481 − 5.695,892 − 347,571 = 7.685,76 (R$ mi). Lucro da Usiminas A/A = "n.s.", porque o 3T25 foi −3.503,338.

Observação: o volume de aço usado na receita por tonelada é o volume total de vendas de aço (pág. 24), e a receita é a do segmento siderurgia (pág. 33).

### 4.2 Contábil de 12 meses (`04_cvm_mercado.py`, `financeiro.json`)

Contas da DRE usadas: receita 3.01; EBIT 3.05 (resultado antes do resultado financeiro e dos tributos); lucro consolidado 3.11; lucro dos controladores 3.11.01; lucro dos não controladores 3.11.02.

| Métrica | Fórmula (campo `formula`) |
|---|---|
| Qualquer conta em 12m | `conta_acum_2026 + conta_2025 − conta_acum_2025` |
| D&A | Linha da DFC método indireto (grupo 6.01.01.*) cuja descrição contém "deprecia"; positivo = despesa |
| D&A do trimestre | `da_acum_2026 − da_acum_ate_<fim do trimestre anterior>` (a DFC só traz acumulado) |
| **EBITDA (CVM 156)** | `ebit + da` (EBIT 3.05 + D&A da DFC). É o EBITDA contábil da Resolução CVM 156, **não** o ajustado |
| PL dos controladores | `pl_total (2.03) − pl_nao_controladores (2.03.09)` |
| Dívida bruta | `emprestimos_cp (2.01.04) + emprestimos_lp (2.02.01)`. Não inclui arrendamentos (IFRS 16) nem derivativos |
| Caixa e aplicações | `caixa_equivalentes (1.01.01) + aplicacoes_financeiras_cp (1.01.02)`. Só aplicações de curto prazo |
| **Dívida líquida** | `divida_bruta − caixa_aplicacoes` |
| Capital investido | `pl_total + divida_liquida` |
| PL dos controladores médio | `(pl_controladores_3T26 + pl_controladores_3T25) / 2` |
| Capital investido médio | `(capital_investido_3T26 + capital_investido_3T25) / 2` |
| **ROE 12m** | `lucro_controladores_12m (3.11.01) / pl_controladores_medio × 100` |
| NOPAT 12m | `ebit_12m × (1 − 34%)` (alíquota nominal de IR/CS, não a efetiva) |
| **ROIC 12m** | `ebit_12m × (1 − 34%) / média(pl_total + divida_liquida) × 100` |
| **Dívida líquida / EBITDA** | `divida_liquida_<data-base> / ebitda_12m` (EBITDA CVM 156) |

Exemplo (Gerdau, R$ mil): ROE = 2.711.842 ÷ 54.597.091,5 = 4,97%. ROIC = 6.091.032 × 0,66 ÷ 63.021.184 = 4.020.081 ÷ 63.021.184 = 6,38%. Dívida líquida / EBITDA = 7.685.763 ÷ 9.787.754 = 0,79x.

Conferência de reapresentação: o acumulado do ano anterior usado (comparativo do ITR corrente) é comparado ao ITR original do ano anterior. Diferença acima de R$ 0,5 mil vira pendência. Nenhuma foi registrada.

### 4.3 Mercado (`04_cvm_mercado.py`, `mercado.json`)

| Métrica | Fórmula (campo `formula`) |
|---|---|
| Ações em circulação, por classe | `acoes_total − acoes_tesouraria` (`QT_ACAO_*_CAP_INTEGR − QT_ACAO_*_TESOURO`, composição do capital do ITR na data-base) |
| Valor de mercado da classe | `acoes_circulacao × preco / 1000` (R$ mil) |
| **Valor de mercado** | `valor_mercado_ON + valor_mercado_PN` |
| **P / L** | `valor_mercado / lucro_controladores_12m` (equivale a preço ÷ LPA de 12 meses ponderado pelas classes) |
| **P / VP** | `valor_mercado / pl_controladores_<data-base>` |
| **EV** | `valor_mercado + divida_liquida_<data-base> + pl_nao_controladores_<data-base>` (não controladores a valor contábil, BPP 2.03.09) |
| **EV / EBITDA** | `ev / ebitda_12m` (EBITDA CVM 156 de 12 meses, não o ajustado) |

Preço: B3 Séries Históricas, COTAHIST diário, campo PREULT (fechamento), CODBDI 02 (lote padrão), TPMERC 010 (à vista), nominal, sem ajuste por proventos. Data: último pregão com arquivo publicado antes de 06/11/2026, ou seja, **05/11/2026**. O fechamento de cada ticker foi conferido com o Yahoo Finance (6 de 6 iguais).

Tickers por classe: Gerdau ON = GGBR3, PN = GGBR4; Usiminas ON = USIM3, PN = USIM5; CSN ON = CSNA3. A GOAU4 tem preço coletado, mas não entra nos múltiplos. Na Usiminas, todas as PN foram precificadas por USIM5, porque a CVM não separa PNA e PNB (a PNB é residual).

Exemplo (Gerdau, R$ mil): EV = 44.653.784 + 7.685.763 + 193.224 = 52.532.771. EV/EBITDA = 52.532.771 ÷ 9.787.754 = 5,37x.

No app, se o P/L for negativo (lucro de 12 meses negativo, caso da CSN), ele aparece como "não se aplica", com o motivo.

### 4.4 Métricas montadas no app (`08_build_app.py`)

| Métrica | Fórmula |
|---|---|
| Margem EBITDA (CVM 156) | `EBITDA (CVM 156) ÷ Receita líquida × 100` |
| Mix de EBITDA por segmento | `segmento ÷ soma dos segmentos × 100`, arredondado. Usa a soma dos segmentos, sem eliminações; por isso a América do Norte aparece com 76% no mix e 77,2% na métrica "peso no EBITDA consolidado" |

Fontes por empresa no app: receita, EBITDA ajustado, margem ajustada e lucro de Gerdau e Usiminas vêm do ITR (`metricas_itr.json`); da CSN, da CVM. EBITDA CVM 156, ROE, ROIC e alavancagem das três vêm da CVM. Múltiplos vêm de `mercado.json`.

## 5. Critérios

### 5.1 Ajustado × contábil

- **EBITDA ajustado:** o divulgado pela companhia. Gerdau: nota 22 do ITR (pág. 72). Usiminas: reconciliação do release (pág. 28), que parte do EBITDA CVM 156, tira a equivalência patrimonial, soma o EBITDA proporcional das controladas em conjunto e exclui itens não recorrentes (ex.: impairment de R$ 2.226,3 mi no 3T25).
- **EBITDA (CVM 156):** EBIT + D&A, igual para todas. Usado em ROE/ROIC/alavancagem/múltiplos e no comparativo quando a CSN entra, porque não há ajustado da CSN no mesmo período.
- Exemplo de como o critério muda a leitura: margem da Usiminas no 3T25 = 6,57% no ajustado e −26,46% no CVM 156 (efeito do impairment).

### 5.2 Escolhas de comparação

- Gerdau é maior que a Usiminas (receita cerca de 3 vezes maior no 3T26). Por isso o foco são margens, retornos, múltiplos e variações.
- Para comparar Brasil com Brasil: Gerdau segmento Brasil contra Usiminas siderurgia.
- Lucro: consolidado (3.11) na DRE do trimestre; dos controladores (3.11.01) no ROE e no P/L.

## 6. Verificação (`03_verificar.py`)

Checagens por métrica:

| Checagem | Critério de aprovação |
|---|---|
| Trecho existe na página indicada | o trecho (linha inteira) aparece literalmente no texto da página |
| Valor aparece no trecho | `valor_como_aparece` está dentro do trecho |
| Escala | `parse_br(valor_como_aparece) ÷ 1000` (se R$ mil) igual ao valor gravado, com tolerância de 0,001 |
| Consolidado | para DRE e BP, a página contém "Consolidad" e não contém "DFs Individuais" |
| Faixa plausível | margem entre −50% e 80%; volume > 0; receita > 0; receita por tonelada entre R$ 1.000 e R$ 20.000 |
| Recálculo | toda métrica calculada é refeita pelos insumos; diferença < 0,01. Variação sobre base negativa precisa ser "n.s." |

Cruzamentos (7) com números que a companhia publica, com tolerância:

| Cruzamento | Tolerância |
|---|---|
| Gerdau: Brasil + América do Norte + América do Sul − 42,411 (eliminações) = EBITDA ajustado consolidado (pág. 72) | R$ 0,01 mi |
| Gerdau: receita total da nota de segmentos (pág. 72) = receita da DRE (pág. 29) | R$ 0,01 mi |
| Usiminas: margem ajustada 3T26 = 9,0% publicado (pág. 28) | 0,05 p.p. |
| Usiminas: margem ajustada 3T25 = 6,6% publicado (pág. 28) | 0,05 p.p. |
| Usiminas: EBITDA CVM 156 (588,039) − equivalência (80,452) + EBITDA de controladas em conjunto (50,430) = ajustado (pág. 28) | R$ 0,01 mi |
| Usiminas: siderurgia + mineração + 1 (ajustes) = EBITDA ajustado arredondado (pág. 33) | R$ 1 mi |
| Usiminas: dívida líquida calculada pelo BP = dívida líquida reportada (pág. 24) | R$ 150 mi |

Atenção: as eliminações da Gerdau (−42,411) e o ajuste da Usiminas (+1) estão digitados no código. No último cruzamento, a diferença é de R$ 95 mi (−566,0 contra −471,0) e não foi reconciliada.

Armadilhas (3): entradas erradas plantadas que o verificador **tem de reprovar** (holding no lugar do consolidado; R$ mil lido como R$ milhões; página errada). Para a armadilha de escala, o verificador também calcula a margem implícita e aplica a faixa plausível.

Regra de saída: o script termina com erro se qualquer métrica reprovar ou se alguma armadilha passar. Resultado atual: 85/85 aprovadas, 7/7 cruzamentos, 3/3 armadilhas barradas.

Outras conferências:

- **PDF × CVM** (`04_cvm_mercado.py`): receita e lucro consolidado do 3T26 e do 3T25 das duas empresas, lidos do PDF, contra os CSVs da CVM. Tolerância de R$ 0,5 mil. Resultado: 8/8 com diferença zero.
- **Macro** (`05_macro.py`): PTAX média mensal (SGS 3698) contra a média da série diária (SGS 1): 106 meses, diferença máxima 0,00005. IPCA mensal (SGS 433) e em 12 meses (SGS 13522) contra o IBGE SIDRA 7060: 81 e 70 meses, diferença zero.
- **Teste de controle** (`07_teste_ia.py`): tolerância de 0,15 p.p. para margens e de max(R$ 1 mi; 0,1% do valor) para valores. Resultado: 8/8 valores certos com páginas curadas e 8/8 com documentos inteiros. A página só é testada nos 6 números extraídos; nas 2 margens (cálculo, sem página única) ela é marcada como certa por padrão.

## 7. Sensibilidade do setor (`06_sensibilidade.py`)

### Como foi calculada

- **Variável do setor (y):** variação contra o mesmo mês do ano anterior (M/M-12, %) da produção física da PIM-PF/IBGE, como o IBGE publica (não recalculada). Série principal: 24.2 Siderurgia (tabela 8885). Comparação: 3.24 Metalurgia e Indústria geral (tabela 8888).
- **Variáveis macro (x)**, todas em 12 meses, calculadas no script:
  - IBC-Br sem ajuste sazonal (SGS 24363): variação % sobre o mesmo mês do ano anterior;
  - câmbio USD/BRL, PTAX venda média mensal (SGS 3698): variação % em 12 meses (alta = real mais fraco);
  - Selic meta de fim de mês (SGS 432): variação em p.p. em 12 meses, e também o nível;
  - minério de ferro 62% Fe CFR China (Banco Mundial, US$/t): variação % em 12 meses.
- **Janela:** jan/2019 até o último mês comum de cada par. O mês corrente da Selic (parcial) é excluído. A coleta começa em jan/2018 para que a variação de 12 meses exista desde jan/2019.
- **Defasagens:** 0, 3 e 6 meses (x no mês t−k contra y no mês t).
- **Estatísticas:** correlação de Pearson e de Spearman; n de meses pareados; **n efetivo** pela correção de Bartlett para autocorrelação de 1ª ordem, `n_eff = n (1 − r1x·r1y) / (1 + r1x·r1y)`; intervalo de 95% aproximado via Fisher-z com esse n efetivo: `tanh(atanh(r) ± 1,96 / √(n_eff − 3))`.
- **Robustez:** a mesma conta excluindo mar/2020 a dez/2021 (choque e efeito-base da pandemia).

### Resultados para a siderurgia (24.2)

| Variável | Defasagem | Pearson (amostra completa) | n | n efetivo | IC 95% | Pearson sem pandemia |
|---|---|---|---|---|---|---|
| IBC-Br | 0 | 0,64 | 92 | 25,4 | 0,33 a 0,83 | 0,18 |
| Câmbio | 6 | 0,52 | 87 | 12,9 | −0,05 a 0,83 | 0,10 |
| Selic (variação 12m) | 6 | −0,47 | 87 | 10,8 | −0,84 a 0,19 | −0,68 (IC −0,91 a −0,13) |
| Minério | 0 | 0,63 | 93 | 14,8 | 0,17 a 0,87 | −0,02 |

Os resultados completos (3 setores × 5 variáveis × 3 defasagens × 2 amostras) estão em `data/processed/sensibilidade.json`.

### Por que é frágil

- **Amostra curta:** cerca de 7 anos de dados mensais.
- **Pouca informação efetiva:** variações de 12 meses se sobrepõem, então meses vizinhos quase se repetem. Com cerca de 90 observações, o n efetivo fica entre 11 e 25. Vários intervalos de confiança incluem o zero.
- **Dominada por um choque:** a pandemia (2020–2021) move tudo junto. Sem ela, IBC-Br cai de 0,64 para 0,18 e minério vai de 0,63 para −0,02. O sinal da Selic fica mais forte sem a pandemia (é a única variável cujo IC exclui o zero na amostra sem pandemia, com defasagem de 3 e 6 meses), e o do câmbio com defasagem de 0 e 3 meses também sobe, mas com IC que inclui o zero.
- **Muitos testes:** 90 combinações testadas; algumas correlações "fortes" podem surgir por acaso.
- **Fatores comuns:** câmbio, Selic e atividade se movem juntos; a correlação com um deles não isola o efeito dele.
- **Mede outra coisa:** produção física de siderurgia no Brasil é volume, não receita, preço ou margem de Gerdau e Usiminas, que dependem também de preço do aço, importações, custos e, na Gerdau, dos EUA.
- **Sem preço do aço:** não há série mensal aberta de preço do aço (ver pendências do README).

Correlação não é causalidade. Use como contexto, não como modelo de previsão.

No app, cada fator do slide "O que move o setor" tem um peso de 1 a 3. Esses pesos são julgamento do time, escritos em `08_build_app.py`, e não saem de um cálculo.

## 8. O app (`08_build_app.py` e `app/app.js`)

- Cada número mostrado tem uma entrada de origem (`PROV` em `app/data.json`): `verificado` (ITR: arquivo, página, trecho, valor como aparece, unidade original, critério), `cvm` (conta, arquivo, período, fórmula), `mercado` (arquivo COTAHIST, fórmula) ou `calculado` (fórmula e insumos). São 52 números com origem.
- Cada lacuna tem um motivo escrito (`ND`): 7 casos, como volume da Gerdau fora do ITR e CSN sem 3T26.
- **Regra do modelo:** o Claude do usuário (capability do Artifact, `modelTier: "quick"`) só escreve texto. No título e nas conclusões, o prompt proíbe números, e o código descarta qualquer saída com dígito. No chat, o modelo chama a ferramenta `mostrar_metricas`, com lista fechada de métricas disponíveis (até 3), e o app desenha a tabela verificada. Se o texto final tiver dígito, ele é trocado por "Aqui estão os números verificados."
- Sem a capability, o app usa título e conclusões padrão e uma busca por palavra-chave para o chat.
- Textos de tese, veredito, forças, fraquezas e riscos são opinião do time. Os números dentro deles são inseridos a partir dos JSONs.

## 9. Fontes setoriais

Lista completa, com URL e cópia local: [fontes_setor.md](fontes_setor.md). No `setor.json`, cada ponto é marcado como `fato` (dado com fonte e página) ou `interpretacao` (opinião apoiada na fonte); a `tese` de cada tópico é opinião.

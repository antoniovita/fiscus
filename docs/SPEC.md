# Fiscus: especificação do produto

Versão 1 · 06/11/2026 · Claude Lab PUC-Rio 2026, Case 3

Esta spec é a fonte de verdade do produto. Qualquer mudança de comportamento, dado ou visual começa aqui: primeiro se altera a spec, depois o código. O revisor confere a implementação contra os critérios de aceite da seção 10.

---

## 1. Visão e problema

**Problema.** Um diretor de research precisa comparar os ITRs do trimestre de duas siderúrgicas (Gerdau e Usiminas no 3T26, com 80 e 110 páginas) e levar ao comitê de investimentos uma apresentação curta. Fazer isso à mão leva horas. Uma IA sem controle corre o risco clássico de escrever um número errado com confiança.

**Visão.** Um produto que responde "este setor é um bom lugar para investir?" e compara duas empresas do setor, em que **cada número é rastreável até a página do documento oficial** e foi verificado antes de aparecer.

**Pergunta central do relatório:** o setor é atrativo? A resposta vem com opinião explícita e indica a empresa que merece a próxima análise (Etapa 2).

**Critérios da banca** (`claude-lab-financas-puc2026/REGRAS_E_AVALIACAO.md`):

| Critério | Peso |
|---|---|
| Utilidade real | 30 |
| Rigor e verificação | 20 |
| Produto | 20 |
| Ideia | 15 |
| Comunicação | 15 |

Toda decisão de escopo é julgada contra esses pesos.

## 2. Usuários e jobs

| Usuário | Job |
|---|---|
| Analista de research | Montar o comparativo do trimestre em minutos e gastar o tempo na tese |
| Gestor e comitê de investimentos | Receber a conclusão clara e conferir qualquer número durante a reunião |
| Escola de finanças | Usar o caso real para ensinar leitura de ITR, critérios contábeis e múltiplos |
| Banca do hackathon | Verificar rigor ("como vocês sabem que esse número está certo?") em um clique |

## 3. Escopo e não-escopo

**Dentro do escopo:**
- **Setor:** siderurgia.
- **Empresas:** Gerdau (GGBR4), Usiminas (USIM5) e CSN (CSNA3). A CSN entra com dados do 2T26.
- **Landing institucional.**
- **Painel com conversa guiada:** tese do setor, comparativo em abas e apresentação de 10 slides exportável em PDF.
- **Histórico de análises** no navegador.
- **Origem de cada número** em um clique.

**Fora do escopo** (aparece como "Em breve" ou como próximo passo):
- outros setores (mineração, bancos, energia, varejo, petróleo);
- Ferbasa;
- extração ao vivo de PDFs enviados pelo usuário;
- login, banco de dados e sincronização entre dispositivos;
- atualização automática a cada trimestre;
- comparação T/T (trimestre contra trimestre).

## 4. Arquitetura

### 4.1 Pipeline de dados (`pipeline/`, Python 3.9, `.venv`)

| Etapa | Script | Entrada → saída |
|---|---|---|
| 1 | `01_extrair_itr.py` | `data/raw/itr/*.pdf` → `data/interim/itr/<empresa>/pagina_NNN.txt` + `manifest.json` (sha256, nº de páginas) |
| 2 | `02_metricas_itr.py` | páginas → `data/processed/metricas_itr.json`. Extração **declarativa**: cada métrica é (página, início da linha, coluna); o valor é lido do texto, nunca digitado |
| 3 | `03_verificar.py` | `metricas_itr.json` → `verificacao.json`. Verificador independente; sai com código 1 se algo reprovar |
| 4 | `04_cvm_mercado.py` | CVM Dados Abertos (ITR 2025/2026, DFP 2025) + B3 COTAHIST → `financeiro.json`, `mercado.json` (12m, ROE, ROIC, múltiplos, cruzamento PDF × CVM) |
| 5 | `05_macro.py` | BCB SGS, IBGE SIDRA, Banco Mundial → `macro.json` |
| 6 | `06_sensibilidade.py` | `macro.json` → `sensibilidade.json` (correlações com n efetivo e IC) |
| 7 | `07_teste_ia.py` | teste de controle com `claude -p` → `teste_ia.json` e `teste_ia_completo.json` (com `--completo`) |
| 8 | `08_build_app.py` | todos os JSONs + `data/raw/logos/*.svg` + `app/icons/*.svg` → `app/data.json` e `app/index.html` |

Além dos scripts:
- **`Makefile`:** `make setup`, `make tudo` (do PDF ao app), `make verificar`, `make teste-ia` e `make app`.
- **Dados brutos:** ficam em `data/raw/` com um `.meta.json` (URL, data da consulta, sha256) quando vêm da internet.
- **Fontes setoriais:** `data/processed/setor.json` + `docs/fontes_setor.md`. O conteúdo foi pesquisado e cada ponto está marcado como `fato` ou `interpretacao`.

### 4.2 App

- `app/template.html` contém o CSS e o HTML, com o marcador `/*__APP__*/`.
- `app/app.js` contém o JS, com o marcador `/*__DATA__*/null`.
- O build injeta o `app.js` no template e o bloco `DATA` no `app.js`, e gera `app/index.html`. **Nunca se edita o `index.html` à mão.**
- O bloco `DATA` traz `{SETOR, EMP, MET, PROV, ND, VERIF, ICONS}`:
  - `MET[k].vals[e] = [atual, anterior]`;
  - `PROV["k|e|i"]` é a origem de cada valor (`verificado` | `calculado` | `cvm` | `mercado`);
  - `ND["k|e"]` é o motivo de um valor não disponível.
- As únicas bibliotecas externas são `html2canvas` 1.4.1 e `jsPDF` 2.5.1, carregadas do cdnjs, para gerar o PDF.

### 4.3 Publicação

**Artifact do claude.ai:** https://claude.ai/artifact/D3PhJmUf6zBdb3waQL6mqh. As capabilities declaradas são:
- `sample`: o Claude do próprio usuário, gasto na cota dele, com consentimento;
- `downloads`: salvar o PDF.

**Por que Artifact e não Next.js na Vercel:**
- a assinatura do Claude não serve de API para um app hospedado fora;
- o Artifact tem custo zero e encaixa no evento;
- ele oferece chat com tools e download de arquivo;
- o deploy é instantâneo.

**Restrições que o Artifact impõe:**
- sem fetch externo em runtime, por isso os dados vão embutidos;
- scripts só do cdnjs, jsdelivr ou unpkg;
- fontes só do Google Fonts;
- sem `window.print`.

## 5. Dados e regras de rigor

1. **Nenhum número digitado à mão.** Todo número exibido sai de `data/processed/*.json` via `08_build_app.py`. Textos de opinião (veredito, leituras) podem citar números somente interpolando valores do JSON.
2. **O modelo nunca escreve números.** O Claude escolhe o que mostrar (tool `mostrar_metricas`) e escreve títulos e conclusões sem dígitos. Respostas com dígito são descartadas e substituídas por texto padrão.
3. **Consolidado sempre.** Os dados da controladora (holding) nunca entram em DRE e BP.
4. **Critério de EBITDA:**
   - Gerdau × Usiminas usa o **EBITDA ajustado** (nota 22 da Gerdau, pág. 72; release da Usiminas, pág. 28).
   - Se a CSN estiver no par, o app usa o **EBITDA CVM 156** (EBIT + D&A) **nas duas empresas** e avisa isso na tela.
5. **Comparação A/A** (3T26 contra 3T25; para a CSN, 2T26 contra 2T25), sempre rotulada assim. Se a base for negativa, a variação aparece como "n.s.".
6. **Unidades:** o ITR vem em R$ mil e o app mostra em R$ milhões. A conversão aparece no painel de origem.
7. **Doze meses** para ROE, ROIC, dívida líquida/EBITDA e múltiplos. O preço é o fechamento oficial da B3 em `mercado.json.data_referencia`.
8. **"n.d." com motivo.** O que não existe para uma empresa aparece como "n.d." (com tooltip) e desabilita a métrica no seletor, com o motivo exibido.
9. **Efeitos pontuais são explicitados**, como o impairment da Usiminas no 3T25.
10. **Correlação não é causalidade.** A sensibilidade mostra o n efetivo e o resultado sem a pandemia, e é rotulada como contexto.
11. **Toda tela termina com fonte, data e o aviso** "não é recomendação de investimento".

## 6. Verificação

O verificador `03_verificar.py` faz cinco grupos de checagem:
- **Por métrica extraída:** o trecho existe na página indicada; o valor aparece no trecho; a escala bate com a unidade original; páginas de DRE e BP são consolidadas.
- **Por faixa de valor:** margem entre −50% e 80%; volume e receita positivos; R$/t entre 1 mil e 20 mil.
- **Recálculo:** toda métrica calculada é refeita a partir dos insumos.
- **Cruzamentos com reconciliações publicadas pelas empresas:** cada trecho é lido literalmente da página.
- **Armadilhas:** 3 entradas erradas que o verificador **tem** de reprovar (holding no lugar do consolidado, R$ mil lido como milhões, página errada).

Há ainda dois cruzamentos externos:
- **ITR × CVM:** valores do PDF contra a base oficial da CVM (`financeiro.json.cruzamento_pdf_itr`).
- **Teste de controle:** o Claude sozinho extrai 8 valores, com páginas curadas e com os documentos inteiros (`teste_ia*.json`).

**Como reportar com honestidade:**
- Os contadores vêm de `VERIF` e nunca são escritos à mão.
- As armadilhas são testes criados pelo time, não erros reais do Claude.
- O resultado do teste de controle é reportado como foi: a IA acertou, e o verificador é a garantia.
- O app usa o slide "Como sabemos que está certo". O título "Onde a IA errou" não é usado.

## 7. Fluxos e rotas

As rotas usam só `#nome` (restrição do Artifact).

### 7.1 `#inicio`: landing institucional

É separada do painel: não tem barra lateral nem histórico.

**Navbar:**
- marca;
- âncoras Problema · Produto · Diferenciais · Para quem · Metodologia · Cobertura;
- botão "Acessar o painel" (`#painel`).

**Seções, nesta ordem:**
1. **Herói:** título, subtítulo, CTAs, a linha "Dados de CVM · B3 · Banco Central · IBGE · Aço Brasil" e a **demonstração animada**. A demo mostra uma página do ITR, a linha destacada e o número verificado, alternando 3 exemplos reais tirados de `PROV` com tipo `verificado`.
2. **Faixa de números:** os contadores de `VERIF` e de `PROV`.
3. **Problema.**
4. **Produto (a solução):** 3 etapas.
5. **Diferenciais:** 6 itens.
6. **Para quem:** 3 públicos.
7. **Metodologia:** 4 passos e o quadro do pipeline com os status reais.
8. **Cobertura:** logotipos e status de cada empresa.
9. **Fontes.**
10. **Chamada final.**
11. **Rodapé:** data de coleta, data do preço, aviso legal e nota sobre os logotipos.

### 7.2 `#painel`: área do usuário (padrão de layout do Claude)

**Barra lateral:**
- marca, que leva a `#inicio`;
- "Nova análise";
- "Recentes": lista simples de itens com título e data, sem cards;
- rodapé "salvo só neste navegador".

**Estado vazio:**
- saudação centralizada ("O que vamos analisar hoje?");
- uma **caixa de composição grande no centro**;
- sugestões abaixo dela (setor disponível, setores em breve, empresas cobertas).

**Conversa:**
- coluna central de leitura;
- mensagens do usuário em bolha;
- respostas do assistente como texto com widgets;
- caixa de composição **retangular arredondada** fixa embaixo.

**Histórico (1:1 com a conversa):**
- Cada análise guarda o estado completo (`msgs`, `step`, `picks`, `metrics`, `title`, `concl`, `verdict`, `tab`) em `localStorage` (chave `balanco-lado-a-lado-analises-v1`, até 30 itens).
- Abrir uma análise restaura exatamente o ponto onde ela parou.
- Para apagar, são dois cliques (✕ e depois "Apagar"), e o pedido expira em 3 s.
- O acesso ao storage fica dentro de try/catch, e o app funciona sem ele.

### 7.3 Passos da conversa

1. **Setor:** o usuário escolhe; só siderurgia está ativa.
2. **Tese do setor:**
   - veredito ("Seletivo"), com uma frase de opinião;
   - a empresa para a Etapa 2 e o porquê;
   - a sensibilidade: 5 drivers com nível de 1 a 3, o dado e a fonte;
   - os 8 tópicos recolhíveis (Introdução, Estrutura competitiva, Cadeia de valor, Drivers, Vantagens competitivas, Regulação, Análise financeira, Riscos), cada um com a tese e os pontos com fonte, marcados como fato ou leitura.
3. **Empresas:** o usuário escolhe 2 de Gerdau, Usiminas e CSN. A Ferbasa fica desabilitada e a CSN mostra o aviso de 2T26.
4. **Métricas:** agrupadas em Crescimento e resultado, Rentabilidade, Balanço, Múltiplos e Operacional. A seleção padrão depende do par (regra do EBITDA). As que não existem ficam desabilitadas com o motivo, e o mínimo é 4.
5. **Comparativo em abas:**
   - **Resumo:** título e 3 conclusões, escritos pelo Claude sem números, com fallback fixo por par; mais 3 destaques.
   - **KPIs:** tabela com variação e destaque.
   - **Modelo de negócio:** resumo com fonte e mix do EBITDA por segmento.
   - **Múltiplos:** barras e a leitura "qual múltiplo usar".
   - **Qualitativo:** forças, fraquezas e o que observar.
6. **Aceitar ou recusar.** "Recusar" oferece "Trocar métricas", "Gerar outro título" e "Trocar empresas".
7. **Apresentação:** miniaturas na conversa, "Abrir apresentação" e "Baixar PDF".
8. **PDF:**
   - cada slide é renderizado fora da tela em 1600×900 e montado com o jsPDF;
   - o arquivo é salvo via `downloads.save`, com confirmação do usuário;
   - se a captura das imagens falhar, gera de novo sem elas;
   - textos com gradiente viram cor sólida.

**Perguntas livres** (depois do comparativo): o Claude recebe o catálogo verificado e a tool `mostrar_metricas` (no máximo 3 métricas disponíveis), e a resposta vira uma tabela.

**Modo demonstração:** sem o Claude (`claude.use("sample")` retorna `null` ou o usuário nega o consentimento), um roteador por palavras-chave substitui a tool. Os textos padrão garantem o fluxo inteiro.

**Origem de qualquer número:** todo número é clicável e abre um painel lateral com documento, página, trecho, valor como aparece, conversão, critério (ou fórmula e insumos, ou conta da CVM, ou fonte da B3) e status.

## 8. Design system

**Direção:** estética Apple institucional, sóbria. Preto, cinza e um azul de ação. Sem gradientes arco-íris e sem cara de template.

**Cores:**

| Token | Valor | Uso |
|---|---|---|
| `--bg` | #f5f5f7 | fundo do painel |
| `--card` | #ffffff | superfícies |
| `--ink` | #1d1d1f | texto principal **e títulos da landing (sempre preto)** |
| `--ink2` / `--muted` / `--faint` | #424245 / #6e6e73 / #86868b | texto secundário |
| `--line` / `--hair` | #d2d2d7 / rgba(0,0,0,.08) | divisórias |
| `--fill` / `--fill2` | #e8e8ed / #f5f5f7 | controles e áreas internas |
| `--blue` | #0071e3 | ação primária e foco |
| `--link` | #0066cc | links e número em hover |
| `--green` / `--red` | #1d8a3e / #d70015 | variação positiva e negativa, status |
| `--c-g` / `--c-u` / `--c-c` | #1d1d1f / #5e5ce6 / #ff9f0a | séries de Gerdau, Usiminas e CSN (só em gráficos e pontos) |

**Tipografia:**
- Fonte do sistema: `-apple-system, BlinkMacSystemFont, "SF Pro Text/Display", "Helvetica Neue", Geist, system-ui`. A mono é `SF Mono, Geist Mono`.
- Títulos com peso 700 e letter-spacing negativo (−0,035 a −0,045em).
- Corpo em 15–17px, com −0,022em.
- Números sempre com `tabular-nums`.

**Raios e sombras:**
- raios: cards 22px, internos 14–18px, controles 10px;
- sombra: `0 2px 6px rgba(0,0,0,.04), 0 8px 28px rgba(0,0,0,.06)`.

**Componentes e regras:**
- **Botões:** primário azul, secundário cinza, borda arredondada. Pills e etiquetas **sempre com a largura do conteúdo** (`justify-self:start`, `width:auto`); nunca esticam no grid.
- **Controle segmentado** para as abas.
- **Listas agrupadas** no estilo dos Ajustes do iOS para sensibilidade e tópicos.
- **Ícones Iconoir 7.11.1** (SVGs em `app/icons/`, embutidos pelo build), usados **só em controles funcionais**: menu, nova análise, fechar, apagar, setas, download e chevron. **Proibido:** ícone decorativo em quadradinho colorido em cards de seção, listas de recursos ou setores.
- **Logotipos:** Gerdau, Usiminas e CSN vêm do Wikimedia Commons, em domínio público (`data/raw/logos/fontes.json`). São usados só para identificar as empresas analisadas. Quando falta o logotipo, entra o nome em texto.
- **Movimento:**
  - animações de entrada **atreladas ao scroll** (CSS `animation-timeline: view()`), no estilo de apps profissionais;
  - sem suporte do navegador, o conteúdo aparece já visível;
  - a demo do herói roda em loop de 4,2 s;
  - contadores animam de 0 ao valor;
  - com `prefers-reduced-motion`, nada se move.
- **Acessibilidade:**
  - foco visível;
  - rótulos em todos os botões só de ícone;
  - `aria-live` no palco dos slides;
  - nada no estado de repouso fica com opacidade 0.
- **Responsivo:**
  - funciona a partir de 400px;
  - gutter de 16px com safe-area;
  - a barra lateral vira gaveta abaixo de 900px;
  - grids caem para 1 coluna;
  - tabelas rolam dentro do próprio container.

## 9. Apresentação (10 slides)

Um **modal de tela cheia acima de tudo**, inclusive da barra lateral. O slide fica em 16:9, ajustado à tela (`min(100vw, 100vh·16/9)`). Embaixo fica uma tira de miniaturas, com navegação por ← → e Esc para fechar. No topo, só os botões "Fechar" e "Baixar PDF".

| # | Slide | Conteúdo |
|---|---|---|
| 1 | Capa | título curto (ex.: "Siderurgia 3T26: seletivo"), com o veredito como subtítulo e a empresa da Etapa 2 |
| 2 | O que move o setor | sensibilidade, com os 5 drivers e a nota de que correlação não é causalidade |
| 3 | Estrutura, cadeia e regulação | as teses de 4 tópicos |
| 4 | Comparativo | título do comparativo e as 3 conclusões |
| 5 | KPIs | tabela sem os múltiplos |
| 6 | Modelos de negócio | resumo e mix por empresa |
| 7 | Múltiplos | barras e a leitura de qual múltiplo usar |
| 8 | Qualitativo e riscos | forças, fraquezas e o que observar |
| 9 | Como sabemos que está certo | contadores de `VERIF`, ITR × CVM e teste de controle |
| 10 | Fontes e metodologia | os 4 passos do pipeline e as convenções |

Todo slide tem rodapé com as fontes e o aviso "não é recomendação de investimento". A mensagem fica no título.

## 10. Critérios de aceite

**Dados e rigor**
- [ ] `make tudo` roda do PDF ao `app/index.html` sem passo manual.
- [ ] `03_verificar.py` sai com código 0: todas as métricas aprovadas, todos os cruzamentos OK e todas as armadilhas barradas.
- [ ] Nenhum número no app fica sem entrada em `PROV`. O teste: abrir o painel de origem de cada número.
- [ ] Com a CSN no par, as métricas de EBITDA e margem são as do critério CVM 156 nas duas empresas, e o aviso aparece.
- [ ] Valores ausentes aparecem como "n.d." com motivo, nunca como 0, vazio, `undefined` ou `NaN`.
- [ ] Respostas do Claude com dígitos são descartadas.

**Landing**
- [ ] Ela abre por padrão (sem hash ou com `#inicio`) e não mostra a barra lateral.
- [ ] Todas as âncoras da navbar levam às seções. "Acessar o painel" leva a `#painel`.
- [ ] Os títulos ficam em `--ink` (preto), sem cinza nem gradiente.
- [ ] Não há ícones decorativos em quadradinhos.
- [ ] As seções entram animadas ao rolar a página, e sem suporte já aparecem visíveis.
- [ ] A demo alterna 3 exemplos reais com página e trecho.

**Painel**
- [ ] A barra lateral tem "Nova análise" e "Recentes" (lista simples). A marca volta para a landing.
- [ ] O estado vazio mostra a saudação centralizada, a caixa de composição grande e as sugestões.
- [ ] Na conversa, a caixa de composição fica retangular arredondada embaixo, numa coluna central.
- [ ] Criar duas análises, recarregar a página e abrir a primeira restaura o mesmo passo e as mesmas mensagens.
- [ ] Apagar pede dois cliques.
- [ ] Sem Claude, o fluxo completo funciona em modo demonstração.

**Apresentação e PDF**
- [ ] O modal cobre toda a tela, inclusive a barra lateral. O slide é 16:9 e cabe na tela sem corte.
- [ ] A tira de miniaturas navega pelos slides, e ← → e Esc funcionam.
- [ ] A capa tem título curto e o veredito como subtítulo.
- [ ] "Baixar PDF" gera 10 páginas 16:9 legíveis e pede confirmação antes de salvar.

**Design**
- [ ] Pills e etiquetas têm a largura do texto em todas as telas.
- [ ] Ícones aparecem só em controles, e todos são do Iconoir.
- [ ] A 400px de largura, a página não tem rolagem horizontal.
- [ ] Com `prefers-reduced-motion`, não há animação.

## 11. Pendências e dívidas conhecidas

- **CSN:** o ITR do 3T26 ainda não está na base da CVM, então ela usa 2T26/2T25 e os múltiplos combinam o preço de 05/11 com o contábil do 2T26. Para atualizar: `04_cvm_mercado.py --refresh`.
- **Volume da Gerdau:** não está no ITR (fica no release de resultados). Por isso faltam volume e receita por tonelada para a Gerdau.
- **Preço do aço:** não há série aberta de HRC.
- **IBC-Br:** só vai até ago/2026.
- **Sensibilidade:** as correlações são frágeis. O n efetivo é pequeno e o sinal some sem a pandemia.
- **Dívida líquida da Usiminas:** o cálculo pelo BP difere do valor reportado no release em cerca de R$ 95 mi. Está dentro da tolerância, mas não foi reconciliado.
- **EBITDA CVM 156 da Usiminas:** a base da CVM e a pág. 28 diferem em R$ 3 mil, vindo da D&A.
- **Mapa de páginas fixo:** os `SPECS` do `02` e as datas no `04` estão no código. O próximo trimestre exige refazer o mapa, e localizar as páginas automaticamente é um próximo passo.
- **Eliminações digitadas:** os valores das eliminações nos cruzamentos de segmentos (Gerdau −42,411; Usiminas +1) estão no `03`.
- **Textos à mão:** o veredito e os pesos de 1 a 3 da sensibilidade são interpretação do time, escrita no `08`.
- **Teste de controle:** a página não é testada nas duas margens, que são calculadas.
- **Makefile:** `make tudo` não roda o `teste-ia` (depende do CLI `claude`), e falha no `06` não interrompe o build.
- **Pendências setoriais:** as que estão em `setor.json` (peso no PIB e na bolsa, número da resolução Gecex, CADE e Ternium, entre outras).
- **Histórico:** fica só no navegador de cada pessoa e não sincroniza.

## 12. Entregáveis do hackathon (prazo 16h00, 06/11/2026)

| Item | Status |
|---|---|
| Artefato publicado | No ar em https://claude.ai/artifact/D3PhJmUf6zBdb3waQL6mqh. **Falta tornar público** (Share) e testar em aba anônima |
| GitHub público do time | README e `docs/metodologia.md` prontos. Faltam preencher a equipe, o link do vídeo e os prints, criar o repositório e fazer o push |
| Vídeo de 2 min | Em produção com Remotion em `video/` (MP4 com legendas + `roteiro_narracao.md`). A gravação de tela do app pode substituir a cena recriada via `video/public/demo.mp4` |
| Formulário de entrega | Pendente: enviar os três links pelo formulário do repositório do evento |
| Spec | Este documento. Atualizar a cada mudança antes de implementar |

---

## Registro de decisões · 06/11/2026, rodada de UI 3

Estas decisões valem sobre qualquer trecho anterior desta spec que as contradiga.

- **Landing:** as seções são separadas por uma borda contínua de 1px (`--line`) de ponta a ponta.
- **Barra lateral do painel:** sem botão hambúrguer e sem item "Painel". Ficam apenas "Nova análise", "Recentes" e o card "Você".
  - Abaixo de 640px a barra lateral some.
  - O card "Você" mostra o papel do usuário, os contadores (análises, comparativos, apresentações prontas), o status do assistente, a data dos dados e a data dos preços da B3, e o aviso de armazenamento local.
- **Tela inicial do painel:** a saudação vem sem símbolo ao lado.
  - O seletor de setor é um dropdown próprio (botão + lista em popover, com setores "Em breve" desabilitados), nunca o `<select>` nativo.
- **Card do veredito:** só texto, sem logotipo.
- **Apagar análise:** abre um modal de confirmação (Cancelar / Apagar). Nunca é por clique duplo.
- **Editar e reenviar mensagem:** toda mensagem digitada pelo usuário mostra "Editar" ao passar o mouse.
  - Na primeira mensagem, refaz a análise com o novo texto, mantendo o mesmo id no histórico.
  - Numa pergunta livre, corta a conversa a partir dela e pergunta de novo.
  - Mensagens geradas por botões (escolhas de etapa) não são editáveis.
- **Rodapé dos widgets** (ex.: o card da apresentação): divisória contínua de ponta a ponta do card, com fundo `#fbfbfd`.

### Critérios de aceite adicionais
- [ ] Nenhum `<select>` nativo no painel.
- [ ] Clicar na lixeira de uma análise abre o modal; "Cancelar" e Esc fecham sem apagar.
- [ ] Editar a primeira mensagem não cria uma entrada nova em "Recentes".
- [ ] Linhas divisórias de seção e de rodapé de card tocam as duas bordas do contêiner.

## Registro de decisões · 06/11/2026, rodada de UI 4

- **Conta local obrigatória para o painel.** Ao abrir `#painel` sem conta, aparece a tela "Crie sua conta" e o painel só abre depois dela.
  - Campos: nome (obrigatório), função (escolha entre Analista de research, Gestor(a) de investimentos, Membro de comitê, Estudante, Professor(a)) e instituição (opcional).
  - O perfil fica em `localStorage` (`balanco-lado-a-lado-conta-v1`).
  - Não há senha nem e-mail, e nada é enviado; a tela diz isso explicitamente.
  - "Sair" no perfil pede confirmação em modal e remove só o perfil. As análises continuam salvas.
- **Saudação do painel:** "{Bom dia|Boa tarde|Boa noite}, {primeiro nome}. Qual setor vamos analisar hoje?", com uma linha de apoio abaixo.
- **Sugestões no estilo de lista:** linhas de texto abaixo da caixa de composição, cada uma com um ícone de linha à esquerda e o tipo (Tese do setor / Comparativo) à direita. Sem cards, sem bordas e sem logotipos.
- **Caixa de composição:** sem o rótulo "3T26".
- **Perfil na barra lateral:** compacto, em linhas separadas por bordas contínuas de ponta a ponta da barra, sem card interno.
  - Linha 1: avatar com iniciais, nome, "função · instituição" e "Sair".
  - Linha 2: análises, comparativos e prontas.
  - Linha 3: status do assistente e data dos dados.
- **Transições:**
  - trocar de aba no comparativo anima o conteúdo (deslize e fade de 0,32 s);
  - trocar de tela (landing ↔ painel, cadastro → painel, abrir análise, nova análise) usa View Transitions quando o navegador suporta;
  - com movimento reduzido no sistema, nada anima.

### Critérios de aceite adicionais
- [ ] `#painel` sem conta mostra o cadastro; com conta, mostra o painel com o primeiro nome na saudação.
- [ ] O cadastro não tem campo de senha nem de e-mail e diz que nada é enviado.
- [ ] Trocar de aba no comparativo anima apenas o conteúdo da aba.

## Registro de decisões · 06/11/2026, marca

- **Nome do produto: Fiscus.** Substitui "Balanço Lado a Lado" em todo lugar visível: título da página, navbar, cadastro, barra lateral, rodapé, autor das mensagens do assistente, rodapé dos slides e nome do PDF (`Fiscus_Siderurgia_<A>_x_<B>_3T26.pdf`).
- **Logo:** vem de `/image.png`, do time.
  - Arquivos derivados em `app/brand/`: `fiscus-logo.png` (logotipo completo, 640px), `fiscus-mark.png` (só o símbolo "F") e as variantes brancas para fundo escuro.
  - O build embute todos como data URI no campo `BRAND` de `DATA`.
  - O logotipo completo aparece na navbar da landing, no cadastro e na barra lateral; o símbolo, nas mensagens do assistente e no rodapé dos slides.
- As chaves de `localStorage` mantêm o prefixo antigo (`balanco-lado-a-lado-*`) para não apagar análises e contas já salvas.

## Registro de decisões · 06/11/2026, rodada de UI 5

- **Tela inicial do painel:** saudação curta ("Boa tarde, {nome}.") e a pergunta na linha de apoio. O bloco saudação + caixa + sugestões fica centralizado vertical e horizontalmente, no padrão do Claude. A barra superior fica vazia nessa tela, sem "Nova análise".
- **Barra lateral:** uma divisória contínua separa o logotipo de "Nova análise". O botão "Sair" usa a classe `.logout`; nunca reutilize nomes de classe da landing (como `.out`) no painel.
- **Botões:** o texto de todo `.pill`, inclusive os que são links, fica centralizado.
- **Herói da landing:** a linha "Dados de CVM · B3 · ..." não tem divisória acima.
- **Seção Fontes:** é uma tabela com linhas contínuas e quatro colunas (Fonte, O que usamos, Onde entra, Referência), com link para o site oficial de cada fonte. Abaixo, uma nota sobre arquivo bruto, URL, data e hash. Os 7 itens: ITRs, CVM Dados Abertos, B3 COTAHIST, BCB SGS, IBGE PIM-PF, Aço Brasil/worldsteel e Banco Mundial.

## Registro de decisões · 06/11/2026, rodada de UI 6 (contas)

- **Criar conta e entrar são telas diferentes.**
  - `#criar-conta`: nome, função e instituição, com o link "Já tem conta? Entrar".
  - `#entrar`: lista das contas salvas neste navegador (iniciais, nome, função · instituição). Um clique entra, como na escolha de perfil da Netflix, com o link "Criar conta".
  - Não há senha nem e-mail: as contas são perfis locais, e a tela diz isso.
- **Rotas:** `#painel` sem sessão vai para `#entrar` se já existe alguma conta, e para `#criar-conta` se não existe nenhuma. A navbar da landing ganhou o link "Entrar".
- **Armazenamento:** `balanco-lado-a-lado-contas-v2` guarda `{list:[{id,nome,funcao,inst,criado,ultimo}], atual}`.
  - O histórico é **por conta**, em `balanco-lado-a-lado-analises-v1:<id>`.
  - Migração: a conta única antiga (`-conta-v1`) vira a primeira conta da lista, e o histórico global antigo passa para a primeira conta que entrar.
- **Sair:** pede confirmação num modal, encerra a sessão, mantém a conta e o histórico, e redireciona para a landing (`#inicio`).
- **Painel:**
  - a saudação e a caixa de composição ficam no centro exato da área útil (grade de 3 linhas `1fr auto 1fr`);
  - as sugestões e a nota ficam logo abaixo, alinhadas à esquerda, sem deslocar o centro;
  - fontes e espaçamentos menores: título de 24–30px e apoio de 15px.
- **Barra lateral:** uma divisória contínua entre "Nova análise" e "Recentes". O perfil não mostra mais "Dados de 06/11".

### Critérios de aceite adicionais
- [ ] Sair leva à landing e `#painel` passa a pedir login.
- [ ] Duas contas no mesmo navegador têm históricos separados.
- [ ] O centro vertical do bloco saudação + caixa coincide com o centro da área útil.

## Registro de decisões · 06/11/2026, rodadas finais

- **Fluxo:** toda entrada genérica pergunta primeiro o setor, num card com os 6 setores, e depois lista todas as empresas do setor que estão na base.
  - Siderurgia segue o fluxo completo: tese, comparativo, valuation e apresentação.
  - Os outros setores mostram um **veredito preliminar** calculado com as medianas do setor (ROE, margem, alavancagem e múltiplos) contra a Selic: Atrativo, Seletivo ou Pouco atrativo. A "empresa para a próxima etapa" é a de maior ROE ÷ P/VP. Depois vem o comparativo de duas empresas com dados da CVM e da B3.
- **Menu +** na caixa de composição: setores → empresas. Na siderurgia, as empresas viram etiquetas; nos outros setores, abrem o panorama.
- **Valuation:** DCF determinístico com premissas do usuário (T-bond de 10 anos e Selic são dados; o resto são sugestões ajustáveis). Inclui sensibilidade WACC × g, a ponte do valor da empresa até o valor do acionista e a recomendação por faixas (compra a partir de +15%, venda abaixo de −10%).
- **Apresentação:** estilo research report (CFA Research Challenge e Poli Finance), com:
  - abas de seção no topo;
  - título com colchete azul;
  - faixa de KPIs com divisórias verdes;
  - marcadores em losango;
  - capa com a recomendação;
  - os slides "Tese em 3 pilares" (escuro) e "Empresa em uma página" (três painéis encadeados);
  - gráficos nos cards e nos slides.
- **Perfil:** uma linha no estilo do Claude (avatar azul, nome · plano), com um menu que traz os detalhes e "Sair".

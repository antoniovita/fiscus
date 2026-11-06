PY := .venv/bin/python

.PHONY: setup tudo itr verificar mercado macro teste-ia app

setup:            ## cria o ambiente e instala as dependências
	python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt

tudo: itr verificar mercado macro app   ## refaz o pipeline inteiro, do PDF ao app

itr:              ## 1–2. texto por página dos ITRs e métricas declarativas
	$(PY) pipeline/01_extrair_itr.py
	$(PY) pipeline/02_metricas_itr.py

verificar:        ## 3. verificação independente (falha o build se algo reprovar)
	$(PY) pipeline/03_verificar.py

mercado:          ## 4. CVM Dados Abertos + preços → ROE, ROIC, múltiplos
	$(PY) pipeline/04_cvm_mercado.py

macro:            ## 5–6. séries BCB/IBGE/minério e sensibilidade do setor
	$(PY) pipeline/05_macro.py
	-$(PY) pipeline/06_sensibilidade.py

teste-ia:         ## controle: extração ingênua por LLM comparada ao verificado
	$(PY) pipeline/07_teste_ia.py
	$(PY) pipeline/07_teste_ia.py --completo

app:              ## 8. empacota os JSONs verificados dentro do app
	$(PY) pipeline/08_build_app.py

PY := .venv/bin/python

.PHONY: setup tudo itr verificar mercado historico setores macro teste-ia app video

setup:            ## cria o ambiente e instala as dependências
	python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt

tudo: itr verificar mercado historico setores macro app   ## refaz o pipeline inteiro, do PDF ao app

itr:              ## 1–2. texto por página dos ITRs e métricas declarativas
	$(PY) pipeline/01_extrair_itr.py
	$(PY) pipeline/02_metricas_itr.py

verificar:        ## 3. verificação independente (falha o build se algo reprovar)
	$(PY) pipeline/03_verificar.py

mercado:          ## 4. CVM Dados Abertos + preços → ROE, ROIC, múltiplos
	$(PY) pipeline/04_cvm_mercado.py

historico:        ## 9. DFP 2021–2025 e base de 12 meses do DCF
	$(PY) pipeline/09_historico_dcf.py

setores:          ## panorama de 44 empresas em 5 setores (CVM + B3)
	for f in pipeline/setores/*.py; do $(PY) -I $$f; done

macro:            ## 5–6. séries BCB/IBGE/minério e sensibilidade do setor
	$(PY) pipeline/05_macro.py
	-$(PY) pipeline/06_sensibilidade.py

teste-ia:         ## controle: extração ingênua por LLM comparada ao verificado
	$(PY) pipeline/07_teste_ia.py
	$(PY) pipeline/07_teste_ia.py --completo

app:              ## 8. empacota os JSONs verificados dentro do app
	$(PY) pipeline/08_build_app.py

video:            ## renderiza o vídeo (Remotion) e junta a narração (ffmpeg)
	cd video && npx remotion render && mv -f out/Entrega.mp4 out/fiscus.mp4
	ffmpeg -y -v error -i video/out/fiscus.mp4 -i video/public/narracao.mp3 -filter_complex "[1:a]atempo=0.9,adelay=600,apad,afade=t=out:st=116.8:d=1.2,loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo[a]" -map 0:v:0 -map "[a]" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset veryfast -c:a aac -b:a 192k -movflags +faststart -t 118 video/out/fiscus_com_narracao.mp4

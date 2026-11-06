"""Etapa 5: coleta de séries macroeconômicas e setoriais para o comparativo Gerdau x Usiminas.

Fontes (todas públicas, sem chave):
  - Banco Central do Brasil, SGS: dados via API JSON (api.bcb.gov.br) e metadados oficiais
    (nome, unidade, periodicidade) via webservice SOAP do SGS (FachadaWSSGS.getUltimoValorXML).
  - IBGE, SIDRA: PIM-PF (tabelas 8885 e 8888) via apisidra.ibge.gov.br; metadados via
    servicodados.ibge.gov.br/api/v3/agregados/<tabela>/metadados.
  - Banco Mundial, Pink Sheet (CMO Historical Data Monthly, xlsx): minério de ferro.
    O link do xlsx muda a cada edição, então é descoberto na página do Pink Sheet. FRED
    (PIRONUSDM) é tentado só como alternativa se o Banco Mundial falhar.

Validações cruzadas (não entram como séries, só como checagem):
  - IPCA SGS 433/13522 x IBGE SIDRA tabela 7060 (variáveis 63 e 2265).
  - PTAX média mensal SGS 3698 x média aritmética da série diária SGS 1.

Saídas:
  data/raw/bcb/      respostas brutas do SGS (um arquivo por série + metadados SOAP)
  data/raw/ibge/     respostas brutas do SIDRA (um arquivo por série + metadados das tabelas)
  data/raw/mercado/  xlsx do Pink Sheet como baixado
  data/processed/macro.json

Uso: .venv/bin/python pipeline/05_macro.py
Só usa a biblioteca padrão + requests + pandas (o xlsx é lido com zipfile, sem openpyxl).
"""
import hashlib
import html
import json
import re
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW_BCB = ROOT / "data" / "raw" / "bcb"
RAW_IBGE = ROOT / "data" / "raw" / "ibge"
RAW_MKT = ROOT / "data" / "raw" / "mercado"
PROC = ROOT / "data" / "processed"

# Começa em jan/2018 para permitir calcular variação de 12 meses já a partir de jan/2019.
INICIO = date(2018, 1, 1)
TIMEOUT = 120

SGS = {  # id_curto: (código, transformação para mensal)
    "selic_meta": (432, "diaria_para_mensal_ultimo_valor"),
    "usdbrl_ptax_venda_media_mensal": (3698, None),
    "ipca_var_mensal": (433, None),
    "ipca_acum_12m": (13522, None),
    "ibcbr": (24363, None),
    "ibcbr_dessaz": (24364, None),
}

SIDRA = {  # id_curto: (tabela, classificação, categoria, variável)
    "pim_siderurgia_indice": (8885, 542, 129238, 12606),
    "pim_siderurgia_var_12m": (8885, 542, 129238, 11602),
    "pim_siderurgia_acum_12m": (8885, 542, 129238, 11604),
    "pim_metalurgia_indice": (8888, 544, 129333, 12606),
    "pim_metalurgia_indice_dessaz": (8888, 544, 129333, 12607),
    "pim_metalurgia_var_12m": (8888, 544, 129333, 11602),
    "pim_industria_geral_indice": (8888, 544, 129314, 12606),
    "pim_industria_geral_indice_dessaz": (8888, 544, 129314, 12607),
    "pim_industria_geral_var_12m": (8888, 544, 129314, 11602),
}

WB_PAGINA = "https://www.worldbank.org/en/research/commodity-markets"
WB_FALLBACK = ("https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/"
               "related/CMO-Historical-Data-Monthly.xlsx")
WB_COLUNA = "Iron ore, cfr spot"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=PIRONUSDM"

pendencias = []
validacoes = []


def agora() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def baixar(url, destino: Path, params=None, method="GET", **kw):
    """Baixa e grava a resposta bruta (bytes exatos). Devolve (response, url_final, consultado_em)."""
    consultado = agora()
    r = requests.request(method, url, params=params, timeout=TIMEOUT, **kw)
    r.raise_for_status()
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(r.content)
    return r, r.url, consultado


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


# ---------------------------------------------------------------- BCB SGS
SOAP_URL = "https://www3.bcb.gov.br/wssgs/services/FachadaWSSGS"
SOAP_BODY = ('<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope '
             'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
             'xmlns:pub="http://publico.ws.casosdeuso.sgs.pec.bcb.gov.br"><soapenv:Body>'
             '<pub:getUltimoValorXML><in0>{codigo}</in0></pub:getUltimoValorXML>'
             '</soapenv:Body></soapenv:Envelope>')
PERIODICIDADE = {"D": "diária", "M": "mensal", "T": "trimestral", "A": "anual"}


def sgs_metadados(codigo: int) -> dict:
    destino = RAW_BCB / f"sgs_{codigo}_metadados_soap.xml"
    r, url, consultado = baixar(SOAP_URL, destino, method="POST",
                                data=SOAP_BODY.format(codigo=codigo).encode(),
                                headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": '""'})
    interno = html.unescape(re.search(r"<getUltimoValorXMLReturn[^>]*>(.*?)</getUltimoValorXMLReturn>",
                                      r.text, re.S).group(1))
    campo = lambda t: html.unescape(re.search(rf"<{t}>(.*?)</{t}>", interno, re.S).group(1)).strip()
    cod = int(campo("CODIGO"))
    if cod != codigo:
        raise ValueError(f"SOAP devolveu código {cod} para {codigo}")
    return {"nome": campo("NOME"), "unidade": campo("UNIDADE"),
            "periodicidade": PERIODICIDADE.get(campo("PERIODICIDADE"), campo("PERIODICIDADE")),
            "url_metadados": SOAP_URL + " (SOAP getUltimoValorXML)", "arquivo_metadados": rel(destino),
            "metadados_consultado_em": consultado}


def sgs_dados(codigo: int, destino: Path):
    params = {"formato": "json", "dataInicial": INICIO.strftime("%d/%m/%Y"),
              "dataFinal": date.today().strftime("%d/%m/%Y")}
    r, url, consultado = baixar(f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados",
                                destino, params=params)
    df = pd.DataFrame(r.json())
    df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
    df["valor"] = pd.to_numeric(df["valor"], errors="raise")
    return df, url, consultado, r.content


def coletar_sgs(series: dict):
    for sid, (codigo, transf) in SGS.items():
        try:
            meta = sgs_metadados(codigo)
            destino = RAW_BCB / f"sgs_{codigo}.json"
            df, url, consultado, raw = sgs_dados(codigo, destino)
            obs = []
            hoje = pd.Timestamp(date.today())
            futuras = int((df["data"] > hoje).sum())
            df = df[df["data"] <= hoje]
            if futuras:
                obs.append(f"A API devolveu {futuras} registros com data posterior à consulta "
                           f"(preenchimento até a próxima reunião do Copom); foram descartados no processado.")
            if transf == "diaria_para_mensal_ultimo_valor":
                df = df.sort_values("data").groupby(df["data"].dt.to_period("M")).last()
                df["data"] = df.index.to_timestamp()
                obs.append("Série diária convertida para mensal pelo último valor vigente em cada mês "
                           "(meta em vigor no último dia com registro do mês).")
                obs.append(f"O último mês ({df['data'].iloc[-1].strftime('%Y-%m')}) pode estar incompleto: "
                           f"reflete a meta vigente até a data da consulta ({date.today().isoformat()}).")
                frequencia = "mensal (derivada da diária)"
            else:
                frequencia = meta["periodicidade"]
            dados = [{"data": d.strftime("%Y-%m"), "valor": float(v)} for d, v in zip(df["data"], df["valor"])]
            series[sid] = {
                "nome": meta["nome"], "unidade": meta["unidade"], "frequencia": frequencia,
                "periodicidade_original": meta["periodicidade"],
                "fonte": "Banco Central do Brasil — SGS", "codigo": codigo, "url": url,
                "consultado_em": consultado, "arquivo_bruto": rel(destino), "sha256_bruto": sha256(raw),
                "metadados": {k: meta[k] for k in ("url_metadados", "arquivo_metadados", "metadados_consultado_em")},
                "observacoes": obs, "dados": dados,
            }
            print(f"SGS {codigo:>5} {sid}: {len(dados)} obs, {dados[0]['data']}..{dados[-1]['data']} "
                  f"último={dados[-1]['valor']}")
        except Exception as e:  # noqa: BLE001
            pendencias.append({"serie": sid, "fonte": "BCB SGS", "codigo": codigo, "erro": repr(e)})
            print(f"FALHA SGS {codigo}: {e!r}")


def validar_sgs(series: dict):
    # PTAX 3698 x média da série diária 1
    try:
        df1, url1, cons1, _ = sgs_dados(1, RAW_BCB / "sgs_1_validacao.json")
        media = df1.groupby(df1["data"].dt.strftime("%Y-%m"))["valor"].mean()
        ptax = {d["data"]: d["valor"] for d in series["usdbrl_ptax_venda_media_mensal"]["dados"]}
        comuns = [m for m in ptax if m in media.index]
        dif = max(abs(ptax[m] - media[m]) for m in comuns)
        validacoes.append({"checagem": "SGS 3698 = média mensal da SGS 1 (dólar venda diário)",
                           "url": url1, "consultado_em": cons1, "meses_comparados": len(comuns),
                           "max_diferenca_abs": round(float(dif), 6), "ok": bool(dif < 0.0006)})
    except Exception as e:  # noqa: BLE001
        pendencias.append({"serie": "validacao_ptax", "erro": repr(e)})
    # IPCA SGS x SIDRA 7060
    try:
        url = "https://apisidra.ibge.gov.br/values/t/7060/n1/all/v/63,2265/p/all/c315/7169"
        r, url, cons = baixar(url, RAW_IBGE / "sidra_7060_ipca_validacao.json", params={"formato": "json"})
        linhas = r.json()[1:]
        for var, sid in (("63", "ipca_var_mensal"), ("2265", "ipca_acum_12m")):
            ibge = {f"{l['D3C'][:4]}-{l['D3C'][4:]}": float(l["V"]) for l in linhas
                    if l["D2C"] == var and l["V"] not in ("...", "-", "..", "X")}
            sgs = {d["data"]: d["valor"] for d in series[sid]["dados"]}
            comuns = [m for m in sgs if m in ibge]
            dif = max(abs(sgs[m] - ibge[m]) for m in comuns)
            validacoes.append({"checagem": f"SGS {series[sid]['codigo']} = SIDRA 7060 variável {var} (Índice geral)",
                               "url": url, "consultado_em": cons, "meses_comparados": len(comuns),
                               "max_diferenca_abs": round(float(dif), 6), "ok": bool(dif < 1e-9)})
    except Exception as e:  # noqa: BLE001
        pendencias.append({"serie": "validacao_ipca", "erro": repr(e)})


# ---------------------------------------------------------------- IBGE SIDRA
def coletar_sidra(series: dict):
    meta_tab = {}
    for tab in sorted({v[0] for v in SIDRA.values()}):
        url = f"https://servicodados.ibge.gov.br/api/v3/agregados/{tab}/metadados"
        try:
            r, url, cons = baixar(url, RAW_IBGE / f"sidra_{tab}_metadados.json")
            meta_tab[tab] = (r.json(), url, cons)
        except Exception as e:  # noqa: BLE001
            pendencias.append({"serie": f"sidra_{tab}_metadados", "erro": repr(e)})
    ini = INICIO.strftime("%Y%m")
    for sid, (tab, cls, cat, var) in SIDRA.items():
        try:
            url = f"https://apisidra.ibge.gov.br/values/t/{tab}/n1/all/v/{var}/p/{ini}-209912/c{cls}/{cat}"
            destino = RAW_IBGE / f"sidra_{tab}_c{cls}_{cat}_v{var}.json"
            r, url, cons = baixar(url, destino, params={"formato": "json"})
            linhas = r.json()[1:]
            dados = [{"data": f"{l['D3C'][:4]}-{l['D3C'][4:]}", "valor": float(l["V"])}
                     for l in linhas if re.fullmatch(r"-?\d+(\.\d+)?", l["V"])]
            nao_num = [l["D3C"] for l in linhas if not re.fullmatch(r"-?\d+(\.\d+)?", l["V"])]
            l0 = linhas[0]
            m, _, _ = meta_tab.get(tab, ({}, None, None))
            series[sid] = {
                "nome": f"{m.get('nome', 'Tabela ' + str(tab))} — {l0['D2N']} — {l0['D4N']} — Brasil",
                "unidade": l0["MN"], "frequencia": "mensal",
                "fonte": "IBGE — SIDRA, Pesquisa Industrial Mensal - Produção Física (PIM-PF)",
                "codigo": f"tabela {tab}, variável {var}, classificação {cls}, categoria {cat}",
                "url": url, "consultado_em": cons, "arquivo_bruto": rel(destino), "sha256_bruto": sha256(r.content),
                "metadados": {"url_metadados": f"https://servicodados.ibge.gov.br/api/v3/agregados/{tab}/metadados",
                              "arquivo_metadados": rel(RAW_IBGE / f"sidra_{tab}_metadados.json")},
                "observacoes": ([f"Períodos sem valor numérico ignorados: {nao_num}"] if nao_num else []),
                "dados": dados,
            }
            print(f"SIDRA {tab} {sid}: {len(dados)} obs, {dados[0]['data']}..{dados[-1]['data']} "
                  f"último={dados[-1]['valor']}")
        except Exception as e:  # noqa: BLE001
            pendencias.append({"serie": sid, "fonte": "IBGE SIDRA", "codigo": tab, "erro": repr(e)})
            print(f"FALHA SIDRA {sid}: {e!r}")


# ---------------------------------------------------------------- Mercado: minério
def ler_xlsx(path: Path, nome_aba: str) -> dict:
    """Leitor mínimo de xlsx (stdlib) -> {linha: {coluna: texto}}."""
    z = zipfile.ZipFile(path)
    wb = z.read("xl/workbook.xml").decode()
    rid = re.search(rf'<sheet [^>]*name="{re.escape(nome_aba)}"[^>]*r:id="([^"]+)"', wb).group(1)
    rels = z.read("xl/_rels/workbook.xml.rels").decode()
    alvo = re.search(rf'Id="{rid}"[^>]*Target="([^"]+)"', rels).group(1)
    ss = [html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S)))
          for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode(), re.S)]
    linhas = {}
    for row in re.finditer(r'<row [^>]*r="(\d+)"[^>]*>(.*?)</row>', z.read("xl/" + alvo).decode(), re.S):
        celulas = {}
        for c in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', row.group(2), re.S):
            col, attrs, inner = c.groups()
            v = re.search(r"<v>(.*?)</v>", inner or "")
            if v:
                celulas[col] = ss[int(v.group(1))] if 't="s"' in attrs else html.unescape(v.group(1))
        linhas[int(row.group(1))] = celulas
    return linhas


def coletar_minerio(series: dict):
    destino = RAW_MKT / "worldbank_CMO-Historical-Data-Monthly.xlsx"
    try:
        url_xlsx = WB_FALLBACK
        try:
            pg = requests.get(WB_PAGINA, timeout=TIMEOUT)
            pg.raise_for_status()
            achados = re.findall(r'https://[^"\']*CMO-Historical-Data-Monthly\.xlsx', pg.text)
            if achados:
                url_xlsx = achados[0]
        except Exception as e:  # noqa: BLE001
            pendencias.append({"serie": "minerio_ferro", "aviso": f"página do Pink Sheet indisponível, "
                               f"usado link conhecido: {e!r}"})
        r, url, cons = baixar(url_xlsx, destino)
        linhas = ler_xlsx(destino, "Monthly Prices")
        atualizado = next((v for l in linhas.values() for v in l.values() if str(v).startswith("Updated on")), None)
        cab = next(n for n, l in linhas.items() if WB_COLUNA in l.values())
        col = next(k for k, v in linhas[cab].items() if v == WB_COLUNA)
        unidade = linhas[cab + 1].get(col)
        dados = []
        for n in sorted(linhas):
            per = linhas[n].get("A", "")
            m = re.fullmatch(r"(\d{4})M(\d{2})", per)
            if not m or (int(m.group(1)), int(m.group(2))) < (INICIO.year, INICIO.month):
                continue
            v = linhas[n].get(col)
            try:
                dados.append({"data": f"{m.group(1)}-{m.group(2)}", "valor": float(v)})
            except (TypeError, ValueError):
                continue
        desc = ler_xlsx(destino, "Description")
        descricao = next((v for l in desc.values() for v in l.values()
                          if str(v).startswith("Iron ore, spot in US dollar")), None)
        series["minerio_ferro_62fe_cfr_china"] = {
            "nome": f"{WB_COLUNA} — Iron ore (any origin) fines, spot price, c.f.r. China, 62% Fe",
            "unidade": "US$/tonelada métrica seca (dmt)",
            "unidade_no_arquivo": unidade, "frequencia": "mensal",
            "fonte": "Banco Mundial — Commodity Price Data (Pink Sheet), CMO Historical Data Monthly",
            "codigo": f"aba 'Monthly Prices', coluna {col} ('{WB_COLUNA}')",
            "url": url, "consultado_em": cons, "arquivo_bruto": rel(destino), "sha256_bruto": sha256(r.content),
            "observacoes": [
                f"Edição do arquivo: {atualizado}.",
                f"O cabeçalho do arquivo traz a unidade '{unidade}', mas a descrição oficial (aba Description) "
                f"diz: '{descricao}'. Desde dez/2008 o dado é spot em US$/tonelada seca; 'dmtu' vale para o "
                "período de contratos anuais. Para 2018+ a unidade é US$/t seca.",
                "O arquivo contém a aba 'Mismatch Details' (revisões do próprio Banco Mundial entre edições): "
                "valores recentes podem ser revisados na próxima edição.",
            ],
            "dados": dados,
        }
        print(f"WB minério: {len(dados)} obs, {dados[0]['data']}..{dados[-1]['data']} último={dados[-1]['valor']}")
        return
    except Exception as e:  # noqa: BLE001
        pendencias.append({"serie": "minerio_ferro", "fonte": "Banco Mundial Pink Sheet", "erro": repr(e)})
        print(f"FALHA Banco Mundial: {e!r}; tentando FRED")
    try:
        destino = RAW_MKT / "fred_PIRONUSDM.csv"
        r, url, cons = baixar(FRED_URL, destino)
        df = pd.read_csv(destino)
        df = df[pd.to_datetime(df.iloc[:, 0]) >= pd.Timestamp(INICIO)]
        series["minerio_ferro_62fe_cfr_china"] = {
            "nome": "Global price of Iron Ore (PIRONUSDM)", "unidade": "US$/tonelada métrica",
            "frequencia": "mensal", "fonte": "FRED — Federal Reserve Bank of St. Louis (origem: FMI)",
            "codigo": "PIRONUSDM", "url": url, "consultado_em": cons, "arquivo_bruto": rel(destino),
            "sha256_bruto": sha256(r.content),
            "dados": [{"data": str(d)[:7], "valor": float(v)} for d, v in zip(df.iloc[:, 0], df.iloc[:, 1])
                      if str(v) not in (".", "nan")],
        }
    except Exception as e:  # noqa: BLE001
        pendencias.append({"serie": "minerio_ferro", "fonte": "FRED PIRONUSDM", "erro": repr(e)})
        print(f"FALHA FRED: {e!r}")


def main():
    for p in (RAW_BCB, RAW_IBGE, RAW_MKT, PROC):
        p.mkdir(parents=True, exist_ok=True)
    gerado = agora()
    series = {}
    coletar_sgs(series)
    if {"usdbrl_ptax_venda_media_mensal", "ipca_var_mensal", "ipca_acum_12m"} <= series.keys():
        validar_sgs(series)
    coletar_sidra(series)
    coletar_minerio(series)
    pendencias.append({
        "serie": "preco_aco_hrc",
        "erro": "Não coletado: não há série mensal aberta de HRC/aço no Pink Sheet mensal (aço aparece só "
                "na aba Description, sem série mensal na aba 'Monthly Prices'); IPA-M/FGV de produtos "
                "siderúrgicos não é aberto; o FRED, alternativa possível (índices PPI de aço), devolveu HTTP 404 "
                "com página anti-robô para download automatizado via fredgraph.csv ao testar PIRONUSDM em "
                "06/11/2026, então não foi usado.",
    })
    saida = {
        "gerado_em": gerado,
        "script": "pipeline/05_macro.py",
        "inicio_coleta": INICIO.strftime("%Y-%m"),
        "nota_periodo": "Coleta começa em jan/2018 para que variações de 12 meses existam desde jan/2019.",
        "series": series,
        "validacoes": validacoes,
        "pendencias": pendencias,
    }
    (PROC / "macro.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(series)} séries -> {rel(PROC / 'macro.json')}; validações={validacoes}; "
          f"pendências={len(pendencias)}")


if __name__ == "__main__":
    main()

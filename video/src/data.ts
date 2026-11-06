/**
 * Todos os números do vídeo saem daqui, lidos direto dos JSONs do projeto
 * (nada digitado à mão). Caminhos relativos a video/src/.
 */
import app from '../../app/data.json';
import verif from '../../data/processed/verificacao.json';
import teste from '../../data/processed/teste_ia_completo.json';
import itr from '../../data/processed/metricas_itr.json';
import hist from '../../data/processed/historico.json';
import sBancos from '../../data/processed/setores/bancos.json';
import sEnergia from '../../data/processed/setores/energia.json';
import sPetroleo from '../../data/processed/setores/petroleo.json';
import sMineracao from '../../data/processed/setores/mineracao.json';
import sVarejo from '../../data/processed/setores/varejo.json';

type Setor = {nome: string; empresas: {ticker: string; nome: string; periodo?: string; metricas: Record<string, {valor: number | null} | null>}[]};
const setores = [sBancos, sEnergia, sPetroleo, sMineracao, sVarejo] as unknown as Setor[];
type Hist = {empresas: Record<string, {anos: Record<string, Record<string, {valor: number | null}>>}>};
const H = (hist as unknown as Hist).empresas;
const serie = (tk: string) =>
  Object.keys(H[tk].anos).sort().map((ano) => ({ano, v: H[tk].anos[ano].margem_ebitda.valor as number}));
const bancos = (sBancos as unknown as Setor).empresas;

type Metrica = {valor: number; pagina?: number; trecho?: string; unidade_original?: string; valor_como_aparece?: string};
const M = (itr as unknown as {metricas: Record<string, Metrica>}).metricas;

/** Formata em pt-BR. */
export const fmt = (v: number, dec = 0) =>
  v.toLocaleString('pt-BR', {minimumFractionDigits: dec, maximumFractionDigits: dec});

const met = app.MET as Record<string, {nome: string; un: string; vals: Record<string, (number | null)[]>}>;
const v = (k: string, e: 'g' | 'u', i: 0 | 1) => met[k].vals[e][i] as number;

export const D = {
  veredito: app.SETOR.veredito,
  sens: app.SETOR.sens.slice(0, 3),
  topicos: app.SETOR.topicos.map((t) => t.t),
  emp: app.EMP,
  linhas: (['receita', 'ebitda_aj', 'margem_aj', 'lucro'] as const).map((k) => ({
    k,
    nome: met[k].nome,
    un: met[k].un,
    g: [v(k, 'g', 0), v(k, 'g', 1)],
    u: [v(k, 'u', 0), v(k, 'u', 1)],
  })),
  provEbitdaG: (app.PROV as unknown as Record<string, {fonte: string; pagina: number; trecho: string; como: string; unOrig: string; crit: string; arquivo: string}>)['ebitda_aj|g|0'],
  margemAN: M['g_margem_an_3t26'].valor, // 27,69 %
  pesoAN: M['g_peso_an_ebitda_3t26'].valor, // 77,22 %
  impairmentU: M['u_impairment_3t25'], // 2.226,332 R$ mi, pág. 28
  verif: verif.resumo,
  cruzamentos: verif.cruzamentos,
  armadilhas: verif.armadilhas,
  ia: {acertosValor: teste.acertos_valor, acertosPagina: teste.acertos_pagina, total: teste.total,
    pagG: teste.paginas_enviadas.gerdau.length, pagU: teste.paginas_enviadas.usiminas.length},
  cvm: app.VERIF.cvm,
  /** Menu "+": outros setores com a contagem real de empresas de cada JSON. */
  panorama: setores.map((x) => ({nome: x.nome, n: x.empresas.length})),
  /** Margem EBITDA anual 2021–2025 (historico.json). */
  histG: serie('GGBR4'),
  histU: serie('USIM5'),
  /** Bancos: ticker, P/L, P/VP e ROE 12m (setores/bancos.json). */
  bancos: bancos.map((b) => ({
    tk: b.ticker,
    nome: b.nome,
    per: b.periodo ?? '',
    roe: b.metricas.roe_12m?.valor as number,
    pl: b.metricas.p_l?.valor ?? null,
    pvp: b.metricas.p_vp?.valor ?? null,
  })),
  csnAviso: (app.EMP.c as {aviso?: string}).aviso ?? '',
};

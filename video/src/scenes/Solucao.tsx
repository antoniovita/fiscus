import React from 'react';
import {Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, card, sec} from '../theme';
import {AppFrame, Appear, Assistente, Cursor, Pill, Stage, useIn, useLin} from '../ui';
import {D, fmt} from '../data';

/** Janela do app ocupando a área acima da legenda. Área útil (children): 1510 × 770. */
const Janela: React.FC<{step: number | null; children: React.ReactNode}> = ({step, children}) => {
  const p = useIn(0);
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 44, bottom: 210, opacity: p}}>
      <AppFrame step={step}>{children}</AppFrame>
    </div>
  );
};

/** Mensagem do usuário: bolha cinza à direita. */
const Bolha: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', justifyContent: 'flex-end'}}>
    <div style={{background: '#ececf0', color: C.ink, fontSize: 26, padding: '14px 24px', borderRadius: 22}}>
      {children}
    </div>
  </div>
);

const Enviar: React.FC<{pressed?: number; size?: number}> = ({pressed = 0, size = 46}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: C.ink,
      color: '#fff',
      fontSize: size * 0.48,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `scale(${1 - pressed * 0.08})`,
      flexShrink: 0,
    }}
  >
    ↑
  </div>
);

/* ---------------- Tela inicial + Etapa 1 · Tese do setor ---------------- */
const PERGUNTA = 'Este setor é um bom lugar para investir?';
const SUGESTOES = [PERGUNTA, 'Quais empresas do setor vale comparar?', 'Monte a apresentação para o comitê'];
const CW = 860; // largura da caixa de composição
const MAIN_W = 1510;

const Inicio: React.FC<{press: number}> = ({press}) => {
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [sec(0.5), sec(1.9)], [0, PERGUNTA.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <Appear at={0.1}>
        <div style={{fontSize: 54, fontWeight: 600, letterSpacing: '-0.035em', textAlign: 'center'}}>Boa tarde, Antonio.</div>
      </Appear>
      <Appear at={0.3}>
        <div
          style={{
            width: CW,
            marginTop: 40,
            background: C.card,
            borderRadius: 22,
            border: `1px solid ${C.line}`,
            boxShadow: '0 2px 10px rgba(0,0,0,.05)',
            padding: '22px 24px 18px 28px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{fontSize: 26, color: n ? C.ink : C.faint, minHeight: 34}}>{n ? PERGUNTA.slice(0, n) : 'Pergunte sobre um setor ou empresa…'}</div>
          <div style={{display: 'flex', alignItems: 'center', marginTop: 22}}>
            <div style={{fontSize: 19, fontWeight: 500, padding: '7px 14px', borderRadius: 980, border: `1px solid ${C.line}`}}>Setor: Siderurgia</div>
            <div style={{flex: 1}} />
            <Enviar pressed={press} />
          </div>
        </div>
      </Appear>
      <Appear at={0.5}>
        <div style={{width: CW, marginTop: 22, display: 'flex', flexDirection: 'column'}}>
          {SUGESTOES.map((t, i) => (
            <div key={t} style={{fontSize: 21, color: C.muted, padding: '12px 28px', borderTop: i ? `1px solid ${C.hair}` : 'none'}}>
              {t}
            </div>
          ))}
        </div>
      </Appear>
    </div>
  );
};

const Tese: React.FC = () => {
  const frame = useCurrentFrame();
  const chat = frame >= sec(2.9);
  const enviar = useLin(2.4, 2.55) - useLin(2.6, 2.75);
  const press = useLin(11.6, 11.8) - useLin(11.9, 12.1);
  // botão de enviar: centro da caixa de composição, canto direito
  const ex = (MAIN_W + CW) / 2 - 24 - 23;
  const ey = 150 + 66 + 40 + 22 + 34 + 22 + 23;
  return (
    <Janela step={chat ? 0 : null}>
      {!chat && <Inicio press={enviar} />}
      {chat && (
        <Sequence from={sec(2.9)} layout="none">
          <div style={{position: 'absolute', left: 150, right: 150, top: 30, display: 'flex', flexDirection: 'column', gap: 24}}>
            <Appear at={0}>
              <Bolha>
                <span style={{color: C.muted}}>Setor: Siderurgia · </span>
                {PERGUNTA}
              </Bolha>
            </Appear>
            <Appear at={0.4}>
              <Assistente />
              <div style={{...card, padding: '28px 36px', border: `1px solid ${C.hair}`}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                  <div style={{fontSize: 21, fontWeight: 600, color: C.muted}}>Veredito · Siderurgia</div>
                  <div style={{background: C.fill, color: C.ink, fontWeight: 700, fontSize: 22, padding: '5px 16px', borderRadius: 980}}>
                    {D.veredito.nivel}
                  </div>
                </div>
                <div style={{fontSize: 33, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, marginTop: 14}}>
                  {D.veredito.frase}
                </div>
                <div style={{display: 'flex', gap: 14, marginTop: 22}}>
                  {D.sens.map((s, i) => (
                    <Appear key={s.d} at={2.6 + i * 0.5} style={{flex: 1}}>
                      <div style={{background: C.bg, borderRadius: 14, padding: '14px 18px', height: 120, boxSizing: 'border-box'}}>
                        <div style={{fontSize: 20, fontWeight: 600}}>{s.d}</div>
                        <div style={{fontSize: 18, color: C.muted, marginTop: 6, lineHeight: 1.3}}>{s.dado}</div>
                      </div>
                    </Appear>
                  ))}
                </div>
                <div style={{fontSize: 16, color: C.faint, marginTop: 12}}>Fontes: {D.sens.map((s) => s.f).join(' · ')}</div>
              </div>
            </Appear>
          </div>
          <Appear at={5.6} style={{position: 'absolute', right: 150, bottom: 30, display: 'flex', gap: 14}}>
            <Pill>Perguntar sobre o setor</Pill>
            <Pill dark pressed={press}>Aprovar e comparar empresas</Pill>
          </Appear>
        </Sequence>
      )}
      <Cursor path={[[1.2, 900, 520], [2.2, ex, ey], [2.9, ex, ey], [9.6, 1000, 600], [11.4, 1220, 712], [13, 1220, 712]]} clickAt={[2.5, 11.7]} />
    </Janela>
  );
};

/* ---------------- Etapa 2 · Escolha das empresas ---------------- */
const EmpCard: React.FC<{k: 'g' | 'u' | 'c' | 'f'; sel: boolean; at: number}> = ({k, sel, at}) => {
  const e = D.emp[k] as {nome: string; tk: string; desc: string; ok: boolean; aviso?: string};
  const cor = {g: C.gerdau, u: C.usiminas, c: C.csn, f: '#9aa0a9'}[k];
  return (
    <Appear at={at} style={{flex: 1}}>
      <div
        style={{
          ...card,
          height: 300,
          padding: 28,
          boxSizing: 'border-box',
          opacity: e.ok ? 1 : 0.5,
          outline: sel ? `3px solid ${C.ink}` : `1px solid ${C.hair}`,
          position: 'relative',
        }}
      >
        <div style={{width: 56, height: 56, borderRadius: 14, background: cor, color: '#fff', fontWeight: 700, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {e.nome[0]}
        </div>
        <div style={{fontSize: 34, fontWeight: 700, letterSpacing: '-0.035em', marginTop: 20}}>{e.nome}</div>
        <div style={{fontSize: 21, color: C.muted, marginTop: 4}}>{e.tk}</div>
        <div style={{fontSize: 19, color: C.ink, marginTop: 12, lineHeight: 1.3}}>{e.desc}</div>
        {!e.ok && <div style={{fontSize: 18, color: C.muted, marginTop: 8}}>Sem dados verificados</div>}
        {e.aviso && <div style={{fontSize: 17, color: C.orange, marginTop: 8}}>Dados do 2T26</div>}
        {sel && (
          <div style={{position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: 20, background: C.ink, color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            ✓
          </div>
        )}
      </div>
    </Appear>
  );
};

const Escolha: React.FC = () => {
  const frame = useCurrentFrame();
  const selG = frame >= sec(2.6);
  const selU = frame >= sec(4.1);
  const press = useLin(6.4, 6.6) - useLin(6.7, 6.9);
  return (
    <Janela step={1}>
      <div style={{position: 'absolute', left: 90, right: 90, top: 40}}>
        <Appear at={0.2}>
          <div style={{fontSize: 46, fontWeight: 700, letterSpacing: '-0.04em'}}>Escolha duas empresas para comparar</div>
          <div style={{fontSize: 24, color: C.muted, marginTop: 8}}>Principais siderúrgicas listadas na B3</div>
        </Appear>
        <div style={{display: 'flex', gap: 26, marginTop: 40}}>
          <EmpCard k="g" sel={selG} at={0.5} />
          <EmpCard k="u" sel={selU} at={0.7} />
          <EmpCard k="c" sel={false} at={0.9} />
          <EmpCard k="f" sel={false} at={1.1} />
        </div>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 40, opacity: selU ? 1 : 0.4}}>
          <Pill dark pressed={press}>Comparar estas duas</Pill>
        </div>
      </div>
      <Cursor
        path={[[1.4, 800, 650], [2.4, 250, 330], [3.4, 250, 330], [3.9, 590, 330], [5, 590, 330], [6.2, 1300, 545], [9, 1300, 545]]}
        clickAt={[2.5, 4, 6.5]}
      />
    </Janela>
  );
};

/* ---------------- Comparativo + clique no número ---------------- */
const LBL = 330;
const COL = 140;
const HEAD = 120;
const ROW = 96;
const TX = 40;
const TY = 36;

const valor = (k: string, n: number) => (k === 'margem_aj' ? `${fmt(n, 1)}%` : fmt(n));

const Comparativo: React.FC = () => {
  const frame = useCurrentFrame();
  const hlMargem = useLin(1.2, 1.8) * (1 - useLin(11.5, 12));
  const painel = useIn(14.8);
  const clicked = frame >= sec(14.2);
  const pulse = clicked ? 1 : 0;
  const trechoHl = useLin(16.5, 17.5);
  const p = D.provEbitdaG;
  const mi = D.linhas[1].g[0];

  return (
    <Janela step={2}>
      {/* Tabela */}
      <Appear at={0.1} style={{position: 'absolute', left: TX, top: TY}}>
        <div style={{...card, width: LBL + COL * 4, paddingBottom: 18, position: 'relative'}}>
          <div style={{height: HEAD, display: 'flex', alignItems: 'flex-end', paddingBottom: 18, boxSizing: 'border-box'}}>
            <div style={{width: LBL, paddingLeft: 34, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em'}}>KPIs lado a lado</div>
            {[['Gerdau', C.gerdau], ['Usiminas', C.usiminas]].map(([n, c]) => (
              <div key={n} style={{width: COL * 2, textAlign: 'center'}}>
                <div style={{fontSize: 24, fontWeight: 700, color: c}}>{n}</div>
                <div style={{display: 'flex', fontSize: 18, color: C.muted, marginTop: 4}}>
                  <div style={{width: COL}}>3T26</div>
                  <div style={{width: COL}}>3T25</div>
                </div>
              </div>
            ))}
          </div>
          {D.linhas.map((l, r) => {
            const hl = l.k === 'margem_aj' ? hlMargem : 0;
            return (
              <div
                key={l.k}
                style={{
                  height: ROW,
                  display: 'flex',
                  alignItems: 'center',
                  borderTop: `1px solid ${C.hair}`,
                  background: `rgba(0,0,0,${0.05 * hl})`,
                }}
              >
                <div style={{width: LBL, paddingLeft: 34, boxSizing: 'border-box'}}>
                  <div style={{fontSize: 25, fontWeight: 600}}>{l.nome}</div>
                  <div style={{fontSize: 18, color: C.muted}}>{l.un}</div>
                </div>
                {[l.g[0], l.g[1], l.u[0], l.u[1]].map((n, i) => {
                  const alvo = r === 1 && i === 0;
                  return (
                    <div key={i} style={{width: COL, textAlign: 'center'}}>
                      <span
                        style={{
                          fontSize: 30,
                          fontWeight: i % 2 === 0 ? 700 : 400,
                          color: i % 2 === 0 ? C.ink : C.muted,
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.02em',
                          textDecoration: 'underline dotted',
                          textDecorationColor: C.line,
                          textUnderlineOffset: 6,
                          padding: '4px 10px',
                          borderRadius: 10,
                          background: alvo && pulse ? C.blueSoft : 'transparent',
                          outline: alvo && pulse ? `2px solid ${C.blue}` : 'none',
                          ...(n < 0 ? {color: C.red} : {}),
                        }}
                      >
                        {valor(l.k, n)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{fontSize: 18, color: C.faint, padding: '14px 34px 0'}}>
            Clique em qualquer número para ver de onde ele saiu · ITRs 3T26, consolidado
          </div>
        </div>
      </Appear>

      {/* Leituras ao lado */}
      <div style={{position: 'absolute', left: TX + LBL + COL * 4 + 34, right: 40, top: TY, display: 'flex', flexDirection: 'column', gap: 22}}>
        <Appear at={4.5}>
          <div style={{...card, padding: '26px 30px'}}>
            <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>Gerdau · América do Norte · 3T26</div>
            <div style={{display: 'flex', gap: 34, marginTop: 10}}>
              <div>
                <div style={{fontSize: 56, fontWeight: 700, letterSpacing: '-0.045em'}}>{fmt(D.pesoAN, 1)}%</div>
                <div style={{fontSize: 20, color: C.muted}}>do EBITDA ajustado</div>
              </div>
              <div>
                <div style={{fontSize: 56, fontWeight: 700, letterSpacing: '-0.045em'}}>{fmt(D.margemAN, 1)}%</div>
                <div style={{fontSize: 20, color: C.muted}}>de margem EBITDA</div>
              </div>
            </div>
            <div style={{fontSize: 17, color: C.faint, marginTop: 10}}>Nota 22 · ITR Gerdau, pág. 72</div>
          </div>
        </Appear>
        <Appear at={8}>
          <div style={{...card, padding: '26px 30px'}}>
            <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>Usiminas · lucro do 3T25</div>
            <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.2}}>
              Prejuízo de R$ {fmt(Math.abs(D.linhas[3].u[1]))} mi com impairment de R$ {fmt(D.impairmentU.valor)} mi
            </div>
            <div style={{fontSize: 17, color: C.faint, marginTop: 10}}>Ajuste do EBITDA · ITR Usiminas, pág. {D.impairmentU.pagina}</div>
          </div>
        </Appear>
      </div>

      {/* Painel de proveniência */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 700,
          transform: `translateX(${(1 - painel) * 740}px)`,
          background: C.card,
          boxShadow: '-20px 0 60px rgba(0,0,0,.12)',
          padding: '34px 40px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{background: C.greenSoft, color: C.green, fontWeight: 600, fontSize: 19, padding: '5px 14px', borderRadius: 980}}>✓ Verificado</div>
          <div style={{fontSize: 19, color: C.muted}}>{p.crit}</div>
        </div>
        <div style={{fontSize: 24, color: C.muted, marginTop: 20}}>EBITDA ajustado · Gerdau · 3T26</div>
        <div style={{fontSize: 76, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1.05}}>R$ {fmt(mi)} mi</div>
        <div style={{fontSize: 26, fontWeight: 600, marginTop: 18}}>
          {p.fonte} · <span style={{color: C.blue}}>pág. {p.pagina}</span>
        </div>
        {/* página do ITR */}
        <div style={{marginTop: 18, background: C.bg, borderRadius: 16, padding: '22px 26px', border: `1px solid ${C.hair}`}}>
          <div style={{fontSize: 16, color: C.faint, marginBottom: 12}}>{p.arquivo} · página {p.pagina}</div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{height: 10, borderRadius: 5, background: C.line, opacity: 0.6, marginBottom: 12, width: `${88 - i * 14}%`}} />
          ))}
          <div
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 34,
              fontWeight: 600,
              padding: '10px 14px',
              borderRadius: 10,
              background: `rgba(255,204,0,${0.55 * trechoHl})`,
              display: 'inline-block',
              margin: '4px 0 14px',
            }}
          >
            {p.trecho}
          </div>
          {[0, 1].map((i) => (
            <div key={i} style={{height: 10, borderRadius: 5, background: C.line, opacity: 0.6, marginBottom: 12, width: `${80 - i * 20}%`}} />
          ))}
        </div>
        <div style={{display: 'flex', gap: 30, marginTop: 20, fontSize: 21}}>
          <div>
            <div style={{color: C.muted}}>Como aparece</div>
            <div style={{fontWeight: 600, marginTop: 2}}>{p.como}</div>
          </div>
          <div>
            <div style={{color: C.muted}}>Unidade original</div>
            <div style={{fontWeight: 600, marginTop: 2}}>{p.unOrig}</div>
          </div>
        </div>
      </div>

      <Cursor
        path={[[11.8, 1200, 640], [13.8, TX + LBL + COL / 2 + 20, TY + HEAD + ROW * 1 + ROW / 2 + 10], [22, TX + LBL + COL / 2 + 20, TY + HEAD + ROW * 1 + ROW / 2 + 10]]}
        clickAt={[14.1]}
      />
    </Janela>
  );
};

/* ---------------- Etapa 3 · Tese e preço-alvo ----------------
 * Os valores desta etapa ainda não existem nos JSONs: a interface aparece sem números
 * (sliders sem escala, campos de resultado como placeholders). Não inventar valores. */
const PREMISSAS: {nome: string; de: number; ate: number; t0: number; t1: number}[] = [
  {nome: 'Taxa livre de risco', de: 0.55, ate: 0.42, t0: 1.0, t1: 1.9},
  {nome: 'Beta', de: 0.4, ate: 0.58, t0: 2.4, t1: 3.3},
  {nome: 'Crescimento na perpetuidade', de: 0.35, ate: 0.5, t0: 3.8, t1: 4.6},
];
const SL_X = 60; // início da trilha dentro do card de premissas
const SL_W = 560;
const PREM_LEFT = 60;
const PREM_TOP = 150;
const SL_ROW = 120;

const Slider: React.FC<{v: number}> = ({v}) => (
  <div style={{position: 'relative', width: SL_W, height: 28}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 12, height: 4, borderRadius: 2, background: C.fill}} />
    <div style={{position: 'absolute', left: 0, width: SL_W * v, top: 12, height: 4, borderRadius: 2, background: C.ink}} />
    <div
      style={{
        position: 'absolute',
        left: SL_W * v - 14,
        top: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        border: `1px solid ${C.line}`,
      }}
    />
  </div>
);

const Vazio: React.FC<{w: number; h?: number}> = ({w, h = 34}) => (
  <div style={{width: w, height: h, borderRadius: 8, background: C.fill}} />
);

const PrecoAlvo: React.FC = () => {
  const frame = useCurrentFrame();
  const res = useIn(5.0);
  const vals = PREMISSAS.map((p) =>
    interpolate(frame, [sec(p.t0), sec(p.t1)], [p.de, p.ate], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const g = D.emp.g as {nome: string; tk: string};
  // cursor: arrasta o botão de cada slider
  const kx = (i: number, v: number) => PREM_LEFT + SL_X + SL_W * v;
  const ky = (i: number) => PREM_TOP + 161 + i * SL_ROW + 14;
  const path: [number, number, number][] = [[0.4, 900, 600]];
  PREMISSAS.forEach((p, i) => {
    path.push([p.t0 - 0.35, kx(i, p.de), ky(i)], [p.t0, kx(i, p.de), ky(i)], [p.t1, kx(i, p.ate), ky(i)]);
  });
  path.push([8, kx(2, PREMISSAS[2].ate) + 40, ky(2) + 60]);
  return (
    <Janela step={3}>
      <div style={{position: 'absolute', left: 150, right: 150, top: 30}}>
        <Appear at={0}>
          <Bolha>Monte a tese e o preço-alvo de {g.nome}</Bolha>
        </Appear>
      </div>
      <Appear at={0.3} style={{position: 'absolute', left: PREM_LEFT, top: PREM_TOP - 44}}>
        <Assistente />
      </Appear>
      <Appear at={0.4} style={{position: 'absolute', left: PREM_LEFT, top: PREM_TOP, width: SL_W + SL_X * 2}}>
        <div style={{...card, border: `1px solid ${C.hair}`, padding: `30px ${SL_X}px 34px`, boxSizing: 'border-box'}}>
          <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em'}}>Premissas</div>
          <div style={{fontSize: 18, color: C.muted, marginTop: 4}}>Ajuste e o preço-alvo é recalculado</div>
          <div style={{marginTop: 10}}>
            {PREMISSAS.map((p, i) => (
              <div key={p.nome} style={{height: SL_ROW, paddingTop: 22, boxSizing: 'border-box'}}>
                <div style={{fontSize: 21, fontWeight: 600, marginBottom: 16}}>{p.nome}</div>
                <Slider v={vals[i]} />
              </div>
            ))}
          </div>
        </div>
      </Appear>
      <div
        style={{
          position: 'absolute',
          left: PREM_LEFT + SL_W + SL_X * 2 + 40,
          right: 60,
          top: PREM_TOP,
          opacity: res,
          transform: `translateY(${(1 - res) * 24}px)`,
        }}
      >
        <div style={{...card, border: `1px solid ${C.hair}`, padding: '30px 40px 34px'}}>
          <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>
            {g.nome} · {g.tk} · tese e preço-alvo
          </div>
          <div style={{marginTop: 26}}>
            <div style={{fontSize: 20, color: C.muted}}>Recomendação</div>
            <div style={{marginTop: 10}}>
              <Vazio w={220} h={44} />
            </div>
          </div>
          <div style={{display: 'flex', gap: 60, marginTop: 30}}>
            <div>
              <div style={{fontSize: 20, color: C.muted}}>Preço-alvo 12m</div>
              <div style={{marginTop: 10}}>
                <Vazio w={200} />
              </div>
            </div>
            <div>
              <div style={{fontSize: 20, color: C.muted}}>Potencial</div>
              <div style={{marginTop: 10}}>
                <Vazio w={140} />
              </div>
            </div>
          </div>
          <div style={{marginTop: 30, borderTop: `1px solid ${C.hair}`, paddingTop: 22}}>
            <div style={{fontSize: 20, color: C.muted, marginBottom: 12}}>Tese</div>
            {[92, 84, 60].map((w) => (
              <div key={w} style={{height: 10, borderRadius: 5, background: C.fill, marginBottom: 12, width: `${w}%`}} />
            ))}
          </div>
        </div>
      </div>
      <Cursor path={path} clickAt={PREMISSAS.map((p) => p.t0)} />
    </Janela>
  );
};

/* ---------------- Etapa 4 · Apresentação (modal escuro) ---------------- */
const SLIDES = [
  'Tese do setor', 'O que move o setor', 'Estrutura, cadeia e regulação', 'Gerdau × Usiminas', 'KPIs lado a lado',
  'Modelos de negócio', 'Múltiplos', 'Leitura qualitativa e riscos', 'Como sabemos que está certo', 'Fontes e metodologia',
];
const MODAL = 30;
const SLIDE_H = 470;
const THUMB_H = 68;

const SlideCorpo: React.FC<{t: string; i: number; s: number}> = ({t, i, s}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: '#fff',
      padding: 44 * s,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      color: C.ink,
    }}
  >
    <div style={{fontSize: 16 * s, color: C.faint, display: 'flex', justifyContent: 'space-between'}}>
      <span>Siderurgia · Gerdau × Usiminas · 3T26</span>
      <span>{i + 1}/10</span>
    </div>
    <div style={{fontSize: 46 * s, fontWeight: 700, letterSpacing: '-0.035em', marginTop: 22 * s, lineHeight: 1.1}}>{t}</div>
    <div style={{flex: 1}} />
    {[0, 1, 2].map((l) => (
      <div key={l} style={{height: 12 * s, borderRadius: 6 * s, background: C.fill, marginTop: 14 * s, width: `${88 - l * 20}%`}} />
    ))}
    <div style={{fontSize: 13 * s, color: C.faint, marginTop: 20 * s}}>Exercício acadêmico · não é recomendação de investimento</div>
  </div>
);

const Apresentacao: React.FC = () => {
  const frame = useCurrentFrame();
  const press = useLin(4.2, 4.4) - useLin(4.5, 4.7);
  const toast = useIn(4.9);
  const modal = useIn(0.2);
  const atual = Math.min(3, Math.floor(interpolate(frame, [sec(0.8), sec(3.6)], [0, 4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  return (
    <Janela step={4}>
      <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.35 * modal})`}} />
      <div
        style={{
          position: 'absolute',
          inset: MODAL,
          background: '#1d1d1f',
          borderRadius: 18,
          opacity: modal,
          transform: `scale(${0.97 + 0.03 * modal})`,
          boxShadow: '0 30px 80px rgba(0,0,0,.35)',
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        <div style={{height: 76, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 14}}>
          <Img src={staticFile('brand/fiscus-mark-white.png')} style={{height: 24, width: 'auto'}} />
          <div style={{fontSize: 22, fontWeight: 600}}>Apresentação para o comitê</div>
          <div style={{fontSize: 18, color: 'rgba(255,255,255,.55)'}}>Dez slides, com a mensagem no título de cada um</div>
          <div style={{flex: 1}} />
          <div
            style={{
              background: '#fff',
              color: C.ink,
              fontSize: 20,
              fontWeight: 600,
              padding: '11px 24px',
              borderRadius: 980,
              transform: `scale(${1 - press * 0.05})`,
            }}
          >
            Baixar PDF
          </div>
          <div style={{fontSize: 26, color: 'rgba(255,255,255,.6)', marginLeft: 6}}>×</div>
        </div>
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 14}}>
          <div style={{height: SLIDE_H, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden'}}>
            <SlideCorpo t={SLIDES[atual]} i={atual} s={1} />
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 12, marginTop: 26}}>
          {SLIDES.map((t, i) => (
            <div
              key={t}
              style={{
                height: THUMB_H,
                aspectRatio: '16 / 9',
                borderRadius: 6,
                overflow: 'hidden',
                outline: i === atual ? '3px solid #fff' : '1px solid rgba(255,255,255,.15)',
                outlineOffset: i === atual ? 2 : 0,
                opacity: i === atual ? 1 : 0.6,
              }}
            >
              <SlideCorpo t={t} i={i} s={THUMB_H / SLIDE_H} />
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: MODAL + 24,
          transform: `translate(-50%, ${(1 - toast) * 40}px)`,
          opacity: toast,
          background: '#fff',
          color: C.ink,
          fontSize: 22,
          fontWeight: 500,
          padding: '14px 28px',
          borderRadius: 980,
          boxShadow: '0 8px 30px rgba(0,0,0,.3)',
          zIndex: 20,
        }}
      >
        PDF pronto para o comitê · 10 slides
      </div>
      <Cursor path={[[1.2, 760, 640], [3.9, 1340, 72], [8, 1340, 72]]} clickAt={[4.3]} />
    </Janela>
  );
};

/** Cena 2 (60 s): tese 13 · empresas 9 · comparativo 22 · tese e preço-alvo 8 · apresentação 8. */
export const Solucao: React.FC = () => (
  <Stage>
    <Sequence durationInFrames={sec(13)} name="Início + tese do setor">
      <Tese />
    </Sequence>
    <Sequence from={sec(13)} durationInFrames={sec(9)} name="Escolha das empresas">
      <Escolha />
    </Sequence>
    <Sequence from={sec(22)} durationInFrames={sec(22)} name="Comparativo + proveniência">
      <Comparativo />
    </Sequence>
    <Sequence from={sec(44)} durationInFrames={sec(8)} name="Tese e preço-alvo">
      <PrecoAlvo />
    </Sequence>
    <Sequence from={sec(52)} durationInFrames={sec(8)} name="Apresentação">
      <Apresentacao />
    </Sequence>
  </Stage>
);

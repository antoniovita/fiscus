import React from 'react';
import {interpolate, Sequence, useCurrentFrame} from 'remotion';
import {C, card, sec} from '../theme';
import {AppFrame, Appear, Cursor, Pill, Stage, useIn, useLin} from '../ui';
import {D, fmt} from '../data';

/** Janela do app ocupando a área acima da legenda. */
const Janela: React.FC<{step: number; children: React.ReactNode}> = ({step, children}) => {
  const p = useIn(0);
  return (
    <div style={{position: 'absolute', left: 80, right: 80, top: 44, bottom: 210, opacity: p}}>
      <AppFrame step={step}>{children}</AppFrame>
    </div>
  );
};

const Bolha: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', justifyContent: 'flex-end'}}>
    <div style={{background: C.blue, color: '#fff', fontSize: 28, padding: '16px 26px', borderRadius: 26, borderBottomRightRadius: 8}}>
      {children}
    </div>
  </div>
);

/* ---------------- Etapa 1 · Tese do setor ---------------- */
const Tese: React.FC = () => {
  const press = useLin(11.6, 11.8) - useLin(11.9, 12.1);
  return (
    <Janela step={0}>
      <div style={{position: 'absolute', left: 160, right: 160, top: 34, display: 'flex', flexDirection: 'column', gap: 26}}>
        <Appear at={0.6}>
          <Bolha>Este setor é um bom lugar para investir?</Bolha>
        </Appear>
        <Appear at={2.6}>
          <div style={{...card, padding: '34px 42px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <div style={{fontSize: 22, fontWeight: 600, color: C.muted}}>Veredito · Siderurgia</div>
              <div style={{background: C.orangeSoft, color: C.orange, fontWeight: 700, fontSize: 24, padding: '6px 18px', borderRadius: 980}}>
                {D.veredito.nivel}
              </div>
            </div>
            <div style={{fontSize: 38, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.18, marginTop: 16}}>
              {D.veredito.frase}
            </div>
            <div style={{display: 'flex', gap: 16, marginTop: 26}}>
              {D.sens.map((s, i) => (
                <Appear key={s.d} at={5.5 + i * 0.5} style={{flex: 1}}>
                  <div style={{background: C.bg, borderRadius: 16, padding: '16px 20px', height: 128, boxSizing: 'border-box'}}>
                    <div style={{fontSize: 21, fontWeight: 600}}>{s.d}</div>
                    <div style={{fontSize: 19, color: C.muted, marginTop: 6, lineHeight: 1.3}}>{s.dado}</div>
                  </div>
                </Appear>
              ))}
            </div>
            <div style={{fontSize: 18, color: C.faint, marginTop: 14}}>Fontes: {D.sens.map((s) => s.f).join(' · ')}</div>
          </div>
        </Appear>
        <Appear at={8.5} style={{display: 'flex', justifyContent: 'flex-end', gap: 14}}>
          <Pill>Perguntar sobre o setor</Pill>
          <Pill dark pressed={press}>Aprovar e comparar empresas</Pill>
        </Appear>
      </div>
      <Cursor path={[[9.6, 1200, 700], [11.4, 1430, 668], [13, 1430, 668]]} clickAt={[11.7]} />
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
          padding: 32,
          boxSizing: 'border-box',
          opacity: e.ok ? 1 : 0.5,
          outline: sel ? `4px solid ${C.blue}` : `1px solid ${C.hair}`,
          position: 'relative',
        }}
      >
        <div style={{width: 56, height: 56, borderRadius: 14, background: cor, color: '#fff', fontWeight: 700, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {e.nome[0]}
        </div>
        <div style={{fontSize: 38, fontWeight: 700, letterSpacing: '-0.035em', marginTop: 22}}>{e.nome}</div>
        <div style={{fontSize: 21, color: C.muted, marginTop: 4}}>{e.tk}</div>
        <div style={{fontSize: 21, color: C.ink, marginTop: 14, lineHeight: 1.3}}>{e.desc}</div>
        {!e.ok && <div style={{fontSize: 18, color: C.muted, marginTop: 8}}>Sem dados verificados</div>}
        {e.aviso && <div style={{fontSize: 17, color: C.orange, marginTop: 8}}>Dados do 2T26</div>}
        {sel && (
          <div style={{position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: 20, background: C.blue, color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
        path={[[1.4, 900, 650], [2.4, 300, 330], [3.4, 300, 330], [3.9, 700, 330], [5, 700, 330], [6.2, 1470, 600], [9, 1470, 600]]}
        clickAt={[2.5, 4, 6.5]}
      />
    </Janela>
  );
};

/* ---------------- Comparativo + clique no número ---------------- */
const LBL = 400;
const COL = 165;
const HEAD = 120;
const ROW = 96;
const TX = 40;
const TY = 36;

const valor = (k: string, n: number) => (k === 'margem_aj' ? `${fmt(n, 1)}%` : fmt(n));

const Comparativo: React.FC = () => {
  const frame = useCurrentFrame();
  const hlMargem = useLin(1.2, 1.8) * (1 - useLin(13.5, 14));
  const painel = useIn(17.2);
  const clicked = frame >= sec(16.6);
  const pulse = clicked ? 1 : 0;
  const trechoHl = useLin(19.5, 20.5);
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
                  background: `rgba(0,113,227,${0.08 * hl})`,
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
        <Appear at={6}>
          <div style={{...card, padding: '26px 30px'}}>
            <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>Gerdau · América do Norte · 3T26</div>
            <div style={{display: 'flex', gap: 34, marginTop: 10}}>
              <div>
                <div style={{fontSize: 64, fontWeight: 700, letterSpacing: '-0.045em'}}>{fmt(D.pesoAN, 1)}%</div>
                <div style={{fontSize: 20, color: C.muted}}>do EBITDA ajustado</div>
              </div>
              <div>
                <div style={{fontSize: 64, fontWeight: 700, letterSpacing: '-0.045em'}}>{fmt(D.margemAN, 1)}%</div>
                <div style={{fontSize: 20, color: C.muted}}>de margem EBITDA</div>
              </div>
            </div>
            <div style={{fontSize: 17, color: C.faint, marginTop: 10}}>Nota 22 · ITR Gerdau, pág. 72</div>
          </div>
        </Appear>
        <Appear at={9.5}>
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
        path={[[13.6, 1300, 640], [16.2, TX + LBL + COL / 2 + 20, TY + HEAD + ROW * 1 + ROW / 2 + 10], [28, TX + LBL + COL / 2 + 20, TY + HEAD + ROW * 1 + ROW / 2 + 10]]}
        clickAt={[16.5]}
      />
    </Janela>
  );
};

/* ---------------- Etapa 3 · Apresentação em PDF ---------------- */
const SLIDES = [
  'Tese do setor', 'O que move o setor', 'Estrutura, cadeia e regulação', 'Gerdau × Usiminas', 'KPIs lado a lado',
  'Modelos de negócio', 'Múltiplos', 'Leitura qualitativa e riscos', 'Como sabemos que está certo', 'Fontes e metodologia',
];

const Apresentacao: React.FC = () => {
  const frame = useCurrentFrame();
  const press = useLin(4.4, 4.6) - useLin(4.7, 4.9);
  const toast = useIn(5.1);
  return (
    <Janela step={3}>
      <div style={{position: 'absolute', left: 60, right: 60, top: 34}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <Appear at={0.1}>
            <div style={{fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em'}}>Apresentação para o comitê</div>
            <div style={{fontSize: 22, color: C.muted, marginTop: 4}}>Dez slides, com a mensagem no título de cada um</div>
          </Appear>
          <Appear at={0.6} style={{display: 'flex', gap: 14}}>
            <Pill dark pressed={press}>Baixar PDF</Pill>
            <Pill>Abrir apresentação</Pill>
          </Appear>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22, marginTop: 30}}>
          {SLIDES.map((t, i) => {
            const pi = interpolate(frame, [sec(0.4 + i * 0.12), sec(0.9 + i * 0.12)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            return (
              <div key={t} style={{opacity: pi, transform: `scale(${0.94 + 0.06 * pi})`}}>
                <div style={{...card, borderRadius: 16, aspectRatio: '16 / 9', padding: 18, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', border: `1px solid ${C.hair}`}}>
                  <div style={{fontSize: 11, color: C.faint, display: 'flex', justifyContent: 'space-between'}}>
                    <span>Siderurgia · Gerdau × Usiminas · 3T26</span>
                    <span>{i + 1}/10</span>
                  </div>
                  <div style={{fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.12}}>{t}</div>
                  <div style={{flex: 1}} />
                  {[0, 1].map((l) => (
                    <div key={l} style={{height: 6, borderRadius: 3, background: C.fill, marginTop: 6, width: `${85 - l * 25}%`}} />
                  ))}
                  <div style={{fontSize: 9, color: C.faint, marginTop: 8}}>Exercício acadêmico · não é recomendação de investimento</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 34,
          transform: `translate(-50%, ${(1 - toast) * 40}px)`,
          opacity: toast,
          background: C.ink,
          color: '#fff',
          fontSize: 24,
          padding: '16px 30px',
          borderRadius: 980,
        }}
      >
        PDF pronto para o comitê · 10 slides
      </div>
      <Cursor path={[[1.4, 900, 600], [4.1, 1440, 70], [10, 1440, 70]]} clickAt={[4.5]} />
    </Janela>
  );
};

export const Solucao: React.FC = () => (
  <Stage>
    <Sequence durationInFrames={sec(13)} name="Tese do setor">
      <Tese />
    </Sequence>
    <Sequence from={sec(13)} durationInFrames={sec(9)} name="Escolha das empresas">
      <Escolha />
    </Sequence>
    <Sequence from={sec(22)} durationInFrames={sec(28)} name="Comparativo + proveniência">
      <Comparativo />
    </Sequence>
    <Sequence from={sec(50)} durationInFrames={sec(10)} name="Apresentação em PDF">
      <Apresentacao />
    </Sequence>
  </Stage>
);

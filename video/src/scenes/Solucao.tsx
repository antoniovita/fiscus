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

/* ---------------- Tela inicial (menu "+") + Etapa 1 · Tese do setor ---------------- */
const PERGUNTA = 'Este setor é um bom lugar para investir?';
const SUGESTOES = [PERGUNTA, 'Quais empresas do setor vale comparar?', 'Monte a apresentação para o comitê'];
const CW = 860; // largura da caixa de composição
const MAIN_W = 1510;
const CX = (MAIN_W - CW) / 2; // borda esquerda da caixa
const ROW_Y = 150 + 66 + 40 + 22 + 34 + 22 + 23; // centro da linha de botões da caixa
const PLUS_X = CX + 28 + 23;
const MENU_TOP = ROW_Y + 23 + 12;
const MENU_W = 430;
const M_HEAD = 46;
const M_ROW = 52;
const SUB_ROW = 56;
const SUB_X = CX + MENU_W + 10;
const T_PLUS = 1.0;
const T_SID = 1.8;
const T_G = 2.6;
const T_U = 3.3;
const T_FECHA = 3.8;
const T_ENVIA = 5.8;
const T_CHAT = 6.2;

const Tag: React.FC<{nome: string; tk: string; cor: string; at: number}> = ({nome, tk, cor, at}) => {
  const p = useIn(at);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 19, fontWeight: 500, padding: '7px 14px', borderRadius: 980, background: C.bg, border: `1px solid ${C.line}`, opacity: p, transform: `scale(${0.8 + 0.2 * p})`}}>
      <div style={{width: 10, height: 10, borderRadius: 5, background: cor}} />
      {nome} <span style={{color: C.faint}}>{tk}</span> <span style={{color: C.faint}}>×</span>
    </div>
  );
};

const Menu: React.FC = () => {
  const frame = useCurrentFrame();
  const abre = useIn(T_PLUS + 0.1);
  const fecha = useLin(T_FECHA, T_FECHA + 0.2);
  const sub = useIn(T_SID + 0.1);
  const op = abre * (1 - fecha);
  if (op <= 0.001) return null;
  const emp = (['g', 'u', 'c', 'f'] as const).map((k) => ({k, ...(D.emp[k] as {nome: string; tk: string; ok: boolean})}));
  const sel = {g: frame >= sec(T_G), u: frame >= sec(T_U), c: false, f: false};
  const box: React.CSSProperties = {position: 'absolute', background: '#fff', borderRadius: 16, border: `1px solid ${C.hair}`, boxShadow: '0 12px 40px rgba(0,0,0,.14)', padding: 8, boxSizing: 'border-box', zIndex: 30};
  return (
    <>
      <div style={{...box, left: CX, top: MENU_TOP, width: MENU_W, opacity: op, transform: `translateY(${(1 - abre) * -8}px)`}}>
        <div style={{height: M_HEAD, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 16, fontWeight: 600, color: C.faint}}>Empresas por setor</div>
        <div style={{height: M_ROW, display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 10, background: frame >= sec(T_SID) ? C.bg : 'transparent'}}>
          <div style={{flex: 1}}>
            <div style={{fontSize: 21, fontWeight: 600}}>Siderurgia</div>
            <div style={{fontSize: 16, color: C.blue}}>Análise completa</div>
          </div>
          <div style={{fontSize: 24, color: C.faint}}>›</div>
        </div>
        {D.panorama.map((x) => (
          <div key={x.nome} style={{height: M_ROW, display: 'flex', alignItems: 'center', padding: '0 14px'}}>
            <div style={{flex: 1}}>
              <div style={{fontSize: 21, fontWeight: 500}}>{x.nome}</div>
              <div style={{fontSize: 16, color: C.muted}}>Panorama · {x.n} empresas</div>
            </div>
            <div style={{fontSize: 24, color: C.faint}}>›</div>
          </div>
        ))}
      </div>
      <div style={{...box, left: SUB_X, top: MENU_TOP + 8 + M_HEAD - 8, width: 340, opacity: op * sub, transform: `translateX(${(1 - sub) * -10}px)`}}>
        {emp.map((e) => (
          <div key={e.k} style={{height: SUB_ROW, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', borderRadius: 10, opacity: e.ok ? 1 : 0.45, background: sel[e.k] ? C.blueSoft : 'transparent'}}>
            <div style={{width: 12, height: 12, borderRadius: 6, background: {g: C.gerdau, u: C.usiminas, c: C.csn, f: '#9aa0a9'}[e.k]}} />
            <div style={{fontSize: 21, fontWeight: 600, flex: 1}}>
              {e.nome} <span style={{fontWeight: 400, color: C.faint, fontSize: 18}}>{e.tk}</span>
            </div>
            {sel[e.k] && <div style={{fontSize: 22, color: C.blue, fontWeight: 700}}>✓</div>}
          </div>
        ))}
      </div>
    </>
  );
};

const Inicio: React.FC<{press: number}> = ({press}) => {
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [sec(4.1), sec(5.3)], [0, PERGUNTA.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const plus = frame >= sec(T_PLUS) && frame < sec(T_FECHA);
  const g = D.emp.g as {nome: string; tk: string};
  const u = D.emp.u as {nome: string; tk: string};
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Appear at={0.1}>
          <div style={{fontSize: 54, fontWeight: 600, letterSpacing: '-0.035em', textAlign: 'center'}}>Boa tarde, Antonio.</div>
        </Appear>
        <Appear at={0.2}>
          <div style={{width: CW, marginTop: 40, background: C.card, borderRadius: 22, border: `1px solid ${C.line}`, boxShadow: '0 2px 10px rgba(0,0,0,.05)', padding: '22px 24px 18px 28px', boxSizing: 'border-box'}}>
            <div style={{fontSize: 26, color: n ? C.ink : C.faint, minHeight: 34}}>{n ? PERGUNTA.slice(0, n) : 'Pergunte sobre um setor ou empresa…'}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 22}}>
              <div style={{width: 46, height: 46, borderRadius: 23, border: `1px solid ${C.line}`, background: plus ? C.fill : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 300, color: C.ink, flexShrink: 0}}>+</div>
              {frame >= sec(T_G) && <Tag nome={g.nome} tk={g.tk} cor={C.gerdau} at={T_G} />}
              {frame >= sec(T_U) && <Tag nome={u.nome} tk={u.tk} cor={C.usiminas} at={T_U} />}
              <div style={{flex: 1}} />
              <Enviar pressed={press} />
            </div>
          </div>
        </Appear>
        <Appear at={0.4}>
          <div style={{width: CW, marginTop: 22, display: 'flex', flexDirection: 'column'}}>
            {SUGESTOES.map((t, i) => (
              <div key={t} style={{fontSize: 21, color: C.muted, padding: '12px 28px', borderTop: i ? `1px solid ${C.hair}` : 'none'}}>
                {t}
              </div>
            ))}
          </div>
        </Appear>
      </div>
      <Menu />
    </>
  );
};

const Tese: React.FC = () => {
  const frame = useCurrentFrame();
  const chat = frame >= sec(T_CHAT);
  const enviar = useLin(T_ENVIA - 0.1, T_ENVIA + 0.05) - useLin(T_ENVIA + 0.1, T_ENVIA + 0.25);
  const press = useLin(12.5, 12.7) - useLin(12.8, 13);
  const ex = (MAIN_W + CW) / 2 - 24 - 23;
  const ey = ROW_Y;
  const g = D.emp.g as {nome: string};
  const u = D.emp.u as {nome: string};
  return (
    <Janela step={chat ? 0 : null}>
      {!chat && <Inicio press={enviar} />}
      {chat && (
        <Sequence from={sec(T_CHAT)} layout="none">
          <div style={{position: 'absolute', left: 150, right: 150, top: 30, display: 'flex', flexDirection: 'column', gap: 24}}>
            <Appear at={0}>
              <Bolha>
                <span style={{color: C.muted}}>Siderurgia · {g.nome} × {u.nome} · </span>
                {PERGUNTA}
              </Bolha>
            </Appear>
            <Appear at={0.4}>
              <Assistente />
              <div style={{...card, padding: '28px 36px', border: `1px solid ${C.hair}`}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                  <div style={{fontSize: 21, fontWeight: 600, color: C.muted}}>Veredito · Siderurgia</div>
                  <div style={{background: C.fill, color: C.ink, fontWeight: 700, fontSize: 22, padding: '5px 16px', borderRadius: 980}}>{D.veredito.nivel}</div>
                </div>
                <div style={{fontSize: 33, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, marginTop: 14}}>{D.veredito.frase}</div>
                <div style={{display: 'flex', gap: 14, marginTop: 22}}>
                  {D.sens.map((s, i) => (
                    <Appear key={s.d} at={1.6 + i * 0.4} style={{flex: 1}}>
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
          <Appear at={4.6} style={{position: 'absolute', right: 150, bottom: 30, display: 'flex', gap: 14}}>
            <Pill>Perguntar sobre o setor</Pill>
            <Pill dark pressed={press}>Aprovar e comparar empresas</Pill>
          </Appear>
        </Sequence>
      )}
      <Cursor
        path={[
          [0.4, 900, 620], [T_PLUS - 0.15, PLUS_X, ROW_Y], [T_PLUS + 0.2, PLUS_X, ROW_Y],
          [T_SID, CX + 200, MENU_TOP + 8 + M_HEAD + M_ROW / 2],
          [T_G - 0.15, SUB_X + 150, MENU_TOP + M_HEAD + 8 + SUB_ROW / 2], [T_G + 0.15, SUB_X + 150, MENU_TOP + M_HEAD + 8 + SUB_ROW / 2],
          [T_U - 0.15, SUB_X + 150, MENU_TOP + M_HEAD + 8 + SUB_ROW * 1.5], [T_U + 0.3, SUB_X + 150, MENU_TOP + M_HEAD + 8 + SUB_ROW * 1.5],
          [T_ENVIA - 0.2, ex, ey], [T_CHAT, ex, ey], [10.8, 1000, 600], [12.3, 1220, 712], [14, 1220, 712],
        ]}
        clickAt={[T_PLUS, T_G, T_U, T_ENVIA, 12.6]}
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
const TY = 96;
const TAB_W = 150;
const TAB_Y = 24;

const valor = (k: string, n: number) => (k === 'margem_aj' ? `${fmt(n, 1)}%` : fmt(n));

/* Gráficos do comparativo: margem EBITDA ajustada 3T25 × 3T26 (app/data.json) e
 * margem EBITDA anual 2021–2025 (data/processed/historico.json, chave margem_ebitda). */
const GW = 700;
const GH = 560;
const pct = (n: number) => `${fmt(n, 1)}%`;

const GraficoBarras: React.FC = () => {
  const cresce = useLin(9.3, 10.3);
  const m = D.linhas.find((l) => l.k === 'margem_aj')!;
  const grupos = [
    {nome: (D.emp.g as {nome: string}).nome, cor: C.gerdau, v: [m.g[1], m.g[0]]},
    {nome: (D.emp.u as {nome: string}).nome, cor: C.usiminas, v: [m.u[1], m.u[0]]},
  ];
  const max = Math.max(...grupos.flatMap((g) => g.v)) * 1.2;
  const W = GW - 80;
  const H = 360;
  const bw = 110;
  return (
    <div style={{...card, width: GW, height: GH, padding: '28px 40px', boxSizing: 'border-box'}}>
      <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em'}}>{m.nome}</div>
      <div style={{fontSize: 18, color: C.muted, marginTop: 4}}>3T25 × 3T26 · {m.un}</div>
      <svg width={W} height={H + 60} style={{marginTop: 22, overflow: 'visible'}}>
        <line x1={0} x2={W} y1={H} y2={H} stroke={C.line} />
        {grupos.map((g, gi) => {
          const gx = 40 + gi * (W / 2);
          return (
            <g key={g.nome}>
              {g.v.map((v, i) => {
                const h = (v / max) * H * cresce;
                const x = gx + i * (bw + 14);
                return (
                  <g key={i}>
                    <rect x={x} y={H - h} width={bw} height={h} rx={6} fill={g.cor} opacity={i === 0 ? 0.35 : 1} />
                    <text x={x + bw / 2} y={H - h - 12} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink} opacity={cresce}>{pct(v)}</text>
                    <text x={x + bw / 2} y={H + 28} textAnchor="middle" fontSize={17} fill={C.muted}>{i === 0 ? '3T25' : '3T26'}</text>
                  </g>
                );
              })}
              <text x={gx + bw + 7} y={H + 56} textAnchor="middle" fontSize={20} fontWeight={600} fill={g.cor}>{g.nome}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const GraficoLinha: React.FC = () => {
  const traço = useLin(9.6, 11.2);
  const series = [
    {nome: 'GGBR4', cor: C.gerdau, pts: D.histG},
    {nome: 'USIM5', cor: C.usiminas, pts: D.histU},
  ];
  const all = series.flatMap((s) => s.pts.map((p) => p.v));
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all) * 1.12;
  const W = GW - 80 - 200;
  const H = 360;
  const n = D.histG.length;
  const X = (i: number) => (i / (n - 1)) * W;
  const Y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  return (
    <div style={{...card, width: GW, height: GH, padding: '28px 40px', boxSizing: 'border-box'}}>
      <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em'}}>Margem EBITDA anual</div>
      <div style={{fontSize: 18, color: C.muted, marginTop: 4}}>
        {D.histG[0].ano}–{D.histG[n - 1].ano} · % · CVM, DFP consolidado
      </div>
      <svg width={GW - 80} height={H + 60} style={{marginTop: 22, overflow: 'visible'}}>
        <g transform="translate(64,0)">
        <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} stroke={C.line} />
        {D.histG.map((p, i) => (
          <text key={p.ano} x={X(i)} y={H + 32} textAnchor="middle" fontSize={17} fill={C.muted}>{p.ano}</text>
        ))}
        {series.map((s) => {
          const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(i)},${Y(p.v)}`).join(' ');
          const last = s.pts[n - 1];
          const first = s.pts[0];
          return (
            <g key={s.nome}>
              <path d={d} fill="none" stroke={s.cor} strokeWidth={4} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - traço} />
              {s.pts.map((p, i) => (
                <circle key={p.ano} cx={X(i)} cy={Y(p.v)} r={6} fill={s.cor} opacity={traço >= i / (n - 1) ? 1 : 0} />
              ))}
              <text x={X(0) - 10} y={Y(first.v) + 7} textAnchor="end" fontSize={18} fontWeight={600} fill={s.cor} opacity={traço}>{pct(first.v)}</text>
              <text x={X(n - 1) + 12} y={Y(last.v) + 7} fontSize={18} fontWeight={700} fill={s.cor} opacity={traço}>{pct(last.v)} {s.nome}</text>
            </g>
          );
        })}
        </g>
      </svg>
    </div>
  );
};

const Comparativo: React.FC = () => {
  const frame = useCurrentFrame();
  const hlMargem = useLin(1.0, 1.6) * (1 - useLin(4.5, 5));
  const painel = useIn(16.5);
  const clicked = frame >= sec(16.0);
  const pulse = clicked ? 1 : 0;
  const trechoHl = useLin(17.4, 18.2);
  const graf = useLin(9.0, 9.4) * (1 - useLin(15.0, 15.4));
  const abaGraf = frame >= sec(9.0) && frame < sec(15.0);
  const p = D.provEbitdaG;
  const mi = D.linhas[1].g[0];

  return (
    <Janela step={2}>
      {/* Abas */}
      <div style={{position: 'absolute', left: TX, top: TAB_Y, display: 'flex', padding: 4, borderRadius: 12, background: C.fill}}>
        {['Tabela', 'Gráficos'].map((t, i) => {
          const on = (i === 1) === abaGraf;
          return (
            <div key={t} style={{width: TAB_W, height: 44, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: on ? 600 : 400, color: on ? C.ink : C.muted, background: on ? '#fff' : 'transparent', boxShadow: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none'}}>
              {t}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', inset: 0, opacity: 1 - graf}}>
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
        <Appear at={4.0}>
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
        <Appear at={6.0}>
          <div style={{...card, padding: '26px 30px'}}>
            <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>Usiminas · lucro do 3T25</div>
            <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.2}}>
              Prejuízo de R$ {fmt(Math.abs(D.linhas[3].u[1]))} mi com impairment de R$ {fmt(D.impairmentU.valor)} mi
            </div>
            <div style={{fontSize: 17, color: C.faint, marginTop: 10}}>Ajuste do EBITDA · ITR Usiminas, pág. {D.impairmentU.pagina}</div>
          </div>
        </Appear>
      </div>

      </div>
      {graf > 0 && (
        <div style={{position: 'absolute', left: TX, right: 40, top: TY, opacity: graf, display: 'flex', gap: 30}}>
          <GraficoBarras />
          <GraficoLinha />
        </div>
      )}

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
        path={[
          [7.6, 1100, 560], [8.8, TX + 4 + TAB_W * 1.5, TAB_Y + 26], [9.4, TX + 4 + TAB_W * 1.5, TAB_Y + 26],
          [11, 700, 500], [14.6, TX + 4 + TAB_W / 2, TAB_Y + 26], [15.2, TX + 4 + TAB_W / 2, TAB_Y + 26],
          [15.8, TX + LBL + COL / 2 + 20, TY + HEAD + ROW * 1 + ROW / 2 + 10], [22, TX + LBL + COL / 2 + 20, TY + HEAD + ROW * 1 + ROW / 2 + 10],
        ]}
        clickAt={[9.0, 15.0, 16.0]}
      />
    </Janela>
  );
};

/* ---------------- Etapa 3 · Tese e preço-alvo ----------------
 * Os valores desta etapa ainda não existem nos JSONs: a interface aparece sem números
 * (sliders sem escala, campos de resultado como placeholders). Não inventar valores. */
const PREMISSAS: {nome: string; de: number; ate: number; t0: number; t1: number}[] = [
  {nome: 'Taxa livre de risco', de: 0.55, ate: 0.42, t0: 0.8, t1: 1.5},
  {nome: 'Beta', de: 0.4, ate: 0.58, t0: 1.9, t1: 2.6},
  {nome: 'Crescimento na perpetuidade', de: 0.35, ate: 0.5, t0: 3.0, t1: 3.6},
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
  const res = useIn(3.9);
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
  path.push([7, kx(2, PREMISSAS[2].ate) + 40, ky(2) + 60]);
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

/* ---------------- Panorama de outros setores (bancos) ----------------
 * Tickers, P/L, P/VP e ROE 12m vêm de data/processed/setores/bancos.json. */
const PN_ROW = 46;
const num = (v: number | null, dec = 1) => (v === null ? '—' : fmt(v, dec));

const Panorama: React.FC = () => {
  const barras = useLin(0.6, 1.8);
  const bancos = D.bancos;
  const ord = [...bancos].sort((a, b) => b.roe - a.roe);
  const max = Math.max(...bancos.map((b) => b.roe));
  const setor = D.panorama.find((x) => x.nome === 'Bancos')!;
  const cols = [150, 110, 110, 110, 140];
  return (
    <Janela step={null}>
      <div style={{position: 'absolute', left: 60, right: 60, top: 6}}>
        <Appear at={0}>
          <div style={{fontSize: 18, fontWeight: 600, color: C.blue}}>Panorama de outros setores</div>
          <div style={{fontSize: 40, fontWeight: 700, letterSpacing: '-0.035em', marginTop: 4}}>
            {setor.nome} <span style={{color: C.faint, fontWeight: 500, fontSize: 28}}>· {setor.n} empresas · CVM Dados Abertos + B3</span>
          </div>
        </Appear>
        <div style={{display: 'flex', gap: 36, marginTop: 22}}>
          <Appear at={0.2}>
            <div style={{...card, border: `1px solid ${C.hair}`, padding: '10px 26px'}}>
              <div style={{display: 'flex', height: 40, alignItems: 'center', fontSize: 16, fontWeight: 600, color: C.faint}}>
                {['Ticker', 'Período', 'P/L', 'P/VP', 'ROE 12m'].map((h, i) => (
                  <div key={h} style={{width: cols[i], textAlign: i ? 'right' : 'left'}}>{h}</div>
                ))}
              </div>
              {bancos.map((b) => (
                <div key={b.tk} style={{display: 'flex', height: PN_ROW, alignItems: 'center', borderTop: `1px solid ${C.hair}`, fontSize: 20, fontVariantNumeric: 'tabular-nums'}}>
                  <div style={{width: cols[0], fontWeight: 700}}>{b.tk}</div>
                  <div style={{width: cols[1], textAlign: 'right', color: C.muted}}>{b.per}</div>
                  <div style={{width: cols[2], textAlign: 'right'}}>{num(b.pl)}</div>
                  <div style={{width: cols[3], textAlign: 'right'}}>{num(b.pvp, 2)}</div>
                  <div style={{width: cols[4], textAlign: 'right', fontWeight: 600}}>{fmt(b.roe, 1)}%</div>
                </div>
              ))}
            </div>
          </Appear>
          <Appear at={0.4} style={{flex: 1}}>
            <div style={{...card, border: `1px solid ${C.hair}`, padding: '18px 30px'}}>
              <div style={{fontSize: 22, fontWeight: 700, height: 32}}>ROE 12 meses por banco</div>
              {ord.map((b) => (
                <div key={b.tk} style={{display: 'flex', alignItems: 'center', height: PN_ROW - 2, gap: 14}}>
                  <div style={{width: 92, fontSize: 18, fontWeight: 600}}>{b.tk}</div>
                  <div style={{flex: 1, position: 'relative', height: 24}}>
                    <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(b.roe / max) * 82 * barras}%`, background: C.blue, borderRadius: 5}} />
                    <div style={{position: 'absolute', left: `calc(${(b.roe / max) * 82 * barras}% + 10px)`, top: 0, fontSize: 17, fontWeight: 600, opacity: barras, lineHeight: '24px'}}>{fmt(b.roe, 1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Appear>
        </div>
      </div>
    </Janela>
  );
};

/* ---------------- Etapa 4 · Apresentação no estilo "research report" ----------------
 * Slides brancos, título com barra azul, faixa de indicadores azul com divisórias verdes,
 * marcadores em losango verde e navegação de seções no rodapé. Capa sem números de
 * valuation (dependem das premissas do usuário): só rótulos e barras cinza. */
const AZUL = '#1f3fd6';
const VERDE = '#00b050';
const SECOES = ['Visão geral', 'Setor', 'Comparativo', 'Valuation', 'Riscos', 'Metodologia'];
const SLIDES: {t: string; sec: number}[] = [
  {t: 'Capa', sec: 0},
  {t: 'Tese do setor', sec: 1},
  {t: 'O que move o setor', sec: 1},
  {t: 'Gerdau × Usiminas', sec: 2},
  {t: 'KPIs lado a lado', sec: 2},
  {t: 'Margem EBITDA 2021–2025', sec: 2},
  {t: 'Premissas e preço-alvo', sec: 3},
  {t: 'Leitura qualitativa e riscos', sec: 4},
  {t: 'Como sabemos que está certo', sec: 5},
  {t: 'Fontes e metodologia', sec: 5},
];
const KPI_SLIDE = 4;
const MODAL = 30;
const SLIDE_H = 470;
const THUMB_H = 68;

const Titulo: React.FC<{s: number; children: React.ReactNode; sub: React.ReactNode}> = ({s, children, sub}) => (
  <div style={{display: 'flex', gap: 14 * s}}>
    <div style={{width: 7 * s, background: AZUL, borderRadius: 2 * s}} />
    <div>
      <div style={{fontSize: 34 * s, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1}}>{children}</div>
      <div style={{fontSize: 17 * s, color: C.muted, marginTop: 6 * s}}>{sub}</div>
    </div>
  </div>
);

const Faixa: React.FC<{s: number; itens: {r: string; v: React.ReactNode}[]}> = ({s, itens}) => (
  <div style={{display: 'flex', background: AZUL, color: '#fff', borderRadius: 4 * s, padding: `${14 * s}px 0`, marginTop: 22 * s}}>
    {itens.map((x, i) => (
      <div key={x.r} style={{flex: 1, padding: `0 ${18 * s}px`, borderLeft: i ? `${2 * s}px solid ${VERDE}` : 'none'}}>
        <div style={{fontSize: 13 * s, opacity: 0.8}}>{x.r}</div>
        <div style={{fontSize: 26 * s, fontWeight: 700, marginTop: 4 * s, letterSpacing: '-0.02em'}}>{x.v}</div>
      </div>
    ))}
  </div>
);

const Cinza: React.FC<{s: number; w: number; h?: number; claro?: boolean}> = ({s, w, h = 22, claro}) => (
  <div style={{width: w * s, height: h * s, borderRadius: 5 * s, background: claro ? 'rgba(255,255,255,.35)' : C.fill, marginTop: 2 * s}} />
);

const Losango: React.FC<{s: number; children?: React.ReactNode; w?: number}> = ({s, children, w = 70}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12 * s, marginTop: 12 * s}}>
    <div style={{width: 9 * s, height: 9 * s, background: VERDE, transform: 'rotate(45deg)', flexShrink: 0}} />
    {children ? <div style={{fontSize: 16 * s}}>{children}</div> : <div style={{height: 10 * s, borderRadius: 5 * s, background: C.fill, width: `${w}%`}} />}
  </div>
);

const Az: React.FC<{children: React.ReactNode}> = ({children}) => <span style={{color: AZUL, fontWeight: 600}}>{children}</span>;

const SlideCorpo: React.FC<{i: number; s: number}> = ({i, s}) => {
  const sl = SLIDES[i];
  const g = D.emp.g as {nome: string; tk: string};
  const u = D.emp.u as {nome: string; tk: string};
  const m = D.linhas.find((l) => l.k === 'margem_aj')!;
  const e = D.linhas.find((l) => l.k === 'ebitda_aj')!;
  let corpo: React.ReactNode;
  if (i === 0) {
    corpo = (
      <>
        <div style={{fontSize: 14 * s, fontWeight: 600, color: AZUL, letterSpacing: '0.04em', marginBottom: 14 * s}}>RESEARCH REPORT · SIDERURGIA · 3T26</div>
        <Titulo s={s} sub={<>Tese do <Az>setor</Az>, comparativo <Az>{g.tk}</Az> × <Az>{u.tk}</Az> e valuation</>}>
          {g.nome} × {u.nome}
        </Titulo>
        <div style={{display: 'flex', background: AZUL, color: '#fff', borderRadius: 4 * s, padding: `${16 * s}px 0`, marginTop: 28 * s}}>
          {['Recomendação:', 'Preço-alvo 12m', 'Potencial'].map((r, k) => (
            <div key={r} style={{flex: 1, padding: `0 ${20 * s}px`, borderLeft: k ? `${2 * s}px solid ${VERDE}` : 'none'}}>
              <div style={{fontSize: 14 * s, opacity: 0.85}}>{r}</div>
              <div style={{marginTop: 8 * s}}><Cinza s={s} w={k ? 120 : 160} h={26} claro /></div>
            </div>
          ))}
        </div>
        <Losango s={s} w={78} />
        <Losango s={s} w={64} />
      </>
    );
  } else if (i === KPI_SLIDE) {
    corpo = (
      <>
        <Titulo s={s} sub={<>{m.nome} e EBITDA ajustado no <Az>3T26</Az>, mesmo critério <Az>consolidado</Az></>}>
          {sl.t}
        </Titulo>
        <Faixa
          s={s}
          itens={[
            {r: `${m.nome} · ${g.nome}`, v: `${fmt(m.g[0], 1)}%`},
            {r: `${m.nome} · ${u.nome}`, v: `${fmt(m.u[0], 1)}%`},
            {r: `${e.nome} · ${g.nome}`, v: `R$ ${fmt(e.g[0])} mi`},
            {r: `${e.nome} · ${u.nome}`, v: `R$ ${fmt(e.u[0])} mi`},
          ]}
        />
        {D.sens.map((x) => (
          <Losango key={x.d} s={s}>
            <b>{x.d}</b> <span style={{color: C.muted}}>· {x.f}</span>
          </Losango>
        ))}
      </>
    );
  } else {
    corpo = (
      <>
        <Titulo s={s} sub={<Cinza s={s} w={380} h={14} />}>{sl.t}</Titulo>
        <div style={{display: 'flex', background: AZUL, borderRadius: 4 * s, padding: `${16 * s}px 0`, marginTop: 22 * s}}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{flex: 1, padding: `0 ${18 * s}px`, borderLeft: k ? `${2 * s}px solid ${VERDE}` : 'none'}}>
              <Cinza s={s} w={110} h={26} claro />
            </div>
          ))}
        </div>
        <Losango s={s} w={80} />
        <Losango s={s} w={66} />
        <Losango s={s} w={72} />
      </>
    );
  }
  return (
    <div style={{width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', color: C.ink, fontFamily: 'inherit'}}>
      <div style={{flex: 1, padding: `${34 * s}px ${44 * s}px 0`, display: 'flex', flexDirection: 'column'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 * s, color: C.faint, marginBottom: 20 * s}}>
          <Img src={staticFile('brand/fiscus-logo.png')} style={{height: 18 * s, width: 'auto'}} />
          <span>{i + 1}/{SLIDES.length}</span>
        </div>
        {corpo}
        <div style={{flex: 1}} />
        <div style={{fontSize: 11 * s, color: C.faint, marginBottom: 8 * s}}>Exercício acadêmico · não é recomendação de investimento</div>
      </div>
      <div style={{height: 34 * s, background: '#f3f4f8', borderTop: `1px solid ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 * s, fontSize: 13 * s}}>
        {SECOES.map((t, k) => (
          <React.Fragment key={t}>
            {k > 0 && <span style={{color: C.faint}}>·</span>}
            <span style={{color: k === sl.sec ? AZUL : C.muted, fontWeight: k === sl.sec ? 700 : 400, borderBottom: k === sl.sec ? `${2 * s}px solid ${AZUL}` : 'none'}}>{t}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const Apresentacao: React.FC = () => {
  const frame = useCurrentFrame();
  const press = useLin(8.4, 8.6) - useLin(8.7, 8.9);
  const toast = useIn(9.0);
  const modal = useIn(0.2);
  const atual = frame < sec(4.2) ? 0 : KPI_SLIDE;
  return (
    <Janela step={4}>
      <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.35 * modal})`}} />
      <div style={{position: 'absolute', inset: MODAL, background: '#1d1d1f', borderRadius: 18, opacity: modal, transform: `scale(${0.97 + 0.03 * modal})`, boxShadow: '0 30px 80px rgba(0,0,0,.35)', color: '#fff', overflow: 'hidden'}}>
        <div style={{height: 76, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 14}}>
          <Img src={staticFile('brand/fiscus-mark-white.png')} style={{height: 24, width: 'auto'}} />
          <div style={{fontSize: 22, fontWeight: 600}}>Apresentação para o comitê</div>
          <div style={{fontSize: 18, color: 'rgba(255,255,255,.55)'}}>Research report · {SLIDES.length} slides</div>
          <div style={{flex: 1}} />
          <div style={{background: '#fff', color: C.ink, fontSize: 20, fontWeight: 600, padding: '11px 24px', borderRadius: 980, transform: `scale(${1 - press * 0.05})`}}>Baixar PDF</div>
          <div style={{fontSize: 26, color: 'rgba(255,255,255,.6)', marginLeft: 6}}>×</div>
        </div>
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 14}}>
          <div style={{height: SLIDE_H, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden'}}>
            <SlideCorpo i={atual} s={1} />
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 12, marginTop: 26}}>
          {SLIDES.map((x, i) => (
            <div key={x.t} style={{height: THUMB_H, aspectRatio: '16 / 9', borderRadius: 6, overflow: 'hidden', outline: i === atual ? '3px solid #fff' : '1px solid rgba(255,255,255,.15)', outlineOffset: i === atual ? 2 : 0, opacity: i === atual ? 1 : 0.6}}>
              <SlideCorpo i={i} s={THUMB_H / SLIDE_H} />
            </div>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: '50%', bottom: MODAL + 24, transform: `translate(-50%, ${(1 - toast) * 40}px)`, opacity: toast, background: '#fff', color: C.ink, fontSize: 22, fontWeight: 500, padding: '14px 28px', borderRadius: 980, boxShadow: '0 8px 30px rgba(0,0,0,.3)', zIndex: 20}}>
        PDF pronto para o comitê · {SLIDES.length} slides
      </div>
      <Cursor path={[[3.2, 900, 600], [4.0, 1060, 720], [4.4, 1060, 720], [8.0, 1340, 72], [12, 1340, 72]]} clickAt={[4.2, 8.5]} />
    </Janela>
  );
};

/** Cena 2 (60 s): início + menu "+" + tese 14 · comparativo (tabela, gráficos, proveniência) 22 ·
 * panorama de bancos 5 · tese e preço-alvo 7 · apresentação 12. */
export const Solucao: React.FC = () => (
  <Stage>
    <Sequence durationInFrames={sec(14)} name="Início (menu +) + tese do setor">
      <Tese />
    </Sequence>
    <Sequence from={sec(14)} durationInFrames={sec(22)} name="Comparativo + gráficos + proveniência">
      <Comparativo />
    </Sequence>
    <Sequence from={sec(36)} durationInFrames={sec(5)} name="Panorama de outros setores">
      <Panorama />
    </Sequence>
    <Sequence from={sec(41)} durationInFrames={sec(7)} name="Tese e preço-alvo">
      <PrecoAlvo />
    </Sequence>
    <Sequence from={sec(48)} durationInFrames={sec(12)} name="Apresentação">
      <Apresentacao />
    </Sequence>
  </Stage>
);

import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {C, FONT, sec} from './theme';

/** Progresso 0→1 com mola, começando em `at` segundos (tempo local da Sequence). */
export const useIn = (at: number, damping = 200) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - sec(at), fps, config: {damping}});
};

/** Progresso linear 0→1 entre `a` e `b` segundos. */
export const useLin = (a: number, b: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [sec(a), sec(b)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
};

export const Appear: React.FC<{
  at: number;
  dy?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({at, dy = 24, style, children}) => {
  const p = useIn(at);
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style}}>{children}</div>
  );
};

export const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: C.bg,
      fontFamily: FONT,
      color: C.ink,
      WebkitFontSmoothing: 'antialiased',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Área de conteúdo acima da faixa de legenda. */
export const Content: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 120,
      right: 120,
      top: 70,
      bottom: 230,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Kicker: React.FC<{children: React.ReactNode; color?: string}> = ({
  children,
  color = C.blue,
}) => (
  <div style={{fontSize: 24, fontWeight: 600, color, letterSpacing: '-0.01em', marginBottom: 10}}>
    {children}
  </div>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  dark?: boolean;
  pressed?: number;
  style?: React.CSSProperties;
}> = ({children, dark, pressed = 0, style}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '14px 28px',
      borderRadius: 980,
      fontSize: 24,
      fontWeight: dark ? 500 : 400,
      background: dark ? C.ink : C.fill,
      color: dark ? '#fff' : C.ink,
      transform: `scale(${1 - pressed * 0.05})`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Selo de etapa no topo (Tese do setor, Empresas, ...). */
export const STEPS = ['Tese do setor', 'Empresas', 'Comparativo', 'Tese e preço-alvo', 'Apresentação'];
export const Steps: React.FC<{active: number}> = ({active}) => (
  <div style={{display: 'flex', gap: 8}}>
    {STEPS.map((t, i) => (
      <div
        key={t}
        style={{
          padding: '6px 14px',
          borderRadius: 980,
          fontSize: 17,
          fontWeight: 500,
          background: i === active ? C.ink : 'transparent',
          color: i === active ? '#fff' : i < active ? C.ink : C.faint,
          border: `1px solid ${i === active ? C.ink : C.line}`,
        }}
      >
        {i < active ? '✓ ' : ''}
        {t}
      </div>
    ))}
  </div>
);

export const SIDEBAR = 250;
export const TOPBAR = 56;

/** Símbolo F + nome, cabeçalho das respostas do assistente. */
export const Assistente: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12}}>
    <Img src={staticFile('brand/fiscus-mark.png')} style={{height: 24, width: 'auto'}} />
    <div style={{fontSize: 21, fontWeight: 600, letterSpacing: '-0.01em'}}>Fiscus</div>
  </div>
);

/** Moldura do app: barra lateral clara com o logotipo, "Nova análise" e "Recentes". */
export const AppFrame: React.FC<{children: React.ReactNode; step: number | null}> = ({children, step}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: C.card,
      borderRadius: 22,
      border: `1px solid ${C.hair}`,
      boxShadow: '0 30px 80px rgba(0,0,0,.10)',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR,
        background: '#f5f5f7',
        borderRight: `1px solid ${C.hair}`,
        padding: '26px 18px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{display: 'flex', gap: 7, marginBottom: 26, paddingLeft: 6}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />
        ))}
      </div>
      <Img src={staticFile('brand/fiscus-logo.png')} style={{width: 118, height: 'auto', display: 'block', marginLeft: 8}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, padding: '10px 10px', borderRadius: 10, fontSize: 19, fontWeight: 500}}>
        <span style={{fontSize: 22, lineHeight: 1}}>＋</span> Nova análise
      </div>
      <div style={{fontSize: 15, fontWeight: 600, color: C.faint, marginTop: 26, padding: '0 10px'}}>Recentes</div>
      <div
        style={{
          marginTop: 8,
          padding: '10px 10px',
          borderRadius: 10,
          fontSize: 18,
          background: step === null ? 'transparent' : 'rgba(0,0,0,.06)',
          color: C.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        Siderurgia · Gerdau × Usiminas
      </div>
    </div>
    <div style={{position: 'absolute', left: SIDEBAR, right: 0, top: 0, bottom: 0}}>
      <div
        style={{
          height: TOPBAR,
          display: 'flex',
          alignItems: 'center',
          padding: '0 26px',
          gap: 16,
          borderBottom: step === null ? 'none' : `1px solid ${C.hair}`,
        }}
      >
        {step !== null && (
          <>
            <div style={{fontSize: 18, color: C.muted}}>Siderurgia · 3T26</div>
            <div style={{flex: 1}} />
            <Steps active={step} />
          </>
        )}
      </div>
      <div style={{position: 'absolute', top: TOPBAR, left: 0, right: 0, bottom: 0}}>{children}</div>
    </div>
  </div>
);

/** Cursor de mouse animado entre pontos [t, x, y]. Clique em `clickAt`. */
export const Cursor: React.FC<{path: [number, number, number][]; clickAt?: number[]}> = ({
  path,
  clickAt = [],
}) => {
  const frame = useCurrentFrame();
  const ts = path.map((p) => sec(p[0]));
  const opt = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)} as const;
  const x = path.length > 1 ? interpolate(frame, ts, path.map((p) => p[1]), opt) : path[0][1];
  const y = path.length > 1 ? interpolate(frame, ts, path.map((p) => p[2]), opt) : path[0][2];
  const visible = interpolate(frame, [ts[0] - 8, ts[0]], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let ring = 0;
  let press = 0;
  for (const c of clickAt) {
    const d = frame - sec(c);
    if (d >= 0 && d < 18) ring = d / 18;
    if (d >= -3 && d < 6) press = 1;
  }
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: visible, pointerEvents: 'none', zIndex: 50}}>
      {ring > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -30 * (0.4 + ring),
            top: -30 * (0.4 + ring),
            width: 60 * (0.4 + ring),
            height: 60 * (0.4 + ring),
            borderRadius: '50%',
            background: C.blue,
            opacity: 0.35 * (1 - ring),
          }}
        />
      )}
      <svg width={34} height={34} viewBox="0 0 24 24" style={{transform: `scale(${press ? 0.88 : 1})`, transformOrigin: '0 0', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.3))'}}>
        <path d="M3 2 L3 19 L7.5 15 L10.5 22 L13.5 20.7 L10.6 14 L17 14 Z" fill="#fff" stroke="#1d1d1f" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

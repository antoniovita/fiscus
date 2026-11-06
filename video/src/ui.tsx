import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
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
      background: dark ? C.blue : C.fill,
      color: dark ? '#fff' : C.ink,
      transform: `scale(${1 - pressed * 0.05})`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Selo de etapa no topo (Etapa 1 · Tese do setor ...). */
export const Steps: React.FC<{active: number}> = ({active}) => {
  const items = ['Tese do setor', 'Empresas', 'Comparativo', 'Apresentação'];
  return (
    <div style={{display: 'flex', gap: 10}}>
      {items.map((t, i) => (
        <div
          key={t}
          style={{
            padding: '8px 18px',
            borderRadius: 980,
            fontSize: 19,
            fontWeight: 500,
            background: i === active ? C.ink : i < active ? C.card : 'transparent',
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
};

/** Moldura de "janela" do app, com a barra superior do painel. */
export const AppFrame: React.FC<{children: React.ReactNode; step: number}> = ({children, step}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      ...{
        background: C.bg,
        borderRadius: 22,
        border: `1px solid ${C.hair}`,
        boxShadow: '0 30px 80px rgba(0,0,0,.10)',
        overflow: 'hidden',
      },
    }}
  >
    <div
      style={{
        height: 64,
        background: 'rgba(255,255,255,.85)',
        borderBottom: `1px solid ${C.hair}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        gap: 18,
      }}
    >
      <div style={{display: 'flex', gap: 8}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
        ))}
      </div>
      <div style={{fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginLeft: 10}}>
        Balanço Lado a Lado
      </div>
      <div style={{fontSize: 18, color: C.muted}}>Siderurgia · 3T26</div>
      <div style={{flex: 1}} />
      <Steps active={step} />
    </div>
    <div style={{position: 'absolute', top: 64, left: 0, right: 0, bottom: 0}}>{children}</div>
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

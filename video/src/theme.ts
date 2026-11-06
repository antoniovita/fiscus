export const FPS = 30;
export const TOTAL_SECONDS = 118;

export const C = {
  bg: '#f5f5f7',
  card: '#ffffff',
  ink: '#1d1d1f',
  muted: '#6e6e73',
  faint: '#86868b',
  line: '#d2d2d7',
  hair: 'rgba(0,0,0,.08)',
  fill: '#e8e8ed',
  blue: '#0071e3',
  blueSoft: '#e8f2fd',
  green: '#1d8a3e',
  greenSoft: '#e6f6ea',
  red: '#d70015',
  redSoft: '#fdecee',
  orange: '#bf4800',
  orangeSoft: '#fff2e6',
  indigo: '#5e5ce6',
  gerdau: '#1d1d1f',
  usiminas: '#5e5ce6',
  csn: '#ff9f0a',
};

export const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

export const card: React.CSSProperties = {
  background: C.card,
  borderRadius: 22,
  boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 28px rgba(0,0,0,.06)',
};

export const h1: React.CSSProperties = {
  fontWeight: 700,
  letterSpacing: '-0.045em',
  lineHeight: 1.04,
  color: C.ink,
  margin: 0,
};

export const sec = (s: number) => Math.round(s * FPS);

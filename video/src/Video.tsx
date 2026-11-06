import React from 'react';
import {
  AbsoluteFill,
  getStaticFiles,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import captions from './captions.json';
import {C, FONT, sec} from './theme';
import {Problema} from './scenes/Problema';
import {Solucao} from './scenes/Solucao';
import {Verificacao} from './scenes/Verificacao';
import {Impacto} from './scenes/Impacto';

/** Cenas (segundos globais). A cena 2 é onde entra o slot da gravação de tela. */
export const CENAS = {
  problema: {de: 0, ate: 20},
  solucao: {de: 20, ate: 80},
  verificacao: {de: 80, ate: 100},
  impacto: {de: 100, ate: 118},
};

/**
 * SLOT DA DEMO: se existir video/public/demo.mp4, a cena 2 (60 s) usa a gravação
 * de tela no lugar das recriações animadas. A gravação deve ter pelo menos 60 s
 * (o excedente é cortado). As legendas continuam por cima.
 */
const temDemo = () => getStaticFiles().some((f) => f.name === 'demo.mp4');

const Legenda: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const c = captions.find((x) => t >= x.de && t < x.ate);
  if (!c) return null;
  const local = frame - sec(c.de);
  const dur = sec(c.ate - c.de);
  const op = interpolate(local, [0, 6, dur - 6, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 46,
        display: 'flex',
        justifyContent: 'center',
        opacity: op,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1560,
          padding: '20px 40px',
          borderRadius: 22,
          background: 'rgba(29,29,31,.90)',
          color: '#fff',
          fontFamily: FONT,
          fontSize: 42,
          fontWeight: 500,
          lineHeight: 1.25,
          letterSpacing: '-0.015em',
          textAlign: 'center',
          textWrap: 'balance',
        } as React.CSSProperties}
      >
        {c.texto}
      </div>
    </div>
  );
};

const Demo: React.FC = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <OffthreadVideo
      src={staticFile('demo.mp4')}
      muted
      style={{width: '100%', height: '100%', objectFit: 'contain'}}
    />
  </AbsoluteFill>
);

export const Entrega: React.FC = () => {
  const dur = (k: keyof typeof CENAS) => sec(CENAS[k].ate - CENAS[k].de);
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Sequence from={sec(CENAS.problema.de)} durationInFrames={dur('problema')} name="1 · Problema">
        <Problema />
      </Sequence>
      <Sequence from={sec(CENAS.solucao.de)} durationInFrames={dur('solucao')} name="2 · Solução">
        {temDemo() ? <Demo /> : <Solucao />}
      </Sequence>
      <Sequence from={sec(CENAS.verificacao.de)} durationInFrames={dur('verificacao')} name="3 · Verificação">
        <Verificacao />
      </Sequence>
      <Sequence from={sec(CENAS.impacto.de)} durationInFrames={dur('impacto')} name="4 · Impacto">
        <Impacto />
      </Sequence>
      <Legenda />
    </AbsoluteFill>
  );
};

import React from 'react';
import {Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, card, h1, sec} from '../theme';
import {Appear, Content, Kicker, Stage, useIn, useLin} from '../ui';

const Titulo: React.FC = () => {
  const out = useLin(4.4, 5);
  return (
    <Content style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: 1 - out}}>
      <Appear at={0.2}>
        <Kicker>Claude Lab PUC-Rio 2026 · Case 3</Kicker>
      </Appear>
      <Appear at={0.5}>
        <Img src={staticFile('brand/fiscus-logo.png')} style={{width: 760, height: 'auto', display: 'block', marginTop: 36}} />
      </Appear>
      <Appear at={1.1}>
        <div style={{fontSize: 48, color: C.muted, marginTop: 28, letterSpacing: '-0.02em', fontWeight: 500}}>
          Gerdau × Usiminas · resultados do 3T26
        </div>
      </Appear>
    </Content>
  );
};

const Pilha: React.FC<{nome: string; paginas: number; at: number; cor: string}> = ({nome, paginas, at, cor}) => {
  const p = useIn(at);
  const count = Math.round(useLin(at, at + 2.2) * paginas);
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * 40}px)`, position: 'relative', width: 520, height: 520}}>
      {[5, 4, 3, 2, 1, 0].map((i) => (
        <div
          key={i}
          style={{
            ...card,
            position: 'absolute',
            left: i * 14,
            top: i * 12,
            width: 420,
            height: 440,
            border: `1px solid ${C.hair}`,
            padding: 36,
            boxSizing: 'border-box',
          }}
        >
          {i === 0 && (
            <>
              <div style={{fontSize: 22, color: C.muted, fontWeight: 600}}>ITR · 3T26</div>
              <div style={{fontSize: 46, fontWeight: 700, letterSpacing: '-0.04em', color: cor, marginTop: 6}}>{nome}</div>
              {[0, 1, 2, 3, 4, 5, 6].map((l) => (
                <div key={l} style={{height: 12, borderRadius: 6, background: C.fill, marginTop: l === 0 ? 34 : 16, width: `${92 - ((l * 13) % 30)}%`}} />
              ))}
              <div style={{position: 'absolute', bottom: 30, left: 36, fontSize: 64, fontWeight: 700, letterSpacing: '-0.04em'}}>
                {count} <span style={{fontSize: 30, color: C.muted, fontWeight: 500}}>páginas</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const Documentos: React.FC = () => (
  <Content style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 160}}>
    <Pilha nome="Gerdau" paginas={80} at={0.1} cor={C.gerdau} />
    <Pilha nome="Usiminas" paginas={110} at={0.5} cor={C.usiminas} />
  </Content>
);

const ErroConfiante: React.FC = () => {
  const frame = useCurrentFrame();
  const stamp = useIn(5.6, 14);
  const typed = '“Gerdau, 3T26: R$ 1.078,8 milhões.”';
  const n = Math.round(interpolate(frame, [sec(0.6), sec(2.4)], [0, typed.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <Content style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <Appear at={0}>
        <div style={{fontSize: 30, color: C.muted, fontWeight: 500, marginBottom: 26, textAlign: 'center'}}>
          Uma IA qualquer, lendo o ITR:
        </div>
      </Appear>
      <Appear at={0.2} style={{position: 'relative'}}>
        <div style={{...card, padding: '56px 72px', fontSize: 72, fontWeight: 700, letterSpacing: '-0.04em', minWidth: 1100, textAlign: 'center'}}>
          {typed.slice(0, n)}
          <div style={{fontSize: 28, fontWeight: 500, color: C.green, letterSpacing: 0, marginTop: 18, opacity: n >= typed.length ? 1 : 0}}>
            ● Resposta com alta confiança
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: -60,
            bottom: -80,
            transform: `rotate(-6deg) scale(${0.6 + stamp * 0.4})`,
            opacity: stamp,
            background: C.redSoft,
            color: C.red,
            border: `3px solid ${C.red}`,
            borderRadius: 18,
            padding: '16px 26px',
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          É a holding (pág. 3), não o consolidado.
          <br />
          <span style={{fontWeight: 500}}>17 vezes menos.</span>
        </div>
      </Appear>
    </Content>
  );
};

export const Problema: React.FC = () => (
  <Stage>
    <Sequence durationInFrames={sec(5)}>
      <Titulo />
    </Sequence>
    <Sequence from={sec(5)} durationInFrames={sec(5)}>
      <Documentos />
    </Sequence>
    <Sequence from={sec(10)} durationInFrames={sec(10)}>
      <ErroConfiante />
    </Sequence>
  </Stage>
);

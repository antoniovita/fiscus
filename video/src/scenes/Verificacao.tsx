import React from 'react';
import {C, card, h1} from '../theme';
import {Appear, Content, Kicker, Stage, useLin} from '../ui';
import {D, fmt} from '../data';

const Stat: React.FC<{at: number; a: number; b: number; label: string; hl?: number}> = ({at, a, b, label, hl = 0}) => {
  const n = Math.round(useLin(at, at + 1.2) * a);
  return (
    <Appear at={at} style={{flex: 1}}>
      <div style={{...card, padding: '26px 30px', height: 200, boxSizing: 'border-box', outline: hl ? `3px solid rgba(0,113,227,${hl})` : 'none'}}>
        <div style={{fontSize: 84, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1}}>
          {n}
          <span style={{color: C.faint}}>/{b}</span>
        </div>
        <div style={{fontSize: 23, color: C.muted, marginTop: 14, lineHeight: 1.25}}>{label}</div>
      </div>
    </Appear>
  );
};

export const Verificacao: React.FC = () => {
  const v = D.verif;
  const cz = D.cruzamentos[0];
  const hlIA = useLin(16, 16.6);
  return (
    <Stage>
      <Content>
        <Appear at={0}>
          <Kicker>Como verificamos</Kicker>
          <h1 style={{...h1, fontSize: 64}}>Nenhum número chega ao painel sem passar na checagem.</h1>
        </Appear>
        <div style={{display: 'flex', gap: 24, marginTop: 34}}>
          <Stat at={0.8} a={v.aprovadas} b={v.metricas} label="números conferidos na página do ITR" />
          <Stat at={1.2} a={v.cruzamentos_ok} b={v.cruzamentos} label="cruzamentos com reconciliações publicadas" />
          <Stat at={1.6} a={v.armadilhas_barradas} b={v.armadilhas} label="armadilhas plantadas e barradas" />
          <Stat at={2.0} a={D.ia.acertosValor} b={D.ia.total} label={`Claude lendo os ITRs inteiros (${D.ia.pagG} + ${D.ia.pagU} págs.)`} hl={hlIA} />
        </div>
        <div style={{display: 'flex', gap: 24, marginTop: 24}}>
          <Appear at={6} style={{flex: 1}}>
            <div style={{...card, padding: '24px 30px', height: 250, boxSizing: 'border-box'}}>
              <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>Exemplo de cruzamento · {cz.fonte}</div>
              <div style={{fontSize: 27, fontWeight: 600, marginTop: 10}}>{cz.checagem}</div>
              <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 18}}>
                <div>
                  <div style={{fontSize: 18, color: C.muted}}>Calculado</div>
                  <div style={{fontSize: 46, fontWeight: 700, letterSpacing: '-0.04em'}}>R$ {fmt(cz.calculado, 1)} mi</div>
                </div>
                <div style={{fontSize: 46, color: C.green, fontWeight: 700}}>=</div>
                <div>
                  <div style={{fontSize: 18, color: C.muted}}>Publicado</div>
                  <div style={{fontSize: 46, fontWeight: 700, letterSpacing: '-0.04em'}}>R$ {fmt(cz.publicado, 1)} mi</div>
                </div>
                <div style={{background: C.greenSoft, color: C.green, fontWeight: 600, fontSize: 22, padding: '6px 16px', borderRadius: 980, marginLeft: 'auto'}}>✓ ok</div>
              </div>
            </div>
          </Appear>
          <Appear at={12} style={{flex: 1}}>
            <div style={{...card, padding: '24px 30px', height: 250, boxSizing: 'border-box'}}>
              <div style={{fontSize: 20, fontWeight: 600, color: C.muted}}>Armadilhas que o verificador reprovou</div>
              {D.armadilhas.map((a, i) => (
                <Appear key={a.caso} at={12.3 + i * 0.4}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 16}}>
                    <div style={{width: 34, height: 34, borderRadius: 17, background: C.redSoft, color: C.red, fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>✕</div>
                    <div style={{fontSize: 26, fontWeight: 600}}>{a.caso}</div>
                    <div style={{fontSize: 19, color: C.red, marginLeft: 'auto'}}>barrada</div>
                  </div>
                </Appear>
              ))}
            </div>
          </Appear>
        </div>
      </Content>
    </Stage>
  );
};

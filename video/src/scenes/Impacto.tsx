import React from 'react';
import {Img, Sequence, staticFile} from 'remotion';
import {C, card, h1, sec} from '../theme';
import {Appear, Content, Kicker, Stage, useLin} from '../ui';

const Passo: React.FC<{at: number; t: string; d: string}> = ({at, t, d}) => (
  <Appear at={at} style={{flex: 1}}>
    <div style={{...card, padding: '28px 32px', height: 230, boxSizing: 'border-box'}}>
      <div style={{fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em'}}>{t}</div>
      <div style={{fontSize: 23, color: C.muted, marginTop: 12, lineHeight: 1.32}}>{d}</div>
    </div>
  </Appear>
);

const ImpactoCorpo: React.FC = () => (
  <Content>
    <Appear at={0}>
      <Kicker>Impacto</Kicker>
      <h1 style={{...h1, fontSize: 72, maxWidth: 1500}}>Uma análise que se defende sozinha na frente do comitê.</h1>
    </Appear>
    <Appear at={1}>
      <div style={{fontSize: 30, color: C.muted, marginTop: 22, maxWidth: 1500, lineHeight: 1.3}}>
        Para analistas e diretores de research: cada número do comparativo responde à pergunta “de onde saiu isso?” com a página e o trecho.
      </div>
    </Appear>
    <Appear at={6} style={{marginTop: 44}}>
      <Kicker color={C.muted}>Com mais um dia</Kicker>
    </Appear>
    <div style={{display: 'flex', gap: 24, marginTop: 6}}>
      <Passo at={6.2} t="CSN no 3T26" d="Hoje com dados do 2T26: o ITR do 3T26 ainda não está na CVM." />
      <Passo at={6.6} t="Ferbasa" d="Já aparece na lista de empresas; falta carregar e verificar os dados." />
      <Passo at={7.0} t="Novos setores" d="Entram no mesmo pipeline: extração por página, verificação e cruzamentos." />
    </div>
  </Content>
);

const Fecho: React.FC = () => {
  const fade = useLin(0, 0.6);
  return (
    <Stage style={{opacity: fade}}>
      <Content style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <Appear at={0.2}>
          <Img src={staticFile('brand/fiscus-logo.png')} style={{width: 640, height: 'auto', display: 'block', margin: '0 auto'}} />
        </Appear>
        <Appear at={0.7}>
          <div style={{fontSize: 46, color: C.ink, marginTop: 40, fontWeight: 500, letterSpacing: '-0.02em'}}>Cada número, até a página.</div>
        </Appear>
        <Appear at={1.2}>
          <div style={{fontSize: 28, color: C.muted, marginTop: 34}}>Claude Lab PUC-Rio 2026 · Case 3 · Gerdau × Usiminas · 3T26</div>
          <div style={{fontSize: 22, color: C.faint, marginTop: 12}}>Fontes: ITRs 3T26, CVM Dados Abertos, B3, Banco Central, IBGE, Aço Brasil</div>
        </Appear>
        <Appear at={1.6}>
          <div style={{marginTop: 34, display: 'inline-block', background: C.fill, borderRadius: 980, padding: '14px 30px', fontSize: 28, fontWeight: 600}}>
            Exercício acadêmico · não é recomendação de investimento
          </div>
        </Appear>
      </Content>
    </Stage>
  );
};

export const Impacto: React.FC = () => (
  <Stage>
    <Sequence durationInFrames={sec(12)}>
      <ImpactoCorpo />
    </Sequence>
    <Sequence from={sec(12)} durationInFrames={sec(6)}>
      <Fecho />
    </Sequence>
  </Stage>
);

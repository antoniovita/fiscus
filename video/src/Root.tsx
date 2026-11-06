import React from 'react';
import {Composition} from 'remotion';
import {Entrega} from './Video';
import {FPS, TOTAL_SECONDS} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Entrega"
    component={Entrega}
    durationInFrames={TOTAL_SECONDS * FPS}
    fps={FPS}
    width={1920}
    height={1080}
  />
);

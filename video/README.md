# Vídeo de entrega · Balanço Lado a Lado

Vídeo de 1:58 (1920×1080, 30 fps, H.264, sem áudio) feito com Remotion 4.0.536.

```bash
npm install
npm run render        # = npx remotion render Entrega out/balanco-lado-a-lado.mp4
npm run studio        # pré-visualização no navegador
npm run roteiro       # regenera roteiro_narracao.md a partir de src/captions.json
```

## Cenas

| Tempo | Cena | Arquivo |
|---|---|---|
| 0:00–0:20 | 1 · O problema | `src/scenes/Problema.tsx` |
| 0:20–1:20 | 2 · A solução (tese → empresas → comparativo + clique no número → PDF) | `src/scenes/Solucao.tsx` |
| 1:20–1:40 | 3 · Como verificamos | `src/scenes/Verificacao.tsx` |
| 1:40–1:58 | 4 · Impacto e próximos passos + aviso | `src/scenes/Impacto.tsx` |

As legendas estão em `src/captions.json` (tempos em segundos globais).
Todos os números vêm de `src/data.ts`, que importa direto `../app/data.json`,
`../data/processed/verificacao.json`, `teste_ia_completo.json` e `metricas_itr.json`.

## Slot da gravação de tela (`public/demo.mp4`)

A cena 2 (0:20–1:20, 60 s) é uma recriação animada do app. Para trocar pela gravação real:

1. Grave a tela do Artifact (~60 s: tese do setor → escolher Gerdau e Usiminas → comparativo →
   clicar no EBITDA ajustado da Gerdau e mostrar pág. 72 → Baixar PDF), 16:9, idealmente 1920×1080.
2. Salve como `video/public/demo.mp4` (H.264). Precisa ter **pelo menos 60 s**; o que passar é cortado.
3. Rode `npm run render` de novo.

A composição detecta o arquivo com `getStaticFiles()` e usa `<OffthreadVideo>` (sem som) no lugar
das recriações; as legendas continuam por cima, então siga a ordem do roteiro na gravação.
Para voltar às recriações, apague ou renomeie o arquivo. A lógica está em `src/Video.tsx` (`temDemo`).

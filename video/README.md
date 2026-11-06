# Vídeo de entrega · Fiscus

Vídeo de 1:58 (1920×1080, 30 fps, H.264, sem áudio) feito com Remotion 4.0.536.

```bash
npm install
npm run render        # = npx remotion render Entrega out/fiscus.mp4
npm run studio        # pré-visualização no navegador
npm run roteiro       # regenera roteiro_narracao.md a partir de src/captions.json
```

## Cenas

| Tempo | Cena | Arquivo |
|---|---|---|
| 0:00–0:20 | 1 · O problema | `src/scenes/Problema.tsx` |
| 0:20–1:20 | 2 · A solução (início com menu “+” e etiquetas Gerdau/Usiminas → tese do setor 0:20–0:34 → comparativo: tabela, aba Gráficos e clique no número 0:34–0:56 → panorama de bancos 0:56–1:01 → tese e preço-alvo 1:01–1:08 → apresentação research report/PDF 1:08–1:20) | `src/scenes/Solucao.tsx` |
| 1:20–1:40 | 3 · Como verificamos | `src/scenes/Verificacao.tsx` |
| 1:40–1:58 | 4 · Impacto e próximos passos + aviso | `src/scenes/Impacto.tsx` |

As legendas estão em `src/captions.json` (tempos em segundos globais).
Logotipos em `public/brand/` (cópia de `../app/brand/`), usados com `staticFile()` + `<Img>`.
A etapa "Tese e preço-alvo" aparece sem valores (recomendação, preço-alvo e potencial como
placeholders; sliders sem escala) porque esses números ainda não estão nos JSONs.
`out/balanco-lado-a-lado.mp4` é a versão anterior ao novo nome.
Todos os números vêm de `src/data.ts`, que importa direto `../app/data.json`,
`../data/processed/verificacao.json`, `teste_ia_completo.json`, `metricas_itr.json`,
`historico.json` (margem EBITDA 2021–2025) e `setores/*.json` (menu “+” e panorama de bancos).
A capa da apresentação mostra só os rótulos de recomendação, preço-alvo e potencial (barras cinza).

## Slot da gravação de tela (`public/demo.mp4`)

A cena 2 (0:20–1:20, 60 s) é uma recriação animada do app. Para trocar pela gravação real:

1. Grave a tela do Artifact (~60 s: tese do setor → escolher Gerdau e Usiminas → comparativo →
   clicar no EBITDA ajustado da Gerdau e mostrar pág. 72 → ajustar premissas da tese e preço-alvo → Baixar PDF), 16:9, idealmente 1920×1080.
2. Salve como `video/public/demo.mp4` (H.264). Precisa ter **pelo menos 60 s**; o que passar é cortado.
3. Rode `npm run render` de novo.

A composição detecta o arquivo com `getStaticFiles()` e usa `<OffthreadVideo>` (sem som) no lugar
das recriações; as legendas continuam por cima, então siga a ordem do roteiro na gravação.
Para voltar às recriações, apague ou renomeie o arquivo. A lógica está em `src/Video.tsx` (`temDemo`).

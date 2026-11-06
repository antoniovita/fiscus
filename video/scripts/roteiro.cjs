// Gera roteiro_narracao.md a partir de src/captions.json (mesmos tempos das legendas).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const c = require(path.join(root, 'src/captions.json'));
const mmss = (s) => {
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${(r < 10 ? '0' : '') + r.toFixed(r % 1 ? 1 : 0)}`;
};
const fim = c[c.length - 1].ate;
let out = `# Roteiro de narração · Fiscus\n\nVídeo de entrega · Claude Lab PUC-Rio 2026 · Case 3 · duração ${mmss(fim)} (${fim} s).\n\nO vídeo já tem estas falas como legenda, nos mesmos tempos. Para gravar a voz: leia cada fala dentro da janela indicada (ritmo calmo, ~2,5 palavras por segundo). Gerado a partir de \`src/captions.json\` — se mudar o texto lá, rode \`npm run roteiro\` para atualizar este arquivo.\n`;
let cena = '';
for (const x of c) {
  if (x.cena !== cena) { cena = x.cena; out += `\n## Cena ${cena}\n\n`; }
  out += `- **${mmss(x.de)}–${mmss(x.ate)}** — ${x.texto}\n`;
}
out += `
## Fontes dos números ditos

- 80 e 110 páginas: \`data/processed/teste_ia_completo.json\` → \`paginas_enviadas\`.
- Holding 17 vezes menor (pág. 3): \`data/processed/verificacao.json\` → \`armadilhas[0]\`.
- Veredito “Seletivo” e frase: \`app/data.json\` → \`SETOR.veredito\`.
- Margem EBITDA ajustada 20,2% (Gerdau) e 9,0% / 6,6% (Usiminas): \`app/data.json\` → \`MET.margem_aj\`.
- 77,2% do EBITDA e margem de 27,7% na América do Norte: \`data/processed/metricas_itr.json\` → \`g_peso_an_ebitda_3t26\`, \`g_margem_an_3t26\`.
- Impairment de R$ 2.226 mi no 3T25 (pág. 28): \`metricas_itr.json\` → \`u_impairment_3t25\`; prejuízo de R$ 3.503 mi: \`app/data.json\` → \`MET.lucro\`.
- EBITDA ajustado R$ 3.770 mi, pág. 72, trecho “3.770.176 2.736.858”, R$ mil: \`app/data.json\` → \`PROV["ebitda_aj|g|0"]\`.
- 85/85, 7/7, 3/3: \`verificacao.json\` → \`resumo\`; soma dos segmentos = R$ 3.770,2 mi: \`cruzamentos[0]\`.
- Claude 8/8: \`teste_ia_completo.json\` → \`acertos_valor\`, \`acertos_pagina\`, \`total\`.
- CSN com dados do 2T26: \`app/data.json\` → \`EMP.c.aviso\`.
`;
fs.writeFileSync(path.join(root, 'roteiro_narracao.md'), out);
console.log('roteiro_narracao.md atualizado');

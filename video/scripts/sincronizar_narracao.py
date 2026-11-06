"""Junta a narração ao vídeo sincronizando por cena.

A narração (video/public/narracao.mp3) é cortada em blocos nos silêncios detectados;
cada bloco começa no início da cena correspondente do vídeo e, se for mais longo que
a cena, é acelerado de leve (atempo, sem mudar o tom; máximo 1,12x).
Uso: python3 video/scripts/sincronizar_narracao.py
"""
import subprocess

V = "video/out/fiscus.mp4"
A = "video/public/narracao.mp3"
OUT = "video/out/fiscus_com_narracao.mp4"

# (início no áudio, fim no áudio, início no vídeo, fim máximo no vídeo, cena)
BLOCOS = [
    (0.00, 22.78, 0.0, 20.4, "1 · O problema"),
    (23.36, 37.45, 20.6, 34.0, "2 · Fiscus e tese do setor"),
    (37.93, 50.80, 34.4, 49.0, "2 · Comparativo e gráficos"),
    (51.29, 58.18, 49.2, 56.0, "2 · Clique no número"),
    (58.57, 62.01, 56.4, 61.0, "2 · Panorama de outros setores"),
    (62.42, 66.74, 61.6, 68.0, "2 · Tese e preço-alvo"),
    (67.12, 70.76, 68.8, 80.0, "2 · Apresentação"),
    (71.24, 88.33, 80.8, 100.0, "3 · Como verificamos"),
    (88.76, 92.67, 101.0, 110.0, "4 · Para quem"),
    (93.12, 99.47, 111.2, 117.8, "4 · Fiscus, cada número, até a página"),
]

partes, rotulos = [], []
for i, (a0, a1, v0, vmax, cena) in enumerate(BLOCOS):
    dur = a1 - a0
    tempo = max(1.0, min(1.12, dur / (vmax - v0)))
    fim = v0 + dur / tempo
    partes.append(f"[1:a]atrim={a0}:{a1},asetpts=PTS-STARTPTS,atempo={tempo:.3f},adelay={int(v0*1000)}:all=1[b{i}]")
    rotulos.append(f"[b{i}]")
    print(f"{cena:38s} áudio {a0:6.2f}–{a1:6.2f}  →  vídeo {v0:6.2f}–{fim:6.2f}  ({tempo:.2f}x){'  ⚠ passa da cena' if fim > vmax + 0.05 else ''}")

filt = ";".join(partes) + f";{''.join(rotulos)}amix=inputs={len(BLOCOS)}:normalize=0:duration=longest,apad," \
       "afade=t=out:st=116.8:d=1.2,loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo[a]"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", V, "-i", A, "-filter_complex", filt, "-map", "0:v:0", "-map", "[a]",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", "-t", "118", OUT], check=True)
print("ok →", OUT)

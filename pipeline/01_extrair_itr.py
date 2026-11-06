"""Etapa 1: extrai o texto de cada página dos ITRs.

Entrada:  data/raw/itr/*.pdf
Saída:    data/interim/itr/<empresa>/pagina_NNN.txt  (uma por página, numeração do PDF)
          data/interim/itr/<empresa>/manifest.json   (sha256 do PDF, nº de páginas, data da extração)
"""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "itr"
OUT = ROOT / "data" / "interim" / "itr"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def extrair(pdf_path: Path) -> dict:
    empresa = pdf_path.stem.split("_")[0]
    destino = OUT / empresa
    destino.mkdir(parents=True, exist_ok=True)
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            texto = page.extract_text() or ""
            (destino / f"pagina_{i:03d}.txt").write_text(texto, encoding="utf-8")
        n = len(pdf.pages)
    manifest = {
        "arquivo": pdf_path.name,
        "sha256": sha256(pdf_path),
        "paginas": n,
        "extraido_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ferramenta": f"pdfplumber {pdfplumber.__version__}",
    }
    (destino / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


if __name__ == "__main__":
    pdfs = sorted(RAW.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"Nenhum PDF em {RAW}")
    for p in pdfs:
        m = extrair(p)
        print(f"{m['arquivo']}: {m['paginas']} páginas · sha256 {m['sha256'][:12]}…")

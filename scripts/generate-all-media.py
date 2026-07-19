"""
Generate animated WebP for every exercise in the catalog.

Reads the full 873-exercise catalog JSON, then for each ID assembles the
two JPEG poses (assets/exercises/gifs/<id>-a.jpg, <id>-b.jpg) into a
single animated WebP written to media/exercises/<id>.webp.

The media/ directory is intentionally outside assets/ and must NOT be
tracked by Git LFS (see .gitattributes).

Usage:
    python scripts/generate-all-media.py

Adjust WEBP_QUALITY if the total output exceeds ~100 MB.
"""

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

CATALOG_PATH = ROOT / "src" / "data" / "exercises.catalog.json"
SOURCE_DIR = ROOT / "assets" / "exercises" / "gifs"
OUTPUT_DIR = ROOT / "media" / "exercises"

# Quality setting — matches existing core WebP files.
# Lower this number if the total output exceeds ~100 MB.
WEBP_QUALITY = 70
FRAME_DURATION_MS = 850

# Speed vs compression trade-off.  method=4 is a reasonable middle ground;
# use 0 for fastest generation, 6 for smallest files.
WEBP_METHOD = 4

# ---------------------------------------------------------------------------

def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    total = len(catalog)
    print(f"Catalogue : {total} exercices")

    source_bytes = 0
    webp_bytes = 0
    generated = 0
    skipped = 0

    for i, exercise in enumerate(catalog, start=1):
        exercise_id: str = exercise["id"]
        target = OUTPUT_DIR / f"{exercise_id}.webp"

        # Skip if already generated (idempotency)
        if target.exists():
            skipped += 1
            continue

        # Load the two poses
        frames: list[Image.Image] = []
        for suffix in ("a", "b"):
            jpg_path = SOURCE_DIR / f"{exercise_id}-{suffix}.jpg"
            if not jpg_path.exists():
                print(f"  [!] Fichier manquant : {jpg_path}", file=sys.stderr)
                continue
            source_bytes += jpg_path.stat().st_size
            frames.append(Image.open(jpg_path).convert("RGB"))

        if len(frames) < 2:
            print(f"  [!] Pas assez de poses pour {exercise_id}, ignoré", file=sys.stderr)
            skipped += 1
            continue

        # Ensure both frames have the same dimensions (resize if needed)
        if frames[0].size != frames[1].size:
            target_size = (
                max(frames[0].width, frames[1].width),
                max(frames[0].height, frames[1].height),
            )
            resized: list[Image.Image] = []
            for frame in frames:
                if frame.size != target_size:
                    padded = Image.new("RGB", target_size, (255, 255, 255))
                    padded.paste(frame, (0, 0))
                    resized.append(padded)
                else:
                    resized.append(frame)
            frames = resized

        # Save animated WebP
        frames[0].save(
            target,
            "WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=[FRAME_DURATION_MS, FRAME_DURATION_MS],
            loop=0,
            quality=WEBP_QUALITY,
            method=WEBP_METHOD,
        )
        webp_bytes += target.stat().st_size
        generated += 1

        if i % 100 == 0 or i == total:
            print(f"  Progression : {i}/{total} — {generated} générés, {skipped} ignorés")

    print()
    print(f"Générés   : {generated}")
    print(f"Déjà présents : {skipped}")
    print(f"Source JPEG   : {source_bytes / 1024 / 1024:.1f} Mo")
    print(f"Sortie WebP   : {webp_bytes / 1024 / 1024:.1f} Mo")
    if webp_bytes > 0 and source_bytes > 0:
        print(f"Gain WebP     : {(1 - webp_bytes / source_bytes) * 100:.1f} %")
    print(f"Qualité       : {WEBP_QUALITY}")
    if webp_bytes > 100 * 1024 * 1024:
        print()
        print(f"⚠  ATTENTION : le poids total ({webp_bytes / 1024 / 1024:.1f} Mo) dépasse 100 Mo.")
        print(f"   Réduisez WEBP_QUALITY dans ce script et relancez.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

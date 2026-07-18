from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "assets" / "exercises" / "gifs"
output = ROOT / "assets" / "exercises" / "core"
output.mkdir(parents=True, exist_ok=True)

core_ids = []
for line in (ROOT / "src" / "data" / "exercises.gifs.ts").read_text(encoding="utf-8").splitlines():
    if "'offline-" in line:
        core_ids.append(line.split("'")[1])

source_bytes = 0
webp_bytes = 0
for exercise_id in core_ids:
    frames = []
    for suffix in ("a", "b"):
        filename = source / f"{exercise_id}-{suffix}.jpg"
        source_bytes += filename.stat().st_size
        frames.append(Image.open(filename).convert("RGB"))
    target = output / f"{exercise_id}.webp"
    frames[0].save(
        target,
        "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=[850, 850],
        loop=0,
        quality=78,
        method=6,
    )
    webp_bytes += target.stat().st_size

print(f"{len(core_ids)} animations : JPEG={source_bytes} octets, WebP={webp_bytes} octets")
print(f"Gain WebP : {(1 - webp_bytes / source_bytes) * 100:.1f}%")

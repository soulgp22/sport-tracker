"""Montage promo Life Sport Tracker : 9:16 et 16:9 a partir des clips emulateur."""
# Copie de travail : les clips sources (adb screenrecord sur emulateur) ne sont pas versionnes.
import subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FF = r"C:\Users\soulg\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
ROOT = Path(__file__).parent
CLIPS = ROOT / "clips"
WORK = ROOT / "work"; WORK.mkdir(exist_ok=True)
REPO = Path(r"E:\AI\Claude Code\sport-tracker")
FONTS = REPO / "node_modules/@expo-google-fonts"
OSWALD = str(FONTS / "oswald/700Bold/Oswald_700Bold.ttf")
ARCHIVO = str(FONTS / "archivo/600SemiBold/Archivo_600SemiBold.ttf")
ICON = REPO / "docs/play-store/assets/playstore-icon-512.png"
NAVY = (22, 35, 59); WHITE = (255, 255, 255); BLUE = (120, 160, 255); GREEN = (80, 200, 150)
SOFT = (148, 160, 182)

# (clip, debut, fin, etiquette, titre)  -- titre : lignes separees par \n
SEGMENTS = [
    ("photo", 5.4, 6.9, "NUTRITION", "Photographie|ton plat"),
    ("photo", 8.6, 9.4, "NUTRITION", "Photographie|ton plat"),
    ("photo", 9.5, 12.4, "IA", "Aliments et grammes|détectés"),
    ("photo", 21.0, 25.2, "CALORIES", "Calories et macros|en quelques secondes"),
    ("save", 0.5, 1.4, "JOURNAL", "Ajouté à ta journée"),
    ("save", 2.0, 3.4, "JOURNAL", "Ajouté à ta journée"),
    ("seance", 2.5, 4.1, "ENTRAÎNEMENT", "Lance ta séance"),
    ("seance", 4.8, 8.2, "ENTRAÎNEMENT", "Lance ta séance"),
    ("seance", 13.0, 16.5, "REPOS", "Minuteur intégré"),
    ("stats", 0.3, 6.6, "PROGRESSION", "1RM, niveau|et badges"),
]
FPS = 30
SRC_CROP = (0, 115, 1080, 2160)  # x, y, w, h : retire barre d'etat et barre de navigation


def font(path, size):
    return ImageFont.truetype(path, size)


def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return m


def text_block(draw, xy, label, title, label_font, title_font, align="left", width=None):
    x, y = xy
    lw = draw.textlength(label, font=label_font)
    lx = x if align == "left" else x + (width - lw) / 2
    draw.text((lx, y), label, font=label_font, fill=BLUE if label != "IA" else GREEN)
    y += label_font.size + 18
    for line in title.split("|"):
        tw = draw.textlength(line, font=title_font)
        tx = x if align == "left" else x + (width - tw) / 2
        draw.text((tx, y), line, font=title_font, fill=WHITE)
        y += int(title_font.size * 1.12)


def frame_png(fmt, label, title, path):
    """Fond navy + legende, avec un trou arrondi transparent a l'emplacement de l'ecran."""
    if fmt == "v":
        W, H = 1080, 1920; sw, sh = 740, 1480; sx, sy = (W - sw) // 2, 408
        img = Image.new("RGBA", (W, H), NAVY + (255,))
        d = ImageDraw.Draw(img)
        text_block(d, (60, 70), label, title, font(ARCHIVO, 34), font(OSWALD, 96), "center", W - 120)
    else:
        W, H = 1920, 1080; sh = 1000; sw = sh // 2; sx, sy = 1170, 40
        img = Image.new("RGBA", (W, H), NAVY + (255,))
        d = ImageDraw.Draw(img)
        n = title.count("|") + 1
        ty = (H - (34 + 18 + int(110 * 1.12) * n)) // 2
        text_block(d, (150, ty), label, title, font(ARCHIVO, 38), font(OSWALD, 110))
    r = 46 if fmt == "v" else 30
    # ombre douce autour de l'ecran
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((sx - 6, sy - 6, sx + sw + 6, sy + sh + 6), r + 6, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    final = Image.alpha_composite(img, shadow)
    hole = Image.new("L", (W, H), 255)
    hole.paste(Image.new("L", (sw, sh), 0), (sx, sy), rounded_mask(sw, sh, r))
    final.putalpha(hole)
    final.save(path)
    return W, H, sw, sh, sx, sy


def card_png(fmt, kind, path):
    W, H = (1080, 1920) if fmt == "v" else (1920, 1080)
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    icon = Image.open(ICON).convert("RGBA")
    isz = 300 if fmt == "v" else 260
    icon = icon.resize((isz, isz), Image.LANCZOS)
    mask = rounded_mask(isz, isz, isz // 5)
    if kind == "intro":
        lines = [("Life Sport Tracker", font(OSWALD, 104 if fmt == "v" else 120), WHITE),
                 ("Muscu et nutrition, au même endroit", font(ARCHIVO, 44 if fmt == "v" else 48), SOFT)]
    else:
        lines = [("Gratuit sur Google Play", font(OSWALD, 96 if fmt == "v" else 110), WHITE),
                 ("Life Sport Tracker", font(ARCHIVO, 48), SOFT)]
    hs = [d.textbbox((0, 0), s, font=f)[3] for s, f, _ in lines]
    gap = 34
    total = isz + 70 + sum(hs) + gap * (len(lines) - 1)
    y = (H - total) // 2
    img.paste(icon, ((W - isz) // 2, y), mask)
    y += isz + 70
    for (text, f, col), h in zip(lines, hs):
        tw = d.textlength(text, font=f)
        d.text(((W - tw) / 2, y), text, font=f, fill=col)
        y += h + gap
    img.save(path)


def run(args):
    r = subprocess.run([FF, "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)


def build(fmt):
    parts = []
    for name, dur in (("intro", 2.4),):
        png = WORK / f"{fmt}_{name}.png"; card_png(fmt, name, png)
        out = WORK / f"{fmt}_00_{name}.mp4"
        run(["-loop", "1", "-t", str(dur), "-i", str(png), "-vf",
             f"fps={FPS},format=yuv420p,fade=in:st=0:d=0.4", "-c:v", "libx264", "-crf", "18", str(out)])
        parts.append(out)
    for i, (clip, t0, t1, label, title) in enumerate(SEGMENTS, 1):
        png = WORK / f"{fmt}_seg{i}.png"
        W, H, sw, sh, sx, sy = frame_png(fmt, label, title, png)
        x, y, w, h = SRC_CROP
        out = WORK / f"{fmt}_{i:02d}.mp4"
        fc = (f"[0:v]fps={FPS},trim={t0}:{t1},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y},scale={sw}:{sh}:flags=lanczos[s];"
              f"color=c=0x16233b:s={W}x{H}:r={FPS}[bg];[bg][s]overlay={sx}:{sy}:shortest=1[b];"
              f"[b][1:v]overlay=0:0,format=yuv420p[o]")
        run(["-i", str(CLIPS / f"{clip}.mp4"), "-loop", "1", "-i", str(png), "-filter_complex", fc,
             "-map", "[o]", "-t", f"{t1 - t0:.2f}", "-c:v", "libx264", "-crf", "18", "-an", str(out)])
        parts.append(out)
    png = WORK / f"{fmt}_outro.png"; card_png(fmt, "outro", png)
    out = WORK / f"{fmt}_99_outro.mp4"
    run(["-loop", "1", "-t", "3", "-i", str(png), "-vf",
         f"fps={FPS},format=yuv420p,fade=out:st=2.4:d=0.6", "-c:v", "libx264", "-crf", "18", str(out)])
    parts.append(out)
    lst = WORK / f"{fmt}_list.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
    final = ROOT / ("promo_vertical_9x16.mp4" if fmt == "v" else "promo_paysage_16x9.mp4")
    run(["-f", "concat", "-safe", "0", "-i", str(lst), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
         "-shortest", "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-movflags", "+faststart", str(final)])
    print("ok", final)


if __name__ == "__main__":
    for f in sys.argv[1:] or ["v", "h"]:
        build(f)

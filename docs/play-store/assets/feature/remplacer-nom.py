"""Remplace « Life Sport Tracker » par « Platelift » sur les bannieres Play 1024 x 500.

Pourquoi ce script plutot qu'une nouvelle generation d'image : les bannieres
premium-v2 (haltere, bol, courbe corail) ont ete generees par IA ; une nouvelle
generation changerait toute la composition et le pack d'origine n'est pas
reproductible. Seul le nom change : on efface le texte blanc par inpainting
(OpenCV, le fond est un degrade lisse), puis on ecrit le nouveau nom dans la
police la plus proche, a la meme hauteur de capitale, sur la meme ligne de base.

Usage : python remplacer-nom.py <source.png> <sortie.png> <geometrique|condensee>
"""
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OLD = 'Life Sport Tracker'
NEW = 'Platelift'
FONTS = 'node_modules/@expo-google-fonts'
STYLES = {
    # (fichier, instance variable). Bannieres FR : sans geometrique demi-gras.
    'geometrique': (f'{FONTS}/archivo/600SemiBold/Archivo_600SemiBold.ttf', None),
    # Bannieres EN/ES/DE : semi-condensee reguliere. Oswald (deja dans le projet) a ete
    # essayee : 16 % plus etroite que l'original a hauteur egale. Bahnschrift
    # SemiCondensed (police Windows) tombe a 4 % : le script suppose donc Windows.
    'condensee': ('C:/Windows/Fonts/bahnschrift.ttf', 'SemiCondensed'),
}


def load_font(style: str, size: int) -> ImageFont.FreeTypeFont:
    path, instance = STYLES[style]
    font = ImageFont.truetype(path, size)
    if instance:
        font.set_variation_by_name(instance)
    return font


# Bande ou se trouve le nom : a droite du symbole (x > 130), avant l'haltere FR (x < 600,
# sinon ses reflets gris clair sont pris pour du texte et effaces).
BAND = (130, 40, 600, 140)


def name_mask(rgb: np.ndarray) -> np.ndarray:
    """Pixels du nom : clairs et peu satures (le symbole est bleu/corail, donc exclu)."""
    x0, y0, x1, y1 = BAND
    zone = rgb[y0:y1, x0:x1].astype(int)
    light = zone.min(axis=2) > 120
    grey = (zone.max(axis=2) - zone.min(axis=2)) < 60
    mask = np.zeros(rgb.shape[:2], np.uint8)
    mask[y0:y1, x0:x1] = (light & grey).astype(np.uint8) * 255
    return mask


def main() -> None:
    src, dst, style = sys.argv[1:4]
    rgb = np.array(Image.open(src).convert('RGB'))
    mask = name_mask(rgb)
    ys, xs = np.nonzero(mask)
    if len(xs) < 200:
        raise SystemExit(f'{src} : nom introuvable dans la bande {BAND}')
    left, top, right, bottom = xs.min(), ys.min(), xs.max(), ys.max()
    color = tuple(int(c) for c in np.median(rgb[mask > 0], axis=0))

    # Effacer : masque dilate pour emporter l'anticrenelage, inpainting Telea.
    grown = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)
    clean = cv2.inpaint(rgb[:, :, ::-1].copy(), grown, 7, cv2.INPAINT_TELEA)[:, :, ::-1]

    # Taille : celle qui redonne a l'ancien nom sa hauteur reelle (haut du L -> bas du p).
    size = 10
    while True:
        f = load_font(style, size + 1)
        b = f.getbbox(OLD)
        if b[3] - b[1] > bottom - top + 1:
            break
        size += 1
    font = load_font(style, size)
    old_box = font.getbbox(OLD)
    print(f'{src} : nom {right - left + 1}x{bottom - top + 1}px, police {size}px, '
          f'largeur rendue {old_box[2] - old_box[0]}px, couleur {color}')

    out = Image.fromarray(clean)
    draw = ImageDraw.Draw(out)
    # Meme origine que l'ancien nom : sa capitale et sa ligne de base restent en place.
    draw.text((left - old_box[0], top - old_box[1]), NEW, font=font, fill=color)
    out.save(dst, optimize=True)


if __name__ == '__main__':
    main()

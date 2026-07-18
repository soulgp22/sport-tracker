#!/usr/bin/env python3
"""Generate every app-brand bitmap from a transparent two-color source mark."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


BLUE = (47, 107, 255, 255)
CORAL = (255, 91, 69, 255)
NAVY = (7, 26, 51, 255)


def flatten_mark(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    pixels = []
    for red, green, blue, alpha in rgba.get_flattened_data():
        if alpha < 8:
            pixels.append((0, 0, 0, 0))
        elif red > blue:
            pixels.append((*CORAL[:3], alpha))
        else:
            pixels.append((*BLUE[:3], alpha))
    rgba.putdata(pixels)
    bounds = rgba.getchannel("A").getbbox()
    return rgba.crop(bounds) if bounds else rgba


def contain(mark: Image.Image, canvas_size: int, mark_size: int, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background)
    resized = mark.copy()
    resized.thumbnail((mark_size, mark_size), Image.Resampling.LANCZOS)
    offset = ((canvas_size - resized.width) // 2, (canvas_size - resized.height) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas


def monochrome(mark: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    result = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    result.paste(color, (0, 0), mark.getchannel("A"))
    return result


def save(image: Image.Image, path: Path) -> None:
    image.save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    mark = flatten_mark(Image.open(args.source))
    transparent_mark = contain(mark, 1024, 900, (0, 0, 0, 0))
    save(transparent_mark, args.output_dir / "life-sport-mark.png")

    save(contain(transparent_mark, 1024, 690, NAVY), args.output_dir / "icon.png")
    save(contain(transparent_mark, 1024, 620, (0, 0, 0, 0)), args.output_dir / "android-icon-foreground.png")
    save(Image.new("RGBA", (1024, 1024), NAVY), args.output_dir / "android-icon-background.png")
    save(contain(monochrome(transparent_mark, (255, 255, 255, 255)), 1024, 620, (0, 0, 0, 0)), args.output_dir / "android-icon-monochrome.png")
    save(contain(transparent_mark, 1024, 640, (0, 0, 0, 0)), args.output_dir / "splash-icon.png")
    save(contain(transparent_mark, 64, 48, NAVY), args.output_dir / "favicon.png")
    save(contain(monochrome(transparent_mark, (255, 255, 255, 255)), 96, 68, (0, 0, 0, 0)), args.output_dir / "notification-icon.png")


if __name__ == "__main__":
    main()

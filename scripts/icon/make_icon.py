"""Draws the app icon (white dumbbell on the app's orange) and writes every size Expo needs.

    python scripts/icon/make_icon.py
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = ROOT + "/assets/images/"
TOP, BOTTOM = (255, 122, 69), (214, 72, 30)  # gradient around the theme's primary #E4572E
SS = 4  # supersampling


def dumbbell(size, span, color=(255, 255, 255, 255), angle=30):
    """Transparent square image with a dumbbell `span` (fraction of size) wide, rotated."""
    n = size * SS
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = n * span
    cx = cy = n / 2

    def box(x0, x1, h, r):
        d.rounded_rectangle([cx + x0 * w, cy - h * w / 2, cx + x1 * w, cy + h * w / 2],
                            radius=r * w, fill=color)

    box(-0.36, 0.36, 0.075, 0.03)  # handle
    for s in (-1, 1):
        a, b = sorted((s * 0.20, s * 0.32))
        box(a, b, 0.62, 0.05)  # big plate
        a, b = sorted((s * 0.34, s * 0.44))
        box(a, b, 0.42, 0.04)  # small plate
        a, b = sorted((s * 0.46, s * 0.5))
        box(a, b, 0.14, 0.02)  # sleeve end
    im = im.rotate(angle, resample=Image.BICUBIC)
    return im.resize((size, size), Image.LANCZOS)


def gradient(size):
    im = Image.new("RGBA", (size, size))
    px = im.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)) + (255,)
    return im


def on_gradient(size, span):
    im = gradient(size)
    im.alpha_composite(dumbbell(size, span))
    return im


on_gradient(1024, 0.7).save(OUT + "icon.png")
on_gradient(48, 0.86).save(OUT + "favicon.png")
# Android adaptive icon: the launcher crops to a circle/squircle, keep the shape in the safe zone.
gradient(512).save(OUT + "android-icon-background.png")
dumbbell(512, 0.56).save(OUT + "android-icon-foreground.png")
dumbbell(432, 0.56).save(OUT + "android-icon-monochrome.png")
dumbbell(456, 0.92).save(OUT + "splash-icon.png")
print("ok")

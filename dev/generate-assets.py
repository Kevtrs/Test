#!/usr/bin/env python3
"""Génère les assets locaux du photobooth (icônes, cadres, logos, fonds).
Script à usage unique, ne fait pas partie de l'app livrée (n'est pas référencé
par le service worker ni le HTML).
"""
import math
import os
import wave
import struct
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "assets", "icons")
FRAMES = os.path.join(ROOT, "assets", "frames")
LOGOS = os.path.join(ROOT, "assets", "logos")
BACKGROUNDS = os.path.join(ROOT, "assets", "backgrounds")
SOUNDS = os.path.join(ROOT, "assets", "sounds")

for d in (ICONS, FRAMES, LOGOS, BACKGROUNDS, SOUNDS):
    os.makedirs(d, exist_ok=True)

BLUE = (10, 132, 184)
BLUE_DARK = (6, 60, 90)
CREAM = (250, 245, 235)


def lerp(a, b, t):
    return a + (b - a) * t


def vgrad(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size, top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(lerp(top[0], bottom[0], t))
        g = int(lerp(top[1], bottom[1], t))
        b = int(lerp(top[2], bottom[2], t))
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


# ---------------------------------------------------------------------------
# Icônes PWA (fond dégradé bleu + appareil photo simplifié + éclair)
# ---------------------------------------------------------------------------
def draw_camera_glyph(draw, cx, cy, s, color, accent):
    # boîtier
    body_w, body_h = s * 0.62, s * 0.42
    left = cx - body_w / 2
    top = cy - body_h / 2 + s * 0.04
    radius = s * 0.07
    draw.rounded_rectangle([left, top, left + body_w, top + body_h], radius=radius, fill=color)
    # bosse viseur
    bump_w, bump_h = s * 0.22, s * 0.10
    draw.rounded_rectangle(
        [cx - bump_w / 2, top - bump_h * 0.8, cx + bump_w / 2, top + bump_h * 0.3],
        radius=bump_h * 0.3, fill=color,
    )
    # objectif
    lens_r = body_h * 0.36
    draw.ellipse([cx - lens_r, cy + s * 0.04 - lens_r, cx + lens_r, cy + s * 0.04 + lens_r], fill=accent)
    inner_r = lens_r * 0.55
    draw.ellipse([cx - inner_r, cy + s * 0.04 - inner_r, cx + inner_r, cy + s * 0.04 + inner_r], fill=color)
    # flash
    flash_r = s * 0.045
    fx, fy = left + body_w * 0.18, top + body_h * 0.22
    draw.ellipse([fx - flash_r, fy - flash_r, fx + flash_r, fy + flash_r], fill=accent)


def make_icon(size, maskable=False):
    img = vgrad((size, size), BLUE, BLUE_DARK)
    draw = ImageDraw.Draw(img)
    if maskable:
        # zone de sécurité ~ 80% pour maskable icons
        draw_camera_glyph(draw, size / 2, size / 2, size * 0.62, CREAM, (255, 214, 102))
    else:
        radius = size * 0.22
        mask = Image.new("L", (size, size), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
        rounded = Image.new("RGBA", (size, size))
        rounded.paste(img, (0, 0), mask)
        img = rounded
        draw = ImageDraw.Draw(img)
        draw_camera_glyph(draw, size / 2, size / 2, size * 0.66, CREAM, (255, 214, 102))
    return img.convert("RGBA")


icon_sizes = [16, 32, 48, 72, 96, 120, 152, 167, 180, 192, 256, 384, 512]
for s in icon_sizes:
    make_icon(s).save(os.path.join(ICONS, f"icon-{s}.png"))
make_icon(512, maskable=True).save(os.path.join(ICONS, "icon-maskable-512.png"))
make_icon(192, maskable=True).save(os.path.join(ICONS, "icon-maskable-192.png"))
# apple-touch-icon dédié (pas de coins arrondis, iOS les applique lui-même)
make_icon(180, maskable=True).save(os.path.join(ICONS, "apple-touch-icon.png"))
# favicon multi-tailles
make_icon(32).save(os.path.join(ICONS, "favicon-32.png"))
make_icon(16).save(os.path.join(ICONS, "favicon-16.png"))

# ---------------------------------------------------------------------------
# Cadre générique élégant (PNG transparent, 1800x1200)
# ---------------------------------------------------------------------------
def make_generic_frame(w, h, path):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = int(min(w, h) * 0.035)
    # double liseré fin
    draw.rounded_rectangle(
        [margin, margin, w - margin, h - margin],
        radius=int(min(w, h) * 0.03), outline=(10, 132, 184, 235), width=max(4, w // 300)
    )
    inner = margin + max(10, w // 150)
    draw.rounded_rectangle(
        [inner, inner, w - inner, h - inner],
        radius=int(min(w, h) * 0.026), outline=(255, 255, 255, 160), width=max(2, w // 600)
    )
    # coins décoratifs (petits arcs dorés)
    corner = int(min(w, h) * 0.06)
    gold = (255, 200, 90, 230)
    for (cx, cy, a1, a2) in [
        (margin, margin, 180, 270),
        (w - margin, margin, 270, 360),
        (margin, h - margin, 90, 180),
        (w - margin, h - margin, 0, 90),
    ]:
        bbox = [cx - corner, cy - corner, cx + corner, cy + corner]
        draw.arc(bbox, a1, a2, fill=gold, width=max(6, w // 220))
    img.save(path)


make_generic_frame(1800, 1200, os.path.join(FRAMES, "frame-generic-landscape.png"))
make_generic_frame(1200, 1800, os.path.join(FRAMES, "frame-generic-portrait.png"))


# ---------------------------------------------------------------------------
# Cadre thème "Sarah - 18 ans" (damier festif rose/rouge/crème/noir en bordure)
# ---------------------------------------------------------------------------
def make_sarah_frame(w, h, path):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    band = int(min(w, h) * 0.075)
    colors = [(233, 30, 99, 255), (198, 40, 40, 255), (250, 245, 235, 255), (20, 18, 20, 255)]
    tile = max(18, band // 2)

    def checker_band(rect, horizontal):
        x0, y0, x1, y1 = rect
        i = 0
        if horizontal:
            x = x0
            while x < x1:
                c = colors[i % len(colors)]
                draw.rectangle([x, y0, min(x + tile, x1), y1], fill=c)
                x += tile
                i += 1
        else:
            y = y0
            while y < y1:
                c = colors[i % len(colors)]
                draw.rectangle([x0, y, x1, min(y + tile, y1)], fill=c)
                y += tile
                i += 1

    checker_band([0, 0, w, band], True)
    checker_band([0, h - band, w, h], True)
    checker_band([0, 0, band, h], False)
    checker_band([w - band, 0, w, h], False)
    # cadre blanc pour la zone photo
    inset = band + int(min(w, h) * 0.012)
    draw.rectangle([inset, inset, w - inset, h - inset], outline=(255, 255, 255, 255), width=max(6, w // 260))
    img.save(path)


make_sarah_frame(1800, 1200, os.path.join(FRAMES, "frame-sarah18-landscape.png"))
make_sarah_frame(1200, 1800, os.path.join(FRAMES, "frame-sarah18-portrait.png"))


# ---------------------------------------------------------------------------
# Logos placeholder
# ---------------------------------------------------------------------------
def make_logo_generic(path, size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, size - 8, size - 8], fill=(10, 132, 184, 255))
    draw_camera_glyph(draw, size / 2, size / 2, size * 0.6, CREAM, (255, 214, 102))
    img.save(path)


def make_logo_sarah(path, size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, size - 8, size - 8], fill=(233, 30, 99, 255))
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    text = "18"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    # gros "18" dessiné en formes simples plutôt qu'une police (évite dépendance police)
    cx, cy = size / 2, size / 2
    draw.ellipse([cx - size * 0.32, cy - size * 0.22, cx + size * 0.32, cy + size * 0.22], outline=(255, 255, 255, 255), width=int(size * 0.05))
    img.save(path)


make_logo_generic(os.path.join(LOGOS, "logo-generic.png"))
make_logo_sarah(os.path.join(LOGOS, "logo-sarah18.png"))

# ---------------------------------------------------------------------------
# Fonds d'écran d'accueil
# ---------------------------------------------------------------------------
def make_bg_generic(path, w=1600, h=1200):
    img = vgrad((w, h), (8, 20, 32), (10, 60, 92))
    draw = ImageDraw.Draw(img, "RGBA")
    import random
    random.seed(7)
    for _ in range(28):
        r = random.randint(40, 220)
        x = random.randint(-50, w + 50)
        y = random.randint(-50, h + 50)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 10))
    img = img.filter(ImageFilter.GaussianBlur(2))
    img.save(path, quality=88)


def make_bg_sarah(path, w=1600, h=1200):
    img = Image.new("RGB", (w, h), (20, 10, 14))
    draw = ImageDraw.Draw(img, "RGBA")
    tile = 90
    colors = [(233, 30, 99), (20, 18, 20)]
    for yi, y in enumerate(range(0, h, tile)):
        for xi, x in enumerate(range(0, w, tile)):
            if (xi + yi) % 2 == 0:
                draw.rectangle([x, y, x + tile, y + tile], fill=colors[0])
            else:
                draw.rectangle([x, y, x + tile, y + tile], fill=colors[1])
    # voile sombre pour la lisibilité du texte
    overlay = Image.new("RGBA", (w, h), (10, 5, 8, 150))
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    img.convert("RGB").save(path, quality=88)


make_bg_generic(os.path.join(BACKGROUNDS, "bg-generic.jpg"))
make_bg_sarah(os.path.join(BACKGROUNDS, "bg-sarah18.jpg"))

# splash simple (pour apple-touch-startup-image basique, iPad landscape 2732x2048 réduit)
make_bg_generic(os.path.join(BACKGROUNDS, "splash-generic.jpg"), 1600, 1200)

print("Images générées.")

# ---------------------------------------------------------------------------
# Sons (WAV synthétisés, pas de dépendance)
# ---------------------------------------------------------------------------
def write_wav(path, samples, rate=44100):
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rate)
        frames = b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples)
        f.writeframes(frames)


def envelope(i, n, attack=0.02, release=0.35):
    t = i / n
    a = min(1.0, t / attack) if attack > 0 else 1.0
    r = min(1.0, (1 - t) / release) if release > 0 else 1.0
    return min(a, r)


def shutter_sound(path, rate=44100, dur=0.18):
    n = int(rate * dur)
    samples = []
    import random
    random.seed(3)
    for i in range(n):
        t = i / rate
        # clic sec: bruit filtré + court transitoire aigu
        noise = (random.random() * 2 - 1)
        click = math.sin(2 * math.pi * 1800 * t) * math.exp(-t * 60)
        env = math.exp(-t * 45)
        s = (noise * 0.35 + click * 0.9) * env
        samples.append(s)
    write_wav(path, samples, rate)


def countdown_tick(path, rate=44100, dur=0.09, freq=880):
    n = int(rate * dur)
    samples = []
    for i in range(n):
        t = i / rate
        env = math.exp(-t * 30)
        s = math.sin(2 * math.pi * freq * t) * env
        samples.append(s * 0.6)
    write_wav(path, samples, rate)


def success_chime(path, rate=44100, dur=0.6):
    n = int(rate * dur)
    samples = []
    notes = [523.25, 659.25, 783.99]
    for i in range(n):
        t = i / rate
        env = math.exp(-t * 3.2)
        s = 0
        for k, f in enumerate(notes):
            start = k * 0.09
            if t >= start:
                s += math.sin(2 * math.pi * f * (t - start)) * math.exp(-(t - start) * 5) * 0.33
        samples.append(s * env)
    write_wav(path, samples, rate)


shutter_sound(os.path.join(SOUNDS, "shutter.wav"))
countdown_tick(os.path.join(SOUNDS, "tick.wav"))
success_chime(os.path.join(SOUNDS, "chime.wav"))

print("Sons générés.")
print("Terminé.")

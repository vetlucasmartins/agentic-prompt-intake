#!/usr/bin/env python3
"""Gera docs/demo.gif: um terminal animado mostrando o protocolo de intake.

Uso: python3 scripts/gen_demo_gif.py
Requisitos: Pillow. Fonte Menlo (macOS) com fallback para DejaVu Sans Mono.
O GIF resultante anima no GitHub (README) via proxy de imagem.
"""
from __future__ import annotations
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "demo.gif")

W, H = 760, 470
PAD_X, TOP = 24, 64
LH = 26  # line height
FS = 16

BG = (13, 17, 23)
BAR = (22, 27, 34)
DEFAULT = (201, 209, 217)
MUTED = (139, 148, 158)
BLUE = (88, 166, 255)
GREEN = (63, 185, 80)
RED = (248, 81, 73)
PURPLE = (210, 168, 255)
WHITE = (240, 246, 252)


def load_font(size, bold=False):
    for path, idx in (("/System/Library/Fonts/Menlo.ttc", 1 if bold else 0),
                      ("/Library/Fonts/Menlo.ttc", 1 if bold else 0)):
        try:
            return ImageFont.truetype(path, size, index=idx)
        except OSError:
            continue
    for name in ("DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf",
                 "DejaVuSansMono.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT = load_font(FS)
FONT_B = load_font(FS, bold=True)
FONT_T = load_font(14)


def base():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 40], fill=BAR)
    for i, c in enumerate(((255, 95, 86), (255, 189, 46), (39, 201, 63))):
        d.ellipse([18 + i * 22, 14, 30 + i * 22, 26], fill=c)
    d.text((W // 2 - 52, 12), "intake-refiner", font=FONT_T, fill=MUTED)
    return img, d


def draw_segs(d, x, y, segs):
    for text, color, font in segs:
        d.text((x, y), text, font=font, fill=color)
        x += d.textlength(text, font=font)


def L(*segs):  # build a line from (text, color, bold?) tuples
    return [(t, c, FONT_B if b else FONT) for (t, c, b) in segs]


you1 = "quero um negócio que faça a IA entender"
you2 = "meus áudios... não sei se é skill ou agents md"
label_you = ("you> ", BLUE, True)
label_ag = ("agent> ", GREEN, True)

steps = []

# 1. typing the natural-language input, a few chars per frame
for i in range(0, len(you1) + 1, 3):
    steps.append(([L(label_you, (you1[:i], DEFAULT, False))], 1))
steps.append(([L(label_you, (you1, DEFAULT, False))], 3))
for i in range(0, len(you2) + 1, 3):
    steps.append(([
        L(label_you, (you1, DEFAULT, False)),
        L(("     ", DEFAULT, False), (you2[:i], DEFAULT, False)),
    ], 1))

full_you = [
    L(label_you, (you1, DEFAULT, False)),
    L(("     ", DEFAULT, False), (you2, DEFAULT, False)),
]
steps.append((full_you, 8))

# 2. naive agent — executes too early
naive = full_you + [
    [("", DEFAULT, FONT)],
    L(label_ag, ("(sem intake) ", MUTED, False), ("já cria um AGENTS.md genérico", DEFAULT, False)),
    L(("        ", DEFAULT, False), ("✗ executou cedo demais", RED, False)),
]
steps.append((naive, 14))

# 3. intake reveal, line by line
intake_lines = [
    [("", DEFAULT, FONT)],
    L(label_ag, ("entendi: camada de intake p/ entradas vagas de áudio", DEFAULT, False)),
    [("", DEFAULT, FONT)],
    L(("  Brief", WHITE, True)),
    L(("   - ", PURPLE, False), ("Objetivo: clarificar antes de executar", DEFAULT, False)),
    L(("   - ", PURPLE, False), ("Entregável: protocolo portátil p/ agentes", DEFAULT, False)),
    L(("   - ", PURPLE, False), ("Sucesso: pergunta quando há lacuna crítica", DEFAULT, False)),
    L(("  Perguntas", WHITE, True)),
    L(("   1. ", PURPLE, False), ("Codex, Claude Code ou outra?", DEFAULT, False)),
    L(("   2. ", PURPLE, False), ("sempre perguntar ou assumir risco baixo?", DEFAULT, False)),
    L(("   3. ", PURPLE, False), ("só instruções ou repositório aberto?", DEFAULT, False)),
]
shown = full_you + [[("", DEFAULT, FONT)]]
for ln in intake_lines:
    shown = shown + [ln]
    steps.append((shown, 3))

final = shown + [L(("        ", DEFAULT, False), ("✓ clarificou antes de agir", GREEN, False))]
steps.append((final, 30))

# render frames
frames, durations = [], []
for lines, hold in steps:
    img, d = base()
    y = TOP
    for line in lines:
        draw_segs(d, PAD_X, y, line)
        y += LH
    frames.append(img.convert("P", palette=Image.ADAPTIVE, colors=64))
    durations.append(40 * hold)

frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=durations,
               loop=0, optimize=True, disposal=2)
print(f"wrote {OUT} ({len(frames)} frames, {os.path.getsize(OUT)//1024} KB)")

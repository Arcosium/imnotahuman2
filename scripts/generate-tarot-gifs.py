#!/usr/bin/env python3
"""Create fixed-identity, gently shimmering GIFs from the public-domain tarot scans."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ASSET_DIR = Path(__file__).resolve().parents[1] / "src/assets/tarot"
CARDS = (
    "moon",
    "five-wands",
    "four-pentacles",
    "seven-swords",
    "magician",
    "star",
    "high-priestess",
    "justice",
    "seven-cups",
    "judgement",
    "hermit",
    "chariot",
)
WIDTH = 280
FRAME_COUNT = 6
FRAME_DURATION_MS = 180


def make_frame(base: Image.Image, progress: float) -> Image.Image:
    width, height = base.size
    band_width = int(width * 0.16)
    x = int(-band_width * 1.5 + progress * (width + band_width * 3))

    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        ((x, 0), (x + band_width, 0), (x + band_width * 2, height), (x + band_width, height)),
        fill=96,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(max(4, width // 60)))
    mask = mask.point(lambda value: min(72, round(value * 0.65)))
    sheen = Image.new("RGB", (width, height), (255, 240, 190))
    return Image.composite(sheen, base, mask)


def generate(card: str) -> None:
    source = ASSET_DIR / f"{card}.jpg"
    output = ASSET_DIR / f"{card}.gif"
    with Image.open(source) as original:
        height = round(WIDTH * original.height / original.width)
        base = ImageOps.fit(original.convert("RGB"), (WIDTH, height), method=Image.Resampling.LANCZOS)

    frames = [make_frame(base, frame / (FRAME_COUNT - 1)) for frame in range(FRAME_COUNT)]
    palette_source = Image.new("RGB", (WIDTH * 2, base.height))
    palette_source.paste(base, (0, 0))
    palette_source.paste(frames[FRAME_COUNT // 2], (WIDTH, 0))
    palette = palette_source.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    indexed_frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    indexed_frames[0].save(
        output,
        save_all=True,
        append_images=indexed_frames[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"{output.name}: {output.stat().st_size:,} bytes, {FRAME_COUNT} frames")


if __name__ == "__main__":
    for card_name in CARDS:
        generate(card_name)

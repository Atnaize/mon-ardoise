"""Regenerate the PWA icons. Run: python3 scripts/generate-icons.py"""

from PIL import Image, ImageDraw

ACCENT = (94, 84, 134, 255)
CHALK = (244, 246, 248, 255)
SIZE = 512


def draw_slate(draw: ImageDraw.ImageDraw, scale: float) -> None:
    """A slate board with three chalk strokes, centred on the canvas."""
    board_w, board_h = 260 * scale, 300 * scale
    left = (SIZE - board_w) / 2
    top = (SIZE - board_h) / 2
    stroke = max(2, round(16 * scale))

    draw.rounded_rectangle(
        [left, top, left + board_w, top + board_h],
        radius=28 * scale,
        outline=CHALK,
        width=stroke,
    )

    line_left = left + 44 * scale
    widths = [172, 172, 104]
    for index, width in enumerate(widths):
        y = top + (92 + index * 58) * scale
        draw.rounded_rectangle(
            [line_left, y, line_left + width * scale, y + 18 * scale],
            radius=9 * scale,
            fill=CHALK,
        )


def build(path: str, maskable: bool) -> None:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if maskable:
        draw.rectangle([0, 0, SIZE, SIZE], fill=ACCENT)
        draw_slate(draw, 0.78)
    else:
        draw.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=112, fill=ACCENT)
        draw_slate(draw, 1.0)

    image.save(path)


if __name__ == "__main__":
    build("public/icon-512.png", maskable=False)
    build("public/icon-maskable-512.png", maskable=True)

    Image.open("public/icon-512.png").resize((192, 192), Image.LANCZOS).save("public/icon-192.png")
    Image.open("public/icon-512.png").resize((180, 180), Image.LANCZOS).save("public/apple-icon.png")
    Image.open("public/icon-512.png").resize((256, 256), Image.LANCZOS).save("src/app/icon.png")

    print("icônes générées")

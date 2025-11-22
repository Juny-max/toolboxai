from pathlib import Path

from PIL import Image, ImageDraw
from svgpathtools import svg2paths


def main() -> None:
    svg_path = Path('src/app/icon.svg')
    output_path = Path('src/app/favicon.png')

    paths, _ = svg2paths(str(svg_path))

    size = 512
    background_color = '#100025'
    stroke_color = '#b388ff'
    stroke_width = 40

    image = Image.new('RGBA', (size, size), background_color)
    draw = ImageDraw.Draw(image)

    for path in paths:
        points = [path.point(t / 1000.0) for t in range(1001)]
        xy = [(point.real, point.imag) for point in points]
        draw.line(xy, fill=stroke_color, width=stroke_width, joint='curve')

    image.save(output_path, format='PNG')


if __name__ == '__main__':
    main()

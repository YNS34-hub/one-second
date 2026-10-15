"""生成项目自己的社交封面，不读取或上传本地私人媒体。"""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PAPER, INK, ACCENT, MUTED, LINE = '#f1f0eb', '#1c1c19', '#c6360c', '#64645d', '#cecec4'

def font(size, bold=False, mono=False):
    name = 'consolab.ttf' if mono else ('msyhbd.ttc' if bold else 'msyh.ttc')
    return ImageFont.truetype(str(Path('C:/Windows/Fonts') / name), size)

def make_cover(path, width=1200, height=630):
    # 采用两倍尺寸绘制再缩小，让中文标题和圆弧在时间线缩略图中保持清晰。
    scale = 2
    image = Image.new('RGB', (width * scale, height * scale), PAPER)
    draw = ImageDraw.Draw(image)
    def text(x, y, value, size, color=INK, bold=False, mono=False):
        draw.text((int(x*scale), int(y*scale)), value, font=font(size*scale, bold, mono), fill=color)
    draw.rectangle((56*scale, 42*scale, 103*scale, 89*scale), fill=ACCENT)
    text(64, 37, '1.', 41, '#ffffff', True, True)
    text(120, 45, '恰好一秒', 20, bold=True)
    text(120, 74, 'ONE SECOND', 9, MUTED, mono=True)
    text(900, 57, '@AmzTjh34230', 17, MUTED, mono=True)
    draw.line((56*scale, 116*scale, (width-56)*scale, 116*scale), fill=LINE, width=scale)
    text(56, 164, '你以为的一秒。', 55, bold=True)
    text(56, 241, '真的是一秒？', 55, ACCENT, True)
    text(56, 352, '按住，凭感觉在一秒松手。', 23, MUTED)
    text(56, 405, '1.000', 76, INK, True, True)
    text(292, 451, 's', 26, MUTED, mono=True)
    cx, cy, radius = 904, 341, 160
    for i in range(60):
        angle = math.radians(i*6 - 90)
        r1, r2 = radius + 21, radius + (34 if i%5 == 0 else 29)
        pts = tuple(round(v*scale) for v in (cx+math.cos(angle)*r1, cy+math.sin(angle)*r1, cx+math.cos(angle)*r2, cy+math.sin(angle)*r2))
        draw.line(pts, fill=ACCENT if i == 0 else LINE, width=3*scale if i == 0 else 2*scale)
    box = tuple(round(v*scale) for v in (cx-radius,cy-radius,cx+radius,cy+radius))
    draw.ellipse(box, fill=INK)
    text(868, 230, '↘', 62, '#ee704c')
    text(827, 326, '按住这里', 35, PAPER, True)
    text(826, 393, 'HOLD. FEEL. RELEASE.', 11, '#bfbfb5', mono=True)
    draw.line((56*scale, 550*scale, (width-56)*scale, 550*scale), fill=LINE, width=scale)
    text(56, 575, '你的直觉，值几毫秒？', 17, MUTED)
    text(804, 575, 'yns34-hub.github.io/one-second', 12, MUTED, mono=True)
    image.resize((width,height),Image.Resampling.LANCZOS).save(path, optimize=True)

make_cover(ROOT / 'dist' / 'cover.png')
print('Created dist/cover.png (1200 x 630)')

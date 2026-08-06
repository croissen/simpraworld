# 로고(logo.png)로부터 @capacitor/assets 입력 소스를 생성.
# - icon-foreground.png: 어댑티브 전경(안전영역 66% 안에 로고), 투명배경
# - icon-background.png: 어댑티브 배경(흰색)
# - icon-only.png: 레거시 정사각 아이콘(흰 배경 + 로고)
# - splash.png / splash-dark.png: 스플래시(흰 배경 + 로고 중앙)
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
logo = Image.open(os.path.join(ROOT, 'logo.png')).convert('RGBA')
os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)

def fit(img, box):
    """가로세로비 유지하며 box(px) 이내로 스케일."""
    w, h = img.size
    s = min(box / w, box / h)
    return img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)

def centered(canvas_size, content, bg):
    base = Image.new('RGBA', (canvas_size, canvas_size), bg)
    x = (canvas_size - content.width) // 2
    y = (canvas_size - content.height) // 2
    base.alpha_composite(content, (x, y))
    return base

WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# 전경: 어댑티브 아이콘 XML이 16.7% 안쪽 여백(→66.6% 축소)을 이미 적용하므로,
# 전경 소스는 거의 꽉 채워야(로고 ~93%) 최종에서 로고가 적당한 크기(≈62%)로 보인다.
fg = centered(1024, fit(logo, 950), TRANSPARENT)
fg.save(os.path.join(ROOT, 'assets', 'icon-foreground.png'))

# 배경: 흰색 단색
Image.new('RGBA', (1024, 1024), WHITE).save(os.path.join(ROOT, 'assets', 'icon-background.png'))

# 레거시 정사각 아이콘: 흰 배경 + 로고(여백 ~10%)
centered(1024, fit(logo, 840), WHITE).save(os.path.join(ROOT, 'assets', 'icon-only.png'))

# 스플래시: 흰 배경 + 중앙 로고(작게)
centered(2732, fit(logo, 640), WHITE).save(os.path.join(ROOT, 'assets', 'splash.png'))
centered(2732, fit(logo, 640), WHITE).save(os.path.join(ROOT, 'assets', 'splash-dark.png'))

print('generated:', os.listdir(os.path.join(ROOT, 'assets')))

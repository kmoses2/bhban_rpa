"""인텔 AI Playground 저장소(MIT, intel/AI-Playground)의 실제 로고·배지·브랜드 패턴·앱 스크린샷을 영상용으로 준비합니다.

사용법: python tools/prepare_assets.py /path/to/ai-playground
  - intel.svg            → assets/intel-logo.json  (점 + 글자별 패스로 분리해 한 글자씩 등장시키기 위함)
  - Core Ultra / Arc 배지 → assets/core-ultra.png, assets/arc.png
  - Arc 브랜드 패턴       → assets/arc-pattern.png (투명 배경 1920x1080)
  - 앱 스크린샷           → assets/aipg-ui.jpg (문서용 손글씨 주석 2곳을 지우고 사용)
  - 필름 그레인 텍스처    → assets/grain.png (직접 생성)
"""
import json
import os
import re
import shutil
import sys

import cv2
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/user/intel/ai-playground"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(OUT, exist_ok=True)
IMG = os.path.join(SRC, "WebUI/src/assets/image")

# ---------------------------------------------------------------- 로고: 점(사각형) + 글자별 패스
svg = open(os.path.join(SRC, "WebUI/src/assets/svg/intel.svg"), encoding="utf-8").read()
rect = dict(re.findall(r'(x|y|width|height)="([\d.]+)"', re.search(r"<rect[^>]*>", svg).group(0)))
d = re.search(r'<path[^>]*\sd="([^"]+)"', svg, re.S).group(1)
d = re.sub(r"\s+", " ", d).strip()
subpaths = ["M" + s.strip() for s in d.split("M") if s.strip()]


def first_xy(sp):
    x, y = re.findall(r"-?[\d.]+", sp)[:2]
    return float(x), float(y)


# 서브패스 시작점의 x 좌표로 글자를 구분 (i 기둥 / n / t / e(바깥+안쪽) / l / ®)
groups = {"i": [], "n": [], "t": [], "e": [], "l": [], "reg": []}
for sp in subpaths:
    x, _ = first_xy(sp)
    key = "i" if x < 40 else "n" if x < 150 else "t" if x < 215 else "e" if x < 330 else "l" if x < 370 else "reg"
    groups[key].append(sp)
logo = {
    "viewBox": [0, 0, 395.4, 155.9],
    "dot": {k: float(v) for k, v in rect.items()},
    "letters": {k: " ".join(v) for k, v in groups.items()},
    "source": "intel/AI-Playground WebUI/src/assets/svg/intel.svg (MIT)",
}
json.dump(logo, open(os.path.join(OUT, "intel-logo.json"), "w"), indent=1)
print("logo parts:", {k: len(v) for k, v in groups.items()})

# ---------------------------------------------------------------- 배지 · 패턴 (+ MIT 라이선스 고지 함께 복사)
shutil.copy(os.path.join(SRC, "LICENSE"), os.path.join(OUT, "LICENSE-AI-Playground.txt"))
shutil.copy(os.path.join(IMG, "core_ultra_badge.png"), os.path.join(OUT, "core-ultra.png"))
Image.open(os.path.join(IMG, "arc_graphics_badge.png")).resize((900, 900), Image.LANCZOS).save(os.path.join(OUT, "arc.png"), optimize=True)
Image.open(os.path.join(IMG, "arc-graphics-environments-3color-pattern-full-transparent-16x9.png")).save(
    os.path.join(OUT, "arc-pattern.png"), optimize=True)

# ---------------------------------------------------------------- 앱 스크린샷: 문서용 손글씨 주석 제거
# 주석(하늘색 손글씨·화살표)은 완전히 평평한 배경색(16,6,19) 위에 그려져 있어, 그 픽셀을 배경색으로 되돌립니다.
im = cv2.imread(os.path.join(SRC, "docs/readme/ui-dark-settings.png"), cv2.IMREAD_COLOR).astype(int)
BG = np.array([19, 6, 16])                                     # BGR
b, g, r = im[:, :, 0], im[:, :, 1], im[:, :, 2]
annot = (np.abs(im - BG).max(axis=2) > 2) & ((b - r > 6) | (g - r > 6))
flat = np.zeros(im.shape[:2], bool)
flat[70:222, 337:640] = True                                   # "app settings" 주석
flat[158:222, 452:640] = False                                 #   이미지 패널 영역은 제외
flat[585:760, 840:1218] = True                                 # "prompt settings panel" 주석(패널 경계선·프롬프트 창 제외)
im[annot & flat] = BG
img = im.astype(np.uint8)
# 화살표가 스친 이미지 패널의 왼쪽 위 모서리는 깨끗한 오른쪽 위 모서리를 좌우 반전해 복원
L, R = 454, 1068                                               # 패널 좌우 경계(x)
img[145:200, 440:501] = img[145:200, L + R - 500:L + R - 439][:, ::-1]
cv2.imwrite(os.path.join(OUT, "aipg-ui.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 93])
print("retouched pixels:", int((annot & flat).sum()))

# ---------------------------------------------------------------- 그레인 (타일 반복 가능한 노이즈)
rng = np.random.default_rng(4004)
n = rng.normal(0, 1, (256, 256))
n = (n - n.min()) / (n.max() - n.min())
Image.fromarray((n * 255).astype(np.uint8), "L").save(os.path.join(OUT, "grain.png"))
print("assets ->", OUT, sorted(os.listdir(OUT)))

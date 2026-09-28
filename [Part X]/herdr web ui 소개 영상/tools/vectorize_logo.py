"""herdr web ui 로고(icon-source.png)를 애니메이션용 벡터 파츠로 나눕니다.

파츠: frame(브라우저 창 테두리) · ram(양 머리와 털, '>' 프롬프트 구멍 포함) · horn(뿔) · ear(귀)
      pointer_outline(커서 외곽) · pointer_hole(커서 안쪽 빈 공간)
모든 파츠를 합치면 원본 로고와 같은 모양이 됩니다(potrace 벡터화).
결과: assets/logo-parts.json  (viewBox 0 0 1254 1254)
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/user/devswha/herdr-web-ui/docs/brand/icon-source.png"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "assets", "logo-parts.json")

gray = np.array(Image.open(SRC).convert("L")).astype(np.float32)
H, W = gray.shape
dark = gray < 128
yy, xx = np.mgrid[0:H, 0:W]

# 브라우저 창: 바깥 둥근 사각형(196,234)-(1058,1004) r=56, 안쪽 창(230,371)-(1024,970)
def rounded_rect(x0, y0, x1, y1, r):
    inside = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
    for cx, cy in [(x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)]:
        corner = ((xx < x0 + r) if cx == x0 + r else (xx > x1 - r)) & ((yy < y0 + r) if cy == y0 + r else (yy > y1 - r))
        inside &= ~(corner & ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r))
    return inside

outer = rounded_rect(196, 234, 1058, 1004, 56)
inner = rounded_rect(230, 371, 1024, 970, 6)
ring = outer & ~inner

# 어두운 영역의 연결 요소: 가장 큰 것(창+양+커서), 뿔, 귀
lab, n = ndimage.label(dark)
sizes = ndimage.sum(dark, lab, range(1, n + 1))
order = np.argsort(-sizes) + 1
main, horn, ear = (lab == order[0]), (lab == order[1]), (lab == order[2])

# 커서: 어두운 외곽선으로 둘러싸인 밝은 화살표(구멍)
light_lab, ln = ndimage.label(~dark)
hole = None
for i in range(1, ln + 1):
    ys, xs = np.where(light_lab == i)
    if len(ys) < 2000:
        continue
    if 800 < xs.min() < 900 and 720 < ys.min() < 800 and xs.max() > 1000:
        hole = light_lab == i
assert hole is not None, "커서 구멍을 찾지 못했습니다"
band = 30
dist = ndimage.distance_transform_edt(~hole)
pointer = (dist <= band) & (dark | hole)           # 커서 외곽 + 안쪽
pointer = ndimage.binary_closing(pointer, iterations=2)

# 커서를 뺀 양 몸통: 구멍은 메우고, 창 아래로 삐져나온 커서 외곽은 지움
ram = (main | hole) & ~ring
ram &= ~(pointer & (yy > 1004))
frame = ring & (dark | (hole & ring))
# 맞닿는 경계에 안티앨리어싱 틈이 보이지 않도록 서로 3px씩 겹치게 함
ram = ndimage.binary_dilation(ram, iterations=3) & (main | hole) & ~(pointer & (yy > 1004))
frame = ndimage.binary_dilation(frame, iterations=3) & (dark | hole) & outer

def trace(mask):
    with tempfile.TemporaryDirectory() as d:
        pbm, svg = os.path.join(d, "m.pbm"), os.path.join(d, "m.svg")
        Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).save(pbm)
        subprocess.run(["potrace", pbm, "-s", "-o", svg, "--turdsize", "20",
                        "--alphamax", "1.0", "--opttolerance", "0.2", "--flat"], check=True)
        return " ".join(re.findall(r'<path d="([^"]+)"', open(svg).read()))

def bbox(mask):
    ys, xs = np.where(mask)
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]

# 애니메이션용: 점 구멍과 '>' 구멍을 메운 '꽉 찬' 창/머리 + 따로 움직일 구멍 모양
dot_holes = np.zeros_like(dark)
prompt_hole = np.zeros_like(dark)
for i in range(1, ln + 1):
    region = light_lab == i
    n_px = region.sum()
    ys, xs = np.where(region)
    if 800 < n_px < 2500 and 280 < ys.mean() < 350:
        dot_holes |= region
    if 500 < n_px < 8000 and 480 < xs.mean() < 640 and 540 < ys.mean() < 700:
        prompt_hole |= region
# 창 테두리는 온전한 고리로(양털이 겹치는 곳의 틈 없이) 두고, 그 틈은 양과 함께 나타나는 ram_gap 으로 분리
frame_solid = ndimage.binary_dilation(ring | dot_holes, iterations=1) & outer
near_wool = ndimage.distance_transform_edt(~(ram & ~ring)) < 36
ram_gap = ring & ~dark & ~dot_holes & ~ndimage.binary_dilation(hole, iterations=2) & near_wool
ram_gap = ndimage.binary_dilation(ram_gap, iterations=1) & ~dark
ram_solid = ram | prompt_hole

parts = {}
for name, mask in [("frame", frame), ("ram", ram), ("horn", horn), ("ear", ear),
                   ("pointer_outline", pointer), ("pointer_hole", hole),
                   ("frame_solid", frame_solid), ("ram_solid", ram_solid), ("prompt", prompt_hole), ("ram_gap", ram_gap)]:
    parts[name] = {"d": trace(mask), "bbox": bbox(mask)}
    print(f"{name:16s} bbox={parts[name]['bbox']} area={int(mask.sum())}")

# 점 3개(창 상단 바의 구멍) 중심
dots = []
for i in range(1, ln + 1):
    ys, xs = np.where(light_lab == i)
    if 800 < len(ys) < 2500 and 280 < ys.mean() < 350:
        dots.append([float(xs.mean()), float(ys.mean()), float(np.sqrt(len(ys) / np.pi))])
dots.sort()
prompt = None
for i in range(1, ln + 1):
    ys, xs = np.where(light_lab == i)
    if 500 < len(ys) < 8000 and 480 < xs.mean() < 640 and 540 < ys.mean() < 700:
        prompt = bbox(light_lab == i)
parts["meta"] = {"size": [W, H], "dots": dots, "prompt_bbox": prompt,
                 "transform": f"translate(0,{H}) scale(0.1,-0.1)"}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(parts, open(OUT, "w"))
print("dots", dots, "prompt", prompt)

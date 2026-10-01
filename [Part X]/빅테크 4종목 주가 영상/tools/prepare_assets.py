"""네 회사의 실제 로고를 영상용 벡터 데이터로 준비합니다.

사용법: python tools/prepare_assets.py /path/to/ai-playground
  - 인텔: 인텔이 공개한 AI Playground 저장소(MIT)의 intel.svg (에너지 블루 점 + 흰 글자)
  - 델·엔비디아·테슬라: simple-icons npm 패키지(npm install 후 node_modules/simple-icons)의 브랜드 마크 패스
  → assets/logos.json, assets/grain.png, assets/LICENSE-AI-Playground.txt
"""
import json
import os
import re
import shutil
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/user/intel/ai-playground"
OUT = os.path.join(HERE, "assets")
os.makedirs(OUT, exist_ok=True)

svg = open(os.path.join(SRC, "WebUI/src/assets/svg/intel.svg"), encoding="utf-8").read()
rect = dict(re.findall(r'(x|y|width|height)="([\d.]+)"', re.search(r"<rect[^>]*>", svg).group(0)))
d = re.sub(r"\s+", " ", re.search(r'<path[^>]*\sd="([^"]+)"', svg, re.S).group(1)).strip()
logos = {
    "INTC": {"viewBox": [0, 0, 395.4, 155.9], "path": d, "dot": {k: float(v) for k, v in rect.items()},
             "source": "intel/AI-Playground WebUI/src/assets/svg/intel.svg (MIT)"},
}

icons = json.load(open(os.path.join(HERE, "node_modules/simple-icons/data/simple-icons.json"), encoding="utf-8"))
icons = icons["icons"] if isinstance(icons, dict) else icons
index = {i["title"]: i for i in icons}
node_si = os.path.join(HERE, "node_modules/simple-icons/icons")
for ticker, title, slug in [("DELL", "Dell", "dell"), ("NVDA", "NVIDIA", "nvidia"), ("TSLA", "Tesla", "tesla")]:
    s = open(os.path.join(node_si, slug + ".svg"), encoding="utf-8").read()
    path = re.search(r'<path d="([^"]+)"', s).group(1)
    logos[ticker] = {"viewBox": [0, 0, 24, 24], "path": path, "brandHex": "#" + index[title]["hex"],
                     "source": f"simple-icons {slug}.svg"}
json.dump(logos, open(os.path.join(OUT, "logos.json"), "w"), indent=1)
shutil.copy(os.path.join(SRC, "LICENSE"), os.path.join(OUT, "LICENSE-AI-Playground.txt"))

rng = np.random.default_rng(2025)
n = rng.normal(0, 1, (256, 256))
Image.fromarray(((n - n.min()) / (n.max() - n.min()) * 255).astype(np.uint8), "L").save(os.path.join(OUT, "grain.png"))
print("assets ->", sorted(os.listdir(OUT)), {k: len(v["path"]) for k, v in logos.items()})

"""herdr-web-ui 저장소의 실제 스크린샷·아이콘을 영상용으로 복사/크롭합니다.

사용법: python tools/prepare_assets.py /path/to/herdr-web-ui
  데스크톱 스크린샷은 검은 여백을 잘라낸 창 영역(2880x1876)을 2400px 폭 JPEG로 저장합니다.
"""
import os
import shutil
import sys

from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/user/devswha/herdr-web-ui"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(OUT, exist_ok=True)

for name in ["desktop-chat", "desktop-terminal"]:
    im = Image.open(os.path.join(SRC, "docs/screenshots", name + ".png")).convert("RGB")
    im = im.crop((72, 72, 2952, 1948)).resize((2400, 1563), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".jpg"), quality=92, subsampling=0)

for rel in ["site/assets/phone-sessions.png", "site/assets/phone-chat.png", "site/assets/phone-approve.png",
            "site/assets/phone-terminal.png", "site/assets/chat-todo.jpg",
            "site/assets/grain.png", "public/icons/icon-192.png"]:
    shutil.copy(os.path.join(SRC, rel), os.path.join(OUT, os.path.basename(rel)))
print("assets ->", OUT, sorted(os.listdir(OUT)))

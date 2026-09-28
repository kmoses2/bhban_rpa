# 인텔 소개 + INTC 주가 변화 — 15초 모션그래픽

인텔이 어떤 회사인지 소개하고, 2024년 폭락부터 2026년 사상 최고가까지 **INTC 주가 변화**를 보여 주는 15초 모션그래픽 영상을 코드로 만듭니다.
음악도 직접 작곡·합성했고, 모든 움직임을 같은 박자표(128 BPM, 8마디 = 정확히 15.0초)에 맞춰 배치했습니다.

- 결과물: `output/intel-intc-15s.mp4` (1920×1080, 60fps, 모션 블러, AAC 스테레오 음악)
- 에셋: 인텔이 공개한 [AI Playground 저장소](https://github.com/intel/AI-Playground)(MIT)의 실제 인텔 로고(SVG), Core Ultra·Arc 배지, Arc 브랜드 패턴, AI Playground 앱 스크린샷
- 글꼴: 인텔의 오픈소스 글꼴 [Intel One Mono](https://github.com/intel/intel-one-mono)(숫자·데이터), 제목은 인텔 배지 글자꼴과 비슷한 Manrope

## 구성 (박자 = b, 1박 = 0.469초)

| 마디 | 시간 | 화면 | 음악 |
|---|---|---|---|
| 1 | 0.0–1.9s | 인텔 로고의 파란 **점** 하나가 켜지고 제자리로 날아가, 16분음표마다 픽셀을 쏘아 `intel` 글자를 찍어냄 → b2에 실제 벡터 로고로 스냅, "SINCE 1968" | 붐, 픽셀마다 플럭, 로고 스냅 히트 |
| 2 | 1.9–3.8s | 점 속으로 줌 → 파란 화면이 픽셀로 흩어지며 제품 장면. Core Ultra·Arc 배지와 AI Playground 앱이 엇박마다 3D로 착지 | G♭–A♭ 그루브 |
| 3 | 3.8–5.2s | 휩 → 주가 차트. 2023년 말 막대, 2024년 막대가 **테이프 스톱**과 함께 무너져 바닥에 부딪힘: **−60%** | 음악이 멈추듯 느려짐 → 붐·글리치 |
| 4 | 5.2–7.5s | 붉게 가라앉은 화면, 심장박동 → 2025년 막대가 차오름 | 드론 → 스네어 롤·라이저 |
| 5 | 7.5–9.4s | **드롭**: 2025년 **+84%**, 2000년 닷컴 기록($74.88) 점선이 그어지고 2026년 막대가 로켓처럼 상승 | D♭–A♭, 로켓 라이저 |
| 6 | 9.4–11.3s | 막대가 2000년 기록선을 **깨고** 돌파(파편) → 사상 최고 종가 **$140.94**, 9월 25일 $123.00 | 임팩트 + 유리 파편 |
| 7 | 11.3–13.1s | **+233%** (2026년 연초 대비) · "First all-time highs since 2000." | G♭–A♭, 필 |
| 8 | 13.1–15.0s | 모든 것이 파란 점으로 모였다가 로고 자리에 착지, 5음 사운드 로고에 맞춰 글자가 하나씩 솟아오름 → NASDAQ: INTC | D♭ + 사운드 로고 |

## 주가 데이터 (종가, USD)

| 시점 | 종가 | 비고 | 출처 |
|---|---|---|---|
| 2000-08-31 | $74.88 | 닷컴 버블 때의 종가 최고 기록 | [TheStreet](https://www.thestreet.com/investing/stocks/intel-just-broke-a-26-year-curse), [Yahoo Finance](https://finance.yahoo.com/markets/article/intel-just-cleared-its-dot-com-era-ceiling-after-earnings-chart-of-the-day-110711546.html) |
| 2023-12-29 | $50.25 | 2024년 −60.1% · 2024년 말 $20.05와 맞는 실제 종가(StatMuse는 배당을 반영한 수정주가 $49.59로 표기) | [Motley Fool](https://www.fool.com/investing/2025/01/15/why-intel-stock-fell-60-in-2024) |
| 2024-12-31 | $20.05 | 2024년 −60%, 2008년 이후 가장 낮은 연말 종가 | [StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-throughout-2024), [Motley Fool](https://www.fool.com/investing/2026/01/07/why-intel-stock-soared-84-in-2025/) |
| 2025-12-31 | $36.90 | 2025년 +84% | [StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-december-2025), [Motley Fool](https://www.fool.com/investing/2026/01/07/why-intel-stock-soared-84-in-2025/) |
| 2026-06-22 | $140.94 | 사상 최고 종가 | [MacroTrends](https://www.macrotrends.net/stocks/charts/INTC/intel/stock-price-history) |
| 2026-09-25 | $123.00 | 2026년 연초 대비 +233% ($36.90 → $123.00으로 계산) | [TradingKey](https://www.tradingkey.com/news/market-movers/262187411-market-movers-intc-20260925) |

- 2026년 4월 24일 하루 +24%로 2000년 기록을 넘어 **26년 만에 사상 최고가**를 새로 썼습니다([CNBC](https://www.cnbc.com/2026/04/24/intel-stock-soars-more-than-20percent-as-chipmaker-shows-signs-of-turnaround.html)).
- 차트의 세로축은 $0에서 시작하는 선형 눈금이고, 막대 높이는 종가에 정확히 비례합니다(픽셀 격자는 무늬일 뿐 값이 반올림되지 않음). 각 막대는 직전 연말 종가(점선)에서 출발해 해당 시점 종가까지 움직입니다.
- 투자 권유가 아니며, 인텔과 관계없는 비공식 영상입니다.

## 만드는 방법

```
tools/prepare_assets.py   AI Playground 저장소 → assets/ (로고를 글자별 패스로 분리, 배지·패턴 복사, 스크린샷 문서용 주석 제거)
make_music.py             음악 합성 → build/music.wav, build/beatmap.json
promo.html + promo.js     GSAP 타임라인(박자 단위) + 매 프레임 계산(차트 카메라·막대·픽셀·파편), window.seek(초)
render.js                 Playwright(CDP)로 캡처 → ffmpeg tmix 모션 블러 → 음악과 합쳐 MP4
```

- **로고**: 실제 `intel.svg`를 점(사각형)과 글자별 패스(i·n·t·e·l·®)로 나눴습니다. 첫 장면의 픽셀은 이 로고를 18px 격자로 샘플링한 것이고, b2에 원본 벡터 로고로 바뀝니다. 마지막 장면은 글자마다 사운드 로고의 음에 맞춰 솟아오릅니다.
- **스크린샷**: `docs/readme/ui-dark-settings.png`에 그려진 하늘색 손글씨 안내(“app settings”, “prompt settings panel”)는 평평한 배경색으로 되돌리고, 화살표가 스친 패널 모서리는 반대쪽 모서리를 좌우 반전해 복원했습니다. 앱 화면 자체는 그대로입니다.
- **음악**: numpy/scipy로 킥·클랩·하이햇·서브 베이스·슈퍼소 코드·플럭·FM 벨·라이저를 합성하고 pedalboard로 컴프·리버브·딜레이를 걸었습니다. 2024년 폭락 순간에는 그때까지의 음악 전체를 테이프가 멈추듯 느리게 늘어뜨리고(타임 워프), 2000년 기록을 깨는 순간에는 유리 파편 소리를 합성했습니다. 마지막은 인텔의 5음 사운드 로고(D♭ D♭ G♭ D♭ A♭)를 직접 합성한 말렛 소리로 오마주했습니다. -14.5 LUFS / 피크 -1 dBFS.
- **싱크**: 음악 스크립트와 애니메이션 스크립트가 같은 박자 번호를 씁니다. 카메라 흔들림·플래시·줌 펌핑도 킥과 히트 시각에서 계산합니다.
- **모션 블러**: 한 프레임마다 셔터 180° 구간에서 5장을 캡처해 평균냅니다(300fps → 60fps).

### 실행

```bash
pip install numpy scipy pedalboard soundfile pyloudnorm pillow opencv-python-headless   # + ffmpeg
npm install
git clone --depth 1 https://github.com/intel/AI-Playground /path/to/ai-playground
python tools/prepare_assets.py /path/to/ai-playground
python make_music.py
node render.js --stills 1,5.3,9.6      # (선택) 정지 화면 미리보기 → build/stills/
node render.js                         # 전체 렌더링 → output/intel-intc-15s.mp4
```

## 크레딧

- 로고·배지·브랜드 패턴·앱 스크린샷: [intel/AI-Playground](https://github.com/intel/AI-Playground) (MIT, © Intel Corporation — 라이선스 전문은 `assets/LICENSE-AI-Playground.txt`). Intel, Intel Core, Arc는 Intel Corporation의 상표입니다.
- 글꼴: Intel One Mono, Manrope (SIL OFL 1.1) · 애니메이션: GSAP · 캡처: Playwright · 인코딩: ffmpeg
- 음악: 이 폴더의 `make_music.py`로 직접 합성 (샘플·외부 음원 없음)

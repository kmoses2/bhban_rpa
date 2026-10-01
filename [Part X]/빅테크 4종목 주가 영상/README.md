# 인텔·델·엔비디아·테슬라 — 2025년 1월 → 2026년 9월 주가 흐름 (30초 모션그래픽)

네 종목이 2024년 마지막 거래일 종가에서 출발해 2026년 9월 25일까지 어떻게 움직였는지 보여 주는 30초 모션그래픽 영상을 코드로 만듭니다.
[인텔 소개 영상](../인텔%20소개%20영상/)과 같은 방식입니다. 음악도 직접 작곡·합성했고, 모든 움직임을 같은 박자표(128 BPM, 16마디 = 정확히 30.0초)에 맞췄습니다.

- 결과물: `output/four-stocks-30s.mp4` (1920×1080, 60fps, 모션 블러, AAC 스테레오 음악)
- 로고: 인텔은 인텔이 공개한 [AI Playground 저장소](https://github.com/intel/AI-Playground)(MIT)의 실제 `intel.svg`, 델·엔비디아·테슬라는 [simple-icons](https://github.com/simple-icons/simple-icons)(CC0) 패키지의 브랜드 마크
- 글꼴: 숫자·데이터는 [Intel One Mono](https://github.com/intel/intel-one-mono), 제목은 Manrope

## 결과 한눈에

| 순위 | 종목 | 2024-12-31 종가 | 2026-09-25 종가 | 변화 |
|---|---|---|---|---|
| 1 | Intel (NASDAQ: INTC) | $20.05 | $123.00 | **+513%** |
| 2 | Dell Technologies (NYSE: DELL) | $113.18 | $562.90 | **+397%** ※ |
| 3 | NVIDIA (NASDAQ: NVDA) | $134.09 | $225.07 | **+68%** |
| 4 | Tesla (NASDAQ: TSLA) | $403.84 | $372.02 | **−8%** |

※ 델의 기준가는 배당을 반영한 수정주가일 수 있습니다. 아래 [주의할 점](#주의할-점)을 보세요.

## 구성 (박자 = b, 1박 = 0.469초)

| 마디 | 시간 | 화면 | 음악 |
|---|---|---|---|
| 1–2 | 0.0–3.75s | 로고 카드 4장(인텔 → 델 → 엔비디아 → 테슬라)이 한 박에 하나씩 착지 → b4 "JAN 2025 → SEP 2026" | 벨 D♭–F–A♭–D♭ 상승, 라이저, 스네어 필 |
| 3–4 | 3.75–7.5s | **테슬라**: 빨간 와이프 → 선이 그려지며 2025년 최저 종가 $221.86(4/8), 사상 최고 종가 $489.88(2025/12/16) → **−8%** | B♭m–G♭ 가장 어두운 그루브 |
| 5–6 | 7.5–11.25s | **엔비디아**: $108.35(2025/3/31) → 사상 최고 종가 $235.20(2026/5/14) → **+68%** | D♭–A♭ |
| 7–8 | 11.25–15.0s | **델**: $97.57(2025/3/21) → 하루 +33%(2026/5/29) → 사상 최고 종가 $588.40(2026/9/17) → **+397%** | B♭m–G♭, b28.5 하루 급등 임팩트 |
| 9–10 | 15.0–18.75s | **인텔**: $19.31(2025/8/1) → 사상 최고 종가 $140.94(2026/6/22) → **+513%** | D♭–A♭ 리프트 → 스네어 롤 |
| 11–14 | 18.75–26.25s | **레이스**: 네 종목을 2024년 말 대비 등락률 한 축에 겹쳐 그림. 세로축이 커지는 상승률에 맞춰 넓어지고, 오른쪽 순위표가 자리를 바꿈. "APR 2025 · TARIFF SHOCK", "JUN 22, 2026 · INTEL RECORD CLOSE" | 드롭: D♭–A♭–B♭m–G♭ + 벨 훅 → 빌드업 |
| 15–16 | 26.25–30.0s | **최종 순위**: 4위부터 한 박에 한 줄씩 → 1위 인텔 강조, 출처 표기 | 말렛이 D♭–F–A♭–D♭로 다시 상승, b60 마지막 히트, 여운 |

종목 구간마다 선이 그려지는 동안, 그 종목의 주가를 음높이로 바꾼 부드러운 톤이 선의 모양을 따라 오르내립니다. 저점·최고점 표시가 뜨는 순간은 16분음표 격자에 맞춰 효과음과 같은 박에 떨어집니다.

## 사용한 종가 데이터 (`data/stocks.json`, USD)

금융 사이트에 직접 접속할 수 없는 환경이라, 각 값은 웹 검색 결과 요약에서 날짜와 함께 확인한 종가입니다. 링크는 그 값이 나온 검색 결과의 해당 페이지입니다.

**Tesla (TSLA)**

| 날짜 | 종가 | 출처 |
|---|---|---|
| 2024-12-31 | 403.84 | [StatMuse](https://www.statmuse.com/money/ask/tsla-stock-price-dec-2024) |
| 2025-01-31 · 02-28 · 03-31 · 04-30 · 05-30 | 404.60 · 292.98 · 259.16 · 282.16 · 346.46 | [StatMuse](https://www.statmuse.com/money/ask/tesla-stock-history-chart) |
| 2025-04-08 | 221.86 (2025년 최저 종가) | [StatMuse](https://www.statmuse.com/money/ask/tesla-stock-price-low-for-2025) |
| 2025-06-30 · 07-31 · 08-29 | 317.66 · 308.27 · 333.87 | StatMuse [6월](https://www.statmuse.com/money/ask/tesla-stock-price-june-2025) · [7월](https://www.statmuse.com/money/ask/tesla-stock-price-july-2025) · [8월](https://www.statmuse.com/money/ask/tesla-stock-price-august-2025) |
| 2025-09-30 · 10-31 | 444.72 · 456.56 | StatMuse [9월](https://www.statmuse.com/money/ask/tesla-stock-price-september-2025) · [10월](https://www.statmuse.com/money/ask/tesla-stock-price-october-2025) |
| 2025-11-28 | 426.58 (약) | [ts2.tech](https://ts2.tech/en/tesla-tsla-stock-today-november-28-2025-black-friday-trade-centers-on-robotaxis-fsd-v14-and-musks-1-trillion-pay-deal/) |
| 2025-12-16 | 489.88 (사상 최고 종가) | [MacroTrends](https://www.macrotrends.net/stocks/charts/TSLA/tesla/stock-price-history) |
| 2025-12-31 | 449.72 | [StatMuse](https://www.statmuse.com/money/ask/tesla-stock-price-in-december-2025) |
| 2026-01-30 · 03-31 · 04-30 | 430.41 · 371.75 · 381.63 | StatMuse [1월](https://www.statmuse.com/money/ask/tesla-stock-price-in-january-2026) · [3월](https://www.statmuse.com/money/ask/tsla-stock-price-mar-2026) · [4월](https://www.statmuse.com/money/ask/tesla-stock-price-in-april-2026) |
| 2026-09-25 | 372.02 | [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/tesla-tsla-stock-falls-amid-204504399.html) |

**NVIDIA (NVDA)**

| 날짜 | 종가 | 출처 |
|---|---|---|
| 2024-12-31 | 134.09 | [StatMuse](https://www.statmuse.com/money/ask/nvda-stock-price-december-2024) |
| 2025-01-31 · 02-28 · 03-31 · 04-30 | 119.89 · 124.88 · 108.35 · 108.90 | StatMuse [1월](https://www.statmuse.com/money/ask/nvidia-stock-price-in-january-2025) · [2월](https://www.statmuse.com/money/ask/nvda-closing-stock-price-in-february-2025) · [3월](https://www.statmuse.com/money/ask/nvda-stock-price-march-31st-2025) · [4월](https://www.statmuse.com/money/ask/nvidia-stock-price-in-april-2025) |
| 2025-05-30 · 06-30 · 07-31 · 08-29 | 135.10 · 157.96 · 177.84 · 173.95 | StatMuse [5월](https://www.statmuse.com/money/ask/nvidia-stock-price-may-2025) · [6월](https://www.statmuse.com/money/ask/nvidia-stock-price-june-2025) · [7월](https://www.statmuse.com/money/ask/nvidia-stock-price-in-july-2025) · [8월](https://www.statmuse.com/money/ask/nvidia-stock-price-in-august-2025) |
| 2025-09-30 · 10-31 · 11-28 · 12-31 | 186.56 · 202.23 · 176.98 · 186.27 | StatMuse [9월](https://www.statmuse.com/money/ask/nvidia-stock-price-september-2025) · [10월](https://www.statmuse.com/money/ask/nvidia-stock-price-historical-october-2025) · [11월](https://www.statmuse.com/money/ask/nvidia-stock-price-november-2025) · [12월](https://www.statmuse.com/money/ask/nvidia-stock-price-in-december-2025) |
| 2026-01-30 · 02-27 · 03-31 · 06-30 · 07-31 | 190.90 · 176.97 · 174.20 · 200.09 · 203.53 | [StatMuse](https://www.statmuse.com/money/ask/nvidia-stock-prices-in-2026) |
| 2026-05-14 | 235.20 (사상 최고 종가) | [StatMuse](https://www.statmuse.com/money/ask/nvidia-stock-price-historical) |
| 2026-09-25 | 225.07 | [Yahoo Finance](https://finance.yahoo.com/quote/NVDA/history/) |

**Dell Technologies (DELL)**

| 날짜 | 종가 | 출처 |
|---|---|---|
| 2024-12-31 | 113.18 | [StatMuse](https://www.statmuse.com/money/ask/dell-stock-price-2024) |
| 2025-03-21 | 97.57 | [Zacks](https://www.zacks.com/stock/research/DELL/all-news) |
| 2025-07-16 | 123.57 | [MacroTrends](https://www.macrotrends.net/stocks/charts/DELL/dell/stock-price-history) |
| 2025-07-31 · 09-26 | 132.69 · 130.79 | 웹 검색 요약 ([Yahoo Finance](https://finance.yahoo.com/quote/DELL/history/) 등) |
| 2025-10-13 | 153.42 | 웹 검색 요약 ([MacroTrends](https://www.macrotrends.net/stocks/charts/DELL/dell/stock-price-history) 등) |
| 2025-12-31 | 124.95 | [StatMuse](https://www.statmuse.com/money/ask/dell-stock-price-2025) |
| 2026-04-29 | 205.93 (그날 시세) | [TIKR](https://www.tikr.com/blog/dell-stock-is-up-260-in-2026-and-just-hit-a-record-high-is-it-too-late-to-buy) |
| 2026-05-28 | 317.05 (계산값: 5/29 종가 − 그날 상승폭 $103.86) | 아래 행과 같음 |
| 2026-05-29 | 420.91 (+32.76%, 사상 최대 하루 상승) | [Yahoo Finance](https://finance.yahoo.com/quote/DELL/history/), [CNBC](https://www.cnbc.com/2026/05/29/dell-stock-earnings-ai-servers.html) |
| 2026-09-17 | 588.40 (사상 최고 종가) | [MacroTrends](https://www.macrotrends.net/stocks/charts/DELL/dell/stock-price-history) |
| 2026-09-24 | 536.02 | [MacroTrends](https://www.macrotrends.net/stocks/charts/DELL/dell/stock-price-history) |
| 2026-09-25 | 562.90 | [ad-hoc-news](https://www.ad-hoc-news.de/boerse/news/vorboerse/dell-technologies-stock-at-usd-562-90-on-september-25-2026/70191126), [TradingKey](https://www.tradingkey.com/news/market-movers/262186967-market-movers-dell-20260925) |

**Intel (INTC)**

| 날짜 | 종가 | 출처 |
|---|---|---|
| 2024-12-31 | 20.05 | [StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-throughout-2024), [Motley Fool](https://www.fool.com/investing/2026/01/07/why-intel-stock-soared-84-in-2025/) |
| 2025-01-31 | 20.29 | 웹 검색 요약 ([StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-history) 등) |
| 2025-04-30 | 20.10 | [StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-in-2025) |
| 2025-08-01 | 19.31 | 웹 검색 요약 ([StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-in-2025) 등) |
| 2025-09-29 | 34.48 | 웹 검색 요약 ([MacroTrends](https://www.macrotrends.net/stocks/charts/INTC/intel/stock-price-history) 등) |
| 2025-12-31 | 36.90 | [StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-december-2025), [Motley Fool](https://www.fool.com/investing/2026/01/07/why-intel-stock-soared-84-in-2025/) |
| 2026-01-30 | 46.47 | [StatMuse](https://www.statmuse.com/money/ask/intel-stock-price-january) |
| 2026-05-11 | 124.92 | 웹 검색 요약 ([Yahoo Finance](https://finance.yahoo.com/quote/INTC/history/) 등) |
| 2026-06-22 | 140.94 (사상 최고 종가) | [MacroTrends](https://www.macrotrends.net/stocks/charts/INTC/intel/stock-price-history) |
| 2026-09-16 | 101.05 | [MacroTrends](https://www.macrotrends.net/stocks/charts/INTC/intel/stock-price-history) |
| 2026-09-25 | 123.00 | [TradingKey](https://www.tradingkey.com/news/market-movers/262187411-market-movers-intc-20260925) |

## 주의할 점

- **점 = 확인된 종가, 선 = 점을 잇는 직선**입니다. 선은 실제 일별 움직임이 아닙니다. 확인하지 못한 달은 추정하거나 보간해서 점을 만들지 않았습니다. 그래서 종목마다 점의 간격이 다릅니다(예: 테슬라 2026년 5–8월, 델 2026년 1–3월·6–8월, 인텔 2026년 2–4월·7–8월은 점이 없음).
- 화면에 나오는 **숫자는 모두 점의 값**입니다. 선을 그리는 펜 옆의 가격과 레이스 순위표의 등락률은 "지금까지 지나온 마지막 점"의 값만 보여 주고, 점 사이의 보간값은 숫자로 표시하지 않습니다. 레이스의 순위도 이 값으로 매깁니다.
- 종목별 화면의 세로축은 종목마다 다른 달러 눈금입니다(테슬라 $150–550, 엔비디아 $60–250, 델 $0–650, 인텔 $0–160). 네 종목을 비교하는 레이스와 최종 순위는 같은 % 축(2024-12-31 종가 = 0%)을 씁니다.
- **델의 기준가**: StatMuse의 값은 배당을 반영한 수정주가일 수 있습니다. 델은 분기 배당을 주므로, 2024-12-31의 실제(비수정) 종가는 $113.18보다 1–3% 높을 수 있고 그 경우 상승률은 +380%대 후반이 됩니다. 순위는 바뀌지 않습니다. 인텔(2024년 말 배당 중단)·테슬라(무배당)·엔비디아(주당 $0.01)는 영향이 거의 없습니다.
- 2025-11-28 테슬라 값은 "약 $426.58"로 보도된 값이고, 2026-04-29 델 값은 그날 시세 기준이며, 2026-05-28 델 값은 5/29 종가에서 그날 상승폭을 빼서 계산한 값입니다.
- 투자 권유가 아니며, 네 회사와 관계없는 비공식 영상입니다.

## 색 (데이터 시각화 팔레트 검증)

차트 선 색은 각 회사의 브랜드 색에서 출발해, 어두운 배경(#050b1f)에서 네 색이 모두 서로 구별되도록 밝기를 맞췄습니다. 로고 자체는 원래 브랜드 색 그대로입니다.

| 종목 | 차트 색 | 로고 원래 색 |
|---|---|---|
| Tesla | `#cc0000` | `#cc0000` |
| NVIDIA | `#6ba808` | `#76b900` |
| Dell | `#5b64ee` | `#007db8` |
| Intel | `#18a2cd` | `#00c7fd` |

```
validate_palette.js "#cc0000,#6ba808,#5b64ee,#18a2cd" --mode dark --surface "#050b1f" --pairs all
  [PASS] Lightness band         all 4 inside L 0.48–0.67
  [PASS] Chroma floor           all 4 >= 0.1
  [PASS] CVD separation         worst all-pairs #6ba808↔#cc0000 ΔE 12.0 (deutan)
  [PASS] Normal-vision floor    worst all-pairs #18a2cd↔#5b64ee ΔE 17.9 (normal)
  [PASS] Contrast vs surface    all 4 >= 3:1
```

레이스 화면에서는 색에만 기대지 않도록 선 끝마다 로고 칩을 붙이고, 오른쪽에 로고·티커가 있는 순위표를 함께 둡니다.

## 만드는 방법

```
tools/prepare_assets.py   인텔 intel.svg + simple-icons 마크 → assets/logos.json, 필름 그레인 → assets/grain.png
data/stocks.json          확인된 종가(날짜·값·출처)
make_music.py             음악 합성 → build/music.wav, build/beatmap.json
promo.html + promo.js     GSAP 타임라인(박자 단위) + 매 프레임 계산(선 그리기, 레이스 축·순위, 카메라), window.seek(초)
render.js                 Playwright(CDP)로 캡처 → ffmpeg tmix 모션 블러 → 음악과 합쳐 MP4
```

- **음악**: numpy/scipy로 킥·클랩·하이햇·서브 베이스·슈퍼소 코드·플럭·FM 벨·말렛·라이저를 합성하고 pedalboard로 컴프·리버브를 걸었습니다. 종목 구간마다 코드 진행과 밀도를 바꿔(테슬라가 가장 어둡고 인텔이 가장 밝음) 결과의 분위기를 따라가게 했고, 선이 그려지는 동안 주가 곡선을 그대로 음높이로 옮긴 톤이 흐릅니다. 사이드체인, -14.5 LUFS / 피크 -1 dBFS.
- **싱크**: 음악 스크립트와 애니메이션 스크립트가 같은 박자 번호를 씁니다(`build/beatmap.json`). 카메라 흔들림·플래시·줌 펌핑도 킥과 히트 시각에서 계산합니다.
- **레이스**: 세로축은 그때까지 나온 가장 큰 상승률에 맞춰 넓어지고(한 번 넓어지면 줄지 않음), 눈금이 촘촘해지면 ±50% 선은 사라집니다. 순위표는 지난 0.36초의 순위를 한(Hann) 창으로 평균해 자리를 바꾸므로, 어느 프레임을 따로 렌더링해도 같은 화면이 나옵니다.
- **모션 블러**: 한 프레임마다 셔터 180° 구간에서 5장을 캡처해 평균냅니다(300fps → 60fps).

### 실행

```bash
pip install numpy scipy pedalboard soundfile pyloudnorm pillow   # + ffmpeg
npm install
git clone --depth 1 https://github.com/intel/AI-Playground /path/to/ai-playground
python tools/prepare_assets.py /path/to/ai-playground
python make_music.py
node render.js --stills 5,13,24.4      # (선택) 정지 화면 미리보기 → build/stills/
node render.js                         # 전체 렌더링 → output/four-stocks-30s.mp4
```

## 크레딧

- 인텔 로고: [intel/AI-Playground](https://github.com/intel/AI-Playground) (MIT, © Intel Corporation — 라이선스 전문은 `assets/LICENSE-AI-Playground.txt`)
- 델·엔비디아·테슬라 마크: [simple-icons](https://github.com/simple-icons/simple-icons) (CC0)
- Intel, Dell, NVIDIA, Tesla와 각 로고는 해당 회사의 상표입니다.
- 글꼴: Intel One Mono, Manrope (SIL OFL 1.1) · 애니메이션: GSAP · 캡처: Playwright · 인코딩: ffmpeg
- 음악: 이 폴더의 `make_music.py`로 직접 합성 (샘플·외부 음원 없음)

# 국채금리, 왜 이렇게 높을까? — 경제 설명 영상 자동 제작

국채금리가 왜 오르고 있는지, 그리고 그게 우리 생활에 어떤 의미인지 정리한 **약 4분짜리 한국어 설명 영상**을 코드로 만듭니다.
대본(JSON)만 고치면 음성·자막·애니메이션·차트가 모두 다시 만들어지는 자동화 예제입니다.

- 결과물: [`output/국채금리_왜_높을까.mp4`](output/) (1920×1080, 30fps, 한국어 내레이션 + 자막 + 배경음)
- 자막 파일: `output/국채금리_왜_높을까.srt` (유튜브 업로드용)
- 기준일: **2026년 9월 28일**까지 공개된 자료와 보도. 투자 권유가 아닙니다.

## 영상 내용 요약

| 구간 | 핵심 내용 |
|---|---|
| 도입 | 국고채 3년물 4.01%(9/11, 34개월 만에 4%대), 미국 국채 10년물 5.21%(9/28, 2007년 이후 최고) |
| 기초 개념 | 국채 = 나라의 차용증, 국채금리 = 나라가 돈을 빌리는 비용, 채권 가격과 금리는 시소처럼 반대로 움직임 |
| 현황 | 3년물 2.95% → 4.01%, 10년물 3.39% → 4.54% — 9개월 새 1%p 넘게 상승 |
| 이유 ① | 8월 소비자물가 3.1%·근원물가 3.4%(3년 3개월 만에 최고), 한국은행 7·8월 연속 인상(2.50% → 3.00%) |
| 이유 ② | 미국-이란 충돌·호르무즈 해협 긴장으로 브렌트유 배럴당 100달러 돌파(9/9) |
| 이유 ③ | 미국 연준 9/16 인상(3.75~4.00%), 재정적자 우려로 미국 10년물 5% 돌파 |
| 이유 ④ | 일본은행 1.25%(31년 만에 최고), 외국인 8월 한국 채권 순매도(3년 7개월 만) |
| 의미 ① | 은행채 5년물 4.66%(2년 10개월 만에 최고), 5대 은행 고정형 주담대 4.89~7.29% |
| 의미 ② | 예금·새 채권 이자 ↑ / 보유 채권 손실, 기업 조달비용 ↑, 주식·부동산 부담, 2027년 국고채 이자 42.8조 원 |
| 의미 ③ | "물가가 쉽게 안 잡히고 고금리가 오래 갈 수 있다" — 돈의 값이 비싸진 시대 |
| 전망 | 10월 초 9월 물가, 10월 22일 한국은행 금통위, 미국 국채금리·연준, 미국-이란 협상과 유가 |

## 차트 데이터

영상 속 차트 값은 [`data/국고채_금리_2026.csv`](data/국고채_금리_2026.csv)에 표로 정리돼 있습니다.
금융투자협회 월간 장외채권시장 동향의 월말 값을 쓰되, 기사에 월말 값이 없는 달(1월, 3월 10년물, 7월 3년물)은 다음 달 값과 전월 대비 변동폭으로 역산했습니다.

## 만드는 방법

```
script.json ──▶ make_narration.py ──▶ build/narration.wav, timeline.json, captions.srt
                make_bgm.py        ──▶ build/bgm.wav
scenes.html + scenes.js (GSAP 애니메이션, timeline.json 에 맞춰 배치)
                render.js          ──▶ Playwright로 프레임 캡처 → ffmpeg로 MP4 인코딩·음성 합치기
```

1. **대본** `script.json` — 장면별 문장. `caption`은 화면 자막, `tts`는 숫자를 한글로 풀어 쓴 읽기용 문장입니다.
2. **내레이션** `make_narration.py` — 오프라인 한국어 음성 합성 모델 [Supertonic 3](https://github.com/supertone-inc/supertonic)(sherpa-onnx 버전)으로 문장마다 음성을 만들고, 문장 시작·끝 시각을 `build/timeline.json`에 기록합니다. 모델은 처음 실행할 때 자동으로 내려받습니다.
3. **배경음** `make_bgm.py` — numpy로 잔잔한 패드 화음을 직접 합성합니다(저작권 걱정 없음).
4. **화면** `scenes.html`, `scenes.js` — 장면 12개를 HTML/CSS로 그리고, GSAP 타임라인을 내레이션 시각에 맞춰 배치합니다. `window.seek(초)`로 원하는 시점의 화면을 만들 수 있습니다.
5. **렌더링** `render.js` — 헤드리스 크롬으로 1/30초씩 화면을 캡처해 ffmpeg로 인코딩하고, 내레이션과 배경음을 합칩니다(말할 때 배경음이 살짝 작아지는 사이드체인 더킹 포함).

### 실행

```bash
# 준비 (최초 1회)
pip install sherpa-onnx soundfile numpy
npm install                      # gsap, pretendard(글꼴), lucide-static(아이콘), playwright
# ffmpeg 가 설치돼 있어야 합니다.

# 제작
python make_narration.py         # 내레이션 + 타임라인 + 자막
python make_bgm.py               # 배경음
node render.js --stills 15,60    # (선택) 특정 시점 미리보기 → build/stills/
node render.js                   # 전체 영상 → output/국채금리_왜_높을까.mp4
```

4코어 CPU 기준으로 음성 합성 약 3분, 렌더링 약 35분이 걸립니다.

## 자료 출처

- 한국은행 기준금리 인상: [7월 16일](https://www.fntimes.com/html/view.php?ud=202607160949173269179ad43907_18), [8월 27일](https://www.fntimes.com/html/view.php?ud=202608271107018117179ad43907_18), [9월 통화신용정책보고서](https://www.seoul.co.kr/news/economy/finance/2026/09/11/20260911031007), [10월 금통위 전망](https://www.fnnews.com/news/202609171625061554)
- 8월 소비자물가: [서울신문](https://www.seoul.co.kr/news/economy/2026/09/02/20260902500015)
- 국고채 금리: [2025년 12월 30일](https://m.news.nate.com/view/20251230n28991), [9월 11일 3년물 4% 돌파](https://m.news.nate.com/view/20260911n27168), [9월 23일 마감](https://supple.kr/news/cmudxdv0v001812j09eb506bz)
- 금융투자협회 월간 장외채권시장 동향: [2월](https://www.etoday.co.kr/news/view/2564096), [3월](https://www.etoday.co.kr/news/view/2575227), [4월](https://www.asiae.co.kr/article/2026051210200181753), [5월](https://www.mt.co.kr/stock/2026/06/10/2026061010121862072), [6월](https://view.asiae.co.kr/article/2026071010052111705), [7월](https://www.newsis.com/view/NISX20260810_0003742977), [8월](https://www.etoday.co.kr/news/view/2623927)
- 국제유가·호르무즈 해협: [뉴데일리](https://www.newdaily.co.kr/site/data/html/2026/09/10/2026091000011.html), [헤럴드경제](https://biz.heraldcorp.com/article/10868129)
- 미국 연준 인상·미 국채금리: [CNBC 금리 결정](https://www.cnbc.com/2026/09/16/fed-rate-decision-september-2026.html), [CNBC 국채금리](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html), [19년 만의 5.1%](https://www.fnnews.com/news/202609241725426919), [추석 연휴 중 5.2%](https://www.ebn.co.kr/news/articleView.html?idxno=1725767)
- 일본은행 인상: [CNBC](https://www.cnbc.com/2026/09/18/japan-raises-rates-30-year-high-yen-jgb.html)
- 외국인 채권 순매도·WGBI: [3년 7개월 만에 순매도](https://m.news.nate.com/view/20260913n02092), [WGBI 편입 효과](https://www.seoul.co.kr/news/economy/2026/09/17/20260917031004)
- 은행채·주담대 금리: [머니투데이](https://www.mt.co.kr/finance/2026/09/17/2026091714272658569), [서울신문](https://www.seoul.co.kr/news/economy/finance/2026/09/16/20260916029002)
- 2027년 국고채 이자비용: [아시아경제](https://view.asiae.co.kr/article/2026090108404626337)

## 사용한 도구와 라이선스

- 음성 합성: Supertonic 3 (모델 OpenRAIL-M, 코드 MIT) · [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) (Apache-2.0)
- 글꼴: [Pretendard](https://github.com/orioncactus/pretendard) (SIL OFL 1.1)
- 아이콘: [Lucide](https://lucide.dev) (ISC)
- 애니메이션: [GSAP](https://gsap.com) (Standard "no charge" license)
- 캡처·인코딩: Playwright (Apache-2.0), ffmpeg

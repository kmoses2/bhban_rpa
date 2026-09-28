# herdr web ui — 15초 프로모션 영상

[herdr web ui](https://devswha.github.io/herdr-web-ui/)를 소개하는 15초 모션그래픽 영상을 코드로 만듭니다.
음악도 직접 작곡·합성하고, 모든 움직임을 같은 박자표(128 BPM, 8마디 = 정확히 15.0초)에 맞춰 배치했습니다.

- 결과물: `output/herdr-web-ui-promo.mp4` (1920×1080, 60fps, 모션 블러, AAC 스테레오 음악)
- 에셋: herdr-web-ui 저장소([MIT](https://github.com/devswha/herdr-web-ui/blob/main/LICENSE))의 실제 스크린샷·앱 아이콘·로고 아트워크와 브랜드 토큰(DESIGN.md: 그래파이트 + 앰버, Pretendard)

## 구성 (박자 = b, 1박 = 0.469초)

| 마디 | 시간 | 화면 | 음악 |
|---|---|---|---|
| 1 | 0.0–1.9s | 앰버 커서가 켜지고 `herdr web ui`가 16분음표마다 타이핑 → 카메라가 글자를 뚫고 들어감 | 콜드 오픈 히트, 키보드 클릭, 라이저 |
| 2 | 1.9–3.8s | **드롭**: 실제 데스크톱 채팅 화면이 3D로 날아와 안착, "Your agents, / in plain / conversation." 을 킥마다 한 줄씩, 할 일 카드가 화면 밖으로 떠오름 | Am, 4-on-the-floor |
| 3 | 3.8–5.6s | 휩 팬 → 폰 승인 화면, 3박 클랩에 맞춰 실제 `1. Yes` 버튼을 탭(리플·스파크) | F, 탭 클릭 + 확인음 |
| 4 | 5.6–7.5s | 앰버 레일 와이프 → 실제 터미널을 크게, 출력 줄이 16분음표마다 나타남, 커서 깜빡임 | C |
| 5 | 7.5–9.4s | 폰 4대가 박마다 한 대씩 부채꼴로 등장, 4박에 푸시 알림 | G, 알림음 |
| 6 | 9.4–11.3s | 스톱 타임: "No wrapper." "No account." "Yours only." 를 각 히트에 슬램 → 스네어 롤에 맞춰 에이전트 이름 스트로브 | F·G·Am 펀치, 롤 |
| 7 | 11.3–13.1s | **두 번째 드롭**: 로고 조립 — 창 테두리 → 점 3개(32분음표) → 양 머리와 앰버 `>` 프롬프트 → 뿔 회전 → 커서가 날아와 3박에 클릭 → 워드마크 | F–G |
| 8 | 13.1–15.0s | **마지막 히트**: URL 등장, 스트릭 플레어, 글린트, 커서 깜빡임으로 마무리 | Cadd9 + 여운 |

## 만드는 방법

```
tools/prepare_assets.py   herdr-web-ui 저장소 → assets/ (스크린샷 크롭·복사)
tools/vectorize_logo.py   로고 아트워크 → 애니메이션용 벡터 파츠(assets/logo-parts.json)
make_music.py             음악 합성 → build/music.wav, build/beatmap.json
promo.html + promo.js     GSAP 타임라인(박자 단위), window.seek(초)로 어느 시점이든 같은 화면
render.js                 Playwright(CDP)로 캡처 → ffmpeg tmix 모션 블러 → 음악과 합쳐 MP4
```

- **로고**: 실제 아트워크(`docs/brand/icon-source.png`)를 potrace로 벡터화하고 창·양·뿔·귀·커서·`>` 프롬프트로 나눴습니다. 파츠를 다시 합치면 원본과 99.6% 이상 같은 모양이라, 조립이 끝난 로고는 실제 로고 그대로입니다(프롬프트만 브랜드 앰버로 강조).
- **음악**: numpy/scipy로 킥·클랩·하이햇·서브 베이스·슈퍼소 코드·플럭 아르페지오·FM 벨·라이저·임팩트를 합성하고, pedalboard로 컴프·리버브·딜레이를 걸었습니다. 킥에 맞춘 사이드체인 펌핑, -14 LUFS / 피크 -1 dBFS로 마스터링했습니다.
- **싱크**: 음악 스크립트와 애니메이션 스크립트가 같은 박자 번호를 씁니다. 카메라 흔들림·플래시·줌 펌핑도 킥과 히트 시각에서 계산합니다.
- **모션 블러**: 한 프레임마다 셔터 180° 구간에서 5장을 캡처해 평균냅니다(300fps → 60fps).

### 실행

```bash
pip install numpy scipy pedalboard soundfile pyloudnorm pillow   # + potrace, ffmpeg
npm install
python tools/prepare_assets.py /path/to/herdr-web-ui
python tools/vectorize_logo.py /path/to/herdr-web-ui/docs/brand/icon-source.png
python make_music.py
node render.js --stills 2,6,12.5      # (선택) 정지 화면 미리보기 → build/stills/
node render.js                        # 전체 렌더링 → output/herdr-web-ui-promo.mp4
```

## 크레딧

- 제품·스크린샷·로고: [herdr web ui](https://github.com/devswha/herdr-web-ui) by devswha (MIT)
- 글꼴: Pretendard, JetBrains Mono (SIL OFL 1.1) · 애니메이션: GSAP · 캡처: Playwright · 인코딩: ffmpeg
- 음악: 이 폴더의 `make_music.py`로 직접 합성 (샘플·외부 음원 없음)

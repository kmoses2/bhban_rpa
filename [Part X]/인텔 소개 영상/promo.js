/* Intel — 15초 모션 피스 (인텔 소개 + INTC 주가 변화).
 * 모든 타이밍은 음악과 같은 박자표(128 BPM, 1박 = 0.46875초, 8마디 = 15초)를 따릅니다.
 * render.js 가 window.seek(초)로 프레임을 넘기며 캡처합니다(같은 시각이면 항상 같은 화면). */
const BPM = 128;
const BEAT = 60 / BPM;
const DUR = 15.0;
const B = (b) => b * BEAT;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const EASES = {};
const ease = (name) => (EASES[name] ||= gsap.parseEase(name));
const prog = (t, b0, b1, e = 'none') => ease(e)(clamp((t - B(b0)) / (B(b1) - B(b0))));
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// ---------------------------------------------------------------- 데이터 (INTC 종가, USD — 출처는 README)
const DATA = [
  { date: 'END 2023', value: 50.25, cls: 'neutral' },
  { date: 'END 2024', value: 20.05, cls: 'down', chg: '−60%' },
  { date: 'END 2025', value: 36.90, cls: '', chg: '+84%' },
  { date: 'JUN 22, 2026', value: 140.94, cls: 'hi', tag: 'RECORD CLOSE' },
  { date: 'SEP 25, 2026', value: 123.00, cls: '', chg: '+233% YTD' },
];
const CEIL = 74.88;                       // 2000-08-31 종가 최고 기록(닷컴 버블 정점)
const BASE_Y = 930;                       // 차트 좌표계에서 $0 기준선
const K = 4.6;                            // $1 = 4.6px (세로축은 0부터 시작하는 선형 눈금)
const XS = [476, 768, 1060, 1352, 1644];
const yOf = (v) => BASE_Y - v * K;

// 박자에 맞춘 카메라 흔들림 / 플래시 / 킥 펌핑
const SHAKES = [[0, 7], [2, 13], [4, 10], [4.5, 5], [5.5, 5], [6.5, 6], [11, 24], [16, 14], [20, 26], [24, 16], [28, 12], [30, 5]];
const FLASHES = [[0, 0.3], [2, 0.5], [4, 0.28], [16, 0.42], [20, 0.62], [24, 0.4], [28, 0.34], [30, 0.3]];
const KICKS = [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
const HEART = [12, 12.3, 13, 13.3];

// 차트 카메라 키프레임: [박, 중심 x, 중심 y, 배율, 이 키프레임까지의 이징]
const CAM = [
  [7.5, 700, 760, 1.5],
  [12.5, 735, 772, 1.53, 'sine.inOut'],
  [13.5, 735, 772, 1.53],
  [15.6, 960, 745, 1.5, 'power2.inOut'],
  [16.4, 960, 745, 1.5],
  [18.0, 1110, 650, 1.2, 'power2.inOut'],
  [20.0, 1290, 560, 1.12, 'sine.in'],
  [21.0, 1330, 430, 1.0, 'power3.out'],
  [21.6, 1330, 430, 1.0],
  [23.0, 985, 585, 0.96, 'power3.inOut'],
  [28.0, 985, 585, 1.0, 'sine.inOut'],
];

let tl, LOGO;
const CELLS = [];
const SHARDS = [];
const MOTES = [];
const L1 = { x: 460, y: 303, w: 1000 };
L1.k = L1.w / 395.4;
const DOT1 = { x: L1.x + 4.7 * L1.k, y: L1.y + 5.2 * L1.k, s: 28.1 * L1.k };
const L2 = { x: 580, y: 318, w: 760 };
L2.k = L2.w / 395.4;
const DOT2 = { x: L2.x + 4.7 * L2.k, y: L2.y + 5.2 * L2.k, s: 28.1 * L2.k };

// ---------------------------------------------------------------- 만들기
function buildLogos() {
  const order = ['i', 'n', 't', 'e', 'l', 'reg'];
  $('#logo1letters').innerHTML = order.map((k) => `<path d="${LOGO.letters[k]}"/>`).join('');
  $('#logo2letters').innerHTML = order.map((k) => `<path id="lt_${k}" d="${LOGO.letters[k]}"/>`).join('');
  $('#maskLetters').innerHTML = ['i', 'n', 't', 'e', 'l'].map((k) => `<path d="${LOGO.letters[k]}"/>`).join('');
}

// 로고 글자를 18px 격자로 샘플링 → 픽셀 사각형들이 날아와 로고를 이룸
function buildPixels() {
  const W = L1.w;
  const H = Math.ceil(155.9 * L1.k);
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const g = off.getContext('2d');
  g.setTransform(L1.k, 0, 0, L1.k, 0, 0);
  g.fillStyle = '#fff';
  ['i', 'n', 't', 'e', 'l'].forEach((k) => g.fill(new Path2D(LOGO.letters[k])));
  const img = g.getImageData(0, 0, W, H).data;
  const C = 18;
  const r = rng(1968);
  for (let y = 0; y < H; y += C) {
    for (let x = 0; x < W; x += C) {
      let inside = 0;
      let tot = 0;
      for (let yy = y + 1; yy < Math.min(H, y + C); yy += 3) {
        for (let xx = x + 1; xx < Math.min(W, x + C); xx += 3) {
          tot++;
          if (img[(yy * W + xx) * 4 + 3] > 127) inside++;
        }
      }
      if (tot && inside / tot > 0.5) CELLS.push({ tx: L1.x + x + C / 2, ty: L1.y + y + C / 2, j: r(), a: r(), bend: r() - 0.5 });
    }
  }
  CELLS.sort((p, q) => p.tx - q.tx || p.ty - q.ty);
  CELLS.forEach((c, i) => {
    const wave = Math.min(3, Math.floor((i / CELLS.length) * 4));   // 16분음표 4번(b1~b1.75)에 나눠 착지
    c.land = B(1 + 0.25 * wave) + c.j * 0.03;
    c.start = c.land - 0.2 - c.a * 0.04;
  });
}

function buildChart() {
  const c = $('#chart');
  let html = '';
  [0, 50, 100, 150].forEach((v) => {
    html += `<div class="gl${v === 0 ? ' base' : ''}" style="top:${yOf(v) - (v === 0 ? 1.5 : 1)}px"></div>`;
    if (v > 0) html += `<div class="gy" style="top:${yOf(v) - 17}px">$${v}</div>`;
  });
  html += `<svg id="ceil" viewBox="0 0 1920 1080">
    <line id="ceilL" x1="330" x2="1238" y1="${yOf(CEIL)}" y2="${yOf(CEIL)}" stroke="#c9d6f2" stroke-width="3" stroke-dasharray="14 10"/>
    <line id="ceilM" x1="1238" x2="1466" y1="${yOf(CEIL)}" y2="${yOf(CEIL)}" stroke="#c9d6f2" stroke-width="3" stroke-dasharray="14 10"/>
    <line id="ceilR" x1="1466" x2="1790" y1="${yOf(CEIL)}" y2="${yOf(CEIL)}" stroke="#c9d6f2" stroke-width="3" stroke-dasharray="14 10"/>
  </svg>
  <div id="ceilLabel" style="left:${1060 - 150}px;top:${yOf(CEIL) - 44}px"><b>$74.88</b> · 2000 RECORD</div>`;
  DATA.forEach((d, i) => {
    let inner = '';
    if (i === 1) inner += `<div class="ghost" id="ghost1" style="bottom:${20.05 * K}px;height:${(50.25 - 20.05) * K}px"></div>`;
    if (i >= 2) inner += `<div class="startline" id="start${i}" style="bottom:${(i === 2 ? 20.05 : 36.90) * K}px"></div>`;
    inner += `<div class="fill"></div><div class="cap"></div><div class="val${i === 3 ? ' bigval' : ''}"></div>`;
    if (d.chg) inner += `<div class="chg" id="chg${i}"><span style="display:inline-block;color:${i === 1 ? 'var(--down)' : 'var(--energy)'}">${d.chg}</span></div>`;
    if (d.tag) inner += `<div class="chg" id="chg${i}"><span class="tag">${d.tag}</span></div>`;
    html += `<div class="col ${d.cls}" id="col${i}" style="left:${XS[i] - 85}px">${inner}</div>`;
    html += `<div class="date" style="left:${XS[i] - 130}px">${d.date}</div>`;
  });
  html += `<div class="big" id="bigDown" style="left:872px;top:556px;color:var(--down)">−60%</div>
    <div class="bigsub" id="bigDownSub" style="left:882px;top:722px">$50.25 → $20.05<br><span style="color:#c9d6f2">LOWEST YEAR-END</span><br><span style="color:#c9d6f2">CLOSE SINCE 2008</span></div>
    <div class="big" id="bigUp" style="left:1150px;top:516px;color:var(--energy)">+84%</div>
    <div class="bigsub" id="bigUpSub" style="left:1160px;top:682px">$20.05 → $36.90<br><span style="color:#c9d6f2">FULL YEAR 2025</span></div>`;
  c.innerHTML = html;
}

function buildShards() {
  const r = rng(2000);
  for (let i = 0; i < 110; i++) {
    const x0 = 1244 + r() * 216;
    SHARDS.push({
      x0, y0: yOf(CEIL) + (r() - 0.5) * 4,
      vx: (x0 - 1352) * (1.5 + r() * 3.5) + (r() - 0.5) * 380, vy: -(260 + r() * 980),
      rot: r() * 6.28, vr: (r() - 0.5) * 20, w: 5 + r() * 15, h: 2.5 + r() * 2.5, spark: i % 3 === 0, life: 0.6 + r() * 0.9,
    });
  }
  const m = rng(77);
  for (let i = 0; i < 46; i++) MOTES.push({ x: m() * 1920, y: m() * 1080, s: 3 + m() * 7, sp: 20 + m() * 60, ph: m() * 6.28, a: 0.15 + m() * 0.35 });
}

// ---------------------------------------------------------------- 타임라인
function build() {
  tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 0.5 } });
  gsap.set('.scene', { autoAlpha: 0 });
  const on = (sel, b) => tl.set(sel, { autoAlpha: 1 }, B(b));
  const off = (sel, b) => tl.set(sel, { autoAlpha: 0 }, B(b));
  const reveal = (sel, b, dur = 0.5) => tl.fromTo(sel, { yPercent: 115, filter: 'blur(8px)' },
    { yPercent: 0, filter: 'blur(0px)', duration: dur, ease: 'expo.out' }, B(b));
  const pop = (sel, b) => {
    gsap.set(sel, { autoAlpha: 0 });
    tl.set(sel, { autoAlpha: 1 }, B(b));
    tl.fromTo(sel, { scale: 0.4, y: 16 }, { scale: 1, y: 0, duration: 0.45, ease: 'back.out(2.2)', immediateRender: false }, B(b));
  };
  const slam = (sel, b, color) => {
    gsap.set(sel, { autoAlpha: 0 });
    tl.set(sel, { autoAlpha: 1 }, B(b));
    tl.fromTo(sel, { scale: 1.5, filter: 'blur(16px)', textShadow: `-16px 0 rgba(0,199,253,0.8), 16px 0 ${color}` },
      { scale: 1, filter: 'blur(0px)', textShadow: '0px 0 rgba(0,199,253,0), 0px 0 rgba(0,0,0,0)', duration: 0.28, ease: 'expo.out', immediateRender: false }, B(b));
  };

  // ================= 마디 1: 점 → 픽셀 → 로고 =================
  on('#s1', 0); off('#s1', 4);
  gsap.set('#logo1letters', { opacity: 0 });
  tl.set('#logo1letters', { opacity: 1 }, B(2));
  gsap.set('#logo1', { scale: 1, transformOrigin: `${DOT1.x + DOT1.s / 2 - L1.x}px ${DOT1.y + DOT1.s / 2 - L1.y}px` });
  tl.fromTo('#logo1', { scale: 1.045 }, { scale: 1, duration: 0.6, ease: 'expo.out', immediateRender: false }, B(2));
  tl.fromTo('#s1cap', { clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0% 0 0)', duration: B(0.75), ease: 'steps(14)' }, B(2.5));
  tl.to('#logo1', { scale: 7, opacity: 0, filter: 'blur(16px)', duration: B(0.62), ease: 'power3.in' }, B(3.38));
  tl.to('#s1cap', { opacity: 0, y: 40, filter: 'blur(8px)', duration: B(0.45), ease: 'power2.in' }, B(3.4));

  // ================= 마디 2: 제품 =================
  on('#s2', 4); off('#s2', 8.1);
  tl.fromTo('#s2kick', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5 }, B(4.1));
  reveal('#s2title .line:nth-child(1) > span', 4.25);
  reveal('#s2title .line:nth-child(2) > span', 5);
  [['#c1', '#l1', 4.5, -12], ['#c2', '#l2', 5.5, -9], ['#c3', '#l3', 6.5, -14]].forEach(([c, l, b, ry]) => {
    gsap.set(c, { autoAlpha: 0 });
    gsap.set(l, { opacity: 0 });
    tl.set(c, { autoAlpha: 1 }, B(b) - 0.3);
    tl.fromTo(c, { z: -1500, y: 180, rotationY: ry - 38, rotationX: 24, rotationZ: -7 },
      { z: 0, y: 0, rotationY: ry, rotationX: 5, rotationZ: 0, duration: 0.3, ease: 'power3.out', immediateRender: false }, B(b) - 0.3);
    tl.to(c, { y: -8, rotationY: ry + 7, rotationX: 2, duration: B(7.5) - B(b), ease: 'sine.inOut' }, B(b));
    tl.fromTo(`${c} .sheen`, { xPercent: -80 }, { xPercent: 80, duration: 1.0, ease: 'power2.inOut' }, B(b));
    tl.fromTo(l, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.45, immediateRender: false }, B(b) + 0.05);
  });
  tl.fromTo('#s2', { scale: 1 }, { scale: 1.045, duration: B(3.5), ease: 'sine.inOut' }, B(4));
  tl.to('#s2', { x: -2500, duration: B(0.5), ease: 'power3.in' }, B(7.5));

  // ================= 마디 3-7: 차트 =================
  on('#s3', 7.45); off('#s3', 28.1);
  tl.fromTo('#s3', { x: 1900 }, { x: 0, duration: B(0.65), ease: 'power3.out' }, B(7.45));
  $$('.gl').forEach((g, i) => tl.fromTo(g, { scaleX: 0 }, { scaleX: 1, duration: B(1.0), ease: 'expo.out' }, B(8 + 0.125 * i)));
  $$('.gy').forEach((g, i) => tl.fromTo(g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, B(8.125 + 0.125 * i)));
  $$('.date').forEach((d, i) => tl.fromTo(d, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, B(8.25 + 0.0625 * i)));
  tl.fromTo('#hud', { opacity: 0, x: -20 }, { opacity: 1, x: 0 }, B(8.1));
  gsap.set('#ghost1', { opacity: 0 });
  tl.to('#ghost1', { opacity: 1, duration: 0.25, ease: 'power2.out' }, B(11));
  // −60%
  slam('#bigDown', 11, 'rgba(255,40,80,0.9)');
  gsap.set('#bigDownSub', { opacity: 0 });
  tl.fromTo('#bigDownSub', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, immediateRender: false }, B(11.5));
  tl.to(['#bigDown', '#bigDownSub'], { opacity: 0, scale: 0.7, duration: B(0.35), ease: 'power2.in' }, B(13.35));
  pop('#chg1 > span', 13.6);
  // +84%
  slam('#bigUp', 16, 'rgba(0,120,255,0.9)');
  gsap.set('#bigUpSub', { opacity: 0 });
  // 페이드인이 b17.05 퇴장 트윈과 겹치지 않도록 짧게(겹치면 퇴장 뒤에 다시 나타남)
  tl.fromTo('#bigUpSub', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.25, immediateRender: false }, B(16.4));
  tl.to(['#bigUp', '#bigUpSub'], { opacity: 0, scale: 0.7, duration: B(0.35), ease: 'power2.in' }, B(17.05));
  pop('#chg2 > span', 17.4);
  // 2000년 기록(천장)
  gsap.set(['#ceilL', '#ceilM', '#ceilR'], { opacity: 0 });
  tl.set(['#ceilL', '#ceilM', '#ceilR'], { opacity: 1 }, B(17));
  tl.fromTo('#ceil', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: B(0.9), ease: 'power2.inOut' }, B(17));
  tl.fromTo('#ceilLabel', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, B(17.6));
  tl.set('#ceilM', { opacity: 0 }, B(20));
  tl.fromTo(['#ceilL', '#ceilR'], { opacity: 0.25 }, { opacity: 1, duration: 0.5, ease: 'steps(5)', immediateRender: false }, B(20));
  pop('#chg3 > span', 21);
  pop('#chg4 > span', 22.9);
  // 히어로를 위해 차트를 뒤로
  tl.to('#s3', { opacity: 0.16, filter: 'blur(6px)', duration: B(0.3), ease: 'power2.out' }, B(23.9));
  tl.to('#s3', { opacity: 0, duration: B(0.45), ease: 'power2.in' }, B(27.5));

  // ================= 마디 7: +233% =================
  on('#s4', 24); off('#s4', 28.05);
  tl.fromTo('#heroWrap', { scale: 1.7, opacity: 0, filter: 'blur(24px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.32, ease: 'expo.out' }, B(24));
  tl.to('#heroWrap', { scale: 1.05, duration: B(3.5) - 0.32, ease: 'none' }, B(24) + 0.32);
  tl.fromTo('#heroSub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, B(24.5));
  tl.fromTo('#heroSub2', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, B(25));
  tl.fromTo('#heroLine', { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55 }, B(26));
  tl.to('#s4', { scale: 0.2, opacity: 0, filter: 'blur(12px)', duration: B(0.4), ease: 'power3.in' }, B(27.3));

  // ================= 마디 8: 로고 락업 + 5음 사운드 로고 =================
  on('#s5', 27.55);
  gsap.set('#dot2', { left: DOT2.x, top: DOT2.y, width: DOT2.s, height: DOT2.s });
  const dcx = 960 - (DOT2.x + DOT2.s / 2), dcy = 540 - (DOT2.y + DOT2.s / 2);
  tl.fromTo('#dot2', { x: dcx, y: dcy, scale: 0 }, { scale: 1.5, duration: B(0.3), ease: 'back.out(3)' }, B(27.62));
  tl.to('#dot2', { x: 0, y: 0, scale: 1, duration: B(28) - B(27.92), ease: 'power3.in' }, B(27.92));
  tl.to('#dot2', { scaleX: 1.45, scaleY: 0.6, duration: 0.05, ease: 'power2.out' }, B(28));
  tl.to('#dot2', { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1.1, 0.4)' }, B(28) + 0.05);
  const letters = [['#lt_i', 28.75], ['#lt_n', 28.75], ['#lt_t', 29], ['#lt_e', 29.5], ['#lt_l', 30], ['#lt_reg', 30]];
  letters.forEach(([sel, b], i) => {
    tl.fromTo(sel, { y: 170 }, { y: 0, duration: 0.42, ease: 'back.out(1.25)' }, B(b) + (sel === '#lt_n' ? 0.03 : 0));
  });
  tl.fromTo('#s5glow', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.2 }, B(28));
  tl.fromTo('#glint', { attr: { x: -120 } }, { attr: { x: 520 } , duration: B(1.6), ease: 'power2.inOut' }, B(30.1));
  tl.fromTo('#ticker', { opacity: 0, y: 24, letterSpacing: '0.6em' }, { opacity: 1, y: 0, letterSpacing: '0.34em', duration: 0.8 }, B(30.5));
  tl.fromTo('#tickRail', { scaleX: 0 }, { scaleX: 1, duration: 0.8 }, B(30.5));
  tl.fromTo('#legal', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out' }, B(30.9));
  tl.fromTo('#logo2', { scale: 1 }, { scale: 1.035, duration: B(4), ease: 'sine.out', transformOrigin: '50% 50%' }, B(28));
  tl.to('#black', { opacity: 1, duration: 0.3, ease: 'power1.in' }, DUR - 0.3);
  tl.to({}, { duration: 0.001 }, DUR);
}

// ---------------------------------------------------------------- 매 프레임 계산 (결정적)
function noise(t, seed) {
  return Math.sin(t * 43.1 + seed) * 0.5 + Math.sin(t * 71.7 + seed * 2.3) * 0.3 + Math.sin(t * 113.3 + seed * 5.1) * 0.2;
}

function dotState(t) {
  // b0: 화면 가운데에서 팝 → b0.3~b0.95: 로고의 점 자리로 이동 → 그 자리에서 픽셀을 쏘아 글자를 찍어냄
  const pop = ease('back.out(2.4)')(clamp(t / 0.3));
  const mv = prog(t, 0.3, 0.95, 'power3.inOut');
  let size = lerp(112 * pop, DOT1.s, mv);
  const cx = lerp(960, DOT1.x + DOT1.s / 2, mv);
  const cy = lerp(540, DOT1.y + DOT1.s / 2, mv);
  size *= 1 + 0.12 * Math.exp(-Math.max(0, t - B(0.95)) / 0.1) * (t > B(0.95) ? 1 : 0);   // 자리 잡을 때 살짝 튕김
  size *= lerp(1, 50, prog(t, 3.35, 4.0, 'power3.in'));
  return { cx, cy, size };
}

function camAt(t) {
  const b = t / BEAT;
  if (b <= CAM[0][0]) return { cx: CAM[0][1], cy: CAM[0][2], s: CAM[0][3] };
  for (let i = 1; i < CAM.length; i++) {
    if (b <= CAM[i][0]) {
      const a = CAM[i - 1];
      const c = CAM[i];
      const p = ease(c[4] || 'none')((b - a[0]) / (c[0] - a[0]));
      return { cx: lerp(a[1], c[1], p), cy: lerp(a[2], c[2], p), s: lerp(a[3], c[3], p) };
    }
  }
  const z = CAM[CAM.length - 1];
  return { cx: z[1], cy: z[2], s: z[3] };
}

const bounce = (t, b, amp) => { const dt = t - B(b); return dt > 0 ? amp * Math.exp(-dt / 0.09) * Math.sin(dt * 42) : 0; };

// 각 막대의 (보이는 높이 값, 라벨 값). null = 아직 안 보임
function colState(i, t) {
  let v;
  switch (i) {
    case 0:
      if (t < B(8.5)) return null;
      v = 50.25 * prog(t, 8.5, 9.2, 'expo.out');
      return [v, v];
    case 1:
      if (t < B(9)) return null;
      v = t < B(10) ? 50.25 * prog(t, 9, 9.45, 'expo.out') : lerp(50.25, 20.05, prog(t, 10, 11, 'power2.in'));
      return [v - bounce(t, 11, 2.2), v];
    case 2:
      if (t < B(14)) return null;
      v = t < B(14.35) ? 20.05 * prog(t, 14, 14.35, 'power3.out') : lerp(20.05, 36.9, prog(t, 14.35, 16, 'power2.in'));
      return [v + bounce(t, 16, 1.6), v];
    case 3:
      if (t < B(18)) return null;
      if (t < B(18.3)) v = 36.9 * prog(t, 18, 18.3, 'power3.out');
      else if (t < B(19.95)) v = lerp(36.9, 73.4, prog(t, 18.3, 19.95, 'power2.in'));
      else if (t < B(20)) v = lerp(73.4, 74.88, prog(t, 19.95, 20));
      else if (t < B(20.9)) v = lerp(74.88, 142.2, prog(t, 20, 20.9, 'expo.out'));
      else v = lerp(142.2, 140.94, prog(t, 20.9, 21.4, 'power2.inOut'));
      return [v, Math.min(v, 140.94)];
    case 4:
      if (t < B(22)) return null;
      v = t < B(22.25) ? 36.9 * prog(t, 22, 22.25, 'power3.out') : lerp(36.9, 123.0, prog(t, 22.25, 22.9, 'expo.out'));
      return [v, v];
    default:
      return null;
  }
}

let colEls = null;
function applyChart(t) {
  const cam = camAt(t);
  $('#chart').style.transform = `translate(${960 - cam.cx * cam.s}px, ${540 - cam.cy * cam.s}px) scale(${cam.s})`;
  if (!colEls) colEls = DATA.map((_, i) => { const c = $(`#col${i}`); return { c, fill: c.querySelector('.fill'), cap: c.querySelector('.cap'), val: c.querySelector('.val'), chg: c.querySelector('.chg') }; });
  colEls.forEach((e, i) => {
    const st = colState(i, t);
    e.c.style.visibility = st ? 'visible' : 'hidden';
    if (!st) return;
    if (i === 1) { e.c.classList.toggle('neutral', t < B(10)); e.c.classList.toggle('down', t >= B(10)); }
    const h = Math.max(0, st[0] * K);
    e.fill.style.height = `${h}px`;
    e.cap.style.bottom = `${h - 2.5}px`;
    const labelBase = i === 1 ? 20.05 * K : h;                       // 2024는 점선 상자 안, 막대 바로 위
    e.val.style.bottom = `${(i === 1 ? Math.max(h, labelBase) : h) + 14}px`;
    e.val.textContent = `$${st[1].toFixed(2)}`;
    if (e.chg) e.chg.style.bottom = `${(i === 1 ? 50.25 * K : h) + (i === 3 ? 92 : 62)}px`;
  });
  ['#start2', '#start3', '#start4'].forEach((sel, k) => {
    const b0 = [14, 18, 22][k];
    $(sel).style.opacity = t >= B(b0) ? 1 - 0.5 * prog(t, b0 + 2, b0 + 3) : 0;
  });
  return cam;
}

function drawPixels(g, t) {
  if (t > B(2) + 0.3) return;
  for (const c of CELLS) {
    if (t < c.start) continue;
    const p = clamp((t - c.start) / (c.land - c.start));
    const e = ease('power3.out')(p);
    const o = dotState(c.start);
    const ox = o.cx + (c.a - 0.5) * 26;
    const oy = o.cy + (c.j - 0.5) * 26;
    const dx = c.tx - ox;
    const dy = c.ty - oy;
    const len = Math.hypot(dx, dy) || 1;
    const bx = (ox + c.tx) / 2 - (dy / len) * c.bend * 300;
    const by = (oy + c.ty) / 2 + (dx / len) * c.bend * 300;
    const x = (1 - e) * (1 - e) * ox + 2 * (1 - e) * e * bx + e * e * c.tx;
    const y = (1 - e) * (1 - e) * oy + 2 * (1 - e) * e * by + e * e * c.ty;
    let size = lerp(6, 15.5, e) * (1 - ease('power2.in')(clamp((t - B(2)) / 0.2)));
    if (size <= 0.2) continue;
    const since = t - c.land;
    const glow = since >= 0 ? Math.exp(-since / 0.09) : 0;
    g.fillStyle = since < 0 ? 'rgba(0,199,253,0.95)' : `rgba(${Math.round(lerp(214, 255, glow))},${Math.round(lerp(240, 255, glow))},255,1)`;
    if (since >= 0 && glow > 0.05) size *= 1 + 0.35 * glow;
    g.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

function drawDissolve(g, t) {
  const t0 = B(4);
  if (t < t0 || t > t0 + 0.7) return;
  const C = 80;
  const d0 = dotState(B(4) - 0.001);
  g.fillStyle = '#00c7fd';
  for (let y = -C; y < 1080 + C; y += C) {
    for (let x = -C; x < 1920 + C; x += C) {
      const d = Math.hypot(x + C / 2 - d0.cx, y + C / 2 - d0.cy) / 2100;
      const p = clamp((t - t0 - 0.02 - d * 0.3) / 0.12);
      const s = (C + 1) * (1 - ease('power2.in')(p));
      if (s > 0.5) g.fillRect(x + (C - s) / 2, y + (C - s) / 2, s, s);
    }
  }
}

function drawShards(g, t, cam) {
  const t0 = B(20);
  if (t < t0 || t > t0 + 1.6) return;
  const dt = t - t0;
  g.save();
  g.setTransform(cam.s, 0, 0, cam.s, 960 - cam.cx * cam.s, 540 - cam.cy * cam.s);
  const flash = Math.exp(-dt / 0.12);
  if (flash > 0.02) {
    const rg = g.createRadialGradient(1352, yOf(CEIL), 0, 1352, yOf(CEIL), 420);
    rg.addColorStop(0, `rgba(220,248,255,${0.9 * flash})`);
    rg.addColorStop(0.35, `rgba(0,199,253,${0.45 * flash})`);
    rg.addColorStop(1, 'rgba(0,199,253,0)');
    g.fillStyle = rg;
    g.fillRect(1352 - 420, yOf(CEIL) - 420, 840, 840);
  }
  for (const s of SHARDS) {
    if (dt > s.life) continue;
    const a = 1 - dt / s.life;
    const x = s.x0 + s.vx * dt;
    const y = s.y0 + s.vy * dt + 0.5 * 1500 * dt * dt;
    g.save();
    g.translate(x, y);
    g.rotate(s.rot + s.vr * dt);
    g.globalAlpha = a;
    g.fillStyle = s.spark ? '#7fe6ff' : '#dfe8ff';
    if (s.spark) g.fillRect(-s.h, -s.h, s.h * 2, s.h * 2);
    else g.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    g.restore();
  }
  g.restore();
}

function drawMotes(g, t) {
  const a0 = prog(t, 16, 16.5) * (1 - prog(t, 27.3, 28));
  if (a0 <= 0) return;
  for (const m of MOTES) {
    const y = ((m.y - (t - B(16)) * m.sp) % 1180 + 1180) % 1180 - 50;
    const x = m.x + Math.sin(t * 0.9 + m.ph) * 20;
    g.globalAlpha = a0 * m.a * (0.6 + 0.4 * Math.sin(t * 2.3 + m.ph));
    g.fillStyle = '#00c7fd';
    g.fillRect(x, y, m.s, m.s);
  }
  g.globalAlpha = 1;
}

function applyFrameFx(t) {
  let dx = 0, dy = 0, rot = 0, zoom = 1, flash = 0, pulse = 0;
  SHAKES.forEach(([b, amp], i) => {
    const d0 = t - B(b);
    if (d0 >= 0 && d0 < 0.8) {
      const d = Math.exp(-d0 / 0.13);
      dx += amp * d * noise(t, i * 3.7);
      dy += amp * d * noise(t, i * 5.3 + 1.1);
      rot += amp * 0.016 * d * noise(t, i * 7.1 + 2.2);
    }
  });
  FLASHES.forEach(([b, a]) => {
    const d0 = t - B(b);
    if (d0 >= 0 && d0 < 1.2) flash += a * Math.exp(-d0 / 0.14);
  });
  KICKS.forEach((b) => {
    const d0 = t - B(b);
    if (d0 >= 0 && d0 < 0.6) { const d = Math.exp(-d0 / 0.11); zoom += 0.006 * d; pulse += d; }
  });
  HEART.forEach((b) => {
    const d0 = t - B(b);
    if (d0 >= 0 && d0 < 0.5) zoom += 0.008 * Math.exp(-d0 / 0.08);
  });
  gsap.set('#rig', { x: dx, y: dy, rotation: rot, scale: zoom });
  gsap.set('#flash', { opacity: Math.min(flash, 0.9) });
  const rf = t >= B(11) ? 0.55 * Math.exp(-(t - B(11)) / 0.16) : 0;
  gsap.set('#redFlash', { opacity: rf });
  // 폭락 구간: 붉은 틴트 + 스캔라인 깜빡임
  const tint = t < B(11) ? 0.55 * prog(t, 10.2, 11, 'power2.in') : lerp(0.85, 0.5, prog(t, 11, 12)) * (1 - prog(t, 15.2, 16, 'power2.in'));
  gsap.set('#redTint', { opacity: tint });
  const scanOn = t > B(10) && t < B(11.8) && noise(t * 3, 9) > 0.1;
  gsap.set('#scan', { opacity: scanOn ? 0.55 : 0 });
  // Arc 브랜드 패턴 배경 (드롭 이후)
  const arcA = prog(t, 15.9, 16.2) * lerp(0.6, 0.3, prog(t, 27.4, 28.2));
  gsap.set('#arcWrap', { opacity: arcA, rotation: (t - B(16)) * 9, scale: 1.02 + 0.12 * prog(t, 16, 32, 'sine.inOut') + 0.015 * Math.min(pulse, 1) });
  gsap.set(['#bg .glowA', '#s5glow'], { filter: `brightness(${1 + 0.5 * Math.min(pulse, 1.2)})` });
  const f = Math.round(t * 60);
  gsap.set('#grain', { x: ((f * 73) % 256) - 128, y: ((f * 151) % 256) - 128 });
  gsap.set('#bg', { x: Math.sin(t * 0.4) * 30, y: Math.cos(t * 0.33) * 20 });

  // 마디 1: 점과 그 빛
  const ds = dotState(t);
  const dotOn = t < B(4);
  gsap.set('#dot', { display: dotOn ? 'block' : 'none', left: ds.cx - ds.size / 2, top: ds.cy - ds.size / 2, width: ds.size, height: ds.size });
  gsap.set('#s1glow', { left: ds.cx, top: ds.cy });

  const cam = applyChart(t);
  const g = $('#fx').getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 1920, 1080);
  drawMotes(g, t);
  drawPixels(g, t);
  drawDissolve(g, t);
  drawShards(g, t, cam);
}

async function init() {
  LOGO = await (await fetch('assets/intel-logo.json')).json();
  buildLogos();
  const bb = $('#logo2letters').getBBox();                          // 글자가 '땅'에서 솟아오르도록 기준선 아래를 잘라냄
  $('#groundClip rect').setAttribute('height', String(bb.y + bb.height + 0.6 + 60));
  buildPixels();
  buildChart();
  buildShards();
  await Promise.all([500, 600, 700, 800].map((w) => document.fonts.load(`${w} 100px Manrope`, 'Chips +84%')));
  await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px "Intel One Mono"`, '$140.94 NASDAQ')));
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  build();
  window.seek = (t) => { tl.seek(t, false); applyFrameFx(t); };
  window.DURATION = DUR;
  window.seek(0);
  window.READY = true;
}
init();

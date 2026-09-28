/* herdr web ui — 15초 프로모 모션.
 * 모든 타이밍은 음악과 같은 박자표(128 BPM, 1박 = 0.46875초, 8마디 = 15초)를 따릅니다.
 * render.js 가 window.seek(초)로 프레임을 넘기며 캡처합니다(같은 시각이면 항상 같은 화면). */
const BPM = 128;
const BEAT = 60 / BPM;
const DUR = 15.0;
const B = (b) => b * BEAT;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// 박자에 맞춘 카메라 흔들림 / 플래시 / 킥 펌핑
const SHAKES = [[0, 9], [4, 15], [8, 5], [10, 4], [12, 6], [16, 5], [20, 13], [21, 13], [22, 18], [24, 9], [26, 6], [28, 17]];
const FLASHES = [[0, 0.5], [4, 0.55], [12, 0.18], [20, 0.26], [21, 0.26], [22, 0.36], [24, 0.32], [26, 0.22], [28, 0.62]];
const KICKS = [1, 2, 3, ...Array.from({ length: 16 }, (_, i) => 4 + i), 20, 21, 22, 24, 25, 26, 27, 28];

let tl;

function buildIntroText() {
  const host = $('#s1text');
  [...'herdr web ui'].forEach((c) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    host.appendChild(s);
  });
  const cur = document.createElement('span');
  cur.id = 's1cursor';
  host.appendChild(cur);
}

function splitLetters(el) {
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach((c) => {
    const s = document.createElement('span');
    s.className = 'lt';
    s.style.display = 'inline-block';
    s.textContent = c === ' ' ? ' ' : c;
    el.appendChild(s);
  });
}

// 로고(실제 아트워크를 potrace로 벡터화한 파츠)를 마스크로 조립
function buildLogo(p) {
  const tr = p.meta.transform;
  const g = (d, fill) => `<g transform="${tr}"><path d="${d}" fill="${fill}"/></g>`;
  $('#logoWrap').innerHTML = `
  <svg id="logo" viewBox="0 0 1254 1254" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="promptBlur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="16"/></filter>
      <clipPath id="frameClip"><rect id="frameClipRect" x="170" y="215" width="920" height="0"/></clipPath>
      <clipPath id="ramClip"><circle id="ramClipCircle" cx="530" cy="600" r="0"/></clipPath>
      <linearGradient id="glintGrad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <mask id="logoMask" maskUnits="userSpaceOnUse" x="-500" y="-500" width="2254" height="2254">
        <rect x="-500" y="-500" width="2254" height="2254" fill="black"/>
        <g id="mFrame" clip-path="url(#frameClip)">${g(p.frame_solid.d, 'white')}</g>
        <g id="mDots">${p.meta.dots.map((d, i) => `<circle id="dot${i}" cx="${d[0].toFixed(1)}" cy="${d[1].toFixed(1)}" r="0" fill="black"/>`).join('')}</g>
        <g id="mRam" clip-path="url(#ramClip)">${g(p.ram_solid.d, 'white')}${g(p.prompt.d, 'black')}${g(p.ram_gap.d, 'black')}</g>
        <g id="mHorn">${g(p.horn.d, 'white')}</g>
        <g id="mEar">${g(p.ear.d, 'white')}</g>
        <g id="mPointer">${g(p.pointer_outline.d, 'white')}${g(p.pointer_hole.d, 'black')}</g>
      </mask>
    </defs>
    <rect x="-500" y="-500" width="2254" height="2254" fill="#f2ebdf" mask="url(#logoMask)"/>
    <g clip-path="url(#ramClip)">
      <g id="promptHalo" filter="url(#promptBlur)" opacity="0">${g(p.prompt.d, '#f0a830')}</g>
      <g id="promptAmber" opacity="0">${g(p.prompt.d, '#f6bb55')}</g>
    </g>
    <rect id="glint" x="-700" y="-300" width="360" height="1900" fill="url(#glintGrad)" mask="url(#logoMask)" transform="rotate(20 627 627)"/>
    <circle id="clickRing" cx="842" cy="760" r="0" fill="none" stroke="#f6bb55" stroke-width="12" opacity="0"/>
  </svg>`;
}

function buildMotes() {
  const host = $('#motes');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 34; i++) {
    const m = document.createElement('div');
    m.className = 'mote';
    const s = 2 + rnd() * 5;
    Object.assign(m.style, { left: `${rnd() * 1920}px`, top: `${rnd() * 1080}px`, width: `${s}px`, height: `${s}px`, opacity: 0.25 + rnd() * 0.6 });
    m.dataset.speed = (20 + rnd() * 70).toFixed(1);
    m.dataset.phase = (rnd() * 6.28).toFixed(2);
    host.appendChild(m);
  }
}

function build() {
  tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 0.5 } });
  gsap.set('.scene', { autoAlpha: 0 });
  const on = (sel, b) => tl.set(sel, { autoAlpha: 1 }, B(b));
  const off = (sel, b) => tl.set(sel, { autoAlpha: 0 }, B(b));
  const reveal = (sel, b, dur = 0.5) => tl.fromTo(sel, { yPercent: 115, filter: 'blur(8px)' },
    { yPercent: 0, filter: 'blur(0px)', duration: dur, ease: 'expo.out' }, B(b));
  const kicker = (sel, b) => tl.fromTo(sel, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }, B(b));

  // ================= 마디 1: 콜드 오픈 + 타이핑 =================
  on('#s1', 0); off('#s1', 4);
  tl.fromTo('#s1line', { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.24, ease: 'expo.out' }, 0);
  tl.to('#s1line', { opacity: 0, scaleY: 0.2, duration: 0.4, ease: 'power2.out' }, 0.2);
  tl.fromTo('#s1glow', { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.8 }, 0);
  tl.fromTo('#s1cursor', { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, 0.05);
  const s1 = $('#s1text');
  $$('#s1text .ch').forEach((c) => { c.style.display = 'inline-block'; });
  const fullW = s1.querySelector('#s1cursor').offsetLeft - s1.querySelector('.ch').offsetLeft;
  $$('#s1text .ch').forEach((c) => { c.style.display = 'none'; });
  Object.assign(s1.style, { left: `${(1920 - fullW) / 2}px`, right: 'auto', textAlign: 'left' });
  tl.fromTo(s1, { x: fullW / 2 - 40 }, { x: 0, duration: B(2.9), ease: 'sine.inOut' }, B(0.4));
  $$('#s1text .ch').forEach((c, i) => {
    const t = B(0.5 + 0.25 * i);
    tl.set(c, { display: 'inline-block' }, t);
    tl.fromTo(c, { y: 16, opacity: 0.35, scaleY: 1.18 }, { y: 0, opacity: 1, scaleY: 1, duration: 0.07, ease: 'power3.out', immediateRender: false }, t);
  });
  tl.fromTo('#s1text', { scale: 0.94 }, { scale: 1.1, duration: B(2.8), ease: 'power1.in' }, B(0.5));
  tl.to('#s1text', { scale: 3.2, opacity: 0, filter: 'blur(22px)', duration: B(0.5), ease: 'power3.in' }, B(3.3));
  tl.to('#s1glow', { scale: 2.2, opacity: 0, duration: B(0.5), ease: 'power2.in' }, B(3.3));
  tl.to('#black', { opacity: 1, duration: B(0.35), ease: 'power2.in' }, B(3.4));
  tl.set('#black', { opacity: 0 }, B(4));

  // ================= 마디 2: 채팅 =================
  on('#s2', 4); off('#s2', 8.05);
  tl.fromTo('#s2win', { z: 1100, x: 380, y: 40, rotationY: -52, rotationX: 24, rotationZ: -8, opacity: 0 },
    { z: 0, x: 0, y: 0, rotationY: -17, rotationX: 7, rotationZ: -1.5, opacity: 1, duration: B(1.5), ease: 'expo.out' }, B(4));
  tl.to('#s2win', { rotationY: -10, rotationX: 4, x: -40, duration: B(2.1), ease: 'sine.inOut' }, B(5.5));
  tl.fromTo('#s2win .sheen', { xPercent: -70 }, { xPercent: 70, duration: B(3.2), ease: 'power1.inOut' }, B(4.2));
  kicker('#s2kick', 4.25);
  reveal('#s2words .line:nth-child(1) > span', 4);
  reveal('#s2words .line:nth-child(2) > span', 5);
  reveal('#s2words .line:nth-child(3) > span', 6);
  tl.fromTo('#s2rail', { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: 'expo.out' }, B(6.2));
  tl.fromTo('#s2todo', { opacity: 0, z: -60, y: 60, scale: 0.84, rotationY: -18, rotationX: 8 },
    { opacity: 1, z: 170, y: 0, scale: 1, rotationY: -12, rotationX: 5, duration: B(0.9), ease: 'expo.out' }, B(7));
  tl.to('#s2', { x: -2500, duration: B(0.5), ease: 'power3.in' }, B(7.5));          // 휩 팬 →

  // ================= 마디 3: 탭 승인 =================
  on('#s3', 7.95); off('#s3', 12.05);
  tl.fromTo('#s3', { x: 1900 }, { x: 0, duration: B(0.62), ease: 'power3.out' }, B(7.92));
  tl.fromTo('#s3phone', { rotationY: -44, rotationX: 12, rotationZ: 5 }, { rotationY: -13, rotationX: 3, rotationZ: 0, duration: B(1.6), ease: 'expo.out' }, B(8));
  tl.to('#s3phone', { rotationY: -7, y: -12, duration: B(1.9), ease: 'sine.inOut' }, B(9.6));
  kicker('#s3kick', 8.4);
  reveal('#s3words .line:nth-child(1) > span', 8.25);
  reveal('#s3words .line:nth-child(2) > span', 9);
  // 탭: 실제 스크린샷의 '1. Yes' 버튼 위치 (화면 좌표 213, 646)
  const tapX = 213, tapY = 646;
  gsap.set('#yesGlow', { left: 27, top: 624, width: 372, height: 44, opacity: 0 });
  gsap.set(['#finger', '.ripple'], { left: tapX, top: tapY });
  tl.fromTo('#finger', { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: B(0.35), ease: 'power2.out' }, B(9.6));
  tl.to('#finger', { scale: 0.78, duration: 0.07, ease: 'power2.in' }, B(10) - 0.07);
  tl.to('#finger', { scale: 1, duration: 0.3, ease: 'back.out(3)' }, B(10));
  tl.to('#finger', { opacity: 0, duration: 0.3 }, B(10.9));
  tl.fromTo('#yesGlow', { opacity: 0 }, { opacity: 1, duration: 0.08, ease: 'none' }, B(10));
  tl.to('#yesGlow', { opacity: 0.35, duration: 0.8, ease: 'power2.out' }, B(10.2));
  gsap.set('.ripple', { opacity: 0 });
  $$('.ripple').forEach((r, i) => tl.fromTo(r, { scale: 0.2, opacity: 1 }, { scale: 2.8 + i * 0.7, opacity: 0, duration: 0.7 + i * 0.15, ease: 'expo.out', immediateRender: false }, B(10) + i * 0.07));
  const sparkHost = $('#tapLayer');
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    sparkHost.appendChild(s);
    const a = (i / 10) * 360;
    gsap.set(s, { left: tapX, top: tapY, rotation: a + 90, opacity: 0 });
    tl.fromTo(s, { x: 0, y: 0, opacity: 1, scaleY: 1 },
      { x: Math.cos(a * Math.PI / 180) * 120, y: Math.sin(a * Math.PI / 180) * 120, opacity: 0, scaleY: 0.3, duration: 0.45, ease: 'expo.out', immediateRender: false }, B(10));
  }
  tl.fromTo('#s3phone', { y: -12 }, { y: 4, duration: 0.08, ease: 'power2.in', immediateRender: false }, B(10) - 0.02);
  tl.to('#s3phone', { y: -8, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, B(10) + 0.06);

  // ================= 마디 4: 터미널 (앰버 레일 와이프) =================
  on('#s4', 11.5); off('#s4', 16);
  tl.set('#wipeBar', { visibility: 'visible', x: -120 }, B(11.5));
  tl.to('#wipeBar', { x: 2040, duration: B(0.5), ease: 'power2.inOut' }, B(11.5));
  tl.set('#wipeBar', { visibility: 'hidden' }, B(12.02));
  tl.fromTo('#s4', { '--wipe': 0 }, { '--wipe': 1, duration: B(0.5), ease: 'power2.inOut' }, B(11.5));
  // 터미널 창을 크게(2600px) 보여 실제 출력 줄이 읽히도록. 좌표는 2400px 크롭 기준 × K
  const K = 2600 / 2400;
  gsap.set('#s4win', { left: 60, top: 18, width: 2600, height: 1563 * K, transformOrigin: '30% 30%' });
  gsap.set('#termMask', { left: 533 * K });
  tl.fromTo('#s4win', { rotationY: 26, rotationX: 8, z: -520, x: 180 }, { rotationY: 12, rotationX: 3, z: 0, x: 0, duration: B(1.3), ease: 'expo.out' }, B(11.6));
  tl.to('#s4win', { rotationY: 6, z: 70, x: -30, duration: B(2.6), ease: 'sine.inOut' }, B(12.9));
  tl.fromTo('#termMask', { top: (170.8 - 6) * K }, { top: (170.8 + 31.75 * 22 + 2) * K, duration: B(2.75), ease: 'steps(11)' }, B(12));
  gsap.set('#termCursor', { left: 657.5 * K, top: 832.5 * K, width: 11 * K, height: 25 * K, opacity: 0 });
  [14.75, 15.25, 15.75].forEach((b) => { tl.set('#termCursor', { opacity: 1 }, B(b)); tl.set('#termCursor', { opacity: 0 }, B(b + 0.25)); });
  kicker('#s4kick', 12.25);
  reveal('#s4words .line:nth-child(1) > span', 12.5);
  reveal('#s4words .line:nth-child(2) > span', 13);
  tl.fromTo('#s4sub', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: B(1), ease: 'steps(22)' }, B(13.5));
  tl.to('#s4', { scale: 0.3, rotation: -7, opacity: 0, filter: 'blur(6px)', duration: B(0.5), ease: 'power3.in' }, B(15.5));

  // ================= 마디 5: 폰 =================
  on('#s5', 15.9); off('#s5', 20);
  const PH = [['#ph1', 815, 15], ['#ph2', 1110, 5], ['#ph3', 1405, -5], ['#ph4', 1700, -15]];
  PH.forEach(([sel, cx, ry], i) => {
    gsap.set(sel, { left: cx - 160, top: 236, rotationY: ry, z: -Math.abs(ry) * 5 });
    tl.fromTo(sel, { y: 980, rotationX: 55, opacity: 0 }, { y: 0, rotationX: 0, opacity: 1, duration: B(0.95), ease: 'back.out(1.15)' }, B(16 + i));
  });
  tl.fromTo('#phones', { rotationY: 8, z: -80 }, { rotationY: -4, z: 30, duration: B(4.2), ease: 'sine.inOut' }, B(16));
  kicker('#s5kick', 16.25);
  reveal('#s5words .line:nth-child(1) > span', 16);
  reveal('#s5words .line:nth-child(2) > span', 17);
  tl.fromTo('#s5sub', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, B(17.5));
  tl.fromTo('#toast', { y: -230, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: B(0.9), ease: 'expo.out' }, B(19));

  // ================= 마디 6: 스톱 타임 펀치 =================
  on('#s6', 20); off('#s6', 24);
  tl.set('#bgBlack', { opacity: 1 }, B(20));
  tl.set('#bgBlack', { opacity: 0 }, B(24));
  gsap.set(['.punch', '.agent'], { autoAlpha: 0 });
  [['#n1', 20], ['#n2', 21], ['#n3', 22]].forEach(([sel, b]) => {
    tl.set(sel, { autoAlpha: 1 }, B(b));
    tl.fromTo(sel, { scale: 1.45, filter: 'blur(18px)', textShadow: '-18px 0 rgba(255,70,70,0.85), 18px 0 rgba(70,200,255,0.85)' },
      { scale: 1, filter: 'blur(0px)', textShadow: '0px 0 rgba(255,70,70,0), 0px 0 rgba(70,200,255,0)', duration: 0.22, ease: 'expo.out' }, B(b));
    tl.to(sel, { scale: 1.04, duration: B(0.9), ease: 'none' }, B(b) + 0.22);
    tl.set(sel, { autoAlpha: 0 }, B(b + 1) - 0.001);
  });
  ['#ag1', '#ag2', '#ag3', '#ag4', '#ag5'].forEach((sel, i) => {
    const b = 23 + 0.125 * i;
    tl.set(sel, { autoAlpha: 1 }, B(b));
    tl.fromTo(sel, { scale: 1.15 }, { scale: 1, duration: 0.08, ease: 'power2.out' }, B(b));
    tl.set(sel, { autoAlpha: 0 }, B(b + 0.125) - 0.001);
  });
  [[23.625, 0.34], [23.75, 0.67], [23.8125, 1]].forEach(([b, sx]) => tl.set('#s6rail', { scaleX: sx, opacity: 1 }, B(b)));
  tl.set('#s6rail', { opacity: 0 }, B(23.875));
  gsap.set('#s6rail', { scaleX: 0, opacity: 0 });

  // ================= 마디 7: 로고 조립 =================
  on('#s7', 24);
  tl.fromTo('#logoGlow', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: B(1.2), ease: 'expo.out' }, B(24));
  tl.fromTo('#frameClipRect', { attr: { height: 0 } }, { attr: { height: 830 }, duration: B(0.7), ease: 'expo.out' }, B(24));
  tl.fromTo('#logoWrap', { scale: 0.82, rotation: -4 }, { scale: 1, rotation: 0, duration: B(1.2), ease: 'expo.out' }, B(24));
  [0, 1, 2].forEach((i) => tl.fromTo(`#dot${i}`, { attr: { r: 0 } }, { attr: { r: 25.6 }, duration: 0.3, ease: 'back.out(4)' }, B(24.5 + 0.125 * i)));
  tl.fromTo('#ramClipCircle', { attr: { r: 0 } }, { attr: { r: 820 }, duration: B(0.8), ease: 'expo.out' }, B(25));
  tl.fromTo('#promptAmber', { opacity: 0 }, { opacity: 1, duration: 0.04, ease: 'none' }, B(25.2));
  tl.to('#promptAmber', { opacity: 0.25, duration: 0.04, ease: 'none' }, B(25.3));
  tl.to('#promptAmber', { opacity: 1, duration: 0.04, ease: 'none' }, B(25.38));
  tl.fromTo('#promptHalo', { opacity: 0 }, { opacity: 0.9, duration: 0.3 }, B(25.38));
  tl.fromTo('#mHorn', { rotation: -240, scale: 0.1, svgOrigin: '764 535', opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: B(0.9), ease: 'expo.out' }, B(25.1));
  tl.fromTo('#mEar', { scale: 0, svgOrigin: '580 428' }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, B(25.5));
  gsap.set('#mPointer', { opacity: 0 });
  tl.set('#mPointer', { opacity: 1 }, B(25.56));
  tl.fromTo('#mPointer', { x: 1250, y: 980, rotation: 30, svgOrigin: '842 760' }, { x: 0, y: 0, rotation: 0, duration: B(0.42), ease: 'power3.out', immediateRender: false }, B(25.56));
  tl.to('#mPointer', { scale: 0.84, svgOrigin: '842 760', duration: 0.07, ease: 'power2.in' }, B(26) - 0.07);
  tl.to('#mPointer', { scale: 1, svgOrigin: '842 760', duration: 0.32, ease: 'back.out(3)' }, B(26));
  tl.fromTo('#clickRing', { attr: { r: 10 }, opacity: 1 }, { attr: { r: 230 }, opacity: 0, duration: 0.6, ease: 'expo.out', immediateRender: false }, B(26));

  // 락업으로 이동 + 워드마크
  tl.to('#logoWrap', { x: -308, y: 124, scale: 0.5769, transformOrigin: '0 0', duration: B(0.7), ease: 'power4.inOut' }, B(26.35));
  tl.to('#logoGlow', { x: -390, y: 10, scale: 0.8, duration: B(0.7), ease: 'power4.inOut' }, B(26.35));
  $$('#wm .lt').forEach((l, i) => tl.fromTo(l, { yPercent: 118, rotation: 8 }, { yPercent: 0, rotation: 0, duration: 0.55, ease: 'expo.out' }, B(26.6) + i * 0.022));
  tl.fromTo('#tagline', { opacity: 0, y: 24, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: B(0.9), ease: 'expo.out' }, B(27));
  tl.fromTo('#s7', { scale: 1 }, { scale: 1.02, duration: B(1), ease: 'power2.in' }, B(27));

  // ================= 마디 8: 마지막 히트 =================
  tl.fromTo('#urlText', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: B(0.55), ease: 'power3.out' }, B(28));
  tl.fromTo('#urlRail', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'expo.out' }, B(28));
  gsap.set('#urlCursor', { opacity: 0 });
  [28.5, 29.5, 30, 31].forEach((b) => { tl.set('#urlCursor', { opacity: 1 }, B(b)); tl.set('#urlCursor', { opacity: 0 }, B(b + 0.5) - 0.001); });
  gsap.set('#streak', { opacity: 0 });
  tl.fromTo('#streak', { scaleX: 0.15, opacity: 1 }, { scaleX: 1.3, opacity: 0, duration: 1.0, ease: 'expo.out', immediateRender: false }, B(28));
  tl.to('#s7', { scale: 1.055, duration: B(3.9), ease: 'sine.out' }, B(28));
  tl.fromTo('#glint', { attr: { x: -700 } }, { attr: { x: 1700 }, duration: B(1.3), ease: 'power2.inOut' }, B(29.2));
  tl.to({}, { duration: 0.001 }, DUR);
}

// ---------- 매 프레임 계산되는 효과 (결정적) ----------
function noise(t, seed) {
  return Math.sin(t * 43.1 + seed) * 0.5 + Math.sin(t * 71.7 + seed * 2.3) * 0.3 + Math.sin(t * 113.3 + seed * 5.1) * 0.2;
}

function applyFrameFx(t) {
  let dx = 0, dy = 0, rot = 0, zoom = 1, flash = 0, pulse = 0;
  SHAKES.forEach(([b, amp], i) => {
    const dt = t - B(b);
    if (dt >= 0 && dt < 0.8) {
      const d = Math.exp(-dt / 0.13);
      dx += amp * d * noise(t, i * 3.7);
      dy += amp * d * noise(t, i * 5.3 + 1.1);
      rot += amp * 0.018 * d * noise(t, i * 7.1 + 2.2);
    }
  });
  FLASHES.forEach(([b, a]) => {
    const dt = t - B(b);
    if (dt >= 0 && dt < 1.2) flash += a * Math.exp(-dt / 0.14);
  });
  KICKS.forEach((b) => {
    const dt = t - B(b);
    if (dt >= 0 && dt < 0.6) { const d = Math.exp(-dt / 0.11); zoom += 0.006 * d; pulse += d; }
  });
  gsap.set('#rig', { x: dx, y: dy, rotation: rot, scale: zoom });
  gsap.set('#flash', { opacity: Math.min(flash, 0.9) });
  gsap.set(['#bg .glowA', '#s1glow'], { filter: `brightness(${1 + 0.55 * Math.min(pulse, 1.2)})` });
  const f = Math.round(t * 60);
  gsap.set('#grain', { x: ((f * 73) % 256) - 128, y: ((f * 151) % 256) - 128 });
  gsap.set('#bg', { x: Math.sin(t * 0.4) * 30, y: Math.cos(t * 0.33) * 20 });
  if (t >= B(24)) {
    $$('.mote').forEach((m) => {
      const sp = +m.dataset.speed, ph = +m.dataset.phase;
      gsap.set(m, { y: -((t - B(24)) * sp) % 1200, x: Math.sin(t * 0.8 + ph) * 18, opacity: Math.min(1, (t - B(24)) * 2) * (0.35 + 0.35 * Math.sin(t * 2 + ph)) });
    });
  } else {
    gsap.set('.mote', { opacity: 0 });
  }
}

async function init() {
  const parts = await (await fetch('assets/logo-parts.json')).json();
  buildLogo(parts);
  buildIntroText();
  buildMotes();
  splitLetters($('#wm'));
  const bgBlack = document.createElement('div');
  bgBlack.id = 'bgBlack';
  Object.assign(bgBlack.style, { position: 'absolute', inset: '0', background: '#080706', opacity: '0' });
  $('#bg').appendChild(bgBlack);
  await Promise.all([500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 100px Pretendard`, 'herdr web ui')));
  await Promise.all([500, 700].map((w) => document.fonts.load(`${w} 40px "JetBrains Mono"`, 'devswha.github.io')));
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  build();
  window.seek = (t) => { tl.seek(t, false); applyFrameFx(t); };
  window.DURATION = DUR;
  window.seek(0);
  window.READY = true;
}
init();

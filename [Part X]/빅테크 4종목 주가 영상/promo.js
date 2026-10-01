/* 인텔·델·엔비디아·테슬라 — 30초 주가 흐름 모션 피스 (2024-12-31 종가 → 2026-09-25 종가).
 * 모든 타이밍은 음악과 같은 박자표(128 BPM, 1박 = 0.46875초, 16마디 = 30초)를 따릅니다.
 * render.js 가 window.seek(초)로 프레임을 넘기며 캡처합니다(같은 시각이면 항상 같은 화면). */
const BPM = 128;
const BEAT = 60 / BPM;
const DUR = 30.0;
const B = (b) => b * BEAT;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const EASES = {};
const ease = (name) => (EASES[name] ||= gsap.parseEase(name));
const prog = (t, b0, b1, e = 'none') => ease(e)(clamp((t - B(b0)) / (B(b1) - B(b0))));

// ---------------------------------------------------------------- 설정
const INTRO_ORDER = ['INTC', 'DELL', 'NVDA', 'TSLA'];                 // 요청하신 순서
const SEGS = [{ tk: 'TSLA', s: 8 }, { tk: 'NVDA', s: 16 }, { tk: 'DELL', s: 24 }, { tk: 'INTC', s: 32 }];
const COLOR = { TSLA: '#cc0000', INTC: '#18a2cd', NVDA: '#6ba808', DELL: '#5b64ee' };   // 차트 선(검증된 팔레트)
const BRAND = { INTC: '#00c7fd', DELL: '#007db8', NVDA: '#76b900', TSLA: '#cc0000' };   // 로고 원래 색
const NAME = { TSLA: 'Tesla', NVDA: 'NVIDIA', DELL: 'Dell Technologies', INTC: 'Intel' };
const EXCH = { TSLA: 'NASDAQ: TSLA', NVDA: 'NASDAQ: NVDA', DELL: 'NYSE: DELL', INTC: 'NASDAQ: INTC' };
const RANGE = { TSLA: [150, 550, [200, 300, 400, 500]], NVDA: [60, 250, [100, 150, 200, 250]],
  DELL: [0, 650, [0, 200, 400, 600]], INTC: [0, 160, [0, 50, 100, 150]] };
// 저점 라벨 위치: 선과 겹치지 않는 빈 쪽 (데이터 모양을 보고 종목별로 지정)
const DIP_SIDE = { TSLA: 'right-below', NVDA: 'right-below', DELL: 'above', INTC: 'above-left' };
const D0 = Date.UTC(2024, 11, 31);
const SPAN = (Date.UTC(2026, 8, 25) - D0) / 864e5;                    // 633일
const dayOf = (iso) => (Date.parse(`${iso}T00:00:00Z`) - D0) / 864e5;
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fmtDate = (iso) => { const d = new Date(`${iso}T00:00:00Z`); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const money = (v) => `$${v.toFixed(2)}`;
const pct = (v) => { const r = Math.round(v); return `${r < 0 ? '−' : r > 0 ? '+' : ''}${Math.abs(r)}%`; };

// 차트 영역(종목 구간)
const SX0 = 180, SX1 = 1740, SYT = 450, SYB = 900;
// 레이스 영역
const RX0 = 160, RX1 = 1390, RYT = 230, RYB = 930, RMIN = -60;

// 박자에 맞춘 카메라 흔들림 / 플래시
const SHAKES = [[0, 6], [1, 6], [2, 6], [3, 8], [4, 12], [14, 12], [22, 12], [28.5, 8], [30, 14], [38, 16], [40, 22], [56, 18], [60, 14]];
const FLASHES = [[4, 0.35], [14, 0.18], [22, 0.22], [30, 0.3], [38, 0.35], [40, 0.6], [56, 0.55], [60, 0.4]];
let KICKS = [];

let tl, DATA, LOGOS;
const ST = {};                                                         // 종목별 계산값

// ---------------------------------------------------------------- 로고
function logoSVG(tk, mode = 'brand', extra = '') {
  const L = LOGOS[tk];
  if (tk === 'INTC') {
    const dot = mode === 'brand' ? BRAND.INTC : '#ffffff';
    const d = L.dot;
    return `<svg viewBox="0 0 395.4 155.9" ${extra}><rect x="${d.x}" y="${d.y}" width="${d.width}" height="${d.height}" fill="${dot}"/><path d="${L.path}" fill="#ffffff"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" ${extra}><path d="${L.path}" fill="${mode === 'brand' ? BRAND[tk] : '#ffffff'}"/></svg>`;
}

// ---------------------------------------------------------------- 데이터
function prepData() {
  for (const tk of Object.keys(DATA.stocks)) {
    const s = DATA.stocks[tk];
    const pts = s.points.map(([d, v]) => ({ day: dayOf(d), v, date: d }));
    const start = pts[0].v;
    ST[tk] = { pts, start, end: pts[pts.length - 1].v, low: { day: dayOf(s.low[0]), v: s.low[1], date: s.low[0] },
      high: { day: dayOf(s.high[0]), v: s.high[1], date: s.high[0] } };
    ST[tk].chg = (ST[tk].end / start - 1) * 100;
  }
}
function valueAt(tk, day) {
  const p = ST[tk].pts;
  if (day <= p[0].day) return p[0].v;
  for (let i = 1; i < p.length; i++) {
    if (day <= p[i].day) return lerp(p[i - 1].v, p[i].v, (day - p[i - 1].day) / (p[i].day - p[i - 1].day));
  }
  return p[p.length - 1].v;
}
const pctAt = (tk, day) => (valueAt(tk, day) / ST[tk].start - 1) * 100;

// ---------------------------------------------------------------- 만들기: 인트로
function buildIntro() {
  const host = $('#intro');
  INTRO_ORDER.forEach((tk, i) => {
    const c = document.createElement('div');
    c.className = 'lcard';
    c.id = `card_${tk}`;
    c.style.left = `${120 + i * 430}px`;
    c.innerHTML = `<div class="logo" style="${tk === 'INTC' ? 'height:104px;top:62px' : ''}">${logoSVG(tk)}</div>
      <div class="tk">${tk}</div><div class="bar" style="background:${COLOR[tk]}"></div>`;
    host.appendChild(c);
  });
}

// ---------------------------------------------------------------- 만들기: 종목 구간
function segGeom(tk) {
  const [vmin, vmax] = RANGE[tk];
  return { x: (day) => SX0 + (SX1 - SX0) * day / SPAN, y: (v) => SYB - (v - vmin) / (vmax - vmin) * (SYB - SYT) };
}
function linePath(pts, X, Y) { return pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.day).toFixed(1)},${Y(p.v).toFixed(1)}`).join(''); }

function buildSegment({ tk, s }) {
  const g = segGeom(tk);
  const st = ST[tk];
  const col = COLOR[tk];
  const sec = document.createElement('section');
  sec.className = 'scene seg';
  sec.id = `seg_${tk}`;
  const [, , ticks] = RANGE[tk];
  let grid = '';
  ticks.forEach((v) => {
    grid += `<line x1="${SX0}" x2="${SX1}" y1="${g.y(v)}" y2="${g.y(v)}" stroke="rgba(142,162,200,0.16)" stroke-width="2"/>`;
    grid += `<text x="${SX0 - 18}" y="${g.y(v) + 8}" text-anchor="end" font-size="24" font-weight="600" fill="#8ea2c8">$${v}</text>`;
  });
  const xt = [['2025-01-01', "JAN '25"], ['2025-04-01', 'APR'], ['2025-07-01', 'JUL'], ['2025-10-01', 'OCT'], ['2026-01-01', "JAN '26"],
    ['2026-04-01', 'APR'], ['2026-07-01', 'JUL']];
  xt.forEach(([d, lab]) => {
    const x = g.x(dayOf(d));
    grid += `<line x1="${x}" x2="${x}" y1="${SYB}" y2="${SYB + 12}" stroke="rgba(190,210,245,0.5)" stroke-width="2"/>`;
    grid += `<text x="${x}" y="${SYB + 46}" text-anchor="middle" font-size="22" font-weight="600" fill="#8ea2c8" letter-spacing="2">${lab}</text>`;
  });
  grid += `<text x="${SX1}" y="${SYB + 46}" text-anchor="end" font-size="22" font-weight="700" fill="#eef4ff" letter-spacing="2">SEP 25</text>`;
  const ys = g.y(st.start);
  const refRight = tk === 'INTC' || tk === 'DELL';                      // 저점 라벨이 왼쪽 기준선 근처에 있는 종목은 기준 라벨을 오른쪽 끝에
  const line = linePath(st.pts, g.x, g.y);
  const area = `${line}L${g.x(st.pts[st.pts.length - 1].day)},${SYB}L${g.x(0)},${SYB}Z`;
  const dots = st.pts.map((p) => `<circle cx="${g.x(p.day).toFixed(1)}" cy="${g.y(p.v).toFixed(1)}" r="6" fill="${col}" stroke="#050b1f" stroke-width="3"/>`).join('');
  sec.innerHTML = `
    <div class="head"><div class="logo">${logoSVG(tk, 'brand', tk === 'INTC' ? 'style="height:84px"' : '')}</div>
      <div>${tk === 'INTC' ? '' : `<div class="line"><span class="name">${NAME[tk]}</span></div>`}<div class="chip"><i style="background:${col}"></i>${EXCH[tk]}</div></div></div>
    <div class="hero"><div class="line"><span class="pct">${pct(st.chg)}</span></div>
      <div class="since">SINCE DEC 31, 2024 CLOSE</div><div class="fromto">${money(st.start)} → ${money(st.end)}</div></div>
    <svg class="chart" viewBox="0 0 1920 1080">
      <defs>
        <clipPath id="clip_${tk}"><rect id="cliprect_${tk}" x="0" y="0" width="0" height="1080"/></clipPath>
        <linearGradient id="area_${tk}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="0.26"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>
        <filter id="glow_${tk}" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <g class="grid">${grid}<line x1="${SX0}" x2="${SX1}" y1="${SYB}" y2="${SYB}" stroke="rgba(190,210,245,0.5)" stroke-width="3"/></g>
      <g class="startref"><line x1="${SX0}" x2="${SX1}" y1="${ys}" y2="${ys}" stroke="rgba(238,244,255,0.55)" stroke-width="2" stroke-dasharray="10 9"/>
        <text x="${refRight ? SX1 - 12 : SX0 + 12}" y="${ys - 14}" text-anchor="${refRight ? 'end' : 'start'}" font-size="22" font-weight="700" fill="#c9d6f2" letter-spacing="1.5">DEC 31, 2024 · ${money(st.start)}</text></g>
      <g clip-path="url(#clip_${tk})">
        <path d="${area}" fill="url(#area_${tk})"/>
        <path d="${line}" fill="none" stroke="${col}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" opacity="0.55" filter="url(#glow_${tk})"/>
        <path d="${line}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
      </g>
      <g id="mk_low_${tk}"><circle cx="${g.x(st.low.day)}" cy="${g.y(st.low.v)}" r="13" fill="none" stroke="#eef4ff" stroke-width="3"/></g>
      <g id="mk_high_${tk}"><circle cx="${g.x(st.high.day)}" cy="${g.y(st.high.v)}" r="13" fill="none" stroke="#eef4ff" stroke-width="3"/></g>
      <g id="pendot_${tk}"><circle r="16" fill="${col}" opacity="0.35"/><circle r="8" fill="#ffffff" stroke="${col}" stroke-width="4"/></g>
    </svg>
    <div class="plabel" id="lab_low_${tk}">${tk === 'TSLA' ? '2025 LOW ' : ''}${money(st.low.v)} <span style="color:#8ea2c8">(${pct((st.low.v / st.start - 1) * 100)})</span><small>${fmtDate(st.low.date)}</small></div>
    <div class="plabel" id="lab_high_${tk}">RECORD CLOSE ${money(st.high.v)}<small>${fmtDate(st.high.date)}</small></div>
    <div class="penlab" id="pen_${tk}">$0.00</div>
    <div class="wipe" id="wipe_${tk}" style="background:${col};box-shadow:0 0 70px 24px ${col}66"></div>`;
  $('#rig').appendChild(sec);
  // 라벨 위치: 최저점은 점 아래, 최고점은 점 위(화면 밖으로 나가면 반대편)
  const place = (id, day, v, side) => {
    const el = $(id);
    const x = g.x(day), y = g.y(v);
    const w = el.getBoundingClientRect().width;
    const pos = {
      'left-below': [x - w - 26, y - 6], 'right-below': [x + 26, y + 4], above: [x - w / 2, y - 92],
      'above-left': [x - w - 10, y - 86], 'high': [Math.min(x - 20, 1700 - w), y - 96], 'high-left': [x - w + 20, y - 96],
    }[side];
    el.style.left = `${pos[0]}px`;
    el.style.top = `${pos[1]}px`;
  };
  place(`#lab_low_${tk}`, st.low.day, st.low.v, DIP_SIDE[tk]);
  place(`#lab_high_${tk}`, st.high.day, st.high.v, st.high.day > SPAN - 60 ? 'high-left' : 'high');
  if (tk === 'DELL') {
    const c = document.createElement('div');
    c.className = 'callout';
    c.id = 'dellBest';
    c.innerHTML = '+33% IN ONE DAY · MAY 29, 2026';
    c.style.left = `${g.x(dayOf('2026-05-29')) - 560}px`;
    c.style.top = `${g.y(420.91) - 26}px`;
    sec.appendChild(c);
  }
}

// ---------------------------------------------------------------- 만들기: 레이스
function buildRace() {
  const sec = document.createElement('section');
  sec.className = 'scene';
  sec.id = 'race';
  let rows = '';
  let heads = '';
  let paths = '';
  INTRO_ORDER.forEach((tk) => {
    paths += `<path id="rglow_${tk}" fill="none" stroke="${COLOR[tk]}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" opacity="0.45" filter="url(#rblur)"/>
      <path id="rline_${tk}" fill="none" stroke="${COLOR[tk]}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <g id="rpts_${tk}">${ST[tk].pts.slice(1).map(() => `<circle r="5.5" fill="${COLOR[tk]}" stroke="#050b1f" stroke-width="2.5" opacity="0"/>`).join('')}</g>
      <circle id="rdot_${tk}" r="8" fill="#ffffff" stroke="${COLOR[tk]}" stroke-width="4"/>`;
    heads += `<div class="headchip" id="rchip_${tk}" style="background:${COLOR[tk]}">${logoSVG(tk, 'white', tk === 'INTC' ? 'style="height:26px"' : '')}</div>`;
    rows += `<div class="row" id="row_${tk}"><div class="rk">1</div><div class="chipc" style="background:${COLOR[tk]}">${logoSVG(tk, 'white', tk === 'INTC' ? 'style="height:28px"' : '')}</div>
      <div class="tk">${tk}</div><div class="v">0%</div></div>`;
  });
  let grid = '';
  [-50, 0, 50, 100, 200, 300, 400, 500, 600].forEach((v) => {
    grid += `<g class="rg" data-v="${v}"><line x1="${RX0}" x2="${RX1}" stroke="${v === 0 ? 'rgba(190,210,245,0.55)' : 'rgba(142,162,200,0.16)'}" stroke-width="${v === 0 ? 3 : 2}"/>
      <text x="${RX0 - 16}" text-anchor="end" font-size="24" font-weight="600" fill="#8ea2c8">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%</text></g>`;
  });
  let xt = '';
  [['2025-01-01', "JAN '25"], ['2025-07-01', 'JUL'], ['2026-01-01', "JAN '26"], ['2026-07-01', 'JUL']].forEach(([d, lab]) => {
    const x = RX0 + (RX1 - RX0) * dayOf(d) / SPAN;
    xt += `<text x="${x}" y="${RYB + 44}" text-anchor="middle" font-size="22" font-weight="600" fill="#8ea2c8" letter-spacing="2">${lab}</text>`;
  });
  sec.innerHTML = `
    <div id="raceHead"><div class="kicker">% change since Dec 31, 2024 close</div><div id="raceDate">JAN 2025</div></div>
    <svg class="chart" viewBox="0 0 1920 1080"><defs><filter id="rblur" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>
      <g id="rgrid">${grid}</g>${xt}${paths}<line id="co_lead" stroke="#eef4ff" stroke-width="2" stroke-dasharray="4 5" opacity="0"/></svg>
    ${heads}${rows}
    <div class="callout" id="co_tariff">APR 2025 · TARIFF SHOCK</div>
    <div class="callout" id="co_intc">JUN 22, 2026 · INTEL RECORD CLOSE</div>`;
  $('#rig').appendChild(sec);
}

// ---------------------------------------------------------------- 만들기: 최종 순위
const ZX = 860;                                                        // 0% 기준선 x
const FSCALE = 1.42;                                                   // 1%p = 1.42px
function buildFinal() {
  const sec = document.createElement('section');
  sec.className = 'scene';
  sec.id = 'final';
  const ranked = Object.keys(ST).sort((a, b) => ST[b].chg - ST[a].chg);
  let rows = '';
  ranked.forEach((tk, i) => {
    const st = ST[tk];
    const w = Math.abs(st.chg) * FSCALE;
    const left = st.chg >= 0 ? ZX - 150 : ZX - 150 - w;
    rows += `<div class="frow" id="frow_${tk}" style="top:${270 + i * 160}px">
      <div class="rk">${i + 1}</div><div class="chipc" style="background:${COLOR[tk]}">${logoSVG(tk, 'white', tk === 'INTC' ? 'style="height:42px"' : '')}</div>
      <div class="nm">${NAME[tk]}</div><div class="ft">${money(st.start)} → ${money(st.end)}</div>
      <div class="bar" style="left:${left}px;width:${w}px;background:${COLOR[tk]}"></div>
      <div class="val" style="left:${(st.chg >= 0 ? ZX - 150 + w : ZX - 150) + 22}px">${pct(st.chg)}</div></div>`;
  });
  sec.innerHTML = `<div id="finalHead"><div class="kicker">Dec 31, 2024 → Sep 25, 2026 · closing prices</div>
      <div id="finalTitle"><span class="line"><span>Final standings</span></span></div></div>
    <div id="zeroLine" style="left:${ZX - 1.5}px"></div>${rows}
    <div id="footer">Sources: StatMuse, MacroTrends, CNBC, Motley Fool, TradingKey (see README) · Not investment advice · Not affiliated with these companies</div>`;
  $('#rig').appendChild(sec);
  ST._ranked = ranked;
}

// ---------------------------------------------------------------- 타임라인
function build() {
  tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 0.5 } });
  gsap.set('.scene', { autoAlpha: 0 });
  const on = (sel, b) => tl.set(sel, { autoAlpha: 1 }, B(b));
  const off = (sel, b) => tl.set(sel, { autoAlpha: 0 }, B(b));
  const reveal = (sel, b, dur = 0.5) => tl.fromTo(sel, { yPercent: 115, filter: 'blur(8px)' },
    { yPercent: 0, filter: 'blur(0px)', duration: dur, ease: 'expo.out' }, B(b));
  const pop = (sel, b, from = 0.4) => {
    gsap.set(sel, { autoAlpha: 0 });
    tl.set(sel, { autoAlpha: 1 }, B(b));
    tl.fromTo(sel, { scale: from }, { scale: 1, duration: 0.45, ease: 'back.out(2.2)', immediateRender: false }, B(b));
  };

  // ===== 인트로 (b0-8) =====
  on('#intro', 0); off('#intro', 8.05);
  INTRO_ORDER.forEach((tk, i) => {
    const sel = `#card_${tk}`;
    gsap.set(sel, { autoAlpha: 0 });
    tl.set(sel, { autoAlpha: 1 }, B(i));
    tl.fromTo(sel, { scale: 1.35, y: -40, filter: 'blur(14px)', rotation: -4 + 2.5 * i },
      { scale: 1, y: 0, filter: 'blur(0px)', rotation: 0, duration: 0.4, ease: 'expo.out', immediateRender: false }, B(i));
    tl.to(sel, { y: 90, duration: B(3.5), ease: 'sine.inOut' }, B(4));
  });
  reveal('#introTitle .line > span', 4, 0.55);
  tl.fromTo('#introSub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, B(4.5));
  tl.fromTo('#intro', { scale: 1 }, { scale: 1.04, duration: B(3.5), ease: 'sine.inOut' }, B(4));

  // ===== 종목 구간 (8박씩) =====
  SEGS.forEach(({ tk, s }, k) => {
    const sec = `#seg_${tk}`;
    on(sec, s - 0.5); off(sec, s + 8.05);
    // 들어올 때: 이 종목 색의 와이프가 오른쪽에서 왼쪽으로 쓸고 지나감
    tl.set(`#wipe_${tk}`, { visibility: 'visible' }, B(s - 0.5));
    tl.fromTo(sec, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: B(0.5), ease: 'power2.inOut' }, B(s - 0.5));
    tl.fromTo(`#wipe_${tk}`, { left: 2040 }, { left: -120, duration: B(0.5), ease: 'power2.inOut' }, B(s - 0.5));
    tl.set(`#wipe_${tk}`, { visibility: 'hidden' }, B(s + 0.02));
    tl.fromTo(`${sec} .head .logo`, { scale: 0.3, rotation: -20, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease: 'back.out(2)' }, B(s));
    if (tk !== 'INTC') reveal(`${sec} .head .name`, s + 0.1);
    tl.fromTo(`${sec} .head .chip`, { opacity: 0, x: -20 }, { opacity: 1, x: 0 }, B(s + 0.25));
    tl.fromTo(`${sec} .grid`, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, B(s + 0.1));
    tl.fromTo(`${sec} .startref`, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, B(s + 0.3));
    const m = { low: 0, high: 0 };
    ['low', 'high'].forEach((kind) => {
      const bq = Math.round((s + 0.5 + 5 * ST[tk][kind].day / SPAN) * 4) / 4;   // 음악의 효과음과 같은 16분음표
      m[kind] = bq;
      pop(`#mk_${kind}_${tk}`, bq, 0.2);
      tl.fromTo(`#lab_${kind}_${tk}`, { opacity: 0, y: kind === 'low' ? -12 : 12 }, { opacity: 1, y: 0, duration: 0.35, immediateRender: true }, B(bq));
    });
    reveal(`${sec} .hero .pct`, s + 6, 0.45);
    tl.fromTo(`${sec} .hero .since`, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, B(s + 6.4));
    tl.fromTo(`${sec} .hero .fromto`, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, B(s + 6.6));
    tl.fromTo(`${sec} .chart`, { scale: 1.06, transformOrigin: '50% 70%' }, { scale: 1, duration: B(6), ease: 'power2.out' }, B(s));
    ST[tk].marks = m;
  });
  pop('#dellBest', 28.5, 0.5);

  // 인텔 구간 끝 → 레이스
  tl.to('#seg_INTC', { scale: 0.86, opacity: 0, filter: 'blur(8px)', duration: B(0.5), ease: 'power3.in' }, B(39.5));

  // ===== 레이스 (b40-56) =====
  on('#race', 40); off('#race', 56.02);
  tl.fromTo('#raceHead', { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, B(40));
  INTRO_ORDER.forEach((tk, i) => tl.fromTo(`#row_${tk}`, { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.5 }, B(40.25 + 0.125 * i)));
  pop('#co_tariff', 42.5, 0.6);
  tl.to('#co_tariff', { opacity: 0, duration: 0.3 }, B(46));
  pop('#co_intc', 51.5, 0.6);
  tl.fromTo('#co_lead', { opacity: 0 }, { opacity: 0.8, duration: 0.3 }, B(51.5));
  tl.fromTo('#race', { scale: 1 }, { scale: 1.03, duration: B(2), ease: 'power2.in' }, B(54));

  // ===== 최종 순위 (b56-64) =====
  on('#final', 56);
  reveal('#finalTitle .line > span', 56, 0.5);
  tl.fromTo('#finalHead .kicker', { opacity: 0 }, { opacity: 1, duration: 0.5 }, B(56.25));
  tl.fromTo('#zeroLine', { scaleY: 0 }, { scaleY: 1, duration: 0.6 }, B(56));
  const ranked = ST._ranked;                                           // 1위 → 4위
  ranked.slice().reverse().forEach((tk, i) => {                        // 4위부터 한 박에 하나씩
    const b = 56 + i;
    gsap.set(`#frow_${tk}`, { autoAlpha: 0 });
    tl.set(`#frow_${tk}`, { autoAlpha: 1 }, B(b));
    tl.fromTo(`#frow_${tk}`, { x: 140 }, { x: 0, duration: 0.5, ease: 'expo.out', immediateRender: false }, B(b));
    tl.fromTo(`#frow_${tk} .bar`, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, B(b) + 0.05);
    tl.fromTo(`#frow_${tk} .val`, { opacity: 0 }, { opacity: 1, duration: 0.3 }, B(b) + 0.2);
  });
  ranked.slice(1).forEach((tk) => tl.to(`#frow_${tk}`, { opacity: 0.5, duration: 0.5 }, B(60)));
  tl.to(`#frow_${ranked[0]}`, { scale: 1.03, transformOrigin: '0% 50%', duration: 0.6, ease: 'back.out(2)' }, B(60));
  tl.fromTo('#footer', { opacity: 0 }, { opacity: 1, duration: 0.6 }, B(60.5));
  tl.to('#note', { opacity: 0, duration: 0.3 }, B(56));
  tl.to('#black', { opacity: 1, duration: 0.35, ease: 'power1.in' }, DUR - 0.35);
  tl.to({}, { duration: 0.001 }, DUR);
}

// ---------------------------------------------------------------- 매 프레임 (결정적)
function noise(t, seed) {
  return Math.sin(t * 43.1 + seed) * 0.5 + Math.sin(t * 71.7 + seed * 2.3) * 0.3 + Math.sin(t * 113.3 + seed * 5.1) * 0.2;
}

function applySegment(t, { tk, s }) {
  if (t < B(s - 0.6) || t > B(s + 8.1)) return;
  const g = segGeom(tk);
  const day = SPAN * prog(t, s + 0.5, s + 5.5);
  const x = g.x(day), v = valueAt(tk, day), y = g.y(v);
  $(`#cliprect_${tk}`).setAttribute('width', String(x + 1));
  const drawing = t >= B(s + 0.5);
  $(`#pendot_${tk}`).setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  $(`#pendot_${tk}`).setAttribute('opacity', drawing ? '1' : '0');
  const lab = $(`#pen_${tk}`);
  let last = ST[tk].start;                                              // 숫자는 지나온 마지막 점(확인된 종가)만 — 점 사이 보간값은 표시하지 않음
  for (const p of ST[tk].pts) { if (p.day <= day) last = p.v; else break; }
  lab.textContent = money(last);
  lab.style.opacity = String(drawing ? clamp((x - SX0 - 380) / 60) : 0);
  lab.style.left = `${x > 1500 ? x - 186 : x + 14}px`;
  lab.style.top = `${y - 58}px`;
}

// 순위표 숫자: 지금까지 지나온 '확인된 종가(점)' 중 마지막 값 — 점과 점 사이의 보간값은 숫자로 보여주지 않음
function lastPct(tk, day) {
  let v = ST[tk].start;
  for (const p of ST[tk].pts) { if (p.day <= day) v = p.v; else break; }
  return (v / ST[tk].start - 1) * 100;
}
const raceDay = (t) => SPAN * prog(t, 40.5, 53.5);
function ranksAt(day) {                                                 // 0 = 1위, 동률이면 요청 순서대로
  const v = INTRO_ORDER.map((tk, i) => [tk, lastPct(tk, day), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  return Object.fromEntries(v.map(([tk], i) => [tk, i]));
}

function applyRace(t) {
  if (t < B(39.9) || t > B(56.1)) return;
  const day = raceDay(t);
  // 세로축: 지금까지 나온 가장 큰 상승률에 맞춰 부드럽게 넓어짐(한 번 넓어지면 줄지 않음)
  let runMax = 0;
  for (const tk of INTRO_ORDER) for (const p of ST[tk].pts) if (p.day <= day) runMax = Math.max(runMax, (p.v / ST[tk].start - 1) * 100);
  for (const tk of INTRO_ORDER) runMax = Math.max(runMax, pctAt(tk, day));
  const yMax = Math.max(120, runMax * 1.12);
  const X = (d) => RX0 + (RX1 - RX0) * d / SPAN;
  const Y = (p) => RYB - (p - RMIN) / (yMax - RMIN) * (RYB - RYT);
  $$('#rgrid .rg').forEach((gEl) => {
    const v = +gEl.dataset.v;
    const y = Y(v);
    const vis = v <= yMax && y >= RYT - 2;
    const neighborGap = (RYB - RYT) * 50 / (yMax - RMIN);           // $50 간격이 몇 px인지
    const fine = v === 50 || v === -50;                                 // 눈금이 촘촘해지면 ±50% 는 사라짐
    const op = !vis ? 0 : (fine ? clamp((neighborGap - 52) / 24) : 1);
    gEl.setAttribute('opacity', op.toFixed(3));
    gEl.querySelector('line').setAttribute('y1', y.toFixed(1));
    gEl.querySelector('line').setAttribute('y2', y.toFixed(1));
    gEl.querySelector('text').setAttribute('y', (y + 8).toFixed(1));
  });
  const heads = {};
  INTRO_ORDER.forEach((tk) => {
    const pts = ST[tk].pts.filter((p) => p.day < day).map((p) => [X(p.day), Y((p.v / ST[tk].start - 1) * 100)]);
    const hv = pctAt(tk, day);
    pts.push([X(day), Y(hv)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
    $(`#rline_${tk}`).setAttribute('d', d);
    $(`#rglow_${tk}`).setAttribute('d', d);
    const circles = $(`#rpts_${tk}`).children;
    ST[tk].pts.slice(1).forEach((p, i) => {
      circles[i].setAttribute('cx', X(p.day).toFixed(1));
      circles[i].setAttribute('cy', Y((p.v / ST[tk].start - 1) * 100).toFixed(1));
      circles[i].setAttribute('opacity', p.day <= day ? '1' : '0');
    });
    const [hx, hy] = pts[pts.length - 1];
    $(`#rdot_${tk}`).setAttribute('cx', hx.toFixed(1));
    $(`#rdot_${tk}`).setAttribute('cy', hy.toFixed(1));
    heads[tk] = [hx, hy];
  });
  // 머리 칩: 세로로 62px 이상 떨어지도록 밀어냄(순서는 유지) — 선의 점은 제자리
  const order = INTRO_ORDER.slice().sort((a, b) => heads[a][1] - heads[b][1] || INTRO_ORDER.indexOf(a) - INTRO_ORDER.indexOf(b));
  const ys = order.map((tk) => heads[tk][1]);
  for (let it = 0; it < 6; it++) {
    for (let i = 1; i < ys.length; i++) {
      const gap = ys[i] - ys[i - 1];
      if (gap < 62) { const push = (62 - gap) / 2; ys[i - 1] -= push; ys[i] += push; }
    }
  }
  order.forEach((tk, i) => {
    const chip = $(`#rchip_${tk}`);
    chip.style.left = `${heads[tk][0]}px`;
    chip.style.top = `${ys[i]}px`;
  });
  // 순위표: 자리 바꿈은 지난 0.36초의 순위를 한(Hann) 창으로 평균해 부드럽게 미끄러지게(같은 시각이면 항상 같은 결과)
  const N = 12, W = 0.36;
  const acc = Object.fromEntries(INTRO_ORDER.map((tk) => [tk, 0]));
  let wsum = 0;
  for (let k = 0; k < N; k++) {
    const w = Math.sin(Math.PI * (k + 0.5) / N) ** 2;
    const r = ranksAt(raceDay(t - W * (k + 0.5) / N));
    INTRO_ORDER.forEach((tk) => { acc[tk] += w * r[tk]; });
    wsum += w;
  }
  const now = ranksAt(day);
  INTRO_ORDER.forEach((tk) => {
    const pos = acc[tk] / wsum;
    const row = $(`#row_${tk}`);
    row.style.top = `${300 + pos * 124}px`;
    row.style.zIndex = String(10 - now[tk]);
    row.querySelector('.rk').textContent = String(Math.round(pos) + 1);
    row.querySelector('.v').textContent = pct(lastPct(tk, day));
  });
  const dd = new Date(D0 + day * 864e5);
  $('#raceDate').textContent = day < 1 ? 'DEC 31, 2024' : day >= SPAN - 0.5 ? 'SEP 25, 2026' : `${MON[dd.getUTCMonth()]} ${dd.getUTCFullYear()}`;
  const co = $('#co_tariff');
  co.style.left = `${X(dayOf('2025-04-08')) + 20}px`;
  co.style.top = `${Y(-45) + 18}px`;
  const ci = $('#co_intc');                                             // 인텔 기록: 그래프 위 빈 줄에 두고 꼭짓점까지 가는 지시선
  const px = X(dayOf('2026-06-22')), py = Y(603);
  ci.style.left = `${px - ci.offsetWidth / 2}px`;
  ci.style.top = '150px';
  const ld = $('#co_lead');
  ld.setAttribute('x1', px.toFixed(1)); ld.setAttribute('x2', px.toFixed(1));
  ld.setAttribute('y1', '196'); ld.setAttribute('y2', (py - 12).toFixed(1));
}

function applyFrameFx(t) {
  let dx = 0, dy = 0, rot = 0, zoom = 1, flash = 0, pulse = 0;
  SHAKES.forEach(([b, amp], i) => {
    const d0 = t - B(b);
    if (d0 >= 0 && d0 < 0.8) {
      const d = Math.exp(-d0 / 0.13);
      dx += amp * d * noise(t, i * 3.7);
      dy += amp * d * noise(t, i * 5.3 + 1.1);
      rot += amp * 0.015 * d * noise(t, i * 7.1 + 2.2);
    }
  });
  FLASHES.forEach(([b, a]) => { const d0 = t - B(b); if (d0 >= 0 && d0 < 1.2) flash += a * Math.exp(-d0 / 0.14); });
  KICKS.forEach((b) => { const d0 = t - B(b); if (d0 >= 0 && d0 < 0.6) { const d = Math.exp(-d0 / 0.11); zoom += 0.005 * d; pulse += d; } });
  gsap.set('#rig', { x: dx, y: dy, rotation: rot, scale: zoom });
  gsap.set('#flash', { opacity: Math.min(flash, 0.9) });
  const f = Math.round(t * 60);
  gsap.set('#grain', { x: ((f * 73) % 256) - 128, y: ((f * 151) % 256) - 128 });
  gsap.set('#bg', { x: Math.sin(t * 0.4) * 30, y: Math.cos(t * 0.33) * 20 });
  // 배경 틴트: 지금 보이는 종목의 색
  let tint = null;
  for (const { tk, s } of SEGS) if (t >= B(s - 0.5) && t < B(s + 7.5)) tint = COLOR[tk];
  const tintEl = $('#bg .tint');
  if (tint) {
    tintEl.style.background = `radial-gradient(1300px 900px at 72% 70%, ${tint}38, transparent 70%)`;
    tintEl.style.opacity = String(0.9 + 0.1 * Math.min(pulse, 1));
  } else tintEl.style.opacity = '0';
  SEGS.forEach((sg) => applySegment(t, sg));
  applyRace(t);
}

async function init() {
  [DATA, LOGOS] = await Promise.all([fetch('data/stocks.json').then((r) => r.json()), fetch('assets/logos.json').then((r) => r.json())]);
  const bm = await fetch('build/beatmap.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  KICKS = bm ? bm.kicks : [];
  prepData();
  buildIntro();
  SEGS.forEach(buildSegment);
  buildRace();
  buildFinal();
  await Promise.all([500, 600, 700, 800].map((w) => document.fonts.load(`${w} 100px Manrope`, 'Final +513%')));
  await Promise.all([500, 600, 700].map((w) => document.fonts.load(`${w} 40px "Intel One Mono"`, '$140.94 NASDAQ')));
  await document.fonts.ready;
  build();
  window.seek = (t) => { tl.seek(t, false); applyFrameFx(t); };
  window.DURATION = DUR;
  window.seek(0);
  window.READY = true;
}
init();

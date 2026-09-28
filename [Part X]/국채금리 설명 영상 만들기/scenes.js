/* 영상 타임라인: build/timeline.js(내레이션 시각)에 맞춰 GSAP 애니메이션을 배치합니다.
 * render.js 가 window.seek(t) 로 한 프레임씩 넘기며 화면을 캡처합니다. */
function build() {
  const T = window.TIMELINE;
  const byId = Object.fromEntries(T.scenes.map((s) => [s.id, s]));
  const L = (id, i) => byId[id].lines[i].start;      // 문장 시작 시각
  const LE = (id, i) => byId[id].lines[i].end;       // 문장 끝 시각
  const S = (id) => byId[id].start;                  // 장면 첫 문장 시작
  const $ = (sel) => document.querySelector(sel);

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.7 } });

  // ---------- 도우미 ----------
  function show(sel, t, from = { y: 36 }, dur = 0.7) {
    tl.fromTo(sel, { autoAlpha: 0, ...from }, { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0, duration: dur }, t);
  }
  function stagger(sels, t, gap = 0.18, from = { y: 36 }) {
    sels.forEach((s, i) => show(s, t + i * gap, from));
  }
  function hide(sel, t, to = {}, dur = 0.45) {
    tl.to(sel, { autoAlpha: 0, duration: dur, ease: 'power2.in', ...to }, t);
  }
  function count(el, from, to, decimals, t, dur) {
    const o = { v: from };
    el.textContent = from.toFixed(decimals);
    tl.fromTo(o, { v: from }, {
      v: to, duration: dur, ease: 'power2.out',
      onUpdate: () => { el.textContent = o.v.toFixed(decimals); },
    }, t);
  }
  function draw(path, t, dur, ease = 'power1.inOut') {
    const len = path.getTotalLength();
    // 둥근 선 끝(round cap) 때문에 그리기 전 시작점에 점이 보이지 않도록 숨겨 둠
    tl.fromTo(path, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, t);
    tl.fromTo(path, { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: dur, ease }, t);
  }

  // ---------- 장면 전환 (교차 페이드) ----------
  T.scenes.forEach((s, i) => {
    const el = document.getElementById('s-' + s.id);
    const tin = i === 0 ? 0 : s.start - 0.6;
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, tin);
    if (i < T.scenes.length - 1) {
      tl.to(el, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, T.scenes[i + 1].start - 0.95);
    }
    // 장면 머리글
    const header = el.querySelector(':scope > .header');
    if (header && s.id !== 'meaning1') show(header, tin + 0.1, { x: -40 }, 0.6);
  });

  // ---------- 공통: 진행 막대, 챕터, 배경 ----------
  tl.fromTo('#progress', { scaleX: 0 }, { scaleX: 1, duration: T.duration, ease: 'none' }, 0);
  tl.fromTo('#bgGlow', { x: 0, y: 0 }, { x: -700, y: 420, duration: T.duration, ease: 'sine.inOut' }, 0);
  show('#brand', 0.2, { y: -20 }, 0.6);
  show('#nav', S('basics') - 0.6, { y: -20 }, 0.6);
  const chapters = [
    ['개념', 'basics', 'basics'], ['현황', 'chart', 'chart'], ['이유', 'reason1', 'reason4'],
    ['의미', 'meaning1', 'meaning3'], ['전망', 'watch', 'watch'], ['정리', 'summary', 'summary'],
  ];
  const order = T.scenes.map((s) => s.id);
  chapters.forEach(([name, first, last]) => {
    const el = document.querySelector(`#nav span[data-ch="${name}"]`);
    tl.to(el, { opacity: 1, color: '#FFFFFF', duration: 0.3 }, S(first) - 0.6);
    const next = order[order.indexOf(last) + 1];
    if (next) tl.to(el, { opacity: 0.35, color: '#A3B1C9', duration: 0.3 }, S(next) - 0.6);
  });

  // ---------- 자막 ----------
  const capWrap = $('#captions');
  const allLines = T.scenes.flatMap((s) => s.lines);
  allLines.forEach((line, i) => {
    const d = document.createElement('div');
    d.className = 'cap';
    d.textContent = line.caption;
    capWrap.appendChild(d);
    gsap.set(d, { xPercent: -50 });
    const next = allLines[i + 1];
    const off = next ? Math.min(line.end + 0.35, next.start - 0.1) : line.end + 0.6;
    tl.fromTo(d, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' }, line.start - 0.08);
    tl.to(d, { autoAlpha: 0, duration: 0.12, ease: 'none' }, off);
  });

  // ================= 인트로 =================
  draw($('#introPath'), 0.1, 3.2, 'power2.inOut');
  show('#introKicker', 0.25, { y: 20 });
  show('#introT1', 0.45, { y: 60 }, 0.8);
  show('#introT2', 0.75, { y: 60 }, 0.8);
  show('#introChipKR', L('intro', 1) + 0.2, { x: 80 });
  show('#introChipUS', L('intro', 2) + 0.1, { x: 80 });
  stagger(['#introAgenda .tag:nth-child(1)', '#introAgenda .tag:nth-child(2)', '#introAgenda .tag:nth-child(3)'],
    L('intro', 3) + 0.4, 0.3, { y: 24 });

  // ================= 기초 개념 =================
  show('#partyGov', L('basics', 0) + 0.1, { scale: 0.8 });
  show('#partyInv', L('basics', 0) + 0.3, { scale: 0.8 });
  show('#xferMoney', L('basics', 0) + 1.0, { x: 60 });
  show('#xferBond', L('basics', 0) + 1.9, { x: -60 });
  show('#basicsFormula', L('basics', 1) + 0.3, { y: 40, scale: 0.94 });
  hide('#basicsA', L('basics', 2) - 0.2);
  show('#seesawCaption', L('basics', 2) + 0.2, { y: 20 });
  show('#seesaw', L('basics', 2) + 0.1, { y: 60 });
  tl.fromTo(['#seatPriceArrow', '#seatRateArrow'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, L('basics', 3) + 1.2);
  tl.fromTo('#plank', { rotation: 0 }, { rotation: -9, duration: 1.4, ease: 'elastic.out(1, 0.6)' }, L('basics', 3) + 1.1);
  tl.fromTo(['#seatPrice', '#seatRate'], { rotation: 0 }, { rotation: 9, duration: 1.4, ease: 'elastic.out(1, 0.6)' }, L('basics', 3) + 1.1);
  hide('#basicsB', L('basics', 4) - 0.2);
  show('#basicsC .root-title', L('basics', 4) + 0.1, { y: 24 });
  stagger(['#bc1', '#basicsC .link:nth-child(2)', '#bc2', '#basicsC .link:nth-child(4)', '#bc3'],
    L('basics', 4) + 0.5, 0.25, { x: -30 });

  // ================= 차트 =================
  buildChart();

  // ================= 이유 ① =================
  show('#r1cpi', L('reason1', 1) + 0.1, { x: -50 });
  show('#r1core', L('reason1', 1) + 2.4, { x: -50 });
  show('#r1growth', L('reason1', 2) + 0.1, { x: -50 });
  show('#r1stairs', L('reason1', 3) - 0.2, { x: 50 });
  ['#r1b1', '#r1b2', '#r1b3'].forEach((b, i) => {
    tl.fromTo(`${b} .bar`, { scaleY: 0 }, { scaleY: 1, duration: 0.7 }, L('reason1', 3) + 0.2 + i * 0.7);
    show(`${b} .bval`, L('reason1', 3) + 0.5 + i * 0.7, { y: 16 }, 0.4);
    show(`${b} .bdate`, L('reason1', 3) + 0.3 + i * 0.7, { y: 10 }, 0.4);
  });
  show('#r1badge', L('reason1', 3) + 2.6, { scale: 0.8 });
  tl.fromTo('#r1b4', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, L('reason1', 4) + 0.1);
  tl.fromTo('#r1b4 .bar', { scaleY: 0 }, { scaleY: 1, duration: 0.7 }, L('reason1', 4) + 0.1);
  show('#r1next', L('reason1', 4) + 1.2, { x: -30 });

  // ================= 이유 ② =================
  show('#r2oil', L('reason2', 1) - 0.3, { x: -50 });
  count($('#r2num'), 70, 100, 0, L('reason2', 1) + 0.2, 2.2);
  show('#r2hormuz', L('reason2', 1) + 0.6, { x: 50 });
  stagger(['#r2c1', '#r2l1', '#r2c2'], L('reason2', 2) + 1.4, 0.3, { x: -30 });
  stagger(['#r2l2', '#r2c3'], L('reason2', 3) + 0.2, 0.3, { x: -30 });

  // ================= 이유 ③ =================
  show('#r3hero', L('reason3', 0) + 0.3, { x: -50 });
  count($('#r3num'), 4.0, 5.21, 2, L('reason3', 0) + 0.4, 2.2);
  tl.to('#r3hero .value', { scale: 1.06, transformOrigin: 'left center', duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1 }, L('reason3', 3) + 0.6);
  show('#r3fed', L('reason3', 1) + 0.1, { x: 50 });
  show('#r3fiscal', L('reason3', 2) + 0.1, { x: 50 });
  stagger(['#r3c1', '#r3chain .link:nth-child(2)', '#r3c2', '#r3chain .link:nth-child(4)', '#r3c3'],
    L('reason3', 4) + 0.1, 0.35, { x: -30 });

  // ================= 이유 ④ =================
  show('#r4rates .ttl', L('reason4', 0) + 0.1, { y: 16 });
  tl.fromTo('#r4rates', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, L('reason4', 0));
  show('#r4us', L('reason4', 0) + 0.8, { x: -40 });
  show('#r4kr', L('reason4', 0) + 1.3, { x: -40 });
  show('#r4jp', L('reason4', 1) + 0.2, { x: -40 });
  tl.fromTo('#r4jp', { backgroundColor: 'rgba(255,93,93,0)' }, { backgroundColor: 'rgba(255,93,93,0.12)', duration: 0.6 }, L('reason4', 1) + 1.0);
  show('#r4flows', L('reason4', 2) + 0.1, { x: 50 });
  tl.fromTo('#r4jul', { scaleY: 0, transformOrigin: 'bottom center' }, { scaleY: 1, duration: 0.7 }, L('reason4', 2) + 0.9);
  show('#r4julL', L('reason4', 2) + 1.2, { y: 10 }, 0.4);
  tl.fromTo('#r4aug', { scaleY: 0, transformOrigin: 'top center' }, { scaleY: 1, duration: 0.7 }, L('reason4', 3) + 0.2);
  show('#r4augL', L('reason4', 3) + 0.5, { y: -10 }, 0.4);
  show('#r4badge', L('reason4', 3) + 1.4, { scale: 0.8 });
  stagger(['#r4c1', '#r4chain .link:nth-child(2)', '#r4c2', '#r4chain .link:nth-child(4)', '#r4c3'],
    L('reason4', 4) + 0.1, 0.35, { x: -30 });

  // ================= 의미 ① =================
  show('#m1q', L('meaning1', 0) - 0.2, { scale: 0.9 });
  hide('#m1q', L('meaning1', 1) - 0.1, { y: -40 }, 0.4);
  show('#m1header', L('meaning1', 1) + 0.1, { x: -40 });
  stagger(['#m1f1', '#m1flow .link:nth-child(2)', '#m1f2', '#m1flow .link:nth-child(4)', '#m1f3'],
    L('meaning1', 2) + 0.2, 0.55, { x: -30 });
  show('#m1bank', L('meaning1', 3) + 0.2, { y: 50 });
  show('#m1loan', L('meaning1', 4) + 0.1, { y: 50 });

  // ================= 의미 ② =================
  show('#m2a', L('meaning2', 0) + 0.2, { y: 50 });
  show('#m2b', L('meaning2', 1) + 0.2, { y: 50 });
  show('#m2c', L('meaning2', 1) + 2.6, { y: 50 });
  show('#m2d', L('meaning2', 2) + 0.1, { y: 50 });
  show('#m2gov', L('meaning2', 3) + 0.4, { y: 50 });

  // ================= 의미 ③ =================
  show('#m3thermo', L('meaning3', 0) + 0.1, { scale: 0.9 });
  tl.fromTo('#m3thermo .ic', { color: '#4D8DFF' }, { color: '#FF5D5D', duration: 1.6, ease: 'power1.inOut' }, L('meaning3', 0) + 0.5);
  show('#m3s1', L('meaning3', 1) + 0.1, { x: 50 });
  show('#m3s2', L('meaning3', 1) + 1.9, { x: 50 });
  show('#m3big', L('meaning3', 2) + 0.2, { y: 30 }, 0.8);

  // ================= 전망 =================
  show('#w1', L('watch', 1) - 0.1, { x: -50 });
  show('#w2', L('watch', 2) - 0.1, { x: -50 });
  show('#w3', L('watch', 3) - 0.1, { x: -50 });
  show('#w4', L('watch', 3) + 2.0, { x: -50 });
  show('#wAlert', L('watch', 4) + 0.3, { y: 30 });

  // ================= 정리 =================
  show('#sum1', L('summary', 0) - 0.2, { x: -50 });
  stagger(['#sc1', '#sc2', '#sc3', '#sc4'], L('summary', 0) + 1.3, 0.6, { y: 16 });
  show('#sum2', L('summary', 1) + 0.1, { x: -50 });
  show('#sum3', L('summary', 2) + 0.1, { x: -50 });
  tl.fromTo('#endcard', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power1.out' }, LE('summary', 2) + 0.7);
  tl.to(['#captions', '#nav', '#brand'], { autoAlpha: 0, duration: 0.5 }, LE('summary', 2) + 0.7);
  tl.to({}, { duration: 0.01 }, T.duration);  // 타임라인 길이를 영상 길이에 맞춤

  // ---------- 차트 그리기 ----------
  function buildChart() {
    const svg = $('#chartSvg');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 1240, H = 640;
    const pad = { l: 96, r: 40, t: 26, b: 70 };
    const y0 = 2.25, y1 = 4.75;
    const d0 = Date.UTC(2025, 11, 22), d1 = Date.UTC(2026, 8, 30);
    const X = (s) => { const [y, m, d] = s.split('-').map(Number); return pad.l + (Date.UTC(y, m - 1, d) - d0) / (d1 - d0) * (W - pad.l - pad.r); };
    const Y = (v) => pad.t + (y1 - v) / (y1 - y0) * (H - pad.t - pad.b);
    const el = (tag, attrs, parent = svg) => {
      const e = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      parent.appendChild(e);
      return e;
    };

    // 국고채 금리: 금융투자협회 월말 종가(1·7월 말 3년물 등은 전월 대비 변동폭으로 역산), 9월은 11일(연중 고점)·23일(추석 전 마지막 거래일)
    const ktb3 = [['2025-12-30', 2.952], ['2026-01-30', 3.138], ['2026-02-27', 3.041], ['2026-03-31', 3.552], ['2026-04-30', 3.595],
      ['2026-05-29', 3.731], ['2026-06-30', 3.703], ['2026-07-31', 3.758], ['2026-08-31', 3.838], ['2026-09-11', 4.011], ['2026-09-23', 4.006]];
    const ktb10 = [['2025-12-30', 3.385], ['2026-01-30', 3.607], ['2026-02-27', 3.446], ['2026-03-31', 3.879], ['2026-04-30', 3.923],
      ['2026-05-29', 4.068], ['2026-06-30', 4.091], ['2026-07-31', 4.261], ['2026-08-31', 4.313], ['2026-09-11', 4.542], ['2026-09-23', 4.392]];
    const base = [['2025-12-30', 2.5], ['2026-07-16', 2.5], ['2026-07-16', 2.75], ['2026-08-27', 2.75], ['2026-08-27', 3.0], ['2026-09-28', 3.0]];

    const grid = el('g', {});
    [2.5, 3.0, 3.5, 4.0, 4.5].forEach((v) => {
      el('line', { x1: pad.l, x2: W - pad.r, y1: Y(v), y2: Y(v), class: 'gridline' }, grid);
      const t = el('text', { x: pad.l - 18, y: Y(v) + 9, 'text-anchor': 'end', class: 'axis-label' }, grid);
      t.textContent = v.toFixed(1) + '%';
    });
    const months = [['2025-12-30', "'25.12"], ['2026-01-30', '1월'], ['2026-02-27', '2월'], ['2026-03-31', '3월'], ['2026-04-30', '4월'],
      ['2026-05-29', '5월'], ['2026-06-30', '6월'], ['2026-07-31', '7월'], ['2026-08-31', '8월'], ['2026-09-17', '9월']];
    months.forEach(([d, lbl]) => {
      const t = el('text', { x: X(d), y: H - pad.b + 42, 'text-anchor': 'middle', class: 'axis-label' }, grid);
      t.textContent = lbl;
    });

    const pathOf = (pts) => pts.map(([d, v], i) => `${i ? 'L' : 'M'} ${X(d).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const pBase = el('path', { d: pathOf(base), class: 'series', stroke: 'var(--series-base)', 'stroke-width': 4 });
    const p10 = el('path', { d: pathOf(ktb10), class: 'series', stroke: 'var(--series-2)' });
    const p3 = el('path', { d: pathOf(ktb3), class: 'series', stroke: 'var(--series-1)' });

    // 보조 설명: 3월 중동 충돌
    const noteG = el('g', {});
    el('line', { x1: X('2026-03-04'), x2: X('2026-03-04'), y1: Y(4.62), y2: Y(3.95), class: 'note-line' }, noteG);
    const nt = el('text', { x: X('2026-03-04') + 12, y: Y(4.62) + 6, class: 'note' }, noteG);
    nt.textContent = '3월 중동 충돌 격화';

    // 기준금리 라벨
    const bl = el('text', { x: X('2026-09-28'), y: Y(3.0) - 16, 'text-anchor': 'end', class: 'dlabel small' });
    bl.textContent = '기준금리 3.00%';

    // 점과 라벨 (시작점·고점만 선택적으로 표시)
    const dot = (d, v, color) => el('circle', { cx: X(d), cy: Y(v), r: 10, fill: color, class: 'dot' });
    const label = (d, v, text, dx, dy, anchor = 'start', cls = 'dlabel') => {
      const t = el('text', { x: X(d) + dx, y: Y(v) + dy, 'text-anchor': anchor, class: cls });
      t.textContent = text;
      return t;
    };
    const s3 = dot('2025-12-30', 2.952, 'var(--series-1)');
    const s3l = label('2025-12-30', 2.952, '2.95%', 10, 48);
    const e3 = dot('2026-09-11', 4.011, 'var(--series-1)');
    const e3l = label('2026-09-11', 4.011, '4.01%', 14, 52);
    const s10 = dot('2025-12-30', 3.385, 'var(--series-2)');
    const s10l = label('2025-12-30', 3.385, '3.39%', 10, -48);
    const e10 = dot('2026-09-11', 4.542, 'var(--series-2)');
    const e10l = label('2026-09-11', 4.542, '4.54%', -18, -20, 'end');
    const e10n = label('2026-09-11', 4.542, '연중 최고', -120, -20, 'end', 'dlabel small');

    // 애니메이션
    show(svg.querySelectorAll('.gridline, .axis-label'), S('chart') - 0.3, { y: 0 }, 0.6);
    show('#chartLegend', S('chart'), { x: 30 });
    draw(pBase, L('chart', 0) + 0.2, 1.4);
    show(bl, L('chart', 0) + 1.2, { y: 10 }, 0.4);
    show([s3, s3l], L('chart', 1) + 0.2, { scale: 0.5, transformOrigin: 'center' }, 0.4);
    draw(p3, L('chart', 1) + 0.4, 3.6);
    show([e3, e3l], L('chart', 1) + 4.0, { scale: 0.5, transformOrigin: 'center' }, 0.5);
    show('#delta3', L('chart', 1) + 4.3, { x: 40 });
    show([s10, s10l], L('chart', 2) + 0.1, { scale: 0.5, transformOrigin: 'center' }, 0.4);
    draw(p10, L('chart', 2) + 0.3, 3.2);
    show([e10, e10l, e10n], L('chart', 2) + 3.4, { scale: 0.5, transformOrigin: 'center' }, 0.5);
    show('#delta10', L('chart', 2) + 3.6, { x: 40 });
    show(noteG, L('chart', 3) + 0.2, { y: -10 }, 0.5);
    show('#chartSource', S('chart') + 0.5, { y: 0 }, 0.6);
  }

  // ---------- 외부 인터페이스 ----------
  window.TL = tl;
  window.seek = (t) => { tl.seek(t, false); };
  window.seek(0);
}

// 아이콘(SVG)과 글꼴을 모두 불러온 뒤 타임라인을 만듭니다.
async function init() {
  const icons = [...document.querySelectorAll('.ic[data-i]')];
  await Promise.all(icons.map(async (el) => {
    const res = await fetch(`node_modules/lucide-static/icons/${el.dataset.i}.svg`);
    el.innerHTML = await res.text();
  }));
  await Promise.all([400, 500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 40px Pretendard`, '국채금리 0123%')));
  await document.fonts.ready;
  build();
  window.READY = true;
}
init();

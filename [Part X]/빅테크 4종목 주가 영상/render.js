// promo.html 을 프레임 단위로 캡처해 음악과 합친 MP4 를 만듭니다.
//
//   node render.js                     60fps + 모션 블러(서브프레임 5장 평균) 전체 렌더링
//   node render.js --stills 1,5.2,9    지정 시각의 정지 화면 → build/stills/
//
// 필요: ffmpeg, playwright(npm install), build/music.wav (python make_music.py)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const BUILD = path.join(ROOT, 'build');
const OUT = path.join(ROOT, 'output', 'four-stocks-30s.mp4');
const FPS = 60;
const SUB = 5;            // 프레임당 서브프레임 수(모션 블러 품질)
const SHUTTER = 0.5;      // 180° 셔터
const WORKERS = Math.max(1, Math.min(3, os.cpus().length - 1));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function run(cmd, args, onSpawn) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} 실패 (${c})\n${err.slice(-1500)}`))));
    if (onSpawn) onSpawn(p);
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('페이지 오류:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('콘솔:', m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

async function renderChunk(browser, url, from, to, file, tick) {
  const page = await openPage(browser, url);
  const cdp = await page.context().newCDPSession(page);
  let ff;
  const done = run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
    '-vf', `tmix=frames=${SUB},select='eq(mod(n,${SUB}),${SUB - 1})',setpts=N/(${FPS}*TB)`,
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-g', String(FPS), file], (p) => { ff = p; });
  for (let f = from; f < to; f++) {
    for (let j = 0; j < SUB; j++) {
      const t = Math.max(0, f / FPS + ((j + 0.5) / SUB - 0.5) * SHUTTER / FPS);
      await page.evaluate((x) => window.seek(x), t);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
      if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    }
    tick();
  }
  ff.stdin.end();
  await done;
  await page.close();
}

async function main() {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/promo.html`;
  const browser = await chromium.launch({ args: ['--disable-lcd-text', '--force-color-profile=srgb'] });
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const dir = path.join(BUILD, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, url);
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      await page.evaluate((x) => window.seek(x), t);
      const file = path.join(dir, `p${t.toFixed(3).padStart(7, '0')}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    await browser.close(); server.close();
    return;
  }
  const dur = 30.0;
  const total = Math.round(dur * FPS);
  const size = Math.ceil(total / WORKERS);
  const chunks = [];
  for (let i = 0; i < WORKERS; i++) {
    const from = i * size, to = Math.min(total, from + size);
    if (from < to) chunks.push({ from, to, file: path.join(BUILD, `chunk_${i}.mp4`) });
  }
  let n = 0;
  const t0 = Date.now();
  const tick = () => { if (++n % 60 === 0 || n === total) console.log(`${n}/${total} 프레임 (${(n / ((Date.now() - t0) / 1000)).toFixed(1)} fps)`); };
  // 작업마다 브라우저를 따로 띄워 GPU(SwiftShader) 프로세스가 병렬로 돌게 함
  await browser.close();
  await Promise.all(chunks.map(async (c) => {
    const b = await chromium.launch({ args: ['--disable-lcd-text', '--force-color-profile=srgb'] });
    await renderChunk(b, url, c.from, c.to, c.file, tick);
    await b.close();
  }));
  server.close();
  const list = path.join(BUILD, 'chunks.txt');
  fs.writeFileSync(list, chunks.map((c) => `file '${c.file.replace(/'/g, "'\\''")}'`).join('\n'));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(BUILD, 'music.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slower', '-crf', '18', '-tune', 'film', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-g', '120', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', OUT]);
  chunks.forEach((c) => fs.unlinkSync(c.file));
  console.log(`완료: ${OUT} (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

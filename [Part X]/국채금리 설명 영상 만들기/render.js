// scenes.html 을 한 프레임씩 캡처해 MP4 로 만듭니다.
//
//   node render.js                    전체 영상 렌더링 → output/국채금리_왜_높을까.mp4
//   node render.js --stills 5,42,90   지정한 시각(초)의 정지 화면만 build/stills/ 에 저장
//
// 필요: ffmpeg, playwright (npm install), make_narration.py 로 만든 build/ 폴더
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = __dirname;
const BUILD = path.join(ROOT, 'build');
const OUT_DIR = path.join(ROOT, 'output');
const OUT_FILE = path.join(OUT_DIR, '국채금리_왜_높을까.mp4');
const FPS = 30;
const WORKERS = Math.max(1, Math.min(3, require('os').cpus().length - 1));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png',
};

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'], ...opts });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} 실패 (${code})\n${err.slice(-2000)}`))));
    if (opts.onSpawn) opts.onSpawn(p);
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('페이지 오류:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

// 프레임 [from, to) 를 캡처해 H.264 조각 파일로 인코딩
async function renderChunk(browser, url, from, to, outFile, progress) {
  const page = await openPage(browser, url);
  // Playwright 스크린샷보다 3배 이상 빠른 CDP 캡처(무손실 PNG)
  const cdp = await page.context().newCDPSession(page);
  let ff;
  const done = run('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-r', String(FPS), outFile,
  ], { onSpawn: (p) => { ff = p; } });
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    const png = Buffer.from(data, 'base64');
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    progress();
  }
  ff.stdin.end();
  await done;
  await page.close();
}

async function main() {
  const timeline = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/scenes.html`;
  const browser = await chromium.launch();

  const stillsArg = process.argv.indexOf('--stills');
  if (stillsArg > 0) {
    const times = process.argv[stillsArg + 1].split(',').map(Number);
    const dir = path.join(BUILD, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, url);
    for (const t of times) {
      await page.evaluate((x) => window.seek(x), t);
      const file = path.join(dir, `t${String(t.toFixed(1)).padStart(6, '0')}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    await browser.close(); server.close();
    return;
  }

  const total = Math.ceil(timeline.duration * FPS);
  const size = Math.ceil(total / WORKERS);
  const chunks = [];
  let rendered = 0;
  const started = Date.now();
  const progress = () => {
    rendered++;
    if (rendered % 150 === 0 || rendered === total) {
      const sec = (Date.now() - started) / 1000;
      console.log(`${rendered}/${total} 프레임 (${(rendered / sec).toFixed(1)} fps, 남은 시간 약 ${Math.round((total - rendered) / (rendered / sec))}초)`);
    }
  };
  for (let i = 0; i < WORKERS; i++) {
    const from = i * size;
    const to = Math.min(total, from + size);
    if (from < to) chunks.push({ from, to, file: path.join(BUILD, `chunk_${i}.mp4`) });
  }
  await Promise.all(chunks.map((c) => renderChunk(browser, url, c.from, c.to, c.file, progress)));
  await browser.close();
  server.close();

  // 조각 이어 붙이기 + 내레이션(+배경음) 합치기
  const list = path.join(BUILD, 'chunks.txt');
  fs.writeFileSync(list, chunks.map((c) => `file '${c.file.replace(/'/g, "'\\''")}'`).join('\n'));
  const video = path.join(BUILD, 'video_only.mp4');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const narration = path.join(BUILD, 'narration.wav');
  const bgm = path.join(BUILD, 'bgm.wav');
  const args = ['-y', '-loglevel', 'error', '-i', video, '-i', narration];
  let filter = '[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[voice]';
  let outLabel = '[voice]';
  if (fs.existsSync(bgm)) {
    args.push('-i', bgm);
    // 말하는 동안 배경음을 살짝 낮춤(사이드체인 더킹)
    filter = '[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,asplit=2[voice][sc];'
      + '[2:a]aresample=48000,volume=0.9[bg];'
      + '[bg][sc]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=450[bgd];'
      + '[voice][bgd]amix=inputs=2:duration=first:normalize=0[mix]';
    outLabel = '[mix]';
  }
  args.push('-filter_complex', filter, '-map', '0:v', '-map', outLabel,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-movflags', '+faststart', '-shortest', OUT_FILE);
  await run('ffmpeg', args);
  fs.copyFileSync(path.join(BUILD, 'captions.srt'), OUT_FILE.replace(/\.mp4$/, '.srt'));
  chunks.forEach((c) => fs.unlinkSync(c.file));
  console.log(`완료: ${OUT_FILE} (${((Date.now() - started) / 1000).toFixed(0)}초 소요)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

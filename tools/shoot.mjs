// 截图脚本：Playwright + Chromium（swiftshader 软渲染）
// 用法：node tools/shoot.mjs [shot1 shot2 ...]   不带参数则跑全部
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = path.resolve('qa/shots');
fs.mkdirSync(OUT, { recursive: true });

const consoleLines = [];
const errors = [];

const ALL = {
  ride_idle:      { url: '/' },
  ride_fast:      { url: '/', prep: async (p) => { await p.evaluate(() => window.__app.debugSetSpeed(6.9)); } },
  drive_xray:     { url: '/?view=drive' },
  inspect_front34:{ url: '/?view=inspect' },
  inspect_side:   { url: '/?view=inspect&spin=90' },
  inspect_rear34: { url: '/?view=inspect&spin=200' },
  explode_50:     { url: '/?view=inspect&explode=0.5' },
  explode_100:    { url: '/?view=inspect&explode=1' },
  cutaway:        { url: '/?view=inspect&cutaway=1' },
  sound:          { url: '/?view=sound' },
  tour_step3:     { url: '/?view=inspect&tour=2' },
  mobile_390:     { url: '/', viewport: { width: 390, height: 844 } },
  audio_solo:     { url: '/?solo=audio' },
  solo_model:     { url: '/?solo=model' },
};

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 软渲染下 tween 被时间稀释，固定 sleep 会截到过渡中间帧。
// 等 tween 全部结束，再多渲染几帧让道路/标签/辉光收敛。
async function settle(page, { timeout = 90000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const busy = await page.evaluate(() => !!(window.__app && window.__app.busy && window.__app.busy()));
    if (!busy) return;
    await wait(400);
  }
  console.log('  (settle timeout)');
}

const wanted = process.argv.slice(2);
const jobs = wanted.length ? Object.entries(ALL).filter(([k]) => wanted.includes(k)) : Object.entries(ALL);

const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
  ],
});

for (const [name, cfg] of jobs) {
  const page = await browser.newPage({ viewport: cfg.viewport || { width: 1440, height: 900 } });
  const localErrors = [];
  page.on('console', (m) => {
    const line = `[console.${m.type()}] ${m.text()}`;
    consoleLines.push(`${name}: ${line}`);
    if (m.type() === 'error') { errors.push(`${name}: ${line}`); localErrors.push(line); }
  });
  page.on('pageerror', (e) => {
    const line = `[pageerror] ${e.message}`;
    consoleLines.push(`${name}: ${line}`);
    errors.push(`${name}: ${line}`);
    localErrors.push(line);
  });

  try {
    await page.goto(BASE + cfg.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__app && window.__app.ready === true, { timeout: 60000 });
    await settle(page);
    if (cfg.prep) { await cfg.prep(page); await settle(page); }
    // 停掉 rAF 再截图：软件渲染下持续合成会拖慢 compositor，导致截图超时
    await page.evaluate(() => {
      window.__app.pause(true);
      window.__app.scene && window.__app.scene.renderOnly && window.__app.scene.renderOnly();
    });
    await wait(120);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, timeout: 120000 });
    await page.evaluate(() => window.__app.pause(false));
    console.log(`shot ${name} -> ${file}${localErrors.length ? `  [${localErrors.length} errors]` : ''}`);
  } catch (e) {
    errors.push(`${name}: [harness] ${e.message}`);
    console.log(`FAIL ${name}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
fs.writeFileSync(path.resolve('qa/console.log'), consoleLines.join('\n') + '\n');
console.log(`\nconsole lines: ${consoleLines.length}, errors: ${errors.length}`);
if (errors.length) {
  console.log('--- ERRORS ---');
  for (const e of errors) console.log(e);
  process.exit(1);
}

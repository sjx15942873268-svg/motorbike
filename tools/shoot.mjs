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
  ride_idle:      { url: '/', actions: [] },
  ride_fast:      { url: '/', actions: [async (p) => { await p.evaluate(() => window.__app.debugSetSpeed(6.9)); await wait(1200); }] },
  drive_xray:     { url: '/?view=drive', actions: [async (p) => { await wait(1600); }] },
  inspect_front34:{ url: '/?view=inspect', actions: [async (p) => { await wait(1600); }] },
  inspect_side:   { url: '/?view=inspect&spin=90', actions: [async (p) => { await wait(1200); }] },
  inspect_rear34: { url: '/?view=inspect&spin=200', actions: [async (p) => { await wait(1200); }] },
  explode_50:     { url: '/?view=inspect&explode=0.5', actions: [async (p) => { await wait(1200); }] },
  explode_100:    { url: '/?view=inspect&explode=1', actions: [async (p) => { await wait(1200); }] },
  cutaway:        { url: '/?view=inspect&cutaway=1', actions: [async (p) => { await wait(1600); }] },
  sound:          { url: '/?view=sound', actions: [async (p) => { await wait(1200); }] },
  tour_step3:     { url: '/?view=inspect&tour=2', actions: [async (p) => { await wait(1600); }] },
  mobile_390:     { url: '/', viewport: { width: 390, height: 844 }, actions: [async (p) => { await wait(800); }] },
  audio_solo:     { url: '/?solo=audio', actions: [async (p) => { await wait(1200); }] },
  solo_model:     { url: '/?solo=model', actions: [async (p) => { await wait(1200); }] },
};

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

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
    await page.evaluate(() => window.__app.scene && window.__app.scene.renderOnly && window.__app.scene.renderOnly());
    await wait(600);
    for (const a of cfg.actions) await a(page);
    await page.evaluate(() => window.__app.scene && window.__app.scene.renderOnly && window.__app.scene.renderOnly());
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
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

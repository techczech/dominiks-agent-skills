// Loads a widget in headless Chromium and prints label/point/leader geometry as JSON.
// Usage: PLAYWRIGHT_CORE=<path to playwright-core> CHROME_HEADLESS_SHELL=<path> node render_probe.cjs <widget.html> [width height]
const { env } = process;
const { chromium } = require(env.PLAYWRIGHT_CORE);
(async () => {
  const [file, w, h] = [process.argv[2], +(process.argv[3] || 1280), +(process.argv[4] || 720)];
  const browser = await chromium.launch({ executablePath: env.CHROME_HEADLESS_SHELL });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file);
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => ({
    labels: [...document.querySelectorAll('[data-role=label]')].map(t => { const b = t.getBBox(); return { model: t.dataset.model, ax: +t.dataset.ax, ay: +t.dataset.ay, box: [b.x, b.y, b.x + b.width, b.y + b.height] }; }),
    points: [...document.querySelectorAll('g[data-px]')].map(g => ({ model: g.dataset.model, px: +g.dataset.px, py: +g.dataset.py })),
    leaders: [...document.querySelectorAll('[data-role=leader]')].map(l => ({ model: l.dataset.model, x1: +l.dataset.x1, y1: +l.dataset.y1 })),
  }));
  out.errors = errors;
  console.log(JSON.stringify(out));
  await browser.close();
})();

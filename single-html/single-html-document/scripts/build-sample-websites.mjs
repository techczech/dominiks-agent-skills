#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const sourceRoot = path.join(repoRoot, "examples/sources");
const outputRoot = path.join(repoRoot, "examples/generated");

const textDecoder = new TextDecoder();

async function main() {
  const requested = process.argv.slice(2);
  const slugs = requested.length ? requested : await listDirs(sourceRoot);
  await mkdir(outputRoot, { recursive: true });

  const manifest = [];
  for (const slug of slugs) {
    const sourceDir = path.join(sourceRoot, slug);
    const sourceInfo = await stat(sourceDir).catch(() => null);
    if (!sourceInfo?.isDirectory()) {
      throw new Error(`Missing sample source folder: ${sourceDir}`);
    }
    const result = await buildSample(sourceDir, slug);
    manifest.push(result);
    console.log(`built ${slug}`);
    console.log(`  normal: ${result.normalIndex}`);
    console.log(`  single: ${result.singleFile} (${formatBytes(result.singleSize)})`);
  }

  await writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), samples: manifest }, null, 2)}\n`,
  );
}

async function buildSample(sourceDir, slug) {
  const site = JSON.parse(await readFile(path.join(sourceDir, "site.json"), "utf8"));
  const pageFiles = (await readdir(path.join(sourceDir, "pages")))
    .filter((name) => name.endsWith(".md"))
    .sort();
  if (!pageFiles.length) {
    throw new Error(`No Markdown pages found for ${slug}`);
  }

  const pages = [];
  const seenIds = new Set();
  for (const fileName of pageFiles) {
    const sourcePath = path.join(sourceDir, "pages", fileName);
    const raw = await readFile(sourcePath, "utf8");
    const parsed = parseFrontmatter(raw);
    const id = parsed.data.id || slugify(parsed.data.title || fileName.replace(/\.md$/, ""));
    if (seenIds.has(id)) {
      throw new Error(`Duplicate page id "${id}" in ${sourcePath}`);
    }
    seenIds.add(id);
    if (!parsed.data.title) {
      throw new Error(`Missing required front matter "title" in ${sourcePath}`);
    }
    pages.push({
      id,
      title: parsed.data.title,
      section: parsed.data.section || id,
      kind: parsed.data.kind || "narrative",
      priority: parsed.data.priority || "medium",
      fileName,
      sourcePath: path.relative(sourceDir, sourcePath),
      sourceText: raw,
      html: renderMarkdown(parsed.body),
      plainText: markdownToPlainText(parsed.body),
    });
  }

  const attachments = await buildAttachments(sourceDir, site.attachments || []);
  const searchIndex = pages.map((page) => ({
    id: page.id,
    title: page.title,
    section: page.section,
    text: `${page.title} ${page.plainText}`.replace(/\s+/g, " ").trim(),
  }));

  const outDir = path.join(outputRoot, slug);
  const normalDir = path.join(outDir, "site");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(normalDir, { recursive: true });

  const css = buildCss(site.design);
  const js = buildRuntimeJs();
  const body = buildBody({ site, slug, pages, attachments, searchIndex });
  const normalHtml = buildDocument({
    title: site.title,
    body,
    cssHref: "styles.css",
    jsSrc: "app.js",
    attachments,
    searchIndex,
  });
  const singleHtml = buildDocument({
    title: site.title,
    body,
    inlineCss: css,
    inlineJs: js,
    attachments,
    searchIndex,
  });

  await writeFile(path.join(normalDir, "index.html"), normalHtml);
  await writeFile(path.join(normalDir, "styles.css"), css);
  await writeFile(path.join(normalDir, "app.js"), js);
  await writeFile(path.join(outDir, `${slug}.single.html`), singleHtml);

  const singleFile = path.join(outDir, `${slug}.single.html`);
  const singleStats = await stat(singleFile);
  return {
    slug,
    title: site.title,
    design: site.design,
    normalIndex: toRepoRelative(path.join(normalDir, "index.html")),
    singleFile: toRepoRelative(singleFile),
    singleSize: singleStats.size,
    pageCount: pages.length,
    attachmentCount: attachments.length,
  };
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

async function listDirs(dir) {
  const names = await readdir(dir);
  const dirs = [];
  for (const name of names) {
    const sourceDir = path.join(dir, name);
    const pagesDir = path.join(sourceDir, "pages");
    const sourceInfo = await stat(sourceDir);
    const pagesInfo = await stat(pagesDir).catch(() => null);
    if (sourceInfo.isDirectory() && pagesInfo?.isDirectory()) {
      dirs.push(name);
    }
  }
  return dirs.sort();
}

async function buildAttachments(sourceDir, attachmentSpecs) {
  const records = [];
  const seen = new Set();
  for (const spec of attachmentSpecs) {
    if (!spec.id || !spec.path) {
      throw new Error(`Attachment needs id and path: ${JSON.stringify(spec)}`);
    }
    if (seen.has(spec.id)) {
      throw new Error(`Duplicate attachment id "${spec.id}"`);
    }
    seen.add(spec.id);
    const absolutePath = path.join(sourceDir, spec.path);
    const bytes = await readFile(absolutePath);
    records.push({
      id: spec.id,
      label: spec.label || path.basename(spec.path),
      description: spec.description || "",
      filename: path.basename(spec.path),
      mimeType: mimeTypeFor(spec.path),
      encoding: "base64",
      size: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      payload: bytes.toString("base64"),
    });
  }
  return records;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) {
    return { data: {}, body: raw };
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("Front matter starts with --- but never closes");
  }
  const header = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const data = {};
  for (const line of header.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      throw new Error(`Invalid front matter line: ${line}`);
    }
    data[match[1]] = unquote(match[2].trim());
  }
  return { data, body };
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(`<pre><code${lang ? ` class="language-${escapeAttr(lang)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length + 1;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (isTableStart(lines, i)) {
      const tableLines = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !isTableStart(lines, i) &&
      !lines[i].startsWith("```")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return html.join("\n");
}

function isTableStart(lines, i) {
  return /^\s*\|.*\|\s*$/.test(lines[i] || "") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1] || "");
}

function renderTable(tableLines) {
  const rows = tableLines
    .filter((_, index) => index !== 1)
    .map((row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
  const [head, ...body] = rows;
  return `<div class="table-wrap"><table><thead><tr>${head
    .map((cell) => `<th>${renderInline(cell)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function renderInline(text) {
  const tokens = [];
  let rendered = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    const key = `@@CODE${tokens.length}@@`;
    tokens.push(`<code>${code}</code>`);
    return key;
  });
  rendered = rendered
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  for (const [index, token] of tokens.entries()) {
    rendered = rendered.replace(`@@CODE${index}@@`, token);
  }
  return rendered;
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|[\]()]/g, " ")
    .replace(/^- /gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBody({ site, slug, pages, attachments, searchIndex }) {
  const nav = pages
    .map((page) => `<a href="#${page.id}" data-nav>${escapeHtml(page.title)}</a>`)
    .join("");
  const pageSections = pages
    .map(
      (page, index) => `
      <section class="content-section" id="${page.id}" data-search-target data-section-kind="${escapeAttr(page.kind)}">
        <div class="section-kicker">${escapeHtml(page.kind)} / ${escapeHtml(page.priority)}</div>
        <h2>${escapeHtml(page.title)}</h2>
        <div class="prose">${page.html}</div>
        ${buildSectionExtra(site, page, index)}
      </section>`,
    )
    .join("");
  const attachmentHtml = attachments
    .map(
      (item) => `
      <article class="artifact-row">
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.description)}</span>
          <small>${escapeHtml(item.filename)} / ${formatBytes(item.size)} / sha256 ${item.sha256.slice(0, 12)}</small>
        </div>
        <button type="button" data-attachment-id="${escapeAttr(item.id)}">Download</button>
      </article>`,
    )
    .join("");
  const sourceAppendix = pages
    .map(
      (page) => `
      <details class="source-card" data-search-target>
        <summary>${escapeHtml(page.title)} <span>${escapeHtml(page.sourcePath)}</span></summary>
        <pre>${escapeHtml(page.sourceText)}</pre>
      </details>`,
    )
    .join("");

  return `
    <div class="app-shell ${escapeAttr(site.design)}" data-sample="${escapeAttr(slug)}">
      <aside class="rail">
        <div class="brand-mark">${escapeHtml((site.navigationLabel || site.title).slice(0, 2).toUpperCase())}</div>
        <div>
          <p class="eyebrow">${escapeHtml(site.navigationLabel || "Single HTML")}</p>
          <h1>${escapeHtml(site.title)}</h1>
          <p class="lede">${escapeHtml(site.subtitle || "")}</p>
        </div>
        <label class="search-box">
          <span>Search</span>
          <input type="search" data-site-search placeholder="Filter report text">
        </label>
        <nav>${nav}<a href="#attachments" data-nav>Artifacts</a><a href="#sources" data-nav>Sources</a></nav>
      </aside>
      <main>
        ${buildHero(site)}
        ${pageSections}
        <section class="content-section artifact-section" id="attachments">
          <div class="section-kicker">embedded artifacts</div>
          <h2>Downloads</h2>
          <p>Artifacts are embedded as Base64 records and materialized as Blob downloads. Narrative and source text is rendered in the page instead of being hidden in text-file downloads.</p>
          <div class="artifact-list">${attachmentHtml}</div>
        </section>
        <section class="content-section source-section" id="sources">
          <div class="section-kicker">incorporated local text</div>
          <h2>Source Appendix</h2>
          <p>These are the local Markdown source files used to build the page. They are searchable and inspectable inside the final HTML artifact.</p>
          ${sourceAppendix}
        </section>
      </main>
    </div>
    <script type="application/json" id="single-html-search-index">${escapeHtml(JSON.stringify(searchIndex))}</script>`;
}

function buildHero(site) {
  if (site.design === "dashboard") {
    const metrics = (site.metrics || [])
      .map(
        (metric) => `
        <article class="metric ${escapeAttr(metric.tone || "neutral")}">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
          <em>${escapeHtml(metric.delta)}</em>
        </article>`,
      )
      .join("");
    const bars = (site.chart || [])
      .map(
        (bar) => `
        <div class="bar-row">
          <span>${escapeHtml(bar.label)}</span>
          <div><i style="width: ${Number(bar.value) || 0}%"></i></div>
          <b>${Number(bar.value) || 0}</b>
        </div>`,
      )
      .join("");
    return `<section class="hero-panel"><div class="metric-grid">${metrics}</div><div class="chart-panel"><h2>Workflow adoption</h2>${bars}</div></section>`;
  }

  if (site.design === "briefing") {
    const timeline = (site.timeline || [])
      .map(
        (item) => `
        <article class="timeline-item">
          <time>${escapeHtml(item.time)}</time>
          <div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></div>
        </article>`,
      )
      .join("");
    return `<section class="hero-panel briefing-hero"><div><p class="eyebrow">Workshop microsite</p><h2>${escapeHtml(site.audience || "Audience")}</h2><p>${escapeHtml(site.subtitle || "")}</p></div><div class="timeline">${timeline}</div></section>`;
  }

  const figures = (site.figures || [])
    .map(
      (figure, index) => `
      <article class="figure-card" data-filter-card="${escapeAttr(figure.category)}">
        <img src="${figureImageDataUri(figure.label, figure.category, index)}" alt="${escapeAttr(figure.label)} visual">
        <div><span>${escapeHtml(figure.category)}</span><strong>${escapeHtml(figure.label)}</strong><em>${Number(figure.score) || 0}/100</em></div>
      </article>`,
    )
    .join("");
  return `<section class="hero-panel gallery-hero"><div class="filter-bar"><button type="button" data-filter-value="all" class="active">All</button><button type="button" data-filter-value="quality">Quality</button><button type="button" data-filter-value="limits">Limits</button><button type="button" data-filter-value="governance">Governance</button></div><div class="figure-grid">${figures}</div></section>`;
}

function buildSectionExtra(site, page, index) {
  if (site.design === "dashboard" && page.kind === "evidence") {
    return `<div class="callout-grid"><div><strong>Signal</strong><span>Shared examples outperform generic training.</span></div><div><strong>Build response</strong><span>Render source trail and search in the packaged file.</span></div></div>`;
  }
  if (site.design === "briefing" && page.kind === "cards") {
    return `<div class="prompt-strip"><button type="button">Scope</button><button type="button">Evidence</button><button type="button">Privacy</button><button type="button">Review</button></div>`;
  }
  if (site.design === "gallery") {
    return `<figure class="inline-visual"><img src="${figureImageDataUri(page.title, page.kind, index + 4)}" alt="${escapeAttr(page.title)} abstract evidence visual"><figcaption>${escapeHtml(page.title)} source-linked figure placeholder.</figcaption></figure>`;
  }
  return "";
}

function buildDocument({ title, body, cssHref, jsSrc, inlineCss, inlineJs, attachments, searchIndex }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="${faviconDataUri()}">
  ${cssHref ? `<link rel="stylesheet" href="${cssHref}">` : `<style>${inlineCss}</style>`}
</head>
<body>
${body}
<script>window.__ATTACHMENTS__ = ${JSON.stringify(attachments)}; window.__SEARCH_INDEX__ = ${JSON.stringify(searchIndex)};</script>
${jsSrc ? `<script src="${jsSrc}"></script>` : `<script>${inlineJs}</script>`}
</body>
</html>
`;
}

function buildRuntimeJs() {
  return `(() => {
  const attachments = new Map((window.__ATTACHMENTS__ || []).map((item) => [item.id, item]));
  const objectUrls = new Map();

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function getAttachmentUrl(record) {
    if (objectUrls.has(record.id)) return objectUrls.get(record.id);
    const blob = new Blob([base64ToBytes(record.payload)], { type: record.mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    objectUrls.set(record.id, url);
    return url;
  }

  document.addEventListener("click", (event) => {
    const downloadButton = event.target.closest("[data-attachment-id]");
    if (downloadButton) {
      const record = attachments.get(downloadButton.dataset.attachmentId);
      if (!record) return;
      const link = document.createElement("a");
      link.href = getAttachmentUrl(record);
      link.download = record.filename || record.id;
      document.body.append(link);
      link.click();
      link.remove();
      return;
    }

    const filterButton = event.target.closest("[data-filter-value]");
    if (filterButton) {
      const value = filterButton.dataset.filterValue;
      document.querySelectorAll("[data-filter-value]").forEach((button) => button.classList.toggle("active", button === filterButton));
      document.querySelectorAll("[data-filter-card]").forEach((card) => {
        card.hidden = value !== "all" && card.dataset.filterCard !== value;
      });
    }
  });

  const search = document.querySelector("[data-site-search]");
  if (search) {
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-search-target]").forEach((node) => {
        node.hidden = query.length > 1 && !node.textContent.toLowerCase().includes(query);
      });
    });
  }

  window.addEventListener("pagehide", () => {
    for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    objectUrls.clear();
  });
})();`;
}

function buildCss(design) {
  const palette = {
    dashboard: {
      bg: "#f5f7fb",
      panel: "#ffffff",
      text: "#172033",
      muted: "#61708a",
      accent: "#2563eb",
      line: "#dbe3ef",
      rail: "#101827",
    },
    briefing: {
      bg: "#f7f4ed",
      panel: "#fffdf8",
      text: "#1e2d2b",
      muted: "#66746f",
      accent: "#0f766e",
      line: "#ded8ca",
      rail: "#102522",
    },
    gallery: {
      bg: "#151515",
      panel: "#f8f5ef",
      text: "#191919",
      muted: "#6b665e",
      accent: "#dc2626",
      line: "#d8d0c3",
      rail: "#0b0b0b",
    },
  }[design] || {
    bg: "#f5f7fb",
    panel: "#ffffff",
    text: "#172033",
    muted: "#61708a",
    accent: "#2563eb",
    line: "#dbe3ef",
    rail: "#101827",
  };

  return `:root {
  color-scheme: light;
  --bg: ${palette.bg};
  --panel: ${palette.panel};
  --text: ${palette.text};
  --muted: ${palette.muted};
  --accent: ${palette.accent};
  --line: ${palette.line};
  --rail: ${palette.rail};
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  line-height: 1.55;
}
a { color: inherit; }
button, input { font: inherit; }
button { cursor: pointer; }

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 330px) minmax(0, 1fr);
}

.rail {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px;
  background: var(--rail);
  color: #f8fafc;
  overflow: auto;
}

.brand-mark {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 8px;
  font-weight: 800;
  background: var(--accent);
}

.eyebrow, .section-kicker {
  margin: 0 0 8px;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 760;
  letter-spacing: .08em;
  color: var(--accent);
}

.rail h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.05;
}

.lede {
  margin: 12px 0 0;
  color: rgba(248,250,252,.78);
}

.search-box {
  display: grid;
  gap: 8px;
  color: rgba(248,250,252,.72);
  font-size: 13px;
}

.search-box input {
  width: 100%;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.08);
  color: #fff;
  border-radius: 8px;
  padding: 11px 12px;
  outline: none;
}

.search-box input::placeholder { color: rgba(255,255,255,.5); }

nav {
  display: grid;
  gap: 6px;
}

nav a {
  padding: 9px 10px;
  border-radius: 8px;
  color: rgba(248,250,252,.78);
  text-decoration: none;
}

nav a:hover { background: rgba(255,255,255,.1); color: #fff; }

main {
  width: min(1120px, calc(100vw - 330px));
  margin: 0 auto;
  padding: 32px;
}

.hero-panel, .content-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-bottom: 22px;
  box-shadow: 0 18px 50px rgba(15,23,42,.08);
}

.hero-panel { padding: 22px; }
.content-section { padding: 30px; }
.content-section h2, .hero-panel h2 {
  margin: 0 0 12px;
  font-size: 28px;
  line-height: 1.15;
}
.prose > *:first-child { margin-top: 0; }
.prose > *:last-child { margin-bottom: 0; }
.prose h3 { margin: 28px 0 10px; font-size: 19px; }
.prose p, .content-section p { color: var(--muted); }
.prose li { margin: 6px 0; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { border-bottom: 1px solid var(--line); padding: 12px; text-align: left; vertical-align: top; }
th { color: var(--text); background: color-mix(in srgb, var(--accent) 7%, transparent); }

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.metric {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  display: grid;
  gap: 5px;
}
.metric span, .artifact-row span, .timeline span, .figure-card span, figcaption { color: var(--muted); }
.metric strong { font-size: 34px; line-height: 1; }
.metric em { color: var(--accent); font-style: normal; font-weight: 700; }
.metric.critical em { color: #b91c1c; }
.metric.warning em { color: #a16207; }

.chart-panel {
  border-top: 1px solid var(--line);
  padding-top: 18px;
}
.bar-row {
  display: grid;
  grid-template-columns: 140px 1fr 44px;
  align-items: center;
  gap: 12px;
  margin: 10px 0;
}
.bar-row div {
  height: 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  overflow: hidden;
}
.bar-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.callout-grid, .prompt-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}
.callout-grid div {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  display: grid;
  gap: 5px;
}
.callout-grid span { color: var(--muted); }

.briefing-hero {
  display: grid;
  grid-template-columns: .85fr 1.15fr;
  gap: 24px;
  align-items: stretch;
}
.timeline { display: grid; gap: 10px; }
.timeline-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
}
.timeline time { font-weight: 800; color: var(--accent); }
.timeline div { display: grid; gap: 4px; }
.prompt-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.prompt-strip button, .filter-bar button, .artifact-row button {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 9%, var(--panel));
  color: var(--text);
  min-height: 40px;
  font-weight: 720;
}

.gallery-hero { display: grid; gap: 18px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; }
.filter-bar button { padding: 8px 12px; background: transparent; }
.filter-bar button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.figure-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.figure-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.figure-card img, .inline-visual img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
.figure-card div {
  padding: 12px;
  display: grid;
  gap: 4px;
}
.figure-card strong { line-height: 1.2; }
.figure-card em { font-style: normal; color: var(--accent); font-weight: 800; }
.inline-visual {
  margin: 22px 0 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.inline-visual figcaption { padding: 10px 12px; font-size: 13px; }

.artifact-list { display: grid; gap: 10px; }
.artifact-row {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: center;
}
.artifact-row div { display: grid; gap: 3px; }
.artifact-row small { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.artifact-row button { padding: 0 14px; }

.source-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-top: 10px;
  background: color-mix(in srgb, var(--accent) 4%, var(--panel));
}
.source-card summary {
  cursor: pointer;
  padding: 13px 14px;
  font-weight: 760;
}
.source-card summary span { color: var(--muted); font-weight: 500; margin-left: 8px; }
.source-card pre {
  margin: 0;
  padding: 14px;
  max-height: 360px;
  overflow: auto;
  border-top: 1px solid var(--line);
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.45;
}

[hidden] { display: none !important; }

@media (max-width: 900px) {
  .app-shell { display: block; }
  .rail { position: relative; height: auto; }
  main { width: 100%; padding: 18px; }
  .metric-grid, .figure-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .briefing-hero, .callout-grid { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .rail { padding: 22px; }
  .rail h1 { font-size: 25px; }
  .content-section, .hero-panel { padding: 20px; }
  .metric-grid, .figure-grid, .prompt-strip { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 1fr; gap: 5px; }
  .artifact-row { grid-template-columns: 1fr; }
}

@media print {
  .rail, .search-box, .filter-bar, button { display: none !important; }
  .app-shell, main { display: block; width: auto; padding: 0; }
  .hero-panel, .content-section { box-shadow: none; break-inside: avoid; }
  body { background: #fff; }
}`;
}

function figureImageDataUri(label, category, index) {
  const colors = [
    ["#0f766e", "#f7f4ed", "#111827"],
    ["#2563eb", "#f5f7fb", "#101827"],
    ["#dc2626", "#fff7ed", "#1c1917"],
    ["#7c3aed", "#f8fafc", "#111827"],
    ["#0f172a", "#e0f2fe", "#1d4ed8"],
    ["#b45309", "#fef3c7", "#1f2937"],
  ][index % 6];
  const safeLabel = escapeHtml(label);
  const safeCategory = escapeHtml(category);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
<rect width="960" height="720" fill="${colors[1]}"/>
<circle cx="160" cy="160" r="118" fill="${colors[0]}" opacity=".16"/>
<circle cx="780" cy="130" r="150" fill="${colors[0]}" opacity=".12"/>
<path d="M0 520 C180 430 280 620 470 500 S760 340 960 450 V720 H0 Z" fill="${colors[0]}" opacity=".2"/>
<rect x="92" y="92" width="776" height="536" rx="26" fill="white" opacity=".9"/>
<path d="M150 500 L320 330 L455 430 L610 245 L790 500 Z" fill="${colors[0]}" opacity=".82"/>
<text x="150" y="185" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="${colors[2]}">${safeLabel}</text>
<text x="150" y="238" font-family="Arial, sans-serif" font-size="24" fill="${colors[2]}" opacity=".72">${safeCategory}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function faviconDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111827"/><path d="M16 18h32v7H16zm0 13h32v7H16zm0 13h20v7H16z" fill="#f8fafc"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") return "text/csv;charset=utf-8";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".json") return "application/json";
  if (ext === ".txt" || ext === ".md") return "text/plain;charset=utf-8";
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === ".pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return "application/octet-stream";
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

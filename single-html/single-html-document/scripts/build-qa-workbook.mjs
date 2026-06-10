#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const sourceDir = path.join(repoRoot, "examples/sources/qa-workbook");
const outputDir = path.join(repoRoot, "examples/generated/qa-workbook");
const siteDir = path.join(outputDir, "site");

async function main() {
  const site = JSON.parse(await fs.readFile(path.join(sourceDir, "site.json"), "utf8"));
  const plan = await buildPlan(site);

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(siteDir, { recursive: true });

  const css = buildCss();
  const runtime = buildRuntime();
  const body = buildBody(plan);

  const siteHtml = buildDocument({
    title: plan.title,
    body,
    cssHref: "styles.css",
    jsSrc: "app.js",
  });
  const singleHtml = buildDocument({
    title: plan.title,
    body,
    inlineCss: css,
    inlineJs: runtime,
  });

  await fs.writeFile(path.join(siteDir, "index.html"), siteHtml);
  await fs.writeFile(path.join(siteDir, "styles.css"), css);
  await fs.writeFile(path.join(siteDir, "app.js"), runtime);
  await fs.writeFile(path.join(outputDir, "qa-workbook.single.html"), singleHtml);

  console.log(`built qa-workbook`);
  console.log(`  normal: ${path.relative(repoRoot, path.join(siteDir, "index.html"))}`);
  console.log(`  single: ${path.relative(repoRoot, path.join(outputDir, "qa-workbook.single.html"))}`);
}

async function buildPlan(site) {
  const planPath = path.join(sourceDir, site.sourcePlan || "plan.md");
  const screenshotsPath = path.join(sourceDir, site.screenshotManifest || "screenshots.json");
  const raw = await fs.readFile(planPath, "utf8");
  const screenshots = JSON.parse(await fs.readFile(screenshotsPath, "utf8"));
  const { frontmatter, body } = parseFrontmatter(raw);
  const { intro, tail, sections } = splitSections(body);
  const introData = parseIntro(intro);
  const parsedSections = await Promise.all(
    sections.map(async (section) => {
      const parsed = parseSection(section.title, section.body);
      parsed.expectedScreenshots = await loadScreenshotsForSection(parsed.id, screenshots);
      return parsed;
    }),
  );
  return {
    id: frontmatter.id || "qa-workbook",
    title: frontmatter.title || introData.title || "QA Workbook",
    date: String(frontmatter.date || ""),
    updated: String(frontmatter.updated || ""),
    sourcePath: path.relative(repoRoot, planPath),
    generatedAt: new Date().toISOString(),
    recipientName: site.recipientName || "reply to the sender of this file",
    recipientEmail: site.recipientEmail || "",
    intro: introData,
    sections: parsedSections,
    followUpItems: parseTail(tail),
  };
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) {
    throw new Error("Expected markdown file with YAML front matter.");
  }
  const split = raw.indexOf("\n---\n", 4);
  if (split === -1) {
    throw new Error("Front matter never closes.");
  }
  const header = raw.slice(4, split).trim();
  const body = raw.slice(split + 5).replace(/^\n/, "");
  const frontmatter = {};
  for (const line of header.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    frontmatter[match[1]] = unquote(match[2].trim());
  }
  return { frontmatter, body };
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

function splitSections(body) {
  const qaMatrixMatch = body.match(/^## QA Matrix$/m);
  if (!qaMatrixMatch) {
    throw new Error("Could not find QA Matrix heading.");
  }
  const qaStart = qaMatrixMatch.index;
  const intro = body.slice(0, qaStart).trim();
  const matrixAndTail = body.slice(qaStart + qaMatrixMatch[0].length).trimStart();
  const tailMatch = matrixAndTail.match(/^## Open Follow-Up Items After This QA Pass$/m);
  const matrix = tailMatch ? matrixAndTail.slice(0, tailMatch.index).trim() : matrixAndTail.trim();
  const tail = tailMatch ? matrixAndTail.slice(tailMatch.index).trim() : "";
  const sectionMatches = Array.from(matrix.matchAll(/^###\s+(.+)$/gm));
  const sections = sectionMatches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < sectionMatches.length ? sectionMatches[index + 1].index : matrix.length;
    return {
      title: match[1].trim(),
      body: matrix.slice(start, end).trim(),
    };
  });
  return { intro, tail, sections };
}

function parseIntro(intro) {
  const lines = intro.split(/\r?\n/).map((line) => line.replace(/\s+$/, ""));
  let title = "";
  const summaryParagraphs = [];
  const metadata = [];
  const steps = [];
  const notes = [];
  let heading = "";

  for (let index = 0; index < lines.length; ) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      index += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      heading = line.slice(3).trim();
      index += 1;
      continue;
    }
    if (heading === "How To Run This QA Pass") {
      const numbered = line.match(/^\d+\.\s+(.*)$/);
      const bullet = line.match(/^-\s+(.*)$/);
      if (numbered) {
        steps.push(numbered[1].trim());
        index += 1;
        continue;
      }
      if (bullet) {
        notes.push(bullet[1].trim());
        index += 1;
        continue;
      }
      if (line.endsWith(":")) {
        index += 1;
        continue;
      }
    }
    if (line.endsWith(":")) {
      const label = line.slice(0, -1).trim();
      const values = [];
      index += 1;
      while (index < lines.length) {
        const candidate = lines[index].trim();
        if (!candidate) {
          index += 1;
          if (values.length) break;
          continue;
        }
        if (candidate.startsWith("## ") || candidate.startsWith("# ")) break;
        const bullet = candidate.match(/^-\s+(.*)$/);
        if (!bullet) break;
        let value = bullet[1].trim();
        index += 1;
        while (index < lines.length) {
          const continuation = lines[index].trim();
          if (!continuation) break;
          if (continuation.startsWith("## ") || continuation.startsWith("# ")) break;
          if (/^-\s+/.test(continuation)) break;
          if (continuation.endsWith(":")) break;
          value += ` ${continuation}`;
          index += 1;
        }
        values.push(cleanInline(value));
      }
      metadata.push({ label, values });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || candidate.startsWith("# ") || candidate.startsWith("## ") || candidate.endsWith(":")) break;
      paragraph.push(candidate);
      index += 1;
    }
    summaryParagraphs.push(paragraph.join(" "));
  }

  return { title, summaryParagraphs, metadata, steps, notes };
}

const SECTION_LABELS = new Set([
  "Original",
  "Original reference",
  "Deployed",
  "Additional deployed check",
  "Backlog",
  "How to test",
  "Review steps",
  "Expected outcome",
  "Purpose of the change",
  "Note",
  "Review note",
]);

function parseSection(title, block) {
  const lines = block.split(/\r?\n/).map((line) => line.replace(/\s+$/, ""));
  const links = [];
  let howToTest = [];
  let expectedOutcome = [];
  let notes = [];
  let purpose = [];

  for (let index = 0; index < lines.length; ) {
    const stripped = lines[index].trim();
    if (!stripped) {
      index += 1;
      continue;
    }

    let headingCandidate = stripped.startsWith("- ") ? stripped.slice(2).trim() : stripped;
    if (headingCandidate.endsWith(":")) {
      const label = headingCandidate.slice(0, -1).trim();
      if (SECTION_LABELS.has(label)) {
        index += 1;
        if (["Original", "Original reference", "Deployed", "Additional deployed check", "Backlog"].includes(label)) {
          const parsed = parseBulletList(lines, index);
          parsed.items.forEach((item) => links.push({ group: label, ...extractLinkValue(item) }));
          index = parsed.nextIndex;
          continue;
        }
        if (label === "How to test" || label === "Review steps") {
          const parsed = parseNumberedList(lines, index);
          howToTest = parsed.items;
          index = parsed.nextIndex;
          continue;
        }
        if (label === "Expected outcome") {
          const parsed = parseBulletList(lines, index);
          expectedOutcome = parsed.items;
          index = parsed.nextIndex;
          continue;
        }
        if (label === "Purpose of the change") {
          const parsed = parseBulletList(lines, index);
          purpose = parsed.items;
          index = parsed.nextIndex;
          continue;
        }
        if (label === "Note" || label === "Review note") {
          const parsed = parseBulletList(lines, index);
          notes = parsed.items;
          index = parsed.nextIndex;
          continue;
        }
      }
    }

    index += 1;
  }

  return {
    id: sectionIdFromTitle(title),
    title,
    originalLinks: links.filter((item) => item.group === "Original" || item.group === "Original reference"),
    deployedLinks: links.filter((item) => item.group === "Deployed" || item.group === "Additional deployed check"),
    backlogLinks: links.filter((item) => item.group === "Backlog"),
    purpose,
    howToTest,
    expectedOutcome,
    notes,
  };
}

function parseBulletList(lines, startIndex) {
  const items = [];
  let index = startIndex;
  while (index < lines.length) {
    const stripped = lines[index].trim();
    if (!stripped) {
      index += 1;
      if (items.length) break;
      continue;
    }
    const bullet = stripped.match(/^-\s+(.*)$/);
    if (!bullet) break;
    const first = bullet[1].trim();
    if (first.endsWith(":") && SECTION_LABELS.has(first.slice(0, -1).trim())) break;
    let text = first;
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index];
      const candidateStripped = candidate.trim();
      if (!candidateStripped) {
        index += 1;
        break;
      }
      if (candidateStripped.startsWith("## ") || candidateStripped.startsWith("# ")) break;
      const nextBullet = candidateStripped.match(/^-\s+(.*)$/);
      if (nextBullet) {
        const nextText = nextBullet[1].trim();
        if (nextText.endsWith(":") && SECTION_LABELS.has(nextText.slice(0, -1).trim())) break;
        break;
      }
      if (candidateStripped.endsWith(":") && SECTION_LABELS.has(candidateStripped.slice(0, -1).trim())) break;
      text += ` ${candidateStripped}`;
      index += 1;
    }
    items.push(text);
  }
  return { items, nextIndex: index };
}

function parseNumberedList(lines, startIndex) {
  const items = [];
  let index = startIndex;
  while (index < lines.length) {
    const stripped = lines[index].trim();
    if (!stripped) {
      index += 1;
      if (items.length) break;
      continue;
    }
    const numbered = stripped.match(/^\d+\.\s+(.*)$/);
    if (!numbered) break;
    const item = { text: numbered[1].trim(), subitems: [] };
    index += 1;
    while (index < lines.length) {
      const continuation = lines[index];
      const trimmed = continuation.trim();
      if (!trimmed) break;
      const sub = continuation.match(/^\s+-\s+(.*)$/);
      if (sub) {
        item.subitems.push(sub[1].trim());
        index += 1;
        continue;
      }
      if (continuation.startsWith("   ") && !/^\d+\.\s+/.test(trimmed)) {
        item.text += ` ${trimmed}`;
        index += 1;
        continue;
      }
      break;
    }
    items.push(item);
  }
  return { items, nextIndex: index };
}

function extractLinkValue(text) {
  const cleaned = cleanInline(text);
  if (/^https?:\/\//.test(cleaned)) {
    return { type: "url", value: cleaned, label: cleaned };
  }
  return { type: "text", value: cleaned, label: cleaned };
}

function cleanInline(value) {
  if (value.startsWith("`") && value.endsWith("`")) {
    return value.slice(1, -1).trim();
  }
  return value.trim();
}

function sectionIdFromTitle(title) {
  const numbered = title.match(/^(\d+)\./);
  if (numbered) return numbered[1];
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseTail(tail) {
  return tail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => cleanInline(line.replace(/^-\s+/, "")));
}

async function loadScreenshotsForSection(sectionId, manifest) {
  const entries = manifest?.[sectionId];
  if (!Array.isArray(entries)) return [];
  const resolved = [];
  for (const entry of entries) {
    const imagePath = path.resolve(sourceDir, entry.path);
    const bytes = await fs.readFile(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "image/png";
    resolved.push({
      caption: entry.caption || path.basename(imagePath),
      dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
    });
  }
  return resolved;
}

function buildBody(plan) {
  return `
    <div id="app" class="qa-workbook-shell"></div>
    <script type="application/json" id="qa-workbook-data">${jsonForScript(plan)}</script>
  `;
}

function buildDocument({ title, body, cssHref, jsSrc, inlineCss, inlineJs }) {
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
${jsSrc ? `<script src="${jsSrc}"></script>` : `<script>${inlineJs}</script>`}
</body>
</html>
`;
}

function faviconDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f172a"/><path d="M18 19h28M18 31h28M18 43h17" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/><circle cx="46" cy="43" r="5" fill="#38bdf8"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildRuntime() {
  return String.raw`(() => {
  const dataEl = document.getElementById("qa-workbook-data");
  if (!dataEl) return;
  const PLAN = JSON.parse(dataEl.textContent || "{}");
  const STORAGE_KEY = "qa-workbook:" + PLAN.id;
  const STATUS_OPTIONS = [
    { value: "", label: "Not started" },
    { value: "pass", label: "Works well" },
    { value: "partial", label: "Possible improvement" },
    { value: "fail", label: "Needs a fix" },
    { value: "not-tested", label: "Not tested" },
  ];

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeStorage() {
    try {
      const key = "__qa_workbook_probe__";
      window.localStorage.setItem(key, "ok");
      window.localStorage.removeItem(key);
      return window.localStorage;
    } catch (_) {
      try {
        const key = "__qa_workbook_probe__";
        window.sessionStorage.setItem(key, "ok");
        window.sessionStorage.removeItem(key);
        return window.sessionStorage;
      } catch (_) {
        return null;
      }
    }
  }

  const storage = safeStorage();

  function emptyState() {
    return {
      reviewer: { name: "" },
      summary: {
        overallStatus: "",
        overallNotes: "",
      },
      sections: Object.fromEntries(
        PLAN.sections.map((section) => [
          section.id,
          { status: "", notes: "", followUp: "", screenshots: [] },
        ]),
      ),
    };
  }

  function mergeState(base, stored) {
    return {
      reviewer: { ...base.reviewer, ...(stored.reviewer || {}) },
      summary: { ...base.summary, ...(stored.summary || {}) },
      sections: Object.fromEntries(
        PLAN.sections.map((section) => [
          section.id,
          {
            ...base.sections[section.id],
            ...(stored.sections?.[section.id] || {}),
          },
        ]),
      ),
    };
  }

  function loadState() {
    const base = emptyState();
    if (!storage) return base;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return base;
      return mergeState(base, JSON.parse(raw));
    } catch (_) {
      return base;
    }
  }

  let state = loadState();
  let lastSavedAt = "";
  let activeScreenshotSection = "";

  function saveState() {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      lastSavedAt = new Date().toLocaleString();
      updateSaveState();
      return true;
    } catch (_) {
      return false;
    }
  }

  function getPath(obj, path) {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  function setPath(obj, path, value) {
    const segments = path.split(".");
    let current = obj;
    while (segments.length > 1) {
      current = current[segments.shift()];
    }
    current[segments[0]] = value;
  }

  function updateSaveState(message) {
    const el = document.getElementById("save-state");
    if (!el) return;
    if (message) {
      el.textContent = message;
      return;
    }
    if (!storage) {
      el.textContent = "Autosave unavailable in this browser context.";
      return;
    }
    el.textContent = lastSavedAt
      ? "Autosaved locally at " + lastSavedAt + "."
      : "Autosave enabled. No changes saved yet in this session.";
  }

  function sectionStatusBadge(status) {
    const normalized = status || "not-tested";
    const label = STATUS_OPTIONS.find((option) => option.value === status)?.label || "Not tested";
    return '<span class="section-badge ' + escapeHtml(normalized) + '">' + escapeHtml(label) + "</span>";
  }

  function renderLinkChip(item, label) {
    if (!item) return "";
    if (item.type === "url") {
      let host = "";
      try {
        host = new URL(item.value).hostname;
      } catch (_) {
        host = "";
      }
      return '<a class="link-chip" href="' + escapeHtml(item.value) + '" target="_blank" rel="noreferrer noopener">' +
        '<span class="link-label">Open page</span>' +
        '<span class="link-host">' + escapeHtml(host || label || item.label) + '</span>' +
        "</a>";
    }
    return '<span class="text-chip">' + escapeHtml(item.value) + "</span>";
  }

  function renderBullets(items) {
    return '<ul class="plain-list">' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + "</ul>";
  }

  function renderSteps(steps) {
    return '<ol class="steps">' + steps.map((step) => {
      const subitems = step.subitems?.length
        ? '<ul>' + step.subitems.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + "</ul>"
        : "";
      return '<li>' + escapeHtml(step.text) + subitems + '</li>';
    }).join("") + "</ol>";
  }

  function renderLinkPanel(title, items) {
    if (!items.length) {
      return '<div class="link-panel"><h3>' + escapeHtml(title) + '</h3><p class="small">No entry recorded in the source plan for this panel.</p></div>';
    }
    return '<div class="link-panel"><h3>' + escapeHtml(title) + '</h3><div class="link-chip-list">' +
      items.map((item) => renderLinkChip(item, item.label || title)).join("") +
      "</div></div>";
  }

  function renderActionBar(location) {
    const right = location === "top"
      ? '<span class="save-state" id="save-state">Autosave status will appear here.</span>'
      : '<span class="small">Use the same actions here after you finish the worksheet.</span>';
    return '<div class="action-bar" data-action-bar="' + escapeHtml(location) + '">' +
      '<button type="button" class="primary" data-action="send-feedback">Send feedback</button>' +
      '<button type="button" class="warn" data-action="clear-draft">Clear saved draft</button>' +
      right +
      '</div>';
  }

  function progressStats() {
    const total = PLAN.sections.length;
    const counts = { pass: 0, partial: 0, fail: 0, "not-tested": 0 };
    PLAN.sections.forEach((section) => {
      const status = state.sections[section.id]?.status || "not-tested";
      counts[status] = (counts[status] || 0) + 1;
    });
    const complete = counts.pass + counts.partial + counts.fail;
    return { total, complete, counts };
  }

  function renderProgressRail() {
    const stats = progressStats();
    const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
    return '<aside class="progress-rail" aria-label="QA progress">' +
      '<div class="progress-card">' +
        '<div class="progress-number">' + pct + '%</div>' +
        '<div class="progress-copy">reviewed</div>' +
        '<div class="progress-bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="progress-mini">' +
          '<span><strong>' + stats.counts.pass + '</strong> works well</span>' +
          '<span><strong>' + stats.counts.partial + '</strong> possible improvement</span>' +
          '<span><strong>' + stats.counts.fail + '</strong> needs a fix</span>' +
        '</div>' +
      '</div>' +
      '<nav class="section-nav">' +
        PLAN.sections.map((section) => {
          const status = state.sections[section.id]?.status || "not-tested";
          return '<a href="#section-' + escapeHtml(section.id) + '" class="section-nav-item ' + escapeHtml(status) + '">' +
            '<span class="nav-dot"></span>' +
            '<span class="nav-label">' + escapeHtml(section.id) + '. ' + escapeHtml(section.title.replace(/^\d+\.\s*/, "")) + '</span>' +
          '</a>';
        }).join("") +
      '</nav>' +
    '</aside>';
  }

  function renderExpectedScreenshots(section) {
    if (!section.expectedScreenshots?.length) return "";
    return '<div class="subpanel subsection-panel"><h3>Expected screenshot reference</h3><div class="screenshot-grid">' +
      section.expectedScreenshots.map((shot) => (
        '<figure class="screenshot-card">' +
          '<img src="' + shot.dataUrl + '" alt="' + escapeHtml(shot.caption) + '">' +
          '<figcaption class="screenshot-copy">' + escapeHtml(shot.caption) + '</figcaption>' +
        '</figure>'
      )).join("") +
      "</div></div>";
  }

  function renderTesterScreenshots(sectionId) {
    const screenshots = state.sections[sectionId]?.screenshots || [];
    return '<div class="subpanel subsection-panel"><h3>Tester screenshots</h3>' +
      '<p class="small">Use Add screenshot, paste an image from the clipboard, or paste a base64/data URL screenshot while this section is active.</p>' +
      '<div class="action-bar compact-actions">' +
      '<button type="button" class="mini-button" data-action="add-screenshot" data-section="' + escapeHtml(sectionId) + '">Add screenshot</button>' +
      '<button type="button" class="mini-button" data-action="paste-screenshot" data-section="' + escapeHtml(sectionId) + '">Paste screenshot</button>' +
      '<input class="hidden" type="file" accept="image/*" data-file-input="' + escapeHtml(sectionId) + '">' +
      '</div>' +
      '<div class="screenshot-grid">' +
      (screenshots.length
        ? screenshots.map((shot) => (
            '<figure class="screenshot-card tester-shot-card">' +
              '<img src="' + shot.dataUrl + '" alt="' + escapeHtml(shot.caption || shot.name || "Tester screenshot") + '">' +
              '<figcaption class="screenshot-copy">' + escapeHtml(shot.caption || shot.name || "Tester screenshot") + '</figcaption>' +
              '<div class="tester-shot-actions">' +
                '<button type="button" class="mini-button" data-action="remove-screenshot" data-section="' + escapeHtml(sectionId) + '" data-screenshot-id="' + escapeHtml(shot.id) + '">Remove</button>' +
              '</div>' +
            '</figure>'
          )).join("")
        : '<div class="small">No screenshots attached yet.</div>') +
      '</div></div>';
  }

  function renderHeader() {
    const metadata = PLAN.intro.metadata.map((entry) => (
      '<li><span class="meta-label">' + escapeHtml(entry.label) + '</span><div class="link-chip-list">' +
        entry.values.map((value) => {
          const item = /^https?:\/\//.test(value)
            ? { type: "url", value, label: value }
            : { type: "text", value, label: value };
          return renderLinkChip(item, item.label);
        }).join("") +
      '</div></li>'
    )).join("");

    const autosaveBanner = storage
      ? '<div class="banner info">This workbook saves progress automatically in your browser for this file. Screenshots are also saved in the draft state, but if you attach many large screenshots you should export JSON periodically.</div>'
      : '<div class="banner warn">Browser storage is unavailable in this file context, so autosave cannot be guaranteed. Use <strong>Send feedback</strong> regularly while you work and choose Download JSON.</div>';

    return '<header class="hero">' +
      '<div class="hero-copy">' +
        '<span class="eyebrow">Single HTML QA</span>' +
        '<h1>' + escapeHtml(PLAN.title) + '</h1>' +
        PLAN.intro.summaryParagraphs.map((paragraph) => '<p>' + escapeHtml(paragraph) + '</p>').join("") +
      '</div>' +
      '<div class="reviewer-panel">' +
        '<div class="field"><label for="reviewer-name">Tester name</label><input id="reviewer-name" data-bind="reviewer.name" placeholder="Your name"></div>' +
        renderActionBar("top") +
      '</div>' +
      '</header>' +
      '<section class="setup-grid">' +
        '<div class="setup-card"><h2>Test setup</h2>' +
          (PLAN.intro.steps.length
            ? renderSteps(PLAN.intro.steps.map((text) => ({ text, subitems: [] })))
            : "<p class='small'>No explicit run steps were parsed from the source markdown.</p>") +
          (PLAN.intro.notes.length ? '<div class="banner info inline-note">' + renderBullets(PLAN.intro.notes) + '</div>' : "") +
        '</div>' +
        '<div class="setup-card"><h2>Reference links</h2><ul class="meta-list">' + metadata + '</ul></div>' +
      '</section>' +
      autosaveBanner +
      '';
  }

  function renderStatusControl(sectionId, currentStatus) {
    return '<div class="status-control" role="group" aria-label="Section status">' +
      STATUS_OPTIONS.filter((option) => option.value).map((option) => {
        const active = option.value === currentStatus ? " active" : "";
        return '<button type="button" class="status-option ' + escapeHtml(option.value) + active + '" data-action="set-section-status" data-section="' + escapeHtml(sectionId) + '" data-status="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '</button>';
      }).join("") +
    '</div>';
  }

  function renderSection(section) {
    const response = state.sections[section.id] || { status: "", notes: "", followUp: "", screenshots: [] };
    return '<section class="section-card" id="section-' + escapeHtml(section.id) + '" data-section-id="' + escapeHtml(section.id) + '">' +
      '<div class="section-top">' +
        '<span class="section-index">' + escapeHtml(section.id) + '</span>' +
        '<div><h2 class="section-title">' + escapeHtml(section.title) + '</h2></div>' +
        sectionStatusBadge(response.status) +
      '</div>' +
      '<div class="link-grid">' +
        renderLinkPanel("Original", section.originalLinks) +
        renderLinkPanel("Deployed", section.deployedLinks) +
        renderLinkPanel("Backlog", section.backlogLinks) +
      '</div>' +
      '<div class="two-col">' +
        '<div class="subpanel"><h3>Point of this change</h3>' + renderBullets(section.purpose) + '</div>' +
        '<div class="subpanel"><h3>Review steps</h3>' + renderSteps(section.howToTest) + '</div>' +
      '</div>' +
      '<div class="two-col">' +
        '<div class="subpanel"><h3>Expected outcome</h3>' + renderBullets(section.expectedOutcome) +
          (section.notes.length ? '<div style="margin-top:14px"><h3 style="margin-bottom:8px">Notes</h3>' + renderBullets(section.notes) + '</div>' : '') +
        '</div>' +
        '<div class="subpanel feedback-guide"><h3>Your response</h3><p class="small">Choose the option that best matches what you see. Add notes only when something is confusing, wrong, or worth improving.</p></div>' +
      '</div>' +
      renderExpectedScreenshots(section) +
      renderTesterScreenshots(section.id) +
      '<div class="response-grid">' +
        '<div class="field status-field"><label>Status</label>' + renderStatusControl(section.id, response.status) + '</div>' +
        '<div class="field"><label for="followup-' + escapeHtml(section.id) + '">Follow-up item</label><input id="followup-' + escapeHtml(section.id) + '" data-section-bind="' + escapeHtml(section.id) + '.followUp" placeholder="e.g. 05 or none"></div>' +
        '<div class="field"><label for="notes-' + escapeHtml(section.id) + '">Tester notes</label><textarea id="notes-' + escapeHtml(section.id) + '" data-section-bind="' + escapeHtml(section.id) + '.notes" placeholder="Record what matched, what diverged, and whether the divergence is acceptable."></textarea></div>' +
      '</div>' +
      '</section>';
  }

  function renderFooter() {
    return '<section class="panel footer-panel">' +
      '<h2 style="margin-top:0">Open follow-up items after this QA pass</h2>' +
      renderBullets(PLAN.followUpItems) +
      '<div class="form-grid footer-form">' +
        '<div class="field"><label for="overall-status-footer">Overall status</label><select id="overall-status-footer" data-bind="summary.overallStatus">' +
          '<option value="">Select overall status</option>' +
          '<option value="ready">Ready to ship</option>' +
          '<option value="ready-with-follow-up">Ready with follow-up items</option>' +
          '<option value="not-ready">Not ready</option>' +
        '</select></div>' +
        '<div class="field full-span"><label for="overall-notes-footer">Overall notes</label><textarea id="overall-notes-footer" data-bind="summary.overallNotes" placeholder="Final summary for the project team. Keep this short and direct."></textarea></div>' +
      '</div>' +
      renderActionBar("bottom") +
      '<p class="small">Workbook source: <code>' + escapeHtml(PLAN.sourcePath) + '</code><br>Generated: ' + escapeHtml(new Date(PLAN.generatedAt).toLocaleString()) + '</p>' +
      '</section>';
  }

  function render() {
    const app = document.getElementById("app");
    app.innerHTML = renderHeader() +
      '<main class="workbench">' +
        renderProgressRail() +
        '<div class="sections">' + PLAN.sections.map((section) => renderSection(section)).join("") + '</div>' +
      '</main>' +
      renderFooter();
    bindInputs();
    updateSaveState();
  }

  function rerenderSectionBadge(sectionId) {
    const card = document.querySelector('[data-section-id="' + CSS.escape(sectionId) + '"]');
    if (!card) return;
    const badge = card.querySelector(".section-badge");
    if (!badge) return;
    badge.outerHTML = sectionStatusBadge(state.sections[sectionId]?.status || "");
  }

  function screenshotId() {
    return "shot-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
  }

  function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load screenshot preview"));
      image.src = dataUrl;
    });
  }

  async function compressDataUrl(dataUrl) {
    const image = await loadImage(dataUrl);
    const maxWidth = 1400;
    const maxHeight = 1400;
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.84);
  }

  async function addScreenshot(sectionId, name, dataUrl, caption = "") {
    const compressed = await compressDataUrl(dataUrl);
    state.sections[sectionId].screenshots.push({
      id: screenshotId(),
      name: name || "screenshot.jpg",
      caption: caption || name || "Tester screenshot",
      dataUrl: compressed,
    });
    saveState();
    render();
    updateSaveState("Added screenshot to section " + sectionId + ".");
  }

  async function addScreenshotFromBlob(sectionId, blob, name) {
    const dataUrl = await readBlobAsDataUrl(blob);
    await addScreenshot(sectionId, name, dataUrl, name);
  }

  async function addScreenshotFromText(sectionId, rawText) {
    const text = rawText.trim();
    let dataUrl = "";
    if (text.startsWith("data:image/")) {
      dataUrl = text;
    } else if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.replace(/\s+/g, "").length > 200) {
      dataUrl = "data:image/png;base64," + text.replace(/\s+/g, "");
    } else {
      throw new Error("Clipboard text does not look like an image or base64 payload.");
    }
    await addScreenshot(sectionId, "pasted-screenshot", dataUrl, "Pasted screenshot");
  }

  function removeScreenshot(sectionId, screenshotIdValue) {
    if (!sectionId || !screenshotIdValue) return;
    state.sections[sectionId].screenshots = (state.sections[sectionId].screenshots || []).filter((shot) => shot.id !== screenshotIdValue);
    saveState();
    render();
  }

  async function handlePaste(event) {
    const sectionId = activeScreenshotSection;
    if (!sectionId) return;
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const imageItem = Array.from(clipboard.items || []).find((item) => item.type.startsWith("image/"));
    try {
      if (imageItem) {
        event.preventDefault();
        const blob = imageItem.getAsFile();
        if (blob) {
          await addScreenshotFromBlob(sectionId, blob, blob.name || "clipboard-image");
          return;
        }
      }
      const text = clipboard.getData("text/plain");
      if (text && text.trim()) {
        event.preventDefault();
        await addScreenshotFromText(sectionId, text);
      }
    } catch (error) {
      updateSaveState(error.message || "Could not add screenshot from clipboard.");
    }
  }

  function feedbackPayload() {
    return {
      workbookId: PLAN.id,
      workbookTitle: PLAN.title,
      sourcePath: PLAN.sourcePath,
      generatedAt: PLAN.generatedAt,
      exportedAt: new Date().toISOString(),
      recipientName: PLAN.recipientName,
      recipientEmail: PLAN.recipientEmail,
      reviewer: state.reviewer,
      summary: state.summary,
      responses: PLAN.sections.map((section) => ({
        id: section.id,
        title: section.title,
        originalLinks: section.originalLinks.map((item) => item.value),
        deployedLinks: section.deployedLinks.map((item) => item.value),
        backlogLinks: section.backlogLinks.map((item) => item.value),
        response: state.sections[section.id] || { status: "", notes: "", followUp: "", screenshots: [] },
      })),
    };
  }

  function buildFilename() {
    const reviewerSlug = (state.reviewer.name || "anonymous")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "anonymous";
    const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\..+$/, "");
    return PLAN.id + "--" + reviewerSlug + "--" + timestamp + ".json";
  }

  function downloadJson(filename) {
    const payload = feedbackPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  }

  function instructionText(filename) {
    return [
      "Review workbook: " + PLAN.title,
      "Downloaded feedback file: " + filename,
      "",
      PLAN.recipientEmail
        ? "Send this JSON file to " + PLAN.recipientName + " <" + PLAN.recipientEmail + ">."
        : "Send this JSON file to " + PLAN.recipientName + ".",
      "If this workbook came by email, the safest path is to reply to that email and attach the downloaded JSON file manually.",
      "",
      "The JSON file contains your section-by-section QA results and overall recommendation.",
    ].join("\n");
  }

  async function copyInstructions(filename = buildFilename()) {
    const text = instructionText(filename);
    try {
      await navigator.clipboard.writeText(text);
      updateSaveState("Send instructions copied to clipboard.");
    } catch (_) {
      updateSaveState("Could not copy instructions automatically. Use the on-screen guidance after export.");
    }
    return text;
  }

  function exportJson() {
    const filename = buildFilename();
    downloadJson(filename);
    updateSaveState("Downloaded " + filename + ".");
    return filename;
  }

  async function sendFeedback() {
    openFeedbackDialog();
  }

  function openFeedbackDialog() {
    const existing = document.querySelector(".feedback-dialog-backdrop");
    if (existing) existing.remove();
    const filename = buildFilename();
    const instructions = instructionText(filename);
    const backdrop = document.createElement("div");
    backdrop.className = "feedback-dialog-backdrop";
    backdrop.innerHTML =
      '<div class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title">' +
        '<button type="button" class="dialog-close" data-action="close-feedback-dialog" aria-label="Close">x</button>' +
        '<h2 id="feedback-dialog-title">Send feedback</h2>' +
        '<p>Choose how you want to send the feedback. Download is best when you can attach a file to an email. Copy is useful when you want to paste the JSON into a message.</p>' +
        '<div class="dialog-actions">' +
          '<button type="button" class="primary" data-action="dialog-download-json">Download JSON</button>' +
          '<button type="button" data-action="dialog-copy-json">Copy JSON</button>' +
          '<button type="button" data-action="dialog-copy-instructions">Copy email instructions</button>' +
        '</div>' +
        '<pre class="instruction-preview">' + escapeHtml(instructions) + '</pre>' +
      '</div>';
    document.body.appendChild(backdrop);
    backdrop.querySelector("[data-action='close-feedback-dialog']").addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) backdrop.remove();
    });
    backdrop.querySelector("[data-action='dialog-download-json']").addEventListener("click", () => {
      downloadJson(filename);
      updateSaveState("Downloaded " + filename + ".");
    });
    backdrop.querySelector("[data-action='dialog-copy-json']").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(feedbackPayload(), null, 2) + "\n");
        updateSaveState("Feedback JSON copied to clipboard.");
      } catch (_) {
        updateSaveState("Could not copy JSON automatically. Use Download JSON instead.");
      }
    });
    backdrop.querySelector("[data-action='dialog-copy-instructions']").addEventListener("click", () => copyInstructions(filename));
  }

  function clearDraft() {
    if (!window.confirm("Clear the saved draft for this workbook on this machine?")) return;
    state = emptyState();
    if (storage) storage.removeItem(STORAGE_KEY);
    lastSavedAt = "";
    render();
  }

  function bindInputs() {
    document.querySelectorAll("[data-section-id]").forEach((sectionCard) => {
      sectionCard.addEventListener("click", () => {
        activeScreenshotSection = sectionCard.getAttribute("data-section-id") || "";
      });
    });

    document.querySelectorAll("[data-bind]").forEach((element) => {
      const path = element.getAttribute("data-bind");
      element.value = getPath(state, path) || "";
      element.addEventListener("input", (event) => {
        setPath(state, path, event.target.value);
        saveState();
      });
      element.addEventListener("change", (event) => {
        setPath(state, path, event.target.value);
        saveState();
      });
    });

    document.querySelectorAll("[data-section-bind]").forEach((element) => {
      const [sectionId, key] = element.getAttribute("data-section-bind").split(".");
      element.value = state.sections[sectionId]?.[key] || "";
      element.addEventListener("input", (event) => {
        state.sections[sectionId][key] = event.target.value;
        saveState();
        rerenderSectionBadge(sectionId);
      });
      element.addEventListener("change", (event) => {
        state.sections[sectionId][key] = event.target.value;
        saveState();
        rerenderSectionBadge(sectionId);
      });
    });

    document.querySelectorAll("[data-action='send-feedback']").forEach((button) => button.addEventListener("click", sendFeedback));
    document.querySelectorAll("[data-action='clear-draft']").forEach((button) => button.addEventListener("click", clearDraft));
    document.querySelectorAll("[data-action='add-screenshot']").forEach((button) => {
      button.addEventListener("click", () => {
        const sectionId = button.getAttribute("data-section");
        document.querySelector('[data-file-input="' + CSS.escape(sectionId) + '"]')?.click();
      });
    });
    document.querySelectorAll("[data-file-input]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        const sectionId = event.target.getAttribute("data-file-input");
        if (!file || !sectionId) return;
        await addScreenshotFromBlob(sectionId, file, file.name);
        event.target.value = "";
      });
    });
    document.querySelectorAll("[data-action='paste-screenshot']").forEach((button) => {
      button.addEventListener("click", () => {
        activeScreenshotSection = button.getAttribute("data-section") || "";
        updateSaveState("Ready to paste a screenshot for this section. Use Cmd/Ctrl+V.");
      });
    });
    document.querySelectorAll("[data-action='remove-screenshot']").forEach((button) => {
      button.addEventListener("click", () => {
        removeScreenshot(button.getAttribute("data-section"), button.getAttribute("data-screenshot-id"));
      });
    });
    document.querySelectorAll("[data-action='set-section-status']").forEach((button) => {
      button.addEventListener("click", () => {
        const sectionId = button.getAttribute("data-section");
        const status = button.getAttribute("data-status") || "";
        if (!sectionId) return;
        state.sections[sectionId].status = status;
        saveState();
        render();
      });
    });
  }

  window.addEventListener("paste", handlePaste);
  render();
})();`;
}

function buildCss() {
  return `:root {
  --bg: #f5fbff;
  --bg-2: #eaf6fb;
  --panel: rgba(255, 255, 255, 0.86);
  --panel-solid: #ffffff;
  --panel-soft: rgba(239, 250, 247, 0.78);
  --line: rgba(120, 158, 170, 0.28);
  --line-strong: rgba(70, 128, 145, 0.42);
  --ink: #102033;
  --muted: #5c7180;
  --accent: #247a8a;
  --accent-ink: #0f4f5b;
  --accent-soft: #ddf6f3;
  --mint: #45b99c;
  --mint-soft: #e7fbf5;
  --sky: #e7f4ff;
  --amber: #c78419;
  --amber-soft: #fff3d8;
  --rose: #b5445c;
  --rose-soft: #fdeef2;
  --pass: #08785e;
  --pass-bg: #e6fbf4;
  --partial: #8a5a00;
  --partial-bg: #fff3d8;
  --fail: #a82d46;
  --fail-bg: #fdeef2;
  --shadow: 0 18px 50px rgba(30, 68, 86, 0.11);
  --shadow-soft: 0 10px 30px rgba(30, 68, 86, 0.08);
  --radius: 8px;
  --mono: ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  --sans: "Aptos", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
html, body { margin: 0; min-height: 100%; padding: 0; }
body {
  font-family: var(--sans);
  background:
    radial-gradient(circle at 18% 0%, rgba(101, 202, 188, 0.28), transparent 22rem),
    radial-gradient(circle at 86% 10%, rgba(147, 198, 236, 0.32), transparent 24rem),
    linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 28rem, #fbfdff 100%);
  color: var(--ink);
  line-height: 1.5;
}

a { color: var(--accent); }
button, input, select, textarea { font: inherit; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
  outline: 3px solid rgba(185, 119, 24, 0.35);
  outline-offset: 2px;
}
.hidden { display: none !important; }

.qa-workbook-shell, .page {
  max-width: 1360px;
  margin: 0 auto;
  padding: 18px;
}

.hero, .panel, .section-card, .setup-card, .progress-card, .progress-rail {
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
  backdrop-filter: blur(18px);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 24px;
  align-items: end;
  padding: 26px;
  margin-bottom: 16px;
  border-top: 5px solid var(--mint);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-soft), var(--sky));
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 16px 0 10px;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1.04;
  letter-spacing: 0;
}

.hero-copy p {
  max-width: 76ch;
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 1rem;
}

.reviewer-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: var(--panel-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.setup-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  margin-bottom: 16px;
}

.setup-card,
.subpanel,
.link-panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(14px);
}

.setup-card h2 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--accent-ink);
}

.meta-list, .plain-list {
  margin: 0;
  padding-left: 18px;
}

.meta-list li, .plain-list li {
  margin: 8px 0;
  color: var(--muted);
}

.meta-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: var(--ink);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0;
}

.field input, .field textarea, .field select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--ink);
}

.field input:hover, .field textarea:hover, .field select:hover {
  border-color: var(--line-strong);
}

.field textarea {
  min-height: 110px;
  resize: vertical;
}

.full-span { grid-column: 1 / -1; }

.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 0;
}

.compact-actions {
  margin-top: 12px;
}

.action-bar button, .mini-button {
  border: 1px solid var(--line-strong);
  background: rgba(255, 255, 255, 0.88);
  color: var(--accent);
  border-radius: var(--radius);
  padding: 10px 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.action-bar button:hover, .mini-button:hover, .link-chip:hover {
  border-color: var(--accent);
  box-shadow: 0 10px 22px rgba(36, 122, 138, 0.16);
  transform: translateY(-1px);
}

.mini-button {
  padding: 8px 12px;
  font-size: 0.85rem;
}

.action-bar button.primary {
  background: linear-gradient(135deg, var(--accent), #2d8f8f);
  color: white;
  border-color: var(--accent);
}

.action-bar button.warn {
  color: var(--rose);
  border-color: rgba(180, 63, 82, 0.28);
}

.save-state {
  font-size: 0.92rem;
  color: var(--muted);
  width: 100%;
}

.banner {
  margin-top: 12px;
  border-radius: var(--radius);
  padding: 14px 16px;
  font-size: 0.95rem;
}

.banner.info {
  background: rgba(221, 246, 243, 0.9);
  color: var(--accent-ink);
  border: 1px solid #badbd5;
}

.banner.warn {
  background: var(--amber-soft);
  color: #6d4300;
  border: 1px solid #f0d08f;
}

.inline-note {
  margin-top: 16px;
}

.workbench {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  margin-top: 18px;
}

.progress-rail {
  position: sticky;
  top: 18px;
  display: grid;
  gap: 14px;
  padding: 14px;
  max-height: calc(100vh - 36px);
  overflow: auto;
}

.progress-card {
  padding: 16px;
  box-shadow: none;
}

.progress-number {
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent-ink);
  line-height: 1;
}

.progress-copy {
  margin-top: 4px;
  color: var(--muted);
  font-size: 0.88rem;
}

.progress-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(120, 158, 170, 0.18);
  margin-top: 14px;
}

.progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--mint), var(--accent));
}

.progress-mini {
  display: grid;
  gap: 5px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.86rem;
}

.section-nav {
  display: grid;
  gap: 4px;
}

.section-nav-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 8px;
  border-radius: var(--radius);
  color: var(--ink);
  text-decoration: none;
}

.section-nav-item:hover {
  background: rgba(231, 244, 255, 0.8);
}

.nav-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #b9ccd5;
}

.section-nav-item.pass .nav-dot { background: var(--pass); }
.section-nav-item.partial .nav-dot { background: var(--amber); }
.section-nav-item.fail .nav-dot { background: var(--rose); }

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
  font-size: 0.9rem;
}

.sections {
  display: grid;
  gap: 18px;
  margin-top: 0;
}

.section-card {
  padding: 20px;
  scroll-margin-top: 18px;
}

.section-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
}

.section-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent-soft), var(--sky));
  color: var(--accent-ink);
  font-weight: 800;
}

.section-title {
  margin: 0;
  font-size: clamp(1.25rem, 2vw, 1.7rem);
  line-height: 1.15;
  letter-spacing: 0;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.link-panel h3, .subpanel h3 {
  margin: 0 0 10px;
  font-size: 0.82rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0;
}

.link-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.link-chip {
  display: inline-grid;
  gap: 2px;
  min-width: 150px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), #2f93a4);
  color: var(--accent-ink);
  text-decoration: none;
  padding: 10px 12px;
  font-size: 0.92rem;
  font-weight: 700;
  word-break: break-word;
}

.link-label {
  color: #fff;
  font-weight: 800;
}

.link-host {
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.78rem;
  font-weight: 700;
}

.text-chip {
  display: inline-flex;
  border-radius: var(--radius);
  background: rgba(234, 246, 251, 0.72);
  color: var(--ink);
  padding: 10px 12px;
  font-size: 0.9rem;
  font-family: var(--mono);
}

.feedback-guide {
  background: linear-gradient(135deg, rgba(221, 246, 243, 0.78), rgba(231, 244, 255, 0.86));
}

.feedback-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(16, 32, 51, 0.38);
}

.feedback-dialog {
  position: relative;
  width: min(680px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel-solid);
  box-shadow: 0 24px 70px rgba(16, 32, 51, 0.25);
  padding: 22px;
}

.feedback-dialog h2 {
  margin: 0 0 10px;
}

.feedback-dialog p {
  color: var(--muted);
}

.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0;
}

.dialog-actions button,
.dialog-close {
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: white;
  color: var(--accent);
  cursor: pointer;
  font-weight: 800;
  padding: 10px 12px;
}

.dialog-actions button.primary {
  background: linear-gradient(135deg, var(--accent), #2f93a4);
  border-color: var(--accent);
  color: white;
}

.dialog-close {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 36px;
  height: 36px;
  padding: 0;
}

.instruction-preview {
  white-space: pre-wrap;
  overflow: auto;
  max-height: 220px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #f4f9fb;
  color: var(--ink);
  padding: 12px;
}

.two-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
  gap: 18px;
  margin-top: 18px;
}

.subsection-panel {
  margin-top: 18px;
}

.steps {
  margin: 0;
  padding-left: 18px;
}

.steps li {
  margin: 10px 0;
  color: var(--muted);
}

.steps ul {
  margin-top: 8px;
  padding-left: 18px;
}

.response-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.85fr) 180px minmax(0, 1fr);
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.section-badge.pass { background: var(--pass-bg); color: var(--pass); }
.section-badge.partial { background: var(--partial-bg); color: var(--partial); }
.section-badge.fail { background: var(--fail-bg); color: var(--fail); }
.section-badge.not-tested { background: #eceff4; color: #4a5568; }

.status-field {
  min-width: 0;
}

.status-control {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 5px;
  background: rgba(234, 246, 251, 0.76);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.status-option {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-weight: 800;
  min-height: 40px;
  padding: 8px;
}

.status-option.active {
  background: var(--panel-solid);
  box-shadow: var(--shadow-soft);
  color: var(--ink);
}

.status-option.pass.active { color: var(--pass); }
.status-option.partial.active { color: var(--partial); }
.status-option.fail.active { color: var(--fail); }

.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.screenshot-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--panel-solid);
}

.screenshot-card img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 220px;
  object-fit: contain;
  background: #eef7fb;
}

.screenshot-copy {
  padding: 10px 12px;
  font-size: 0.92rem;
  color: var(--muted);
}

.tester-shot-actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}

.footer-panel {
  margin-top: 22px;
  padding: 20px;
}

.small {
  font-size: 0.9rem;
  color: var(--muted);
}

@media (max-width: 980px) {
  .hero, .setup-grid, .workbench, .two-col, .response-grid, .link-grid, .form-grid, .section-top {
    grid-template-columns: 1fr;
  }

  .progress-rail {
    position: static;
    max-height: none;
  }
}

@media (max-width: 640px) {
  .qa-workbook-shell, .page {
    padding: 10px;
  }

  .hero, .section-card, .setup-card, .panel {
    padding: 14px;
  }

  .hero {
    gap: 16px;
  }

  .action-bar {
    align-items: flex-start;
  }

  .action-bar button {
    padding: 9px 12px;
  }

  .status-control {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

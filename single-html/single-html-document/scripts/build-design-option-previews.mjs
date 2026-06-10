#!/usr/bin/env node
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildBlockSample } from "./build-block-sample.mjs";
import handbookManifest from "./manifests/composed-blocks-handbook.mjs";
import walkthroughManifest from "./manifests/composed-blocks-walkthrough.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const outputDirs = [
  path.join(repoRoot, "single-html-document/assets/design-samples"),
  path.join(repoRoot, "examples/design-options/generated"),
];
const skillDesignSamplesDir = path.join(repoRoot, "single-html-document/assets/design-samples");

const blockSamples = [
  {
    id: "composed-blocks-handbook",
    title: "Composed Blocks Handbook",
    webType: "block-pattern handbook",
    manifest: handbookManifest,
  },
  {
    id: "composed-blocks-walkthrough",
    title: "Composed Blocks Walkthrough",
    sampleTitle: "Why single-file HTML is a delivery format",
    webType: "narrative walkthrough using blocks",
    manifest: walkthroughManifest,
  },
];

const options = [
  {
    id: "institutional-analytics",
    title: "Institutional Analytics",
    sampleTitle: "Institution AI Usage Analytics",
    webType: "operational analytics dashboard",
    source: "Inspired by operational usage-report dashboards",
    bestFor: "CSV or admin exports, product-like operational reporting, KPI-heavy dashboards.",
    avoidFor: "Long narrative reports where charts are only supporting evidence.",
    layout: "Left rail, topbar metadata chips, KPI cards, dashboard grids, ranked table, footer strip.",
    palette: "Warm sand, deep teal, slate, muted gold, restrained red.",
    components: ["navigation rail", "metadata chips", "KPI cards", "chart panels", "ranked table", "export cards"],
    className: "analytics",
  },
  {
    id: "record-catalogue",
    title: "Record Catalogue",
    sampleTitle: "AI Stress Test Protocol Library",
    webType: "searchable record catalogue",
    source: "Inspired by generated record catalogues",
    bestFor: "Atomic Markdown records, protocols, tool inventories, people directories, compliance registers.",
    avoidFor: "Reports that need a polished first-read narrative arc.",
    layout: "Header bar, sticky filter sidebar, summary stats, stacked record cards with metadata grids.",
    palette: "Institutional blue, white, governance-style greys, gold focus state, semantic status colours.",
    components: ["search", "select filters", "record cards", "status pills", "metadata grid", "print-safe cards"],
    className: "catalogue",
  },
  {
    id: "committee-briefing",
    title: "Committee Briefing",
    sampleTitle: "AI Governance Committee Pack",
    webType: "committee briefing microsite",
    source: "Inspired by generated committee briefing and meeting notes pages",
    bestFor: "Meeting packs, committee papers, workshop notes, decision briefings with a strong opening overview.",
    avoidFor: "Dense data exploration where the reader needs tables first.",
    layout: "Landing overview, fact cards, section cards, sticky scroll sidebar, long-form article sections.",
    palette: "Light neutral, black ink, blue active state, quiet grey surfaces.",
    components: ["landing panel", "attendance/fact cards", "section overview grid", "scroll navigation", "highlight boxes"],
    className: "committee",
  },
  {
    id: "protocol-dossier",
    title: "Protocol Dossier",
    sampleTitle: "Interview Integrity Protocol",
    webType: "single protocol dossier",
    source: "Inspired by generated protocol share pages",
    bestFor: "A single important protocol, policy proposal, research plan, or risk review that needs authority.",
    avoidFor: "Collections of many short records.",
    layout: "Full-width institutional hero, right-side metadata cards, article body, sticky fact rail, reading/meeting toggle.",
    palette: "Institutional blue, gold, white, muted grey, high contrast.",
    components: ["hero metadata", "fact rail", "table of contents", "prose body", "meeting-mode sections"],
    className: "dossier",
  },
  {
    id: "tabbed-workshop",
    title: "Tabbed Workshop",
    sampleTitle: "AI Decision Workshop",
    webType: "facilitated workshop website",
    source: "Inspired by generated tabbed briefing drafts",
    bestFor: "Training packs, facilitation guides, strategy workshops, slide-like reports opened in a browser.",
    avoidFor: "Documents that must print as one uninterrupted paper.",
    layout: "Compact hero, stat strip, tab buttons, card grids, action blocks.",
    palette: "Deep blue header, gold tab rule, white content, pale grey cards.",
    components: ["tabs", "stat strip", "card grids", "action lists", "print-all fallback"],
    className: "tabs",
  },
  {
    id: "inspection-gallery",
    title: "Inspection Gallery",
    sampleTitle: "Image Capability Review Gallery",
    webType: "visual inspection gallery",
    source: "Derived from current single-html gallery sample",
    bestFor: "Image/model comparisons, screenshots, prompt galleries, portfolio-style evidence reviews.",
    avoidFor: "Text-only reports where large visual surfaces waste space.",
    layout: "Dark utility rail, filter controls, large figure grid, figure metadata, source/provenance notes.",
    palette: "Charcoal shell, paper cards, red or teal accent, neutral metadata.",
    components: ["figure grid", "category filters", "metadata badges", "source drawers", "rubric download"],
    className: "gallery",
  },
  {
    id: "workshop-report",
    title: "Workshop Report",
    sampleTitle: "Research Practice Workshop",
    webType: "detailed workshop/event report",
    source: "Synthetic workshop fixture with slide-style images, session notes, and follow-up resources",
    bestFor: "Event reports, training-session records, speaker/session pages, slide-rich meeting notes, and follow-up packs.",
    avoidFor: "Short memos where programme, media, and provenance would add noise.",
    layout: "Image-led hero, sticky navigation, programme timeline, session detail cards, slide gallery, speakers, materials, provenance.",
    palette: "Institutional navy, warm paper, gold highlights, clinical blue accents, photo-led content blocks.",
    components: ["hero image", "sticky section nav", "programme timeline", "session cards", "slide image gallery", "speaker cards", "materials/provenance"],
    className: "workshop",
  },
];

async function main() {
  for (const outDir of outputDirs) {
    await buildOutput(outDir);
  }
}

async function buildOutput(outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const manifest = [];
  for (const option of options) {
    const preparedOption = await prepareOption(option);
    const html = buildOptionPage(preparedOption);
    const target = path.join(outDir, `${option.id}.single.html`);
    await writeFile(target, html);
    const size = (await stat(target)).size;
    manifest.push({
      id: option.id,
      title: option.title,
      sampleTitle: option.sampleTitle,
      webType: option.webType,
      file: path.basename(target),
      size,
    });
    console.log(`built ${path.relative(repoRoot, target)} (${formatBytes(size)})`);
  }
  if (outDir === skillDesignSamplesDir) {
    const blockManifestEntries = [];
    for (const sample of blockSamples) {
      const target = path.join(outDir, sample.manifest.outputName);
      const result = await buildBlockSample(sample.manifest, target);
      blockManifestEntries.push({
        id: sample.id,
        title: sample.title || sample.manifest.title,
        sampleTitle: sample.sampleTitle || sample.manifest.title,
        webType: sample.webType,
        file: path.basename(target),
        size: result.sizeBytes,
      });
      console.log(`built ${path.relative(repoRoot, target)} (${formatBytes(result.sizeBytes)})`);
    }
    manifest.unshift(...blockManifestEntries);
  }
  const index = buildIndex(manifest);
  await writeFile(path.join(outDir, "index.html"), index);
  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), options: manifest }, null, 2)}\n`);
  await writeFile(path.join(outDir, "README.md"), readmeFor(outDir));
  console.log(`built index (${path.relative(repoRoot, path.join(outDir, "index.html"))})`);
}

async function prepareOption(option) {
  if (option.id !== "workshop-report") return option;
  const imageSpecs = [
    ["Opening slide", "Synthetic title-slide visual for a portable workshop report.", "synthetic/opening-slide.png"],
    ["Practice workflow", "Synthetic visual for a session on repeatable research workflows.", "synthetic/practice-workflow.png"],
    ["Evidence map", "Synthetic visual for evidence capture, review, and provenance.", "synthetic/evidence-map.png"],
    ["Tooling pattern", "Synthetic visual for choosing tools, data boundaries, and checks.", "synthetic/tooling-pattern.png"],
    ["Follow-up plan", "Synthetic visual for actions, owners, artifacts, and next review.", "synthetic/follow-up-plan.png"],
  ];
  const images = imageSpecs.map(([title, caption, relPath], index) => ({
    title,
    caption,
    path: relPath,
    src: figureDataUri(title, index + 2),
  }));
  return { ...option, images };
}

function buildOptionPage(option) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(option.sampleTitle)} Sample</title>
  <link rel="icon" href="${faviconDataUri()}">
  <style>${baseCss()}${optionCss(option.className)}</style>
</head>
<body class="${option.className}">
  ${renderOption(option)}
  <script>${runtimeJs()}</script>
</body>
</html>
`;
}

function buildIndex(manifest) {
  const manifestById = new Map(manifest.map((item) => [item.id, item]));
  const nav = options.map((option, index) => `<a class="${index === 0 ? "active" : ""}" href="#${option.id}">${icon(optionIcon(option.className))} ${escapeHtml(option.title)}</a>`).join("");
  const filters = [
    ["all", "All"],
    ["analytics", "Analytics"],
    ["catalogue", "Catalogue"],
    ["briefing", "Briefing"],
    ["workshop", "Workshop"],
    ["visual", "Visual"],
  ].map(([value, label], index) => `<button class="${index === 0 ? "active" : ""}" data-index-filter="${value}">${label}</button>`).join("");
  const rows = options.map((option) => {
    const item = manifestById.get(option.id);
    return `<tr data-index-card data-kind="${optionKind(option)}"><td><a href="#${option.id}">${escapeHtml(option.title)}</a></td><td>${escapeHtml(option.webType)}</td><td>${escapeHtml(option.bestFor)}</td><td>${escapeHtml(item ? formatBytes(item.size) : "")}</td></tr>`;
  }).join("");
  const cards = options.map((option) => {
    const item = manifestById.get(option.id);
    return `<article id="${option.id}" class="design-card ${option.className}" data-index-card data-kind="${optionKind(option)}">
      <div class="preview-frame ${option.className}" aria-hidden="true">${designPreview(option)}</div>
      <div class="design-copy">
        <p class="eyebrow">${escapeHtml(option.webType)}</p>
        <h2>${icon(optionIcon(option.className))} ${escapeHtml(option.title)}</h2>
        <p class="sample-name">${escapeHtml(option.sampleTitle)}</p>
        <dl>
          <div><dt>Best for</dt><dd>${escapeHtml(option.bestFor)}</dd></div>
          <div><dt>Avoid for</dt><dd>${escapeHtml(option.avoidFor)}</dd></div>
          <div><dt>Layout</dt><dd>${escapeHtml(option.layout)}</dd></div>
          <div><dt>Palette</dt><dd>${escapeHtml(option.palette)}</dd></div>
        </dl>
        <div class="component-list">${option.components.map((component) => `<span>${escapeHtml(component)}</span>`).join("")}</div>
        <div class="design-actions"><a href="#${option.id}">${icon("Eye")} Inspect here</a><a href="#comparison">${icon("Table2")} Compare</a><span>${icon("FileText")} ${escapeHtml(item ? `${item.file} / ${formatBytes(item.size)}` : "")}</span></div>
      </div>
    </article>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Single HTML Design Inspection Gallery</title>
  <link rel="icon" href="${faviconDataUri()}">
  <style>${baseCss()}
    body{background:#f4f0e8;color:#172233}
    .index-layout{display:grid;grid-template-columns:286px 1fr;min-height:100vh}
    .index-rail{position:sticky;top:0;height:100vh;background:#fffdf8;color:#172233;padding:24px;overflow:auto;border-right:1px solid #dfd4c3}
    .index-rail h1{font-size:26px;line-height:1.05;margin:0 0 10px}
    .index-rail p{color:#586575;font-size:14px;margin-bottom:18px}
    .index-rail nav{display:grid;gap:7px}
    .index-rail a{display:flex;align-items:center;gap:8px;color:#29384a;text-decoration:none;border:1px solid #dfd4c3;border-radius:8px;padding:9px 10px;background:#fff}
    .index-rail a.active{background:#eef6f4;border-color:#0f5f68;color:#0f5f68;font-weight:900}
    .index-main{min-width:0}
    .index-hero{padding:38px max(24px,calc((100vw - 1220px)/2));background:#fffdf8;border-bottom:1px solid #dfd4c3}
    .index-hero h1{font-size:52px;line-height:1.02;margin:0 0 14px;max-width:850px}
    .index-hero p{font-size:18px;color:#586575;max-width:82ch}
    .index-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
    .index-toolbar button{border:1px solid #cfc5b5;background:#fff;border-radius:8px;padding:8px 11px;font-weight:800;color:#29384a}
    .index-toolbar button.active{background:#0f5f68;color:#fff;border-color:#0f5f68}
    .comparison{padding:28px max(24px,calc((100vw - 1220px)/2));border-bottom:1px solid #dfd4c3}
    .comparison h2,.gallery-list h2{font-size:28px;margin-bottom:12px}
    .comparison table{background:#fffdf8;border:1px solid #dfd4c3;border-radius:8px;overflow:hidden}
    .comparison td,.comparison th{vertical-align:top}
    .comparison a{color:#0f5f68;font-weight:900;text-decoration:none}
    .gallery-list{padding:28px max(24px,calc((100vw - 1220px)/2));display:grid;gap:18px}
    .design-card{background:#fffdf8;border:1px solid #dfd4c3;border-radius:8px;display:grid;grid-template-columns:minmax(300px,42%) 1fr;overflow:hidden;scroll-margin-top:18px}
    .preview-frame{min-height:320px;padding:18px;border-right:1px solid #dfd4c3;background:#f8f4ec;display:grid}
    .design-copy{padding:22px;display:grid;gap:12px}
    .design-copy h2{font-size:30px;display:flex;gap:9px;align-items:center;margin:0}
    .sample-name{font-weight:900;color:#0f5f68;margin:0}
    .design-copy dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}
    .design-copy dt{text-transform:uppercase;font-size:11px;font-weight:900;color:#687386}
    .design-copy dd{margin:3px 0 0;color:#344154;line-height:1.45}
    .component-list{display:flex;flex-wrap:wrap;gap:7px}
    .component-list span{border:1px solid #dfd4c3;background:#fff;border-radius:999px;padding:5px 8px;font-size:12px;font-weight:800;color:#566173}
    .design-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .design-actions a,.design-actions span{display:inline-flex;gap:7px;align-items:center;text-decoration:none;color:#0f5f68;font-weight:900;border:1px solid #d7cbb9;border-radius:8px;padding:8px 10px;background:#fff}
    .mini{width:100%;height:100%;min-height:280px;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,.12);background:#fff;box-shadow:0 8px 20px rgba(17,24,39,.08)}
    .mini-analytics{display:grid;grid-template-columns:22% 1fr;background:#f6efe3}.mini-analytics aside{background:#efe4d2}.mini-analytics main{padding:16px}.mini-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.mini-bars i{display:block;height:50px;background:#176d6d;border-radius:6px}.mini-panels{display:grid;grid-template-columns:1.3fr 1fr;gap:9px;margin-top:12px}.mini-panels div{height:68px;background:#fff;border:1px solid #eadfce;border-radius:6px}
    .mini-catalogue{background:#f3f2f1}.mini-catalogue header{height:52px;background:#002147}.mini-catalogue div{display:grid;grid-template-columns:32% 1fr;gap:10px;padding:12px}.mini-catalogue aside,.mini-catalogue article{background:#fff;border:1px solid #d4d6d8}.mini-catalogue article{height:58px;border-left:5px solid #002147;margin-bottom:8px}
    .mini-committee{background:#f5f5f7}.mini-committee header{height:96px;background:#fff;border-bottom:1px solid #e5e5e7}.mini-committee div{display:grid;grid-template-columns:25% 1fr;gap:12px;padding:12px}.mini-committee aside,.mini-committee section{background:#fff;border:1px solid #e5e5e7;border-radius:6px}.mini-committee section{height:72px;margin-bottom:8px}
    .mini-dossier{background:#f3f2f1}.mini-dossier header{height:105px;background:#002147}.mini-dossier div{display:grid;grid-template-columns:1fr 28%;gap:12px;padding:12px}.mini-dossier article,.mini-dossier aside{background:#fff;border:1px solid #d4d6d8}.mini-dossier article{height:145px}
    .mini-tabs{background:#fff}.mini-tabs header{height:112px;background:#002147}.mini-tabs nav{height:34px;background:#062d52;border-bottom:4px solid #c7a23c}.mini-tabs section{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px}.mini-tabs section div{height:86px;background:#f8f8f8;border:1px solid #d4d6d8;border-left:5px solid #002147;border-radius:6px}
    .mini-gallery{display:grid;grid-template-columns:28% 1fr;background:#f7f3eb}.mini-gallery aside{background:#fffdf8;border-right:1px solid #dfd4c3}.mini-gallery section{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px}.mini-gallery figure{margin:0;background:#f8f5ef;border:1px solid #dfd4c3;border-radius:6px;height:92px}
    .mini-workshop{display:grid;grid-template-columns:26% 1fr;background:#f6f1e8}.mini-workshop aside{background:#071b33}.mini-workshop main{padding:14px}.mini-workshop figure{height:92px;background:#fff;border:1px solid #e4d9c7;border-radius:6px;margin:0 0 12px}.mini-workshop article{height:44px;background:#fffdf8;border:1px solid #e4d9c7;border-radius:6px;margin-bottom:8px}
    .icon{width:18px;height:18px;display:inline-block;vertical-align:-3px}
    @media(max-width:1000px){.index-layout,.design-card{grid-template-columns:1fr}.index-rail{position:static;height:auto}.preview-frame{border-right:0;border-bottom:1px solid #dfd4c3}.design-copy dl{grid-template-columns:1fr}}
    @media(max-width:620px){.index-hero h1{font-size:34px}.comparison{overflow-x:auto}.preview-frame{min-height:230px}.mini{min-height:220px}}
  </style>
</head>
<body>
  <div class="index-layout">
    <aside class="index-rail"><h1>${icon("Images")} Design Inspection Gallery</h1><p>All reusable single-HTML design options in one navigable file.</p><nav><a class="active" href="#overview">${icon("Home")} Overview</a><a href="#comparison">${icon("Table2")} Comparison</a>${nav}</nav></aside>
    <main class="index-main">
      <section id="overview" class="index-hero">
        <p class="eyebrow">single-html-document / design options</p>
        <h1>Choose the report shape before building the page</h1>
        <p>This index is the inspection gallery for all possible sample designs. It is a packaging-safe single HTML page with internal navigation, comparison data, thumbnail previews, and links to the full functional samples.</p>
        <div class="index-toolbar">${filters}</div>
      </section>
      <section id="comparison" class="comparison">
        <h2>${icon("Table2")} Compare Options</h2>
        <table><thead><tr><th>Design</th><th>Website type</th><th>Best fit</th><th>Sample size</th></tr></thead><tbody>${rows}</tbody></table>
      </section>
      <section class="gallery-list"><h2>${icon("Images")} Design Previews</h2>${cards}</section>
    </main>
  </div>
  <script>${indexRuntimeJs()}</script>
</body>
</html>`;
}

function optionIcon(className) {
  const icons = {
    analytics: "LayoutDashboard",
    catalogue: "Search",
    committee: "ClipboardList",
    dossier: "ShieldCheck",
    tabs: "Presentation",
    gallery: "Images",
    workshop: "CalendarClock",
  };
  return icons[className] || "FileText";
}

function optionKind(option) {
  if (option.className === "analytics") return "analytics";
  if (option.className === "catalogue") return "catalogue";
  if (option.className === "committee" || option.className === "dossier") return "briefing";
  if (option.className === "tabs" || option.className === "workshop") return "workshop";
  return "visual";
}

function designPreview(option) {
  const previews = {
    analytics: `<div class="mini mini-analytics"><aside></aside><main><div class="mini-bars"><i></i><i></i><i></i><i></i></div><div class="mini-panels"><div></div><div></div><div></div><div></div></div></main></div>`,
    catalogue: `<div class="mini mini-catalogue"><header></header><div><aside></aside><main><article></article><article></article><article></article></main></div></div>`,
    committee: `<div class="mini mini-committee"><header></header><div><aside></aside><main><section></section><section></section></main></div></div>`,
    dossier: `<div class="mini mini-dossier"><header></header><div><article></article><aside></aside></div></div>`,
    tabs: `<div class="mini mini-tabs"><header></header><nav></nav><section><div></div><div></div><div></div></section></div>`,
    gallery: `<div class="mini mini-gallery"><aside></aside><section><figure></figure><figure></figure><figure></figure><figure></figure></section></div>`,
    workshop: `<div class="mini mini-workshop"><aside></aside><main><figure></figure><article></article><article></article><article></article></main></div>`,
  };
  return previews[option.className] || previews.committee;
}

function indexRuntimeJs() {
  return `document.addEventListener("click",(event)=>{const filter=event.target.closest("[data-index-filter]");if(!filter)return;const kind=filter.dataset.indexFilter;document.querySelectorAll("[data-index-filter]").forEach(button=>button.classList.toggle("active",button===filter));document.querySelectorAll("[data-index-card]").forEach(card=>{card.hidden=kind!=="all"&&card.dataset.kind!==kind;});});`;
}

function readmeFor(outDir) {
  const rel = path.relative(repoRoot, outDir);
  return `# Single HTML Design Samples

Generated packaging-safe design samples for the single-html-document skill.

This folder is generated by:

\`\`\`bash
node single-html-document/scripts/build-design-option-previews.mjs
\`\`\`

Output folder: \`${rel}\`

The samples are assets for the skill, not final templates:

- \`institutional-analytics.single.html\`: operational analytics dashboard
- \`record-catalogue.single.html\`: searchable record catalogue
- \`committee-briefing.single.html\`: committee briefing microsite
- \`protocol-dossier.single.html\`: single protocol dossier
- \`tabbed-workshop.single.html\`: facilitated workshop website
- \`inspection-gallery.single.html\`: visual inspection gallery
- \`workshop-report.single.html\`: detailed slide-rich event report

The \`index.html\` file is itself a single-file design inspection gallery. It has
internal navigation, filtering, a comparison table, and inline CSS previews for
all options without depending on the adjacent sample files.

The current generated examples in \`examples/generated\` remain valid design options too. These files expand the menu and give future builds a local visual reference.
`;
}

function renderOption(option) {
  if (option.className === "analytics") return analyticsHtml(option);
  if (option.className === "catalogue") return catalogueHtml(option);
  if (option.className === "committee") return committeeHtml(option);
  if (option.className === "dossier") return dossierHtml(option);
  if (option.className === "tabs") return tabsHtml(option);
  if (option.className === "workshop") return workshopReportHtml(option);
  return galleryHtml(option);
}

function analyticsHtml(option) {
  return `<div class="analytics-shell">
    <aside class="ana-rail">${navItems([["Home", "Overview", "overview"], ["Users", "Accounts", "accounts"], ["Layers", "Models", "models"], ["Wrench", "Tools", "tools"], ["Download", "Exports", "exports"]])}</aside>
    <main class="ana-main">
      <section id="overview" class="ana-section">
        ${optionHeader(option)}
      </section>
      <section class="ana-metrics" aria-label="Summary metrics">
        ${metric("Total accounts", "67,063", "All time", "Users")}
        ${metric("Enabled", "28,476", "42.5% of total", "BadgeCheck")}
        ${metric("Active period", "17,267", "5 day export", "Activity")}
        ${metric("Messages", "728k", "Current window", "MessageSquare")}
      </section>
      <section class="ana-grid">
        ${panel("Account creation trend", bars(["Jan", "Feb", "Mar", "Apr"], [38, 52, 71, 88]), "BarChart3", "overview-trend")}
        ${panel("Model share", hBars([["GPT-4.1", 82], ["GPT-4o", 63], ["o3", 41], ["Other", 18]]), "Layers", "models")}
        ${panel("Account status", donutLegend(), "PieChart", "accounts")}
        ${panel("Top accounts", tableRows(), "Table2", "accounts-table")}
        ${panel("Tools usage", hBars([["Code interpreter", 71], ["Image generation", 56], ["Deep research", 44], ["Connectors", 29]]), "Wrench", "tools")}
        ${panel("Exports", exportCards(), "Download", "exports")}
      </section>
    </main>
  </div>`;
}

function catalogueHtml(option) {
  const records = [
    ["Adversarial Prompt Injection", "protocol", "active", "Critical"],
    ["Demographic Bias Detection", "tool", "active", "Critical"],
    ["Consistency Across Inputs", "protocol", "active", "Critical"],
    ["Reliability Under Load", "tool", "draft", "High"],
  ];
  return `<header class="cat-head"><div><h1>${icon("ShieldAlert")} ${option.sampleTitle}</h1><p>${option.bestFor}</p></div><button data-toggle-filter>${icon("SlidersHorizontal")} Filters</button></header>
  <div class="cat-layout">
    <aside class="cat-filter"><label>${icon("Search")} Search<input data-record-search placeholder="Search records"></label><label>${icon("FileText")} Type<select data-record-type><option value="all">All types</option><option value="protocol">Protocol</option><option value="tool">Tool</option></select></label><label>${icon("BadgeCheck")} Status<select data-record-status><option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option></select></label></aside>
    <main class="cat-main">
      <section class="cat-stats">${metric("Records", "18", "loaded", "FileText")} ${metric("Protocols", "6", "active", "FileCheck2")} ${metric("Tools", "5", "tracked", "Wrench")}</section>
      ${records.map(([record, type, status, severity], index) => `<article class="cat-card" data-record-card data-type="${type}" data-status="${status}" data-title="${escapeAttr(record.toLowerCase())}"><div><span class="pill">${type}</span><span class="pill warn">${status}</span></div><h2>${icon(type === "tool" ? "Wrench" : "FileWarning")} ${record}</h2><p>Structured record with source path, status, owners, tags, related IDs, and body text embedded directly in the page.</p><div class="meta-grid"><span>${icon("Tag")} ID<br><b>PROTO-00${index + 1}</b></span><span>${icon("UserRound")} Owner<br><b>TBC</b></span><span>${icon("ShieldAlert")} Severity<br><b>${severity}</b></span></div></article>`).join("")}
      <p class="empty-state" data-record-empty hidden>No records match the current filters.</p>
    </main>
  </div>`;
}

function committeeHtml(option) {
  return `<section class="com-landing"><p class="eyebrow">${escapeHtml(option.source)}</p><h1>${icon("ClipboardList")} ${option.sampleTitle}</h1><p>${escapeHtml(option.bestFor)}</p><div class="com-facts">${[fact("Audience", "Committee", "UsersRound"), fact("Mode", "Pre-read", "BookOpenText"), fact("Decision", "Review", "CheckCircle2"), fact("Format", "Single HTML", "FileText")].join("")}</div></section>
  <div class="com-shell"><aside>${navItems([["ClipboardList", "Purpose", "purpose"], ["ScrollText", "Evidence", "evidence"], ["CheckCircle2", "Decision", "decision"], ["ListChecks", "Actions", "actions"]])}</aside><main>
    ${articleSection("Purpose", "Open with a readable landing overview, then move into source-backed sections that committee members can scan without losing context.", "purpose")}
    ${articleSection("Evidence", "Use fact cards, highlighted decision points, and full local source text where it is needed for provenance.", "evidence")}
    ${articleSection("Decision", "Make the decision surface explicit: what is being asked, what evidence supports it, and what uncertainty remains.", "decision")}
    ${articleSection("Actions", "Close with owners, dates, risks, and a clear appendix rather than separate text-note downloads.", "actions")}
  </main></div>`;
}

function dossierHtml(option) {
  return `<section class="dos-hero"><div><p class="eyebrow">${escapeHtml(option.source)}</p><h1>${icon("ShieldCheck")} ${option.sampleTitle}</h1><p>${escapeHtml(option.bestFor)}</p></div><div class="dos-meta">${[fact("Status", "Draft", "FileWarning"), fact("Owner", "Working group", "UsersRound"), fact("Severity", "Critical", "ShieldAlert")].join("")}</div></section>
  <main class="dos-content"><article>${articleSection("Core Question", "A single policy, protocol, or proposal gets a strong institutional hero and a focused article body. The reader can treat it as a paper or as meeting material.", "core-question")}${articleSection("Implementation", "The skill should generate metadata cards, a table of contents, source facts, and optional meeting-mode sections from the same content model.", "implementation")}${articleSection("Source Appendix", "The source Markdown or notes that support the dossier should be incorporated here or in a source drawer.", "source-appendix")}</article><aside>${panel("Fact Rail", `<nav class="fact-nav">${navItems([["ShieldCheck", "Core question", "core-question"], ["ListChecks", "Implementation", "implementation"], ["ScrollText", "Sources", "source-appendix"]])}</nav><p>Use for dates, owners, status, related records, and attachment metadata.</p>`, "ScrollText", "fact-rail")}</aside></main>`;
}

function tabsHtml(option) {
  return `<header class="tab-head"><p class="eyebrow">${escapeHtml(option.source)}</p><h1>${icon("Presentation")} ${option.sampleTitle}</h1><p>${escapeHtml(option.bestFor)}</p><div class="tab-stats">${metric("Modules", "5", "facilitation flow", "Blocks")} ${metric("Actions", "12", "tracked", "ClipboardCheck")} ${metric("Artifacts", "3", "embedded", "Download")}</div></header>
  <nav class="tabs-nav">${[["PlayCircle", "Frame"], ["MessagesSquare", "Scenarios"], ["ShieldAlert", "Risks"], ["Target", "Actions"]].map(([iconName, name], i) => `<button class="${i === 0 ? "active" : ""}" data-tab="${i}">${icon(iconName)} ${name}</button>`).join("")}</nav>
  <main>${["Frame the session", "Scenario cards", "Risk review", "Action plan"].map((title, i) => `<section class="tab-section ${i === 0 ? "active" : ""}" data-tab-panel="${i}"><h2>${title}</h2><div class="tab-grid">${card("Reader task", "Scan, discuss, decide, and export only what must travel separately.", "Target")}${card("Source rule", "Local text is rendered in the HTML. CSV/PDF style artifacts can be downloaded.", "FileText")}${card("Packaging", "Inline CSS and JS, strict audit, no adjacent runtime files.", "PackageCheck")}</div></section>`).join("")}</main>`;
}

function galleryHtml(option) {
  const figures = [
    ["Instruction following", "quality", "Prompt follows the target scene, count constraints, and object relationships.", 88],
    ["Text rendering", "quality", "Checks whether generated text remains legible and faithful to the prompt.", 84],
    ["Style transfer", "quality", "Compares requested design language with visible output traits.", 80],
    ["Safety refusals", "governance", "Captures model limits and refusal behaviour for risky visual prompts.", 76],
    ["Prompt provenance", "governance", "Keeps prompt, seed, model, source path, and reviewer notes close to the figure.", 72],
    ["Rubric scoring", "limits", "Shows how inspection criteria translate into a repeatable review record.", 68],
  ];
  return `<div class="gal-shell"><aside><h1>${icon("Images")} ${option.sampleTitle}</h1><p>${option.bestFor}</p><nav class="gal-nav">${navItems([["Eye", "Overview", "overview"], ["Images", "Figures", "figures"], ["ListChecks", "Rubric", "rubric"], ["ScrollText", "Sources", "sources"]])}</nav><div class="gal-filters"><button class="active" data-gallery-filter="all">${icon("Eye")} All</button><button data-gallery-filter="quality">${icon("BadgeCheck")} Quality</button><button data-gallery-filter="limits">${icon("SlidersHorizontal")} Limits</button><button data-gallery-filter="governance">${icon("Scale")} Governance</button></div></aside><main>
    <section id="overview" class="gal-intro"><p class="eyebrow">${escapeHtml(option.source)}</p><h2>Visual review as a portable evidence pack</h2><p>Use this option when the report needs image-first scanning plus source-backed detail. The packaged page keeps every figure, rubric note, and review comment available from a single file.</p></section>
    <section id="figures" class="gal-grid">${figures.map(([name, category, note, score], index) => `<article data-gallery-card data-category="${category}" id="${slugify(name)}"><a href="#detail-${slugify(name)}"><img src="${figureDataUri(name, index)}" alt="${escapeAttr(`${name} placeholder visual`)}"></a><div><span>${category}</span><strong>${name}</strong><em>${score}/100</em><p>${note}</p><a href="#detail-${slugify(name)}">${icon("ExternalLink")} Review notes</a></div></article>`).join("")}</section>
    <section class="gal-details" aria-label="Figure review notes">${figures.map(([name, category, note, score]) => `<article id="detail-${slugify(name)}"><h3>${icon("Image")} ${name}</h3><p><strong>Category:</strong> ${category}. <strong>Score:</strong> ${score}/100.</p><p>${note}</p><p>Implementation pattern: keep prompt text, source file path, generation settings, and evaluator comments in this detail section, not in a detached text download.</p><a href="#${slugify(name)}">${icon("ArrowLeft")} Back to figure</a></article>`).join("")}</section>
    <section id="rubric" class="gal-note"><h2>${icon("ListChecks")} Rubric</h2><p>Score visual examples against instruction following, legibility, source traceability, risk handling, and evidence value. CSV export is acceptable when the table must be reused elsewhere, but the readable rubric belongs in the HTML.</p></section>
    <section id="sources" class="gal-note"><h2>${icon("ScrollText")} Source and provenance</h2><p>Every source prompt, reviewer note, and local text artifact should be rendered inside this page. Only binary or tabular artifacts that need separate distribution should be materialized as downloads.</p></section>
  </main></div>`;
}

function workshopReportHtml(option) {
  const sessions = [
    ["09:30", "Welcome and workshop frame", "Workshop chair", "Sets up the event as a practical look at better research operations, evidence handling, and reusable reporting.", "Frame expectations, orient the audience, and connect the event to the report outputs."],
    ["09:45", "Building repeatable research workflows", "Practice lead", "Demonstrates how a team can move from ad hoc notes to structured project records, reusable prompts, and source-backed reports.", "Use content structure, provenance, and review checkpoints to keep work grounded."],
    ["10:15", "Evidence capture and review", "Evidence lead", "Shows how source material, screenshots, decisions, and reviewer notes can be organized without losing context.", "Treat evidence as report content first and downloadable artifacts only when reuse requires it."],
    ["10:45", "Breakout: tool choices and boundaries", "Facilitation team", "Groups identify which tools belong in the workflow, where private data must stay out, and what checks are required before sharing.", "The report should preserve decisions, risks, and unresolved questions in one file."],
    ["11:20", "From workshop notes to shareable report", "Reporting lead", "Connects session notes, slide images, decisions, and follow-up actions into a browser-openable workshop report.", "Build the normal site first, then package the selected images and source text."],
    ["11:45", "Panel discussion and Q&A", "Panel", "Turns the workshop into questions about adoption, support, governance, and long-term maintenance.", "Capture unanswered questions as follow-up work."],
    ["12:00", "Close and next actions", "Workshop chair", "Confirms owners, deadlines, outputs, and the next review point.", "Event reports should preserve follow-up pathways and materials in the same distributable file."],
  ];
  const images = option.images || [];
  return `<div class="workshop-shell">
    <aside class="work-nav"><h1>${icon("Presentation")} Research Practice Workshop</h1><p>12 May 2026 / Learning Studio</p>${navItems([["Home", "Overview", "overview"], ["CalendarClock", "Programme", "programme"], ["MessagesSquare", "Sessions", "sessions"], ["Images", "Slides", "slides"], ["UsersRound", "Roles", "speakers"], ["FileArchive", "Materials", "materials"], ["ScrollText", "Provenance", "provenance"]])}</aside>
    <main>
      <section id="overview" class="work-hero"><div><p class="eyebrow">${escapeHtml(option.source)}</p><h1>${escapeHtml(option.sampleTitle)}</h1><p>Detailed single-file event report with embedded slide-style imagery, programme notes, session summaries, role references, materials, and provenance. This is the shape to use when replacing a PDF or PowerPoint with a richer browser-openable report.</p><div class="work-facts">${fact("Date", "12 May 2026", "Calendar")} ${fact("Time", "09:30-12:15", "CalendarClock")} ${fact("Venue", "Learning Studio", "Home")} ${fact("Organiser", "Research Operations Team", "UsersRound")}</div></div>${images[0] ? `<figure><img src="${images[0].src}" alt="${escapeAttr(images[0].caption)}"><figcaption>${escapeHtml(images[0].caption)}</figcaption></figure>` : ""}</section>
      <section id="programme" class="work-section"><h2>${icon("CalendarClock")} Programme</h2><div class="programme-list">${sessions.map(([time, title, speaker]) => `<article><time>${time}</time><div><h3>${title}</h3><p>${speaker}</p></div></article>`).join("")}</div></section>
      <section id="sessions" class="work-section"><h2>${icon("MessagesSquare")} Session Notes</h2><div class="session-list">${sessions.map(([time, title, speaker, summary, takeaway]) => `<article id="${slugify(title)}"><span>${time}</span><h3>${title}</h3><p class="speaker">${speaker}</p><p>${summary}</p><p><strong>Reusable report pattern:</strong> ${takeaway}</p></article>`).join("")}</div></section>
      <section id="slides" class="work-section"><h2>${icon("Images")} Embedded Slide Evidence</h2><p>These images are embedded directly as Base64 data URIs from the local extracted presentation assets. A final report can use the same pattern for selected slides while preserving all explanatory text in the HTML.</p><div class="slide-grid">${images.map((image, index) => `<figure id="slide-${index + 1}"><img src="${image.src}" alt="${escapeAttr(image.caption)}"><figcaption><strong>${escapeHtml(image.title)}</strong><span>${escapeHtml(image.path)}</span>${escapeHtml(image.caption)}</figcaption></figure>`).join("")}</div></section>
      <section id="speakers" class="work-section"><h2>${icon("UsersRound")} Roles</h2><div class="speaker-grid">${["Workshop chair: event framing and close", "Practice lead: workflow design and source structure", "Evidence lead: capture, review, and provenance", "Facilitation team: breakout support and decision capture", "Reporting lead: single-file report packaging", "Panel: questions, risks, and adoption planning"].map((item) => {
        const [name, role] = item.split(": ");
        return `<article><h3>${icon("UserRound")} ${name}</h3><p>${role}</p></article>`;
      }).join("")}</div></section>
      <section id="materials" class="work-section"><h2>${icon("FileArchive")} Materials</h2><div class="materials-grid">${card("Deck-derived screenshots", "Selected slide screenshots are embedded in the page. Full slide decks can remain separate downloads only when they need separate distribution.", "Images")}${card("Session notes", "Markdown notes and summaries should become readable sections, speaker pages, appendices, or source drawers.", "FileText")}${card("Follow-up resources", "Links to live resources can be cited, but local text and decisions should not be stranded outside the HTML.", "Link2")}</div></section>
      <section id="provenance" class="work-section provenance"><h2>${icon("ScrollText")} Provenance</h2><p>Source fixture: <code>synthetic-workshop-fixture</code></p><p>This sample uses generated content and synthetic slide-style images. It demonstrates the report structure without embedding private event material, personal data, browser state, or local source paths.</p></section>
    </main>
  </div>`;
}

function optionHeader(option) {
  return `<header class="option-head"><div><p class="eyebrow">${escapeHtml(option.webType)} / ${escapeHtml(option.source)}</p><h1>${icon("LayoutDashboard")} ${escapeHtml(option.sampleTitle)}</h1><p>${escapeHtml(option.bestFor)}</p></div><div class="chips"><span>${icon("FileText")} Single file</span><span>${icon("WifiOff")} No remote assets</span><span>${icon("ScrollText")} Source text embedded</span></div></header>`;
}

function metric(label, value, note, iconName = "Activity") {
  return `<article class="metric"><div class="metric-icon">${icon(iconName)}</div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><em>${escapeHtml(note)}</em></article>`;
}

function panel(title, body, iconName = "FileText", id = "") {
  const attr = id ? ` id="${escapeAttr(id)}"` : "";
  return `<article class="panel"${attr}><h2>${icon(iconName)} ${escapeHtml(title)}</h2>${body}</article>`;
}

function bars(labels, values) {
  return labels.map((label, i) => `<div class="bar"><span>${label}</span><i style="height:${values[i]}%"></i></div>`).join("");
}

function hBars(items) {
  return items.map(([label, value]) => `<div class="hbar"><span>${label}</span><div><i style="width:${value}%"></i></div><b>${value}%</b></div>`).join("");
}

function donutLegend() {
  return `<div class="donut"><div></div><ul><li>Enabled 42%</li><li>Pending 56%</li><li>Deleted 2%</li></ul></div>`;
}

function tableRows() {
  return `<table><tr><th>Rank</th><th>Account</th><th>Messages</th></tr><tr><td>1</td><td>department@example.edu</td><td>4,812</td></tr><tr><td>2</td><td>team@example.edu</td><td>3,906</td></tr><tr><td>3</td><td>unit@example.edu</td><td>2,804</td></tr></table>`;
}

function fact(label, value, iconName = "Info") {
  return `<div class="fact"><small>${icon(iconName)} ${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
}

function articleSection(title, body, id = "") {
  const attr = id ? ` id="${escapeAttr(id)}"` : "";
  return `<section class="article-section"${attr}><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p><p>The implementation should preserve the authored content model, expose source/provenance text inside the page, and keep only true artifacts as downloads.</p></section>`;
}

function card(title, body, iconName = "FileText") {
  return `<article class="small-card"><h3>${icon(iconName)} ${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
}

function navItems(items) {
  return items.map((item, i) => {
    const [iconName, label, id] = Array.isArray(item) ? item : ["ChevronRight", item, slugify(item)];
    return `<a class="${i === 0 ? "active" : ""}" href="#${escapeAttr(id || slugify(label))}">${icon(iconName)} ${escapeHtml(label)}</a>`;
  }).join("");
}

function exportCards() {
  return `<div class="export-grid">${card("Embedded source appendix", "Narrative, Markdown, and JSON summaries are rendered in the page.", "ScrollText")}${card("CSV attachment", "Tabular data can be materialized with a Blob URL when the user needs a separate file.", "FileSpreadsheet")}</div>`;
}

function baseCss() {
  return `*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}h1,h2,h3,p{margin-top:0}button,input,select{font:inherit}.icon{width:1em;height:1em;display:inline-block;vertical-align:-.16em;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.eyebrow{text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.08em}.metric{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:14px;display:grid;gap:3px;position:relative}.metric-icon{position:absolute;right:12px;top:12px;color:var(--accent);font-size:22px;opacity:.9}.metric strong{font-size:30px;line-height:1}.metric span{color:var(--muted);font-weight:700}.metric em{font-style:normal;color:var(--accent);font-size:13px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:18px}.panel h2{font-size:18px;display:flex;gap:8px;align-items:center}.bar{height:180px;display:inline-grid;align-items:end;gap:8px;margin-right:14px}.bar i{display:block;width:28px;background:var(--accent);border-radius:8px 8px 0 0}.bar span{font-size:12px;color:var(--muted)}.hbar{display:grid;grid-template-columns:96px 1fr 42px;gap:10px;align-items:center;margin:10px 0}.hbar div{height:10px;background:var(--soft);border-radius:99px;overflow:hidden}.hbar i{display:block;height:100%;background:var(--accent)}table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid var(--line);padding:9px;text-align:left}.fact{border:1px solid var(--line);background:var(--panel);padding:12px;border-radius:8px}.fact small{display:flex;gap:6px;align-items:center;text-transform:uppercase;font-size:11px;font-weight:800;color:var(--muted)}.fact strong{display:block;margin-top:3px}.small-card{border:1px solid var(--line);background:var(--panel);border-left:5px solid var(--accent);padding:16px;border-radius:8px}.small-card h3{display:flex;gap:8px;align-items:center}.small-card p{color:var(--muted)}@media(max-width:900px){.ana-grid,.cat-layout,.com-shell,.dos-content,.gal-shell{grid-template-columns:1fr!important}.ana-rail,.cat-filter,.com-shell aside{position:static!important;height:auto!important}.ana-metrics,.cat-stats,.tab-stats{grid-template-columns:1fr 1fr!important}}@media(max-width:560px){.ana-metrics,.cat-stats,.tab-stats,.tab-grid,.com-facts{grid-template-columns:1fr!important}}`;
}

function optionCss(name) {
  const map = {
    analytics: `:root{--bg:#f7f2ea;--panel:#fffdfa;--ink:#143347;--muted:#617487;--accent:#176d6d;--soft:#dceeed;--line:#eadfce}.analytics{background:linear-gradient(180deg,#efe7d8,#faf7f1);color:var(--ink)}.analytics-shell{display:grid;grid-template-columns:190px 1fr;min-height:100vh}.ana-rail{background:#f5eee2;border-right:1px solid var(--line);padding:78px 8px;display:grid;align-content:start;gap:8px}.ana-rail a{padding:13px 18px;border-radius:8px;text-decoration:none;color:var(--ink)}.ana-rail a.active{background:#f4ebdc;border-left:3px solid #c78616;color:#9a650f}.ana-main{padding:24px}.option-head{display:flex;justify-content:space-between;gap:20px;align-items:start}.option-head h1{font-size:42px;line-height:1.05}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:9px 12px}.ana-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.ana-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:14px}.ana-grid .panel:last-child{grid-column:span 2}.donut{display:grid;grid-template-columns:100px 1fr;gap:18px;align-items:center}.donut div{width:96px;height:96px;border-radius:50%;background:conic-gradient(#176d6d 0 42%,#f0ab2f 42% 98%,#d75a4a 98%)}.donut li{margin:6px 0;color:var(--muted)}`,
    catalogue: `:root{--bg:#f3f2f1;--panel:#fff;--ink:#0b0c0c;--muted:#505a5f;--accent:#002147;--soft:#e8eef8;--line:#d4d6d8}.catalogue{background:var(--bg);color:var(--ink)}.cat-head{background:var(--accent);color:#fff;padding:18px 22px;display:flex;justify-content:space-between}.cat-head h1{font-size:24px}.cat-head p{color:rgba(255,255,255,.72)}.cat-head button{background:transparent;border:2px solid rgba(255,255,255,.4);color:#fff;padding:7px 10px}.cat-layout{max-width:1400px;margin:0 auto;padding:20px;display:grid;grid-template-columns:280px 1fr;gap:20px}.cat-filter{position:sticky;top:20px;align-self:start;background:#fff;border:1px solid var(--line);padding:16px;display:grid;gap:14px}.cat-filter label{display:grid;gap:6px;font-weight:800;font-size:13px}.cat-filter input,.cat-filter select{border:2px solid #0b0c0c;border-radius:0;padding:8px}.cat-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}.cat-card{background:#fff;border:1px solid var(--line);border-left:5px solid var(--accent);padding:20px;margin-bottom:12px}.cat-card h2{font-size:21px}.cat-card p{color:var(--muted)}.pill{display:inline-flex;background:var(--accent);color:#fff;padding:3px 8px;font-size:12px;font-weight:800;text-transform:uppercase;margin-right:4px}.pill.warn{background:#f47738}.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;border-top:1px solid var(--line);padding-top:10px}.meta-grid span{color:var(--muted);font-size:12px}.meta-grid b{color:var(--ink);font-size:14px}.empty-state{background:#fff;border:2px dashed var(--line);padding:18px;color:var(--muted);font-weight:800}`,
    committee: `:root{--bg:#f5f5f7;--panel:#fff;--ink:#1d1d1f;--muted:#6e6e73;--accent:#0066cc;--soft:#e8f0fe;--line:#e5e5e7}.committee{background:var(--bg);color:var(--ink)}.com-landing{background:#fff;padding:52px max(24px,calc((100vw - 1180px)/2));border-bottom:1px solid var(--line)}.com-landing h1{font-size:48px;line-height:1.05}.com-landing>p:not(.eyebrow){max-width:64ch;color:#424245}.com-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px}.com-shell{display:grid;grid-template-columns:250px 1fr}.com-shell aside{position:sticky;top:0;height:100vh;background:#fff;border-right:1px solid var(--line);padding:18px;display:grid;align-content:start;gap:4px}.com-shell aside a{padding:8px 10px;border-radius:8px;text-decoration:none;color:#424245}.com-shell aside a.active{background:var(--soft);color:var(--accent);font-weight:800}.com-shell main{padding:34px max(24px,calc((100vw - 940px)/2));}.article-section{background:#fff;border:1px solid var(--line);border-radius:8px;padding:28px;margin-bottom:16px}.article-section h2{font-size:28px}.article-section p{max-width:70ch;color:#424245}`,
    dossier: `:root{--bg:#f3f2f1;--panel:#fff;--ink:#0b0c0c;--muted:#505a5f;--accent:#002147;--soft:#fef9ec;--line:#d4d6d8}.dossier{background:var(--bg);color:var(--ink)}.dos-hero{background:var(--accent);color:#fff;padding:38px max(24px,calc((100vw - 1160px)/2));display:grid;grid-template-columns:1fr 320px;gap:28px}.dos-hero h1{font-size:48px;line-height:1.08}.dos-hero p{color:rgba(255,255,255,.75);max-width:60ch}.dos-hero .eyebrow{color:#c7a23c}.dos-meta{display:grid;gap:10px}.dos-meta .fact{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);border-left:4px solid #c7a23c}.dos-content{max-width:1160px;margin:0 auto;padding:28px 24px;display:grid;grid-template-columns:1fr 280px;gap:22px}.dos-content aside{position:sticky;top:20px;align-self:start}.article-section{background:#fff;border:1px solid var(--line);padding:28px;margin-bottom:14px}.article-section p{font-family:Georgia,serif;font-size:19px;line-height:1.65;color:var(--muted)}`,
    tabs: `:root{--bg:#fff;--panel:#f8f8f8;--ink:#0b0c0c;--muted:#505a5f;--accent:#002147;--soft:#e8eef8;--line:#d4d6d8}.tabs{background:#fff;color:var(--ink)}.tab-head{background:var(--accent);color:#fff;padding:30px max(24px,calc((100vw - 1120px)/2)) 20px}.tab-head h1{font-size:40px;line-height:1.08}.tab-head p{color:rgba(255,255,255,.7)}.tab-head .eyebrow{color:#c7a23c}.tab-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:920px}.tab-stats .metric{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:#fff}.tabs-nav{background:var(--accent);border-bottom:3px solid #c7a23c;padding:0 max(24px,calc((100vw - 1120px)/2));display:flex}.tabs-nav button{border:0;background:transparent;color:rgba(255,255,255,.55);padding:13px 20px;font-weight:800}.tabs-nav button.active{background:rgba(255,255,255,.08);color:#fff}.tab-section{display:none;max-width:1120px;margin:0 auto;padding:32px 24px}.tab-section.active{display:block}.tab-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}`,
    gallery: `:root{--bg:#151515;--panel:#f8f5ef;--ink:#191919;--muted:#6b665e;--accent:#dc2626;--soft:#f2ddd9;--line:#d8d0c3}.gallery{background:var(--bg);color:var(--ink)}.gal-shell{min-height:100vh;display:grid;grid-template-columns:310px 1fr}.gal-shell aside{background:#0b0b0b;color:#fff;padding:28px;position:sticky;top:0;height:100vh;overflow:auto}.gal-shell aside h1{font-size:34px;line-height:1.05}.gal-shell aside p{color:rgba(255,255,255,.72)}.gal-nav{display:grid;gap:6px;margin:18px 0}.gal-nav a{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:9px 10px}.gal-nav a.active{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.28)}.gal-filters{display:flex;flex-wrap:wrap;gap:8px}.gal-filters button{border:1px solid rgba(255,255,255,.25);background:transparent;color:#fff;border-radius:8px;padding:8px 10px}.gal-filters button.active{background:var(--accent);border-color:var(--accent)}.gal-shell main{padding:26px}.gal-intro,.gal-note,.gal-details article{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:22px;margin-bottom:14px}.gal-intro h2{font-size:34px;line-height:1.08}.gal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:14px}.gal-grid article{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}.gal-grid img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}.gal-grid div{padding:13px;display:grid;gap:6px}.gal-grid span{color:var(--muted);text-transform:uppercase;font-size:12px;font-weight:800}.gal-grid em{font-style:normal;color:var(--accent);font-weight:800}.gal-grid a,.gal-details a{color:var(--accent);font-weight:800;text-decoration:none}.gal-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.gal-details article{margin:0}@media(max-width:900px){.gal-grid,.gal-details{grid-template-columns:1fr 1fr}}@media(max-width:560px){.gal-grid,.gal-details{grid-template-columns:1fr}}`,
    workshop: `:root{--bg:#f6f1e8;--panel:#fffdf8;--ink:#102235;--muted:#5e6b78;--accent:#0d5f7a;--soft:#dbeaf0;--line:#e4d9c7}.workshop{background:var(--bg);color:var(--ink)}.workshop-shell{display:grid;grid-template-columns:270px 1fr;min-height:100vh}.work-nav{position:sticky;top:0;height:100vh;background:#071b33;color:#fff;padding:24px;overflow:auto}.work-nav h1{font-size:24px;line-height:1.08}.work-nav p{color:rgba(255,255,255,.68);font-size:13px}.work-nav a{display:flex;gap:8px;align-items:center;color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:9px 10px;margin:6px 0}.work-nav a.active{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3)}.workshop-shell main{min-width:0}.work-hero{display:grid;grid-template-columns:1fr minmax(320px,44%);gap:26px;align-items:center;padding:34px max(24px,calc((100vw - 1180px)/2));background:#fffdf8;border-bottom:1px solid var(--line)}.work-hero h1{font-size:54px;line-height:1.02}.work-hero p{font-size:18px;color:var(--muted);max-width:68ch}.work-hero figure,.slide-grid figure{margin:0;background:#fff;border:1px solid var(--line);border-radius:8px;overflow:hidden}.work-hero img,.slide-grid img{width:100%;display:block}.work-hero figcaption,.slide-grid figcaption{padding:10px 12px;color:var(--muted);font-size:13px}.work-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}.work-section{padding:30px max(24px,calc((100vw - 1180px)/2));border-bottom:1px solid var(--line)}.work-section h2{font-size:30px;display:flex;gap:9px;align-items:center}.programme-list{display:grid;gap:10px}.programme-list article{display:grid;grid-template-columns:78px 1fr;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px}.programme-list time{color:var(--accent);font-weight:900}.programme-list h3,.programme-list p{margin:0}.session-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.session-list article,.speaker-grid article{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:18px}.session-list span{font-weight:900;color:var(--accent)}.speaker{font-weight:800;color:var(--muted)}.slide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}.slide-grid figcaption{display:grid;gap:4px}.slide-grid figcaption strong{color:var(--ink)}.slide-grid figcaption span{font-family:ui-monospace,monospace;font-size:11px;color:var(--muted);overflow-wrap:anywhere}.speaker-grid,.materials-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.provenance code{background:#fff;border:1px solid var(--line);border-radius:6px;padding:2px 5px;overflow-wrap:anywhere}@media(max-width:980px){.workshop-shell,.work-hero{grid-template-columns:1fr}.work-nav{position:static;height:auto}.session-list,.speaker-grid,.materials-grid,.slide-grid{grid-template-columns:1fr}.work-facts{grid-template-columns:1fr 1fr}}@media(max-width:560px){.work-hero h1{font-size:36px}.work-facts{grid-template-columns:1fr}}`,
  };
  return map[name];
}

function runtimeJs() {
  return `function filterRecords(){const q=(document.querySelector("[data-record-search]")?.value||"").toLowerCase();const type=document.querySelector("[data-record-type]")?.value||"all";const status=document.querySelector("[data-record-status]")?.value||"all";let shown=0;document.querySelectorAll("[data-record-card]").forEach(card=>{const okText=!q||card.dataset.title.includes(q);const okType=type==="all"||card.dataset.type===type;const okStatus=status==="all"||card.dataset.status===status;const visible=okText&&okType&&okStatus;card.hidden=!visible;if(visible)shown+=1;});const empty=document.querySelector("[data-record-empty]");if(empty)empty.hidden=shown!==0;}document.addEventListener("input",(event)=>{if(event.target.matches("[data-record-search]"))filterRecords();});document.addEventListener("change",(event)=>{if(event.target.matches("[data-record-type],[data-record-status]"))filterRecords();});document.addEventListener("click",(event)=>{const tab=event.target.closest("[data-tab]");if(tab){document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===tab));document.querySelectorAll("[data-tab-panel]").forEach(p=>p.classList.toggle("active",p.dataset.tabPanel===tab.dataset.tab));}const filter=event.target.closest("[data-gallery-filter]");if(filter){const category=filter.dataset.galleryFilter;document.querySelectorAll("[data-gallery-filter]").forEach(button=>button.classList.toggle("active",button===filter));document.querySelectorAll("[data-gallery-card]").forEach(card=>{card.hidden=category!=="all"&&card.dataset.category!==category;});}});`;
}

function icon(name) {
  const paths = {
    Activity: '<path d="M22 12h-4l-3 8-6-16-3 8H2"/>',
    ArrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    BadgeCheck: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.75Z"/><path d="m9 12 2 2 4-4"/>',
    BarChart3: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    Blocks: '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
    BookOpenText: '<path d="M12 7v14"/><path d="M16 12h2"/><path d="M16 8h2"/><path d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/><path d="M6 12h2"/><path d="M6 8h2"/>',
    Calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    CalendarClock: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><circle cx="16" cy="16" r="6"/><path d="M16 14v2l1 1"/>',
    CheckCircle2: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    ChevronRight: '<path d="m9 18 6-6-6-6"/>',
    ClipboardCheck: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    ClipboardList: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    Contact: '<path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect width="18" height="18" x="3" y="4" rx="2"/><circle cx="12" cy="10" r="2"/>',
    Database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    Download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    ExternalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    Eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    FileArchive: '<path d="M10 12v-1"/><path d="M10 18v-2"/><path d="M10 7V6"/><path d="M14 2v6h6"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>',
    FileCheck2: '<path d="M14 2v6h6"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="m9 15 2 2 4-4"/>',
    FileSpreadsheet: '<path d="M14 2v6h6"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9v8"/>',
    FileText: '<path d="M14 2v6h6"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    FileWarning: '<path d="M14 2v6h6"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M12 17h.01"/><path d="M12 11v3"/>',
    Filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    Home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    Image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    Images: '<path d="M18 22H4a2 2 0 0 1-2-2V6"/><rect width="16" height="16" x="6" y="2" rx="2"/><circle cx="12" cy="8" r="2"/><path d="m22 16-3-3a2 2 0 0 0-2.8 0L10 19"/>',
    Info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    Layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    LayoutDashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    Link2: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>',
    ListChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    MessageSquare: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    MessagesSquare: '<path d="M14 9a4 4 0 0 1 4 4v4l3 3V9a4 4 0 0 0-4-4h-4"/><path d="M3 7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H8l-5 5z"/>',
    Network: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M12 8v3"/>',
    PackageCheck: '<path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><path d="M3.29 7 12 12l8.71-5"/><path d="M12 22V12"/>',
    PanelLeftClose: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
    PieChart: '<path d="M21 12c.6 4.4-2.7 8.4-7.1 8.9A9 9 0 1 1 11 3v9z"/><path d="M21 12A9 9 0 0 0 12 3v9z"/>',
    PlayCircle: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
    Presentation: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
    Route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    Scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    ScrollText: '<path d="M8 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8"/><path d="M10 17h8"/><path d="M10 13h8"/><path d="M10 9h8"/><path d="M2 21h6"/><path d="M2 3h6"/><path d="M5 3v18"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    ShieldAlert: '<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.5a1.3 1.3 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    ShieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.5a1.3 1.3 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    SlidersHorizontal: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><circle cx="12" cy="4" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="14" cy="20" r="2"/>',
    Table2: '<path d="M9 3H5a2 2 0 0 0-2 2v4h6z"/><path d="M9 3h10a2 2 0 0 1 2 2v4H9z"/><path d="M9 9h12v10a2 2 0 0 1-2 2H9z"/><path d="M9 9H3v10a2 2 0 0 0 2 2h4z"/>',
    Tag: '<path d="M12.6 2H2v10.6L11.4 22 22 11.4z"/><circle cx="7" cy="7" r="1"/>',
    Target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    UserRound: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    UsersRound: '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20a6 6 0 0 0-5-5.8"/><path d="M17 3.2a5 5 0 0 1 0 9.6"/>',
    WifiOff: '<path d="M12 20h.01"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.8A15 15 0 0 1 9.3 5"/><path d="M16.7 5A15 15 0 0 1 22 8.8"/><path d="m2 2 20 20"/>',
    Wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-3-3z"/>',
    X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  };
  const pathData = paths[name] || paths.Info;
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${pathData}</svg>`;
}

function figureDataUri(label, index) {
  const color = ["#dc2626", "#0f766e", "#2563eb", "#b45309", "#111827", "#7c3aed"][index % 6];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675"><rect width="900" height="675" fill="#f8f5ef"/><rect x="70" y="70" width="760" height="535" rx="24" fill="white"/><circle cx="210" cy="210" r="115" fill="${color}" opacity=".18"/><path d="M120 510 310 310l130 140 145-210 210 270z" fill="${color}" opacity=".78"/><text x="120" y="160" font-family="Arial" font-size="42" font-weight="700" fill="#191919">${escapeHtml(label)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function faviconDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111827"/><path d="M16 18h32v7H16zm0 13h32v7H16zm0 13h20v7H16z" fill="#f8fafc"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
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
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const generatedRoot = path.join(repoRoot, "examples/generated");

async function main() {
  run("node", ["single-html-document/scripts/build-sample-websites.mjs"]);
  const manifest = JSON.parse(await readFile(path.join(generatedRoot, "manifest.json"), "utf8"));
  const results = [];

  for (const sample of manifest.samples) {
    const singlePath = path.resolve(repoRoot, sample.singleFile);
    const html = await readFile(singlePath, "utf8");
    const checks = [
      ["has inline attachment manifest", html.includes("window.__ATTACHMENTS__")],
      ["has incorporated source appendix", html.includes("Source Appendix")],
      ["has no external stylesheet tag", !/<link[^>]+rel=["']stylesheet["']/i.test(html)],
      ["has no external script tag", !/<script[^>]+src=/i.test(html)],
      ["has data favicon", /rel=["']icon["'][^>]+data:image\/svg\+xml/i.test(html)],
    ];
    for (const [label, passed] of checks) {
      if (!passed) {
        throw new Error(`${sample.slug}: failed check "${label}"`);
      }
    }
    run("node", ["single-html-document/scripts/audit-single-html.mjs", sample.singleFile, "--strict"]);
    results.push({
      slug: sample.slug,
      size: (await stat(singlePath)).size,
      checks: checks.length,
    });
  }

  console.log("\nSample verification passed:");
  for (const result of results) {
    console.log(`- ${result.slug}: ${formatBytes(result.size)}, ${result.checks} static checks, strict audit passed`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout.trim()) process.stdout.write(`${result.stdout.trim()}\n`);
  if (result.stderr.trim()) process.stderr.write(`${result.stderr.trim()}\n`);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
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

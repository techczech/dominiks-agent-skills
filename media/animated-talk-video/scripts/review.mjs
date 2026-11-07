#!/usr/bin/env node
// Review page and feedback server for a project. Thin wrapper over the kit's tools/review-page.mjs.
// usage: node review.mjs <project>            writes <project>/review/review.html (re-run after every change to index.html or scenes.json)
//        node review.mjs serve <project>      serves it on 127.0.0.1:4777 and saves notes to <project>/review/feedback/. Stop it (Ctrl+C) when the session ends.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'
const here = path.dirname(fileURLToPath(import.meta.url))
const tool = [path.join(here, '../kit/tools/review-page.mjs'), path.join(here, '../assets/kit/tools/review-page.mjs')].find(existsSync)
process.exit(spawnSync('node', [tool, ...process.argv.slice(2)], { stdio: 'inherit' }).status ?? 1)

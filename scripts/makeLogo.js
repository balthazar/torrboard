#!/usr/bin/env node
// Renders the bFlix mark to PNG for the invite email, which cannot use SVG:
// Gmail and Outlook both strip it. src/statics/bflix.svg stays the source of
// truth for the shape; this only rasterises it.
//
//   node scripts/makeLogo.js
//
// Requires rsvg-convert (brew install librsvg).
const { execFileSync } = require('child_process')
const path = require('path')

const statics = path.join(__dirname, '..', 'src', 'statics')
const src = path.join(statics, 'bflix.svg')
const out = path.join(statics, 'bflix.png')

execFileSync('rsvg-convert', [src, '-w', '256', '-h', '256', '-o', out], { stdio: 'inherit' })

console.log(`Wrote ${out}`)

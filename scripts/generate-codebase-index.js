#!/usr/bin/env node
/**
 * Walks src/ and generates codebase-index.json
 * Maps file paths to one-line descriptions based on content analysis
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')
const OUT = path.join(__dirname, 'codebase-index.json')

function describeFile(relPath, content) {
  const lines = content.split('\n').slice(0, 30).join('\n')
  const isPage = relPath.includes('/app/') && relPath.endsWith('page.tsx')
  const isRoute = relPath.endsWith('route.ts')
  const isComponent = relPath.includes('/components/')
  const isLib = relPath.includes('/lib/')
  const isContext = relPath.includes('/context')

  // Extract default export name or key identifiers
  const exportMatch = lines.match(/export\s+default\s+(?:async\s+)?function\s+(\w+)/)
  const name = exportMatch ? exportMatch[1] : ''

  if (isRoute) {
    const methods = []
    if (content.includes('export async function GET')) methods.push('GET')
    if (content.includes('export async function POST')) methods.push('POST')
    if (content.includes('export async function PATCH')) methods.push('PATCH')
    if (content.includes('export async function DELETE')) methods.push('DELETE')
    if (content.includes('export async function PUT')) methods.push('PUT')
    const route = relPath.replace(/\/route\.ts$/, '').replace(/^app\/api\//, 'API: /')
    return `${route} — ${methods.join(', ')} endpoint`
  }

  if (isPage) {
    const route = relPath.replace(/\/page\.tsx$/, '').replace(/^app\//, '/')
    return `Page: ${route || '/'} — ${name || 'page component'}`
  }

  if (isComponent) {
    const desc = []
    if (content.includes("'use client'")) desc.push('client')
    if (lines.includes('Modal') || lines.includes('modal')) desc.push('modal')
    if (lines.includes('Panel') || lines.includes('panel')) desc.push('panel')
    if (lines.includes('Sheet') || lines.includes('sheet')) desc.push('sheet')
    return `Component: ${name || path.basename(relPath, path.extname(relPath))}${desc.length ? ` (${desc.join(', ')})` : ''}`
  }

  if (isLib) {
    const basename = path.basename(relPath, path.extname(relPath))
    if (content.includes('export function')) {
      const fns = content.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || []
      const fnNames = fns.map(f => f.replace(/export\s+(async\s+)?function\s+/, '')).slice(0, 4)
      return `Library: ${basename} — exports ${fnNames.join(', ')}`
    }
    if (content.includes('export const')) {
      return `Library: ${basename} — constants and config`
    }
    return `Library: ${basename}`
  }

  if (isContext) {
    return `Context: ${name || path.basename(relPath, path.extname(relPath))}`
  }

  if (relPath.endsWith('.css')) {
    return `Stylesheet: ${path.basename(relPath)}`
  }

  return `${name || path.basename(relPath, path.extname(relPath))}`
}

function walk(dir, base) {
  const index = {}
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      Object.assign(index, walk(full, base))
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      const rel = path.relative(base, full).replace(/\\/g, '/')
      try {
        const content = fs.readFileSync(full, 'utf8')
        index[rel] = describeFile(rel, content)
      } catch {
        index[rel] = 'Could not read file'
      }
    }
  }
  return index
}

const index = walk(SRC, SRC)
fs.writeFileSync(OUT, JSON.stringify(index, null, 2))
console.log(`Generated codebase index: ${Object.keys(index).length} files → ${OUT}`)

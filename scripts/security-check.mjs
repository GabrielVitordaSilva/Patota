import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const root = new URL('../', import.meta.url)
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules'])
const checkedExtensions = new Set(['.html', '.js', '.jsx', '.md', '.sql'])
const findings = []

const rules = [
  {
    description: 'chave service_role ou JWT versionado',
    pattern: /(?:service_role\s*[=:]\s*['"]?eyJ|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/g
  },
  {
    description: 'execucao dinamica no navegador',
    pattern: /\b(?:eval|Function)\s*\(/g,
    extensions: new Set(['.js', '.jsx', '.html'])
  },
  {
    description: 'HTML injetado sem escape',
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/g,
    extensions: new Set(['.js', '.jsx', '.html'])
  },
  {
    description: 'SQL dinamico no banco',
    pattern: /\bEXECUTE\s+(?:FORMAT\s*\(|[^;]*\|\|)/gi,
    extensions: new Set(['.sql'])
  }
]

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue

    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await scan(path)
      continue
    }

    const extension = extname(entry.name)
    if (!checkedExtensions.has(extension)) continue

    const contents = await readFile(path, 'utf8')
    for (const rule of rules) {
      if (rule.extensions && !rule.extensions.has(extension)) continue
      for (const match of contents.matchAll(rule.pattern)) {
        const line = contents.slice(0, match.index).split('\n').length
        findings.push(`${relative(root.pathname, path)}:${line} — ${rule.description}`)
      }
    }
  }
}

await scan(root.pathname)

if (findings.length) {
  console.error(`Falha na verificacao de seguranca:\n${findings.join('\n')}`)
  process.exitCode = 1
} else {
  console.log('Verificacao estatica de seguranca concluida sem achados.')
}

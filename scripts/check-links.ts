// Checks the built page's links against expected-links.json.
// Usage: node scripts/check-links.ts [public-dir]   (Node 22.18 or later)
import { readFileSync } from "node:fs"
import { join } from "node:path"

type ExpectedLink = { source: string; href: string; text: string; rel: string[] }
type OmittedLink = { source: string; paragraphStartsWith: string; text: string }
type Expected = { page: string; links: ExpectedLink[]; omitted: OmittedLink[] }
type Anchor = { href: string | undefined; text: string; rel: string[] }

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  nbsp: " ",
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === "#") {
      const code =
        name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
      return String.fromCodePoint(code)
    }
    return ENTITIES[name.toLowerCase()] ?? match
  })
}

function textContent(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim()
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>()
  const pattern = /([^\s"'=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of source.matchAll(pattern)) {
    const name = match[1].toLowerCase()
    if (!attributes.has(name)) {
      attributes.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""))
    }
  }
  return attributes
}

function parseAnchors(html: string): Anchor[] {
  const anchors: Anchor[] = []
  for (const match of html.matchAll(/<a(\s[^>]*)?>([\s\S]*?)<\/a\s*>/gi)) {
    const attributes = parseAttributes(match[1] ?? "")
    const rel = (attributes.get("rel") ?? "").toLowerCase().split(/\s+/).filter(Boolean)
    anchors.push({ href: attributes.get("href"), text: textContent(match[2]), rel })
  }
  return anchors
}

function sameTokens(actual: string[], expected: string[]): boolean {
  const actualSet = new Set(actual)
  return (
    actualSet.size === new Set(expected).size && expected.every((token) => actualSet.has(token))
  )
}

function describe(anchor: Anchor | undefined): string {
  return anchor ? JSON.stringify(anchor) : "nothing"
}

function check({ publicDir }: { publicDir: string }): string[] {
  const expected: Expected = JSON.parse(
    readFileSync(new URL("../expected-links.json", import.meta.url), "utf8"),
  )
  const pagePath = join(publicDir, expected.page)
  const html = readFileSync(pagePath, "utf8").replace(/<!--[\s\S]*?-->/g, "")
  const failures: string[] = []

  const destinations = new Set(expected.links.map((link) => link.href))
  const found = parseAnchors(html).filter(
    (anchor) => anchor.href !== undefined && destinations.has(anchor.href),
  )
  if (found.length !== expected.links.length) {
    failures.push(
      `${expected.page}: expected ${expected.links.length} links to the destination, found ${found.length}`,
    )
  }
  expected.links.forEach((link, index) => {
    const anchor = found[index]
    const matches =
      anchor !== undefined &&
      anchor.href === link.href &&
      anchor.text === link.text &&
      sameTokens(anchor.rel, link.rel)
    if (!matches) {
      failures.push(
        `${link.source} link: expected ${JSON.stringify({ href: link.href, text: link.text, rel: link.rel })}, found ${describe(anchor)}`,
      )
    }
  })

  const paragraphs = [...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p\s*>/gi)].map(
    (match) => match[1],
  )
  for (const omitted of expected.omitted) {
    const paragraph = paragraphs.find((inner) =>
      textContent(inner).startsWith(omitted.paragraphStartsWith),
    )
    if (paragraph === undefined) {
      failures.push(`${omitted.source}: no paragraph starting "${omitted.paragraphStartsWith}"`)
    } else if (parseAnchors(paragraph).length > 0) {
      failures.push(`${omitted.source}: the link was rendered, expected it to be omitted`)
    } else if (!textContent(paragraph).includes(omitted.text)) {
      failures.push(
        `${omitted.source}: anchor text "${omitted.text}" is missing from the paragraph`,
      )
    }
  }
  return failures
}

const publicDir = process.argv[2] ?? "public"
let failures: string[]
try {
  failures = check({ publicDir })
} catch (error) {
  failures = [error instanceof Error ? error.message : String(error)]
}
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`)
  }
  process.exit(1)
}
console.log(
  "OK shortcode link has rel=nofollow, Markdown link has no rel, inline HTML link omitted",
)

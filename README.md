# Add nofollow to one Hugo Markdown link

A small Hugo project using a shortcode to add `rel="nofollow"` to one link. Raw HTML stays disabled. A plain Markdown link and an inline HTML link show what changes in the generated page.

The source was built locally with Hugo 0.169.0 on 10 November 2026. See the [recipe and recorded HTML](https://codingagentlinkbuilding.com/markdown-nofollow/hugo/). These examples are by LinkBunny, which publishes codingagentlinkbuilding.com.

The shortcode goes in `layouts/_shortcodes/nofollow.html`:

```go-html-template
<a href="{{ .Get "href" }}" rel="nofollow">{{ .Inner }}</a>
{{- /* Trim the trailing newline so the link sits inside the sentence. */ -}}
```

Use it inside a sentence:

```text
Logsift's {{< nofollow href="https://logsift.example/guides/job-logs" >}}guide to structured job logs{{< /nofollow >}} shows a format you can search later.
```

## Build and check

You need Hugo 0.169.0 (see `versions.txt`) and Node 22.18 or later.

```sh
hugo --destination public
node scripts/check-links.ts public
```

Then inspect `public/blog/retry-failed-jobs/index.html`. The shortcode link should contain `nofollow`; the ordinary Markdown link should have no rel; the raw HTML link should be omitted. `expected-links.json` lists what the check looks for, and it fails if any expected link is missing. Do not change the renderer's `unsafe` setting to make this example pass.

The GitHub Actions workflow runs the same build and check on Ubuntu with the Linux release of Hugo 0.169.0, after verifying the download against the release checksum.

## Files

- `hugo.toml`: minimal site configuration
- `content/blog/retry-failed-jobs.md`: the page with all three links
- `layouts/_shortcodes/nofollow.html`: the shortcode
- `layouts/single.html`, `layouts/list.html`: bare page templates
- `versions.txt`: the Hugo version used for the local build
- `expected-links.json`, `scripts/check-links.ts`: the link check

[Audit your own built HTML](https://codingagentlinkbuilding.com/built-link-audit/) in your browser. Other generators have [separate recipes](https://codingagentlinkbuilding.com/markdown-nofollow/).

## License

MIT. See `LICENSE`.

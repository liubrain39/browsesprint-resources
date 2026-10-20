# Public first-read network comparison

This author-run benchmark compares three ways to read the same eight public
pages from a fresh, independent GitHub-hosted Linux machine:

- Direct publisher HTML, extracted without executing scripts.
- BrowseSprint's existing public HTML-reading service.
- Playwright MCP 0.0.83 with one `browser_run_code_unsafe` call that navigates, waits for
  the fixed content conditions and reads the DOM in one batch.

It is a network and public-service experiment, **not** a benchmark of the
private BrowseSprint Reader package, Codex's internal native bridge, model
inference, or a completed installer. It does not establish majority-user benefit.
The code and analysis are AI-assisted and published by BrowseSprint's author.

Each attempt uses a fresh connection dispatcher or isolated browser. MCP and
the browser initialize to `about:blank` before the first-site timer starts;
that setup time is recorded separately. The browser tool disables automatic
snapshots and settling because the submitted code explicitly waits for the
required page content. TLS verification stays enabled. No image/resource
blocking is used. The browser may execute publisher scripts, while the two
HTML methods do not, so matching phrases do not establish equal live state.

Normal and controlled slow profiles run twice in reversed order. The slow
profile limits aggregate tunnel traffic to 64 KiB/s in each direction and adds
200 ms before each CONNECT. The local test proxy resolves with that machine's
ordinary system DNS and rejects private/shared/reserved IPv4 destinations.
OS, DNS, CDN and origin caches are not flushed or assumed cold. This is a cloud
machine, not a residential-network survey.

The same predeclared conditions are checked for every method. Failures remain
in the data. HTTP 429 stops later attempts for that site; the site is not replaced.
Raw page text is not written to the log: only titles, condition results, content
hashes, timing and transport measurements are retained.

Run `npm ci --ignore-scripts`, `npm test`, then install the pinned browser with
`node node_modules/@playwright/mcp/cli.js install-browser chromium --with-deps`.
`npm run bench` performs the experiment. `BENCH_SMOKE=1` only checks that an owned
blank browser can be controlled; it is not a webpage performance result.

The one-off workflow uses a standard Linux runner in this existing public
repository. It does not upload Actions artifacts or use dependency caches.
Completed rows are compressed into job-log lines so partial runs remain
recoverable. It has no schedule and no repository-write permissions.

References:

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [BrowseSprint](https://codexbrowse.site/)

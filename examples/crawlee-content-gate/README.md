# A Crawlee request can finish while a content check fails

This small example keeps Crawlee's request-processing result separate from an explicit check of the returned HTML. It makes one HTTPS request, extracts the page title and writes a JSON report. It does not recursively enqueue links.

## What was actually executed

On 2026-10-10, the example ran twice against the same project-owned public article, using Node **v22.16.0** and **@crawlee/cheerio 3.18.2 / @crawlee/core 3.18.2**. These were real HTTP fetches. The second invocation deliberately supplied a wrong title expectation; the site is not being described as broken.

Both responses were HTTP **200** and returned this title:

> Why Is Codex Browsing Slow? A Measurement Guide — BrowseSprint

| Invocation | Expected title fragment | requestsFinished | requestsFailed | Rows produced | Content checks passed | Process exit |
| --- | --- | --- | --- | --- | --- | --- |
| Correct condition | `Codex` | 1 | 0 | 1 | 1 | 0 |
| Deliberately wrong condition | `INTENTIONALLY_WRONG_BROWSESPRINT_TITLE` | 1 | 0 | 1 | 0 | 1 |

[The captured JSON](sample-output.json) preserves the two conditions, returned titles, status codes, result checks and process exit codes. It contains no timing comparison. Two requests to one page are not a performance benchmark or a reliability estimate.

## Run the example

Use Node 22 or a compatible Node version supported by the pinned dependencies. In this directory:

```sh
npm ci --no-audit --no-fund
node crawlee-content-gate.mjs https://codexbrowse.site/codex-browser-slow Codex
node crawlee-content-gate.mjs https://codexbrowse.site/codex-browser-slow INTENTIONALLY_WRONG_BROWSESPRINT_TITLE
```

The final command is expected to exit **1** even when its HTTP request finishes normally. Exit **0** means this limited example's content gate passed; exit **2** means the command arguments were invalid. Crawlee diagnostic lines may precede the final JSON in stdout.

For another page you own or are authorized to read, replace the URL and expected title fragment. This is an illustrative title check, not a complete definition of a correct scraping job. The expected fragment is matched case-sensitively.

## Why the two outcomes differ

The handler records `contentGatePassed: false` when the returned title does not contain the expectation. It returns normally instead of throwing. That deliberate choice lets the report keep the mismatch without retrying the same extraction as if it were a transport exception. The independent post-run gate then checks the request counters, row count and content result before setting the process exit code.

`rowsProduced` means records in this example's own in-memory array and printed JSON. The example does not save a Crawlee Dataset or verify durable storage. The zero `requestsFailed` value is Crawlee's final processing counter, not proof that the independent content condition passed.

The script uses concurrency 1, at most one request and zero retries. It disables the session pool and explicitly keeps TLS certificate verification enabled with `ignoreSslErrors: false`. No browser, JavaScript execution, credentials, form submission, CAPTCHA handling or cloud account is involved in these two runs.

## What this check leaves unresolved

A title match does not establish complete extraction, JavaScript-rendered state, backend delivery, editorial acceptance or search indexing. This is a working Crawlee HTTP example; it does not demonstrate a browser-agent integration, an LLM run, an extension or a speed improvement. A real task needs its own explicit content and completion rules.

The [BrowseSprint diagnostic guide](https://codexbrowse.site/codex-browser-slow) explains the broader exercise, while the [original result-verification field notes](../../docs/browser-result-verification.md) describe three separate public-outcome observations. Those resources have no measured speedup claim.

## Sources and disclosure

- [Crawlee CheerioCrawler API](https://crawlee.dev/js/api/cheerio-crawler/class/CheerioCrawler): HTTP parsing and the `run()` result.
- [Crawlee configuration API](https://crawlee.dev/js/api/core/class/Configuration): custom configuration and storage persistence.

I maintain BrowseSprint and the linked resources. This example and write-up were prepared with AI assistance and checked by executing the pinned packages. They are author-maintained materials, with no implied endorsement by Crawlee or Apify. No source license was changed by adding this example.

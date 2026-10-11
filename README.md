# BrowseSprint browser task resources

Free, editable resources for checking a slow browser task before choosing a fix. These materials accompany [BrowseSprint](https://codexbrowse.site/), an independent research project.

The current resources are a guide, a blank CSV, a comparison protocol, a local CSV-checking helper and a small read-only Crawlee HTTP content-check example. There is no released extension, automatic timing service or verified speed improvement. BrowseSprint is not affiliated with OpenAI.

[中文说明](README.zh-CN.md)

## Start with one repeatable public-page task

1. Write the expected successful outcome and the public URL before you start.
2. Record three baseline attempts, including failures.
3. Change one factor that addresses the observed problem.
4. Record three changed attempts under comparable conditions.
5. Compare correctness and elapsed time together. Keep unknown values blank.

Six attempts are a small diagnostic exercise, not a universal benchmark. A faster incorrect answer is not an improvement.

## Download and use

| Resource | What it contains |
| --- | --- |
| [Blank timing CSV](browser-task-benchmark.csv) | Three baseline rows and three changed rows; no example timings or claimed results |
| [Local worksheet checker](docs/worksheet-checker.md) | Runnable standard-library Python helper; keeps reported failures and unknowns separate; no automatic speedup claim |
| [Executed Crawlee HTTP example](examples/crawlee-content-gate/README.md) | One public-page title gate with a real matched fetch and a deliberately wrong condition; no browser or speed comparison |
| [Result-verification field notes](docs/browser-result-verification.md) | Real outcome checks and a reproducible public-HTML example; no timing results |
| [Measurement protocol](docs/browser-task-protocol.md) | Success rules, comparability, column meanings and limits on conclusions |
| [Comparison report template](comparison-report-template.md) | A short record of the setup, observations and remaining uncertainty |
| [Public diagnostic guide](https://codexbrowse.site/codex-browser-slow) | The accompanying web guide, available without signup |

Download the CSV using GitHub's file download control or get the website copy:

```sh
curl --fail --location https://codexbrowse.site/browser-task-benchmark.csv \
  --output browser-task-benchmark.csv
```

Open it in a spreadsheet or text editor and replace `cold_or_reused` with the session condition you actually used. Seconds are the unit for timing columns. Do not enter zero for a timing you could not observe.

## What to record

Use total elapsed time as the primary timing observation. The optional stage columns are notes about intervals you could directly observe. Some intervals overlap or have gaps, so they must not be added together to manufacture a complete breakdown. A gap between visible actions does not by itself prove how much time a model spent thinking.

Keep the same expected answer, public page, browser tool setup and session condition for the comparison. Record changes that you cannot control, such as page content or network conditions. If a run fails or times out, keep the row and describe the failure in `notes`.

## Share a useful observation

An issue is most useful when it includes the public task, the intended outcome, the factor changed, all comparison rows and a narrow conclusion supported by those rows. Do not paste cookies, authentication tokens, private pages, personal contact details or confidential logs into an issue.

The optional [research signup](https://codexbrowse.site/#research) is for research conversations or future tests. It is not access to an available extension. No release date is confirmed.

These are maker-maintained resources. A repository listing is not independent validation of the project or of a performance claim.

## Executed AutoGen FunctionTool example

[Run a tool, then check the returned page title](examples/autogen-title-gate/README.md).
Two direct autogen-core0.7.5 calls both returned HTTP200; the declared title passed and the intentionally wrong title failed the application predicate. The code, dependency lock and actual JSON are included. No browser, model or timing comparison was run. This example is for existing AutoGen users; AutoGen is in maintenance mode.

# Check a manually recorded worksheet

`scripts/check_worksheet.py` is a local Python 3.9+ helper for the existing
[CSV worksheet](../browser-task-benchmark.csv). It validates fields and reports
individual timings and descriptive medians separately for reported successes,
reported failures and unchecked outcomes. It neither runs a browser nor measures
a task, checks a page's correctness, or establishes a speed improvement.

It uses the Python standard library and makes no network requests.

## Run it

From the downloaded repository directory:

```sh
python3 scripts/check_worksheet.py browser-task-benchmark.csv
```

The unchanged blank worksheet returns JSON with `status: incomplete`, six
unchecked outcomes, empty timing lists and null medians. Its exit code is 1.
That is the expected result: a template contains no observations.

After recording actual attempts yourself, run the same command on your local
CSV. Keep the published header order, `baseline`/`changed` approach values,
positive run numbers and lowercase `true`/`false` success values. Leave unknown
values blank; do not fill them with zero. Replace `cold_or_reused` with the
starting session condition you actually used.

Exit codes:

- 0: rows contain the core fields and each approach has at least three rows.
- 1: core fields, failure details or the starting row count are incomplete.
- 2: the file cannot be read, the CSV structure is invalid, or a value violates
  the field rules.

`status: recorded` and exit code 0 describe input completeness. They do not
confirm that the stated successes are correct or that an experiment is valid.

## What the report preserves

A quick failed attempt stays in `reported_failure`; it is not mixed into the
successful-time median. Blank outcomes stay unchecked, including when an
elapsed time was recorded. Blank times remain null rather than becoming zero.
Zero means the supplied observation was zero.

Different public URLs, expected outcomes or session labels produce separate
strata. The helper does not aggregate their timings into a single comparison.
`one_recorded_context_matches` checks only the three recorded context fields
and completeness. The prompt, model, tool version, page contents, cache, network
and the one intentional change still need manual review. Equal labels cannot
establish equal real conditions.

Optional stage intervals remain separate fields. They may overlap, so the
helper never sums them into total time or infers internal model thinking time.
NaN, infinity, negative times, fractional call/retry counts and duplicate
approach/run pairs are rejected.

The report always leaves `automatic_speedup_claim` null. Three baseline and
three changed attempts are a starting diagnostic. More rows can be added, but
even a larger file does not turn these descriptive summaries into a statistical
test or a general claim about Codex, Chrome MCP or another agent.

## Validation performed

The current official website CSV was fetched and compared with the repository
copy on 10 October 2026. Both were blank and matched exactly. Running this
helper on that file returned incomplete, with all six outcomes unchecked and no
timing or speedup result.

Twelve offline regression cases passed. Their numbers are deliberately
synthetic: they cover fast failures, unchecked outcomes, session/page changes,
overlapping stage intervals, invalid numeric values, exact whole counts,
duplicate rows and success flags that still require human verification. They
are not browser runs or performance measurements.

Run those checks from the repository directory:

```sh
python3 -m unittest discover -s scripts -p test_check_worksheet.py -v
```

These resources accompany the [BrowseSprint diagnostic guide](https://codexbrowse.site/codex-browser-slow).
The helper was prepared with AI assistance and checked as described above.

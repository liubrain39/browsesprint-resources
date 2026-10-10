# A comparison protocol for one browser task

This protocol helps document an observation. It does not identify an internal model bottleneck from wall-clock time alone and does not promise that any particular edit will make a task faster.

## 1. Define a correct result

Choose a public page and a result that can be checked. For example, find a named fact on a specified page and return the fact with its source URL. Before running, describe what would count as wrong, incomplete or failed.

Keep the initial prompt or task description unchanged between the two approaches. If the goal changes, start a separate comparison rather than mixing the observations.

## 2. Keep the starting conditions comparable

Record the browser tool, visible version if available, public starting URL and session condition. State whether you reused the session or started fresh. Record whether the page was already open. Do not record cookies or credential values.

Cache warmth, network conditions and changes to a page may affect a comparison. If you cannot control them, write that down. If an automatic login, verification step or unrelated interruption occurs, record it rather than silently removing its elapsed time.

## 3. Record three baseline runs

Measure from the start of the requested task until a usable result or a clear failure. Keep all three rows. Record success against the rule from step 1, even if a wrong answer looked plausible.

Use observable tool calls and retries where available. Leave a count blank if the tool does not expose enough information to count it reliably. A failure can have a measured elapsed time; it must not be treated as a fast successful run.

## 4. Change one factor

Choose a change based on what you observed. Possible experiments include asking for a smaller relevant page extract, making the target description more specific, or checking the page's readiness before retrying an action.

Write the exact change before the changed runs. Do not change the task, tool setup, expected answer and page all at once, then attribute a difference to one edit.

## 5. Record three changed runs

Use the same success rule. Preserve failures, timeouts and uncertain observations. The worksheet's six rows are starting rows; add more comparable runs if the spread is too large to support a conclusion.

### Column meanings

| Column | Meaning |
| --- | --- |
| `approach` | `baseline` or `changed` |
| `run` | Run number within that approach |
| `public_page` | The public URL used for the task |
| `outcome` | The result expected from the task, or a concise reference to the written success rule |
| `session_state` | The starting session condition you actually used; replace the placeholder |
| `total_seconds` | Elapsed seconds from task start to usable result or clear failure |
| `success` | Whether the written success rule was met; record `true` or `false`, or leave blank if not checked |
| `tool_calls` | Count of calls you could actually observe |
| `retries` | Count of repeated attempts you could actually observe |
| `navigation_seconds` | An observed navigation interval, with its boundaries described in notes |
| `extraction_seconds` | An observed page-read interval, with its boundaries described in notes |
| `decision_seconds` | An observed gap between visible actions; it is not a measurement of internal inference time |
| `timeout_seconds` | An observed timeout interval; it may already be included in total elapsed time |
| `notes` | Failure details, interruptions, boundaries, exact change and unknowns |

Leave unavailable timing values blank. Zero means an observed zero, not an unknown value. Partial intervals may overlap and must not be summed as if they partition the total.

## 6. State only the conclusion the rows support

Compare success and elapsed time together. Show the individual runs rather than choosing the best run. If the apparent gain is smaller than the spread between runs, collect more observations before claiming an improvement.

Use a narrow statement such as "In this task and setup, these changed runs took less time and met the same success rule." Do not turn a small local comparison into a percentage speedup claim for all Codex or other agent tasks.

For the surrounding guide and optional research participation, see [BrowseSprint](https://codexbrowse.site/). These resources are independent and have no OpenAI affiliation.

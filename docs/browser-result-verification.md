# Check a browser-agent result before timing it

Brain Liu · BrowseSprint · 10 October 2026

A browser task can end with a reassuring screen while the requested change is still unconfirmed. If that run is marked successful, a later speed comparison measures the time to a claim rather than the time to the intended result.

These are field notes from publishing BrowseSprint's public learning resources. They document observed outcomes, not a controlled browser-agent benchmark. No timings or speed improvements are claimed.

## Three observations and their grading rules

| Observed task | Evidence available | Result that can be claimed |
| --- | --- | --- |
| Submit a resource to DevStack | The form reset after one attempt; no success receipt or related receipt email was found during checking. | Submission outcome unconfirmed. A reset is not a receipt. Do not retry a write solely to obtain a more reassuring screen. |
| Verify the [TheDevToolsDir public listing](https://thedevtoolsdir.com/product/browsesprint/) | An anonymous HTML request returned HTTP 200. Three anchors on that page linked to `codexbrowse.site` with the listing's referral query. | One publicly retrievable listing page with matching outgoing anchors. Three anchors are not three placements; HTTP 200 does not prove search indexing or a traffic gain. |
| Propose an article to [Awesome Browser Automation, PR 186](https://github.com/angrykoala/awesome-browser-automation/pull/186) | The public pull request exists and is open; its API record reports that it is unmerged. | The proposal was submitted. Inclusion in the maintained resource list remains unconfirmed. |

The form observation is our own report; we have no public server receipt for that attempt. The other two examples have public URLs that readers can inspect. The platforms' future behavior and review decisions remain outside this check.

## A read-only check readers can reproduce

This Python 3 example checks the listing's returned HTML for anchors to the exact project host. It uses the standard library, follows ordinary HTTP redirects, and requires no account, browser session or third-party package.

```python
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
import json

page = "https://thedevtoolsdir.com/product/browsesprint/"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.matches = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        attrs = dict(attrs)
        href = urljoin(page, attrs.get("href", ""))
        if urlsplit(href).hostname == "codexbrowse.site":
            self.matches.append({"href": href, "rel": attrs.get("rel", "")})


with urlopen(
    Request(page, headers={"User-Agent": "BrowseSprint public-resource-check/1.0"}),
    timeout=25,
) as response:
    status = response.status
    final_url = response.url
    html = response.read().decode("utf-8", "replace")

links = Links()
links.feed(html)
print(json.dumps({
    "http_status": status,
    "final_url": final_url,
    "matching_anchor_count": len(links.matches),
    "matching_anchors": links.matches,
}, indent=2))
```

On our 10 October 2026 check, this returned HTTP 200 and three matching anchors with `rel="noopener"`. This is a dated observation, not a promise about subsequent requests. Save your actual output instead of copying these values into a run record.

A timeout or HTTP error means this check did not establish the result. Let it remain an error; do not disable certificate verification. The script does not render JavaScript, establish the authenticity of every page statement, measure a browser tool, or inspect a submission's private backend. It is appropriate only when the success rule concerns retrievable public HTML. For a JavaScript-only result, use evidence from the rendered page or an authorized service API that checks the intended state.

## Put the rule into the timing exercise

1. Before running, write the requested state and the evidence needed to establish it. For a form, this might be a receipt identifier and an authorized readback. For a public page, it might be the correct title, content and destination at the expected URL.
2. Keep the action attempt and the verification result separate. Record a clear failure as failure; preserve an unresolved result as unconfirmed. Do not silently convert either into success.
3. Choose a verification deadline before the run. Stop timing at confirmed completion, a clear failure, or that deadline. If completion is unresolved at the deadline, record the observed elapsed time and the unresolved outcome together.
4. Apply the same evidence rule to the baseline and changed approach. Keep failed attempts, timeouts, retries, session conditions and verification work in the record.

BrowseSprint provides a [blank six-run worksheet](https://codexbrowse.site/browser-task-benchmark.csv) and a [comparison protocol](browser-task-protocol.md). Its three baseline and three changed rows are a small diagnostic exercise, not a validated benchmark or a statistically conclusive sample. The rows intentionally contain no measured results.

## Relationship and limits

I maintain [BrowseSprint](https://codexbrowse.site/), an independent research project, and the public resources used in these examples. The accompanying [browser-task diagnostic guide](https://codexbrowse.site/codex-browser-slow) is available without signup. There is no released extension, automatic timing service or verified speed gain, and no affiliation with OpenAI. This article was prepared with AI assistance using the recorded checks; no independent evaluation or editorial endorsement is implied.

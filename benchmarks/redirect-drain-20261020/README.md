# Complete client / settled browser network comparison

This temporary test uses the existing owner's private Reader build in an
authenticated AES-256-GCM encrypted package. Source is not published or licensed
by uploading this encrypted file. The one-run decryption key is supplied by an
Actions secret, never committed. It is removed after the test, and the workflow
is disabled again.

Thirteen frozen public pages (ten previous plus MDN Array, Wikipedia and Example Domain), two repetitions, normal and controlled slow transport,
and four subjects: an unchanged automatic Reader, bounded redirect completion,
the same plus direct complete short static HTML, and an already-started isolated sandboxed browser via
Playwright MCP. The browser visits each target once in a new tab per profile
and repetition. Browser blank setup and its explicit 2-second settling pause
are excluded from paired read time; Reader startup is included. No target page
is prefetched, no resources are blocked, and expected content is checked only
after each result. A generic readable-body condition ends the browser read.

All Reader builds and the browser have a 45-second whole-read budget; startup is recorded separately.
NOAA is predeclared skipped in all subjects because the previous Reader run received HTTP 403;
its historical failures remain available. Safe error details are retained.
Failures are retained. The cloud runner is not a residential-user survey.
OS, DNS, proxy and CDN caches are not claimed cold. These tests do not measure
Codex's internal bridge, model latency, installation or login workflows.
Public logs contain compact results, text hashes and timing evidence; no page
body, private source, credentials or decryption key is intentionally logged.

Only the standard ubuntu-24.04 hosted runner is used, with no paid runner,
artifact upload, Actions cache or production deployment.

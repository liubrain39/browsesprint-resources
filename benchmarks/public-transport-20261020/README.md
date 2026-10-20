# Public transport phase probe

This standalone diagnostic uses Python's standard library and curl. It contains
no private BrowseSprint Reader code, encrypted payload, decryption key,
repository secret or credential access. No packages or lifecycle scripts are
installed. The dedicated push workflow uses standard public Ubuntu/macOS
runners, read-only repository permissions and no persisted checkout credentials.

Six fixed public pages, two repetitions, normal / curl-limited 64 KiB/s
transfer, and three subjects: direct full HTML, primary public reading service,
backup public reading service. There are 72 scheduled requests per runner.
Each request starts a new curl process. Subject and condition order changes;
OS/DNS/CDN caches are not claimed cold. Two-second pauses outside timing limit
service load. Access refusals stop that site across later subjects/conditions.
No accounts, challenges, forms, votes, mail or homepage deployment.

Public logs contain response status, timing, bounded titles/errors and hashes.
Response bodies stay only in temporary runner files and are deleted. Raw
outgoing IP addresses and complete curl diagnostics are not logged. The trace
endpoint runs after the matrix and stores only an IP hash and coarse location.
Its route is not evidence that every target uses the same exit.

This is **not** a complete Reader, native browser, model or installation
comparison. Direct reads download full HTML; the service returns bounded text.
Matching fixed facts does not make these outputs equivalent. Curl's transfer
limit is not the earlier shared slow-link/added-RTT fixture. Report DNS,
connection, TLS, response and body observations with their redirect limits;
do not turn them into a product speedup percentage.

Prepared with AI assistance by the project author. This author-run benchmark
is not independent endorsement. No new source licence is granted.

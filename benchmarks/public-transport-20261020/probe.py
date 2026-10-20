"""Public transport diagnostic. Standard library and curl; no Reader source."""
import hashlib
import html.parser
import ipaddress
import json
import os
import platform
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CASES = [
    dict(site="iana", url="https://www.iana.org/help/example-domains", title="Example Domains", phrase="documentation purposes"),
    dict(site="cern", url="https://info.cern.ch/hypertext/WWW/TheProject.html", title="World Wide Web", phrase="hypermedia"),
    dict(site="berkshire", url="https://www.berkshirehathaway.com/", title="BERKSHIRE HATHAWAY", phrase="Annual"),
    dict(site="w3c", url="https://www.w3.org/", title="W3C", phrase="standards"),
    dict(site="gutenberg", url="https://www.gutenberg.org/about/", title="About", phrase="ebooks"),
    dict(site="curl", url="https://curl.se/", title="curl", phrase="transfer"),
]
SERVICES = {
    "primary": "https://reader.codexbrowse.site/api/read",
    "backup": "https://reader-backup.codexbrowse.site/api/read",
}
FIELDS = ["http_code", "http_version", "num_connects", "num_redirects", "size_download",
          "time_namelookup", "time_connect", "time_appconnect", "time_pretransfer",
          "time_starttransfer", "time_redirect", "time_total", "url_effective"]

class ObservedHTML(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = []
        self.text = []
    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
    def handle_data(self, data):
        self.text.append(data)
        if self.in_title:
            self.title.append(data)

def observed(body, subject):
    if subject == "direct":
        parser = ObservedHTML()
        parser.feed(body.decode("utf-8", errors="replace"))
        return dict(title=" ".join(parser.title), text=" ".join(parser.text))
    value = json.loads(body)
    if value.get("error"):
        return dict(error=value["error"])
    return dict(title=value["result"]["title"], text=value["result"]["text"],
                requestedUrl=value.get("requestedUrl"), serverMs=value.get("serverMs"),
                serviceVersion=value.get("serviceVersion"))

def request(case, subject, condition):
    # -q prevents curl from loading local config. No proxy/cookie/auth settings
    # or machine environment values are copied to the result.
    with tempfile.TemporaryDirectory(prefix="public-transport-") as directory:
        target = Path(directory) / "response"
        args = ["curl", "-q", "--noproxy", "*", "--silent", "--show-error",
                "--connect-timeout", "10", "--max-time", "40", "--max-filesize", "4194304",
                "--proto", "=https", "--proto-redir", "=https", "--compressed",
                "--output", str(target), "--write-out", "%{json}"]
        if condition == "capped":
            args += ["--limit-rate", "64K"]
        if subject == "direct":
            args += ["--location", "--max-redirs", "4", case["url"]]
        else:
            args += ["--header", "content-type: application/json", "--data",
                     json.dumps({"url": case["url"]}), SERVICES[subject]]
        begin = time.perf_counter()
        process = subprocess.run(args, capture_output=True, timeout=45)
        wall_ms = (time.perf_counter()-begin)*1000
        try:
            raw = json.loads(process.stdout)
        except ValueError:
            raw = {}
        body = target.read_bytes() if target.exists() else b""
        row = dict(exitCode=process.returncode, wallMs=wall_ms,
                   curl={k: raw.get(k) for k in FIELDS},
                   bodyBytes=len(body), bodySha256=hashlib.sha256(body).hexdigest())
        try:
            row["remoteAddressFamily"] = ipaddress.ip_address(raw.get("remote_ip", "")).version
        except ValueError:
            row["remoteAddressFamily"] = None
        if process.stderr:
            row["curlError"] = process.stderr.decode(errors="replace")[:500]
        try:
            result = observed(body, subject)
            row["title"] = result.get("title")
            row["serviceError"] = result.get("error")
            row["serverMs"] = result.get("serverMs")
            row["serviceVersion"] = result.get("serviceVersion")
            row["contentChecks"] = {
                "title": case["title"].lower() in result.get("title", "").lower(),
                "phrase": case["phrase"].lower() in result.get("text", "").lower(),
                "requestedUrl": subject == "direct" or result.get("requestedUrl") == case["url"]}
        except (ValueError, KeyError, TypeError) as error:
            row["parseError"] = type(error).__name__
            row["contentChecks"] = {}
        row["ok"] = process.returncode == 0 and raw.get("http_code") == 200 and all(row["contentChecks"].values()) and len(row["contentChecks"]) == 3
        title = row.get("title") or ""
        code = (row.get("serviceError") or {}).get("code", "")
        row["refused"] = raw.get("http_code") in [401, 403, 429] or bool(re.search(
            r"just a moment|access denied|verify you are human|security verification", title, re.I)
            or re.search(r"HTTP_(401|403|429)|ACCESS_CHALLENGE|RATE_LIMITED", code))
        return row

def emit(kind, value):
    print("BROWSESPRINT_PUBLIC_TRANSPORT_"+kind+"="+json.dumps(value, separators=(",", ":")), flush=True)

def trace():
    try:
        p = subprocess.run(["curl", "-q", "--noproxy", "*", "--silent", "--show-error",
                            "--max-time", "12", "--fail", "https://www.cloudflare.com/cdn-cgi/trace"],
                           capture_output=True, timeout=15)
        data = dict(line.split("=", 1) for line in p.stdout.decode().splitlines() if "=" in line)
        return dict(exitCode=p.returncode, country=data.get("loc"), colo=data.get("colo"),
                    ipSha256=hashlib.sha256(data["ip"].encode()).hexdigest() if "ip" in data else None)
    except Exception as error:
        return dict(error=type(error).__name__)

def main():
    if "--self-test" in sys.argv:
        assert observed(b"<title>A &amp; B</title><p>Known text</p>", "direct")["title"] == "A & B"
        assert observed(b'{"result":{"title":"A","text":"B"},"serverMs":1}', "primary")["serverMs"] == 1
        assert observed(b'{"error":{"code":"HTTP_403"}}', "backup")["error"]["code"] == "HTTP_403"
        print("Three parser checks passed; no network requests.")
        return
    label = os.environ.get("PROBE_LABEL")
    if label not in ["ubuntu-24.04", "macos-14"]:
        raise SystemExit("Explicit standard runner label required")
    emit("ENV", dict(label=label, system=platform.system(), machine=platform.machine(),
                     python=platform.python_version(),
                     curl=subprocess.check_output(["curl", "--version"], text=True).splitlines()[0],
                     sourceSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                     scope="Transport-only, not Reader/native/model comparison. Fresh curl process per request; OS/DNS/CDN caches not cleared. Capped means curl transfer limit only, no injected latency. Full HTML and service excerpts are not equivalent outputs."))
    rows, refused, service_refused = [], set(), False
    for rep in [1, 2]:
        for condition in (["normal", "capped"] if rep == 1 else ["capped", "normal"]):
            for index, case in enumerate(CASES):
                subjects = ["direct", "primary", "backup"]
                offset = (index+rep) % 3
                subjects = subjects[offset:]+subjects[:offset]
                if rep == 2:
                    subjects.reverse()
                for subject in subjects:
                    row = dict(label=label, rep=rep, condition=condition, subject=subject, site=case["site"])
                    if case["site"] in refused:
                        row.update(ok=False, skipped="Earlier access refusal; no alternate/retry")
                    elif subject != "direct" and service_refused:
                        row.update(ok=False, skipped="Earlier service-level refusal; no alias retry")
                    else:
                        try:
                            row.update(request(case, subject, condition))
                        except Exception as error:
                            row.update(ok=False, exception=type(error).__name__)
                        if row.get("refused"):
                            refused.add(case["site"])
                        if subject != "direct" and row.get("curl", {}).get("http_code") in [401, 403, 429]:
                            service_refused = True
                    rows.append(row)
                    emit("ROW", row)
                    # Limit service request frequency. This pause is outside
                    # every measured interval.
                    time.sleep(2)
    # Run exit observation last; do not warm the target/service DNS first.
    emit("TRACE", trace())
    emit("DONE", dict(scheduled=len(rows), attempted=sum("skipped" not in r for r in rows),
                      passed=sum(bool(r["ok"]) for r in rows), refused=sorted(refused)))

if __name__ == "__main__":
    main()

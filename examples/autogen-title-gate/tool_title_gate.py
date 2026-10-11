"""One read-only AutoGen tool call, followed by an explicit content predicate."""
import argparse
import asyncio
import hashlib
import json
import platform
import ssl
import sys
from html.parser import HTMLParser
from importlib.metadata import version
from urllib.request import Request, urlopen

from autogen_core import CancellationToken
from autogen_core.tools import FunctionTool

GUIDE_URL = "https://codexbrowse.site/codex-browser-slow"
EXPECTED_TITLE = "Why Is Codex Browsing Slow? A Measurement Guide \u2014 BrowseSprint"
MAX_HTML_BYTES = 1_000_000


class TitleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.titles: list[str] = []
        self.current: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "title":
            self.current = []

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title" and self.current is not None:
            self.titles.append(" ".join("".join(self.current).split()))
            self.current = None


def read_public_guide() -> dict[str, str | int]:
    """Fetch the fixed public guide; this does not execute JavaScript."""
    request = Request(
        GUIDE_URL,
        headers={"User-Agent": "BrowseSprint-FunctionTool-example/1.0",
                 "Accept": "text/html"},
    )
    with urlopen(request, timeout=20, context=ssl.create_default_context()) as response:
        raw = response.read(MAX_HTML_BYTES + 1)
        if len(raw) > MAX_HTML_BYTES:
            raise ValueError("Response exceeds this example's HTML size limit")
        parser = TitleParser()
        parser.feed(raw.decode(response.headers.get_content_charset() or "utf-8"))
        return {
            "requested_url": GUIDE_URL,
            "final_url": response.geturl(),
            "http_status": response.status,
            "title_count": len(parser.titles),
            "title": parser.titles[0] if len(parser.titles) == 1 else "",
            "response_sha256": hashlib.sha256(raw).hexdigest(),
        }


async def run(expected_title: str) -> tuple[dict, int]:
    tool = FunctionTool(
        read_public_guide,
        name="read_public_guide",
        description="Read the fixed public BrowseSprint guide without a browser.",
    )
    result = await tool.run_json({}, CancellationToken())
    # run_json returned. The following application checks are our own predicate.
    content_check_passed = (
        result["http_status"] == 200
        and result["final_url"] == GUIDE_URL
        and result["title_count"] == 1
        and result["title"] == expected_title
    )
    report = {
        "autogen_core_version": version("autogen-core"),
        "python_version": platform.python_version(),
        "functiontool_returned": True,
        "expected_title": expected_title,
        "observation": result,
        "content_check_passed": content_check_passed,
        "model_calls": 0,
        "browser_runs": 0,
        "speedup_claim": None,
    }
    return report, 0 if content_check_passed else 1


def main() -> int:
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument("--expected-title", default=EXPECTED_TITLE)
    args = arguments.parse_args()
    try:
        report, exit_code = asyncio.run(run(args.expected_title))
    except Exception as error:
        print(json.dumps({
            "functiontool_returned": False,
            "error_type": type(error).__name__,
            "error": str(error),
            "content_check_passed": None,
            "speedup_claim": None,
        }, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())


# An executed AutoGen FunctionTool with a separate title check

This small example for existing AutoGen users wraps a read-only function in
`autogen_core.tools.FunctionTool`. It calls `run_json({}, CancellationToken())`,
then applies an explicit application predicate to the returned object.

It reads the fixed public [BrowseSprint measurement guide](https://codexbrowse.site/codex-browser-slow).
The function uses Python's HTTPS client and HTML parser. It does not execute
page JavaScript. There is no model client, AgentChat team or WebSurfer.

AutoGen's current [README](https://github.com/microsoft/autogen#readme) says the
project is in maintenance mode and directs new projects to Microsoft Agent
Framework. This example targets the existing `autogen-core==0.7.5` API.
See its [official FunctionTool reference](https://microsoft.github.io/autogen/stable/reference/python/autogen_core.tools.html#autogen_core.tools.FunctionTool).

## Reproduce

Python 3.10+ is the package requirement. This example was actually executed
with Python 3.12.14 on macOS. From a downloaded copy of this resource repository:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r examples/autogen-title-gate/requirements-lock.txt
.venv/bin/python examples/autogen-title-gate/tool_title_gate.py
.venv/bin/python examples/autogen-title-gate/tool_title_gate.py --expected-title INTENTIONALLY_WRONG_AUTOGEN_TITLE
```

Each command that runs the script performs one tool invocation and one page
fetch. The first script command is expected to exit 0. The intentionally wrong
title control is expected to exit 1. An HTTP, parsing or SDK exception exits 2.
The script has a 20-second HTTPS timeout, a one-million-byte HTML limit and no
application retry loop. TLS certificate validation stays enabled.

`requirements.txt` pins the SDK; `requirements-lock.txt` records all ten packages
installed in the isolated environment used for the two actual invocations.
The lock records the tested versions; cross-platform execution was not tested.

## Actual observations

The two invocations saved in [sample-output.json](sample-output.json) returned:

| Local expected-title condition | HTTP | FunctionTool returned | Content check | Process exit |
| --- | --- | --- | --- | --- |
| Declared guide title | 200 | true | true | 0 |
| Intentionally wrong title | 200 | true | false | 1 |

Both responses had SHA-256
`32a64d9388fbe458920706e361281cdbcc6fe7077efe130841391e4cda7f4578`
and the title
`Why Is Codex Browsing Slow? A Measurement Guide — BrowseSprint`.

The content predicate checks HTTP 200, the final URL, exactly one HTML title
and an exact match to the caller's expected title. It runs after the SDK call
returns. The deliberately wrong condition is a negative control for this
predicate; it is not a website outage or an observed AutoGen defect.

## Boundaries

A title match is a narrow metadata check. It cannot establish that a browser
interaction, form submission, full article extraction or user's overall task
succeeded. Change the acceptance predicate for the actual task and retain
failed or unchecked outcomes when recording a comparison.

These are two direct FunctionTool calls with HTTPS page reads, zero model calls
and zero browser runs. There are no timing measurements, speed comparisons,
new AutoGen features or provider-evaluation claims.

I maintain BrowseSprint and this resource repository. The code and documentation
were prepared with AI assistance and checked by the two executed controls.
This is an author-owned teaching example; no Microsoft or AutoGen affiliation,
adoption, endorsement or independent reproduction is claimed.


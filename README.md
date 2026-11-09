# Attest

**Verified, scoped, retractable memory for coding agents.**

Attest lets a coding agent learn from code review without learning the wrong things.
It stores only experience that a verified change actually applied, scopes every note to
the repository and version it came from, and lets people — never the agent — approve,
supersede or retract it. It plugs into any MCP-capable agent.

[![Live demo](https://img.shields.io/badge/demo-live-2648b8)](https://tonglynn.github.io/attest-agent-memory/)
[![Tests](https://img.shields.io/badge/tests-177%20passed-1d7448)](tests/)
[![MCP](https://img.shields.io/badge/MCP-compatible-5b6a60)](attest/mcp_server.py)
[![Python](https://img.shields.io/badge/python-3.11%2B-3776ab)](requirements.txt)

**English** · [简体中文](README.zh-CN.md)

![Clean-stream pass@1 against poison applied, six memory systems in one session](docs/effect_safety.png)

## Why

Coding agents keep repeating mistakes that review already corrected. Memory systems that
try to fix this usually store whatever the agent concluded, apply it everywhere and never
take it back — so a plausible but wrong suggestion that happens to pass the tests becomes a
permanent rule.

## Results

| | Result | Source |
|---|---|---|
| **Learns** | Held-out first-attempt pass rate **33% → 70%** (+36 pp [+21, +52]) on tasks it never learned from | Preregistered main experiment, `runs/main` |
| **Is not taught wrong** | Test-passing poisoned advice stored as a rule **0/60** times (no gate: 46/60, ACE-style: 38, ReasoningBank-style: 50) | `runs/poison_channels` |
| **Costs nothing on clean work** | With the evidence gateway: 82% pass@1, same as no gate, +9 pp over the preregistered gate | `runs/gate_confirm` |
| **Stays in scope** | **0** foreign notes leaked into a control repository (54 without scoping) | `runs/main` |
| **Follows policy change** | Tasks after a policy change **+67 pp** with versioned notes | `runs/main` |

Negative results are reported too: the preregistered write gate cost −15 pp (hypothesis
H6 not supported), and failure attribution remains unsolved. See [Limits](#limits).

## How it works

```
task ──► recall ──► coding agent ──► verification ──► review comments
           ▲                                               │
  scope + version filter                         write gate (deterministic)
  rank → inject (soft budget)                    · task verified
           ▲                                     · source quote verbatim
           │                                     · applied line = a real changed line
  append-only, HMAC-sealed event log ◄── lifecycle: pending · active · suspect · retired · superseded
```

- **Write path** — learn only after verification passes; the model proposes at most three
  candidates, each quoting the review and the changed line; a deterministic gateway decides
  *approve / reject / hold for a person*; then merge, supersede or correct existing notes.
- **Recall path** — filter by repository, version range and status; rank against the new
  task; inject with provenance; feed the outcome back (verified → stronger, failed → suspect → retired).
- **Human governance** — approval and retraction exist only on the command line for people.
  The MCP server exposes no approve or retract tool.

## Quick start

```bash
pip install -r requirements.txt
python -m pytest -q                  # offline, no API calls
python scripts/mcp_demo.py           # end-to-end demo with a scripted model

# use with a real agent (e.g. Claude Code)
claude mcp add attest -- python -m attest.mcp_server
python -m attest.admin review        # people review, approve, reject, retract
```

Try it in the browser: **[live demo](https://tonglynn.github.io/attest-agent-memory/)** —
runs the real Attest code via Pyodide, with a 5-minute recording of a live session.

## Repository map

| Path | What it is |
|---|---|
| `attest/memory/` | Write gate, evidence gateway, retrieval, lifecycle, stores (JSONL, SQLite) |
| `attest/mcp_server.py` | MCP server for coding agents |
| `benchmark/` | 25-task benchmark on a synthetic billing codebase |
| `runs/` | Every experiment run: trajectories, diffs, results, memory logs |
| `docs/app/` | Source of the interactive demo |
| [`ASSESSMENT.md`](ASSESSMENT.md) | Full write-up: method, all experiments, design decisions |
| [`RESULTS.md`](RESULTS.md) · [`PREREGISTRATION.md`](PREREGISTRATION.md) · [`DECISIONS.md`](DECISIONS.md) | Results, preregistered plan, decision log D1–D79 |

## Limits

One model (DeepSeek), one synthetic benchmark designed by the author, simulated review
comments, 11 held-out tasks × 3 repetitions. The gate checks that the evidence line is a
real verified change, not that it is about the rule. Process rules that a diff cannot show
(rebase, backport) are out of reach. All repositories, review comments, policies and attack
material are synthetic and labelled as such.

## Background

Attest started as a practical assessment for an AI-native development role; the full
assessment write-up is in [`ASSESSMENT.md`](ASSESSMENT.md).

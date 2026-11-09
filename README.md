<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/attest-banner-dark.svg">
  <img src="docs/assets/attest-banner-light.svg" width="100%" alt="Attest — Evidence-backed memory for coding agents">
</picture>

# Attest

**Coding agents remember the review. Your team controls the memory.**

Attest is an MCP memory server that learns review feedback from verified code changes, recalls it within the relevant repository and version, and lets people review, supersede, or retract it. Built for coding workflows that need reusable team knowledge with traceable evidence.

[Interactive demo](https://tonglynn.github.io/attest-agent-memory/) · [MCP integration guide](docs/MCP_DEMO.md) · [简体中文](README.zh-CN.md)

[![MCP server](https://img.shields.io/badge/MCP-server-255fb2)](docs/MCP_DEMO.md)
[![CI tests](https://github.com/tonglynn/attest-agent-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/tonglynn/attest-agent-memory/actions/workflows/ci.yml)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776ab)](pyproject.toml)
[![License: MIT](https://img.shields.io/badge/License-MIT-52677f)](LICENSE)

[![Main study: preregistered](https://img.shields.io/badge/Main_study-preregistered-226b53)](PREREGISTRATION.md)
[![Evidence: public run logs](https://img.shields.io/badge/Evidence-public_run_logs-52677f)](runs/)


CI covers Python **3.11, 3.12, and 3.13**. The main study has a preregistered protocol; experiment run logs and negative results are public for inspection.

## From one review to the next task

1. **Collect evidence.** After a change, Attest runs verification and captures the review and actual diff. The model proposes candidate notes.
2. **Check admission.** A deterministic evidence gateway approves, rejects, or holds each candidate for human review. Passing tests alone does not make advice correct.
3. **Recall in scope.** A new task retrieves notes for its repository, version, and status, together with their provenance.
4. **Keep people in control.** People review, supersede, and retract through `attest-admin`. These management tools are not exposed over MCP.

## See a real session

[![Recorded Claude Desktop session: learning, evidence checks, and human review](docs/assets/live_run.gif)](https://tonglynn.github.io/attest-agent-memory/app/)

Recorded with Claude Desktop and the Attest MCP server. The interactive walkthrough separately labels browser execution, experiment replays, and precomputed results.

[Watch the 5-minute recording](docs/attest_mcp_live.mp4) · [MCP integration guide](docs/MCP_DEMO.md)

## What has been measured

- **Learning: 33% → 70% first-attempt pass rate.** Preregistered main experiment: one model, an author-designed synthetic billing benchmark, 11 held-out tasks repeated three times.
- **Admission: 0/60 attacks became rules.** Later D70 synthetic attacks against gateway v4. With empty memory, 23/60 were still retained as unconfirmed notes; this does not mean zero storage or exposure risk.
- **Performance has tradeoffs.** In the later exploratory D71 experiment, gateway v3.1 reached 82% on the clean stream, matching the no-gate arm. The original preregistered gate had a 15-point cost.

These are different versions and experiments, not a combined production or security guarantee. [Full results & limitations](RESULTS.md) · [Preregistered protocol](PREREGISTRATION.md)

## System design

![Write path, scoped recall, and separate human governance](docs/assets/architecture.svg)

The memory core supports SQLite and JSONL. MCP provides the agent tools; `attest-admin` provides the human governance interface. Events remain in an append-only log.

## Quick start

Install the MCP server and connect it to an agent:

```bash
pip install "git+https://github.com/tonglynn/attest-agent-memory"
claude mcp add attest -- attest-mcp        # Claude Code; any MCP client works the same way
```

The agent receives four tools:

| Tool | Called | What it does |
|---|---|---|
| `recall` | before a task | Returns the approved notes for this repository and version, with provenance |
| `learn` | after an accepted change | Runs verification, computes the diff, and sends candidate notes through the gate |
| `report_outcome` | when the task ends | Records which notes were used and whether the work passed |
| `list_notes` | any time | Lists the notes kept for the repository |

People review what the gateway held back, and approve, reject or retract:

```bash
export ATTEST_APPROVERS=owner:finance-lead
attest-admin review  --repo .
attest-admin approve --repo . --note at-0004 --by owner:finance-lead --reason "Finance needs the ticket id"
attest-admin retract --repo . --note at-0002 --reason "Policy changed"
```

<details>
<summary><b>Configuration</b></summary>

| Variable | Default | Meaning |
|---|---|---|
| `ATTEST_HOME` | `~/.attest` | Where memory is stored, one store per repository |
| `ATTEST_STORE` | `sqlite` | `sqlite` (shared by several agents or people) or `jsonl` |
| `ATTEST_VERIFY_CMD` | `python -m pytest -q` | Verification command, set by the person who configures the server, never by the agent |
| `ATTEST_GATEWAY` | `checks` | `checks` runs the evidence gateway; `off` keeps only the preregistered write gate |
| `ATTEST_ALLOWED_REPOS` | *(all)* | Comma-separated repository keys the server may serve |
| `ATTEST_SECRET_SCAN` | `1` | Reject notes that contain secrets |
| `ATTEST_APPROVERS` | *(none)* | Names allowed to approve with `attest-admin` |

</details>

## Reproduce the experiments

```bash
git clone https://github.com/tonglynn/attest-agent-memory && cd attest-agent-memory
pip install -r requirements.txt && pip install -e . --no-deps
python -m pytest -q                        # offline, no API key needed
python scripts/mcp_demo.py                 # end-to-end MCP demo with a scripted model

export DEEPSEEK_API_KEY=...                # model runs only
python -m attest experiment --name main    # the preregistered experiment
```

Every run behind the numbers above is committed under [`runs/`](runs/) with its
trajectories, diffs, results and memory logs. The experiments also run on GitHub Actions
through the [`experiment`](.github/workflows/experiment.yml) workflow.

## Documentation

| Document | Contents |
|---|---|
| [`ASSESSMENT.md`](ASSESSMENT.md) | Full write-up: problem, method, every experiment, design decisions |
| [`RESULTS.md`](RESULTS.md) | All results, including negative and null ones, with run directories |
| [`PREREGISTRATION.md`](PREREGISTRATION.md) | Hypotheses and analysis plan, frozen before any memory run |
| [`DECISIONS.md`](DECISIONS.md) | Decision log D1–D79 |
| [`SCENARIO.md`](SCENARIO.md) | The synthetic billing codebase and its team rules |
| [`docs/MCP_DEMO.md`](docs/MCP_DEMO.md) | Using Attest from a real agent |

| Path | Contents |
|---|---|
| `attest/memory/` | Write gate, evidence gateway, retrieval, lifecycle, stores (JSONL, SQLite) |
| `attest/mcp_server.py` · `attest/admin.py` | MCP server for agents; command line for people |
| `benchmark/` | 25-task benchmark on a synthetic billing codebase |
| `runs/` | Every experiment run |
| `demo-app/` · `docs/app/` | Interactive demo source and published build |

## Limits

One model (DeepSeek), one synthetic benchmark designed by the author, simulated review
comments, 11 held-out tasks × 3 repetitions. The gate checks that the evidence line is a
real verified change, not that it is about the rule. Process rules that a diff cannot show
(rebase, backport) are out of reach. All repositories, review comments, policies and attack
material are synthetic and labelled as such.

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Please report
security issues privately as described in [SECURITY.md](SECURITY.md).

## Citation

```bibtex
@software{lin2026attest,
  author  = {Lin, Tong},
  title   = {Attest: Verified, Scoped, Retractable Memory for Coding Agents},
  year    = {2026},
  version = {0.1.0},
  url     = {https://github.com/tonglynn/attest-agent-memory}
}
```

## License

[MIT](LICENSE). Attest started as a practical assessment for an AI-native development role;
the original write-up is kept in [`ASSESSMENT.md`](ASSESSMENT.md).

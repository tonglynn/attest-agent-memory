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

### Effectiveness and safety in the same experiment

[![D71 comparison: clean-stream first-attempt pass rate versus poisoned held-out runs. Gateway v3.1: 82% and 0/55; gateway v4: 84% and 0/55. ACE-style: 65% and 23/55; ReasoningBank-style: 60% and 28/55.](docs/effect_safety.png)](runs/gate_confirm/report.md)

**Read toward the lower right:** higher clean-stream first-attempt pass rate, fewer poisoned held-out runs applying the injected advice. In this exploratory D71 study, every arm learned its own memory in the same session; the gateway variants combined high clean-stream performance with 0/55 poisoned held-out runs applying the advice.

Conditions: one model (`deepseek-flash`), an author-designed synthetic billing benchmark, 11 held-out tasks × 5 repetitions per arm. ACE-style and ReasoningBank-style are simplified in-repository reproductions, not official-system leaderboard results. The plot is descriptive; paired uncertainty intervals and comparison verdicts are in the [report](runs/gate_confirm/report.md). Gateway variants were developed after the main experiment on this benchmark.

[Run records](runs/gate_confirm) · [Machine-readable summary](runs/gate_confirm/summary.json) · [Analysis script](scripts/gate_confirm_report.py)

## System design

![Write path, scoped recall, and separate human governance](docs/assets/architecture.svg)

The memory core supports SQLite and JSONL. MCP provides the agent tools; `attest-admin` provides the human governance interface. Events remain in an append-only log.

## Core mechanisms

Consider an **illustrative rule from the synthetic billing scenario**: a review asks a refund function to accept a keyword-only idempotency key and check it before changing state. The lifecycle below explains how such feedback can become reusable knowledge; it is not an additional experiment result.

### 1. Build an evidence chain before learning

The MCP server computes `git diff` and runs the verification command configured by the person operating the server. The agent cannot choose that command through the `learn` tool. A failed verification stops the default learning path. The agent or distillation model proposes at most three notes, each quoting a review comment and an added line from the actual change.

For the refund rule, the candidate needs both the review's wording and the line that applies it. The memory records the source task, review, applied file/line, verification, and repository/version scope. Matching a quotation and a changed line establishes traceability; it does **not** by itself establish that the rule is semantically correct.

Implementation: [`learn` and server-side verification](attest/mcp_server.py) · [candidate admission and provenance](attest/memory/earned.py).

### 2. Separate a verified change from a justified rule

The shared evidence gateway classifies **counter-evidence**, **hard evidence**, and **soft evidence**. Hard evidence can include a registered policy, a supporting team code check, or an applicable counterfactual check. Soft evidence includes trusted-reviewer wording and repetition from independent sources. The final three-state decision is deterministic:

- **Approved:** no counter-evidence, and either hard evidence or two kinds of soft evidence.
- **Rejected:** counter-evidence without hard evidence.
- **Uncertain:** all other combinations, including conflicting hard evidence and counter-evidence, or a trusted reviewer alone. A person must decide.

Thus, a refund patch passing its tests is not enough to promote every suggestion in its review. In the **default MCP path**, assessment supplies registered-policy references, scenario-specific team code checks, and trusted-reviewer wording; it does **not** run counterfactual tests or supply the repeated-source signal. Uncertain notes are retained with `observed_only`, but MCP recall excludes them until a person approves them. Rejected notes are retired with a reason.

Implementation: [`three_state`](attest/memory/gateway.py) · [`_assess` and `_McpMemory._exclusion`](attest/mcp_server.py). The bundled registry and code checks come from the synthetic scenario; other teams need to adapt these evidence sources to their own policies and code conventions.

### 3. Recall knowledge only where it applies

The MCP store is partitioned by the full Git remote identity, rather than the repository basename; local repositories without a remote use a path-derived key. The checkout version is taken from its most recent reachable Git tag. Within that store, retrieval filters notes by repository, version validity, lifecycle status, and the MCP uncertainty rule before ranking candidates by task relevance.

For the refund example, a note from another repository or outside its version range is ineligible. Eligible notes are injected with their source and usage history. A `suspect` note can still be shown with a warning; a retired note is excluded. Retrieval also warns when a major-version change has not been revalidated, so version checking should not be read as an automatic proof that a policy still holds.

Implementation: [repository identity and MCP recall](attest/mcp_server.py) · [filtering, ranking, and context assembly](attest/memory/earned.py).

### 4. Feed task outcomes back into the memory lifecycle

`report_outcome` reruns verification and records which notes were shown and cited. A cited note used in a passing task gains a successful-use record and can recover from `suspect` to `active`. If a cited note is associated with a related review failure, the first consecutive failure marks it `suspect`; the next retires it. An unrelated failure does not trigger that blame path.

The refund rule therefore carries an observable use history instead of staying permanently trusted after admission. Citation is reported by the agent, and relatedness is heuristic: this feedback is **not causal attribution** of the failure to the note.

Implementation: [`report_outcome`](attest/mcp_server.py) · [`feedback`](attest/memory/earned.py).

### 5. Keep human decisions separate and auditable

The MCP server exposes `recall`, `learn`, `report_outcome`, and `list_notes`; it exposes no human approval or retraction tool. `attest-admin` provides review, approval, rejection, and retraction. Approval/rejection checks the registered approver list and refuses agent identities and the note's proposer; approval also records supporting evidence, the reason, and scope. Retraction stops recall while retaining the note in the event history.

The review library additionally implements **policy-change invalidation** and **explicit supersession**: a policy dependency can send an approved note back for review; an approved replacement can supersede older notes without deleting their history. These are library operations in [`review.py`](attest/memory/review.py), **not current `attest-admin` subcommands**. Approver identities are checked names, not cryptographic proof of a person's identity.

Implementation: [human CLI](attest/admin.py) · [review permissions, policy dependencies, supersession, and review audit](attest/memory/review.py).

<details>
<summary><b>Experimental extensions: what is separate from the default MCP path?</b></summary>

- **Counterfactual validation:** experimental gateways revert candidate-related edits and rerun relevant checks to ask whether the verified result depends on them. This is implemented in [`counterfactual.py`](attest/memory/counterfactual.py); the MCP assessment does not run it.
- **Tiered injection:** [`tiers.py`](attest/memory/tiers.py) explores prioritizing core rules over regular notes and file-local candidates. Its policy reflects the synthetic billing scenario and is not the default MCP retrieval policy.
- **Dynamic forgetting:** [`forgetting.py`](attest/memory/forgetting.py) combines evidence quality, decay, and verified use to archive notes. Archival preserves history; V1.1 is opt-in, and useful-rule loss is reported in the results. This policy is not enabled by the default MCP memory class.
- **Long-session context management:** [`context/manager.py`](attest/context/manager.py) keeps structured working state, pinned constraints, and recent messages under a context budget. It is a separate experimental component, not automatically installed into an MCP client's conversation by connecting the memory server.

These extensions have different experiments and limitations. See [all results](RESULTS.md) and the [decision log](DECISIONS.md) rather than treating them as one evaluated default configuration.

</details>

## Quick start

Install the MCP server and connect it to an agent:

```bash
pip install "git+https://github.com/tonglynn/attest-agent-memory"
claude mcp add attest -- attest-mcp        # Claude Code; any MCP client works the same way
```

The agent receives four tools:

| Tool | Called | What it does |
|---|---|---|
| `recall` | before a task | Returns eligible notes for this repository and version, with provenance and warnings |
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
comments, 11 held-out tasks × 3 repetitions. The preregistered write gate checks that the evidence line is a
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

# Contributing

Issues and pull requests are welcome. Attest is a research prototype, so changes that keep
its claims checkable are preferred over changes that add features.

## Setup

```bash
git clone https://github.com/tonglynn/attest-agent-memory
cd attest-agent-memory
pip install -r requirements.txt && pip install -e . --no-deps
python -m pytest -q          # offline, no API key needed
```

## Ground rules

- **Tests stay offline.** Tests use scripted models; no test may call a model API or read a key.
- **The preregistered experiment is frozen.** The code and data behind `runs/main`
  (commit `cf5d879`) are not changed. New ideas go into new, separately labelled experiments.
- **Report results as they are.** A new experiment reports its negative and null results
  in `RESULTS.md` alongside the positive ones, with the run directory as its source.
- **Agents never approve or retract.** Do not add approve, reject or retract tools to the MCP
  server; those actions belong to `attest-admin`, which only people run.
- **Synthetic material is labelled.** Repositories, review comments, policies and attack
  material in the benchmark are synthetic and must stay marked as such.
- **No secrets in the repository.** Keys live in the environment or in the Actions secret
  `DEEPSEEK_API_KEY`.

## Pull requests

Keep each pull request to one change, describe what it changes and how it was checked, and
add or update tests where behaviour changes. Design decisions that change behaviour are
recorded in `DECISIONS.md`.

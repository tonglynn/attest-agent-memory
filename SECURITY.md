# Security policy

Attest is a defence against one class of attack: plausible but wrong advice that passes the
tests and would otherwise become a stored rule. Reports in that area are especially useful.

## In scope

- Poisoned review advice or candidate notes that pass the write gate and become active rules
- Any path by which an agent can approve, reject or retract a note
- Notes recalled outside their repository or version range
- Undetected modification of the event log (HMAC chain and anchors)
- Secrets stored in, or recalled from, memory

## Reporting

Please report vulnerabilities privately through
[GitHub private vulnerability reporting](https://github.com/tonglynn/attest-agent-memory/security/advisories/new)
rather than in a public issue. Include the steps or input that reproduce the problem and the
commit you tested.

## Supported versions

Only the latest commit on `main` receives fixes.

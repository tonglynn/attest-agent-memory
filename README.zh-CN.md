<div align="center">

# Attest

**面向编码智能体的可验证、限定作用域、可撤回的团队记忆。**

编码智能体从代码评审中学习，但只学习经验证改动实际采用的经验，只在来源仓库与适用版本内生效，人工撤回后即刻失效。

[![tests](https://github.com/tonglynn/attest-agent-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/tonglynn/attest-agent-memory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-1d7448)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-3776ab)](pyproject.toml)
[![MCP server](https://img.shields.io/badge/MCP-server-5b6a60)](attest/mcp_server.py)
[![Live demo](https://img.shields.io/badge/demo-live-2648b8)](https://tonglynn.github.io/attest-agent-memory/)

[**在线演示**](https://tonglynn.github.io/attest-agent-memory/) ·
[**5 分钟实录**](docs/attest_mcp_live.mp4) ·
[**完整报告**](ASSESSMENT.md) ·
[**English**](README.md)

</div>

<p align="center">
  <img src="docs/assets/live_run.gif" width="880" alt="Claude 桌面应用真实运行中的五个时刻：评审规则批准为 at-0002；可通过测试的 float 建议被拒绝；证据不足的规则转人工；人工批准与撤回后召回结果随之变化；第二次会话召回两条规则">
  <br>
  <sub>Claude 接入 Attest MCP 服务的真实运行：学习一条规则，拒绝一条可通过测试的错误规则，证据不足的规则交由人工判定，召回结果随人工决定更新。</sub>
</p>

## 动机

编码智能体反复出现评审已纠正过的错误。现有记忆方案通常保存智能体自行得出的结论、在所有场景中套用且无法撤回，因此一条能通过测试的错误建议可能被固化为永久规则。

Attest 将每条记忆视为需要证据支持的主张：

- **仅从经验证的工作中学习。** 验证命令由 Attest 自行执行；每条经验须引用来源评审原文，并指向采用该经验的改动行。
- **确定性判定。** 证据网关将经验判定为批准、拒绝或待人工；是否成为规则不由模型调用决定。
- **限定作用域。** 每条经验绑定仓库与适用版本区间，不会在其他代码库或政策变更后被召回。
- **人工主导治理。** 批准、拒绝、取代与撤回仅由人工经命令行执行，智能体无权访问；全部变更写入只追加、经 HMAC 封存的事件日志。

## 结果

| | 结果 | 来源 |
|---|---|---|
| **持续学习** | 留出任务首轮通过率 **33% → 70%**（+36 pp [+21, +52]） | 预注册主实验，[`runs/main`](runs/main) |
| **抵御投毒** | 可通过测试的投毒建议成为规则 **0/60**（无门槛 46/60，ACE 式 38，ReasoningBank 式 50） | [`runs/poison_channels`](runs/poison_channels) |
| **无额外代价** | 启用证据网关后通过率 82%，与无门槛持平，较预注册门槛高 9 pp | [`runs/gate_confirm`](runs/gate_confirm) |
| **作用域隔离** | 对照仓库泄漏经验 **0** 条（不限定作用域时 54 条） | [`runs/main`](runs/main) |
| **政策变更** | 政策变更后的任务 **+67 pp** | [`runs/main`](runs/main) |

<p align="center">
  <img src="docs/effect_safety.png" width="760" alt="散点图：六种记忆系统的干净任务通过率与照做投毒次数；启用证据网关的 Attest 位于 82%–84%、0/55">
</p>

负面结果同样报告：预注册写入门槛带来 −15 pp 代价（H6 不成立），失败归因问题尚未解决。详见[局限](#局限)。

## 工作原理

<p align="center">
  <img src="docs/assets/architecture.svg" width="880" alt="写入链路：验证、提炼、门槛、入库；召回链路：过滤、排序、注入、回写；批准、拒绝与撤回仅经 attest-admin 由人工执行">
</p>

- **写入链路**（`learn`，任务验证通过后触发）：模型至多提出三条候选，每条附评审原文与对应改动行；确定性检查与证据网关判定为批准、拒绝或待人工；批准的经验与既有经验合并、取代或更正。
- **召回链路**（`recall`，新任务开始前触发）：按仓库、版本区间与状态过滤；核心规则优先，在软预算内按任务相关性排序；每条附来源注入；任务结束后回写结果（通过则加强，失败则标为可疑直至退役）。
- **人工治理**：批准与撤回仅存在于 `attest-admin`；MCP 服务不提供相应工具，智能体无法批准自身提出的经验。

## 快速开始

安装 MCP 服务并接入智能体：

```bash
pip install "git+https://github.com/tonglynn/attest-agent-memory"
claude mcp add attest -- attest-mcp        # Claude Code；其他 MCP 客户端接入方式相同
```

智能体获得四个工具：

| 工具 | 调用时机 | 作用 |
|---|---|---|
| `recall` | 任务开始前 | 返回本仓库、本版本内已批准的经验及其来源 |
| `learn` | 改动被接受后 | 执行验证、计算 diff，并将候选经验送入写入门槛 |
| `report_outcome` | 任务结束时 | 记录所用经验及任务是否通过 |
| `list_notes` | 任意时刻 | 列出本仓库保存的经验 |

人工审核待判定的经验，并执行批准、拒绝或撤回：

```bash
export ATTEST_APPROVERS=owner:finance-lead
attest-admin review  --repo .
attest-admin approve --repo . --note at-0004 --by owner:finance-lead --reason "财务对账需要工单号"
attest-admin retract --repo . --note at-0002 --reason "政策变更"
```

<details>
<summary><b>配置项</b></summary>

| 变量 | 默认值 | 含义 |
|---|---|---|
| `ATTEST_HOME` | `~/.attest` | 记忆存储位置，每个仓库一份 |
| `ATTEST_STORE` | `sqlite` | `sqlite`（可供多个智能体或人员共享）或 `jsonl` |
| `ATTEST_VERIFY_CMD` | `python -m pytest -q` | 验证命令，由配置服务的人员设定，智能体无法指定 |
| `ATTEST_GATEWAY` | `checks` | `checks` 启用证据网关；`off` 仅保留预注册写入门槛 |
| `ATTEST_ALLOWED_REPOS` | （全部） | 允许服务的仓库标识，逗号分隔 |
| `ATTEST_SECRET_SCAN` | `1` | 拒绝含密钥的经验 |
| `ATTEST_APPROVERS` | （无） | 可经 `attest-admin` 执行批准的人员 |

</details>

## 复现实验

```bash
git clone https://github.com/tonglynn/attest-agent-memory && cd attest-agent-memory
pip install -r requirements.txt && pip install -e . --no-deps
python -m pytest -q                        # 离线测试，无需 API 密钥
python scripts/mcp_demo.py                 # 脚本化模型的 MCP 端到端演示

export DEEPSEEK_API_KEY=...                # 仅模型运行需要
python -m attest experiment --name main    # 预注册主实验
```

上述数字对应的全部运行记录（轨迹、diff、结果与记忆日志）均提交于 [`runs/`](runs/)。实验亦可通过 [`experiment`](.github/workflows/experiment.yml) 工作流在 GitHub Actions 上运行。

## 文档

| 文档 | 内容 |
|---|---|
| [`ASSESSMENT.md`](ASSESSMENT.md) | 完整报告：问题、方法、全部实验与设计决策 |
| [`RESULTS.md`](RESULTS.md) | 全部结果，含负面与无效结果及对应运行目录 |
| [`PREREGISTRATION.md`](PREREGISTRATION.md) | 假设与分析计划，于任何有记忆的运行之前冻结 |
| [`DECISIONS.md`](DECISIONS.md) | 决策日志 D1–D79 |
| [`SCENARIO.md`](SCENARIO.md) | 合成计费代码库及其团队规则 |
| [`docs/MCP_DEMO.md`](docs/MCP_DEMO.md) | 在真实智能体中使用 Attest |

## 局限

单一模型（DeepSeek）、作者自建的单一合成基准、模拟评审意见、11 个留出任务 × 3 次重复。写入门槛核验证据行确为经验证的改动，但不核验该行与规则的语义关联。diff 无法体现的流程规则（rebase、backport）不在覆盖范围内。所有仓库、评审意见、政策与攻击材料均为合成数据并已标注。

## 参与贡献

欢迎提交 Issue 与 Pull Request，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

## 许可证

[MIT](LICENSE)。Attest 起源于一项 AI 原生开发岗位的实践测评，原始报告保留于 [`ASSESSMENT.md`](ASSESSMENT.md)。

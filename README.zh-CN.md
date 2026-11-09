<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/attest-banner-dark.svg">
  <img src="docs/assets/attest-banner-light.svg" width="100%" alt="Attest — Evidence-backed memory for coding agents">
</picture>

# Attest

**让编码智能体记住评审经验，让团队掌握记忆的使用权。**

Attest 是一个 MCP 记忆服务：从已验证的代码改动中学习评审经验，按仓库与版本召回，并支持人工审核、取代和撤回。适合需要跨任务复用团队规则、同时保留来源与决策记录的编码工作流。

[交互演示](https://tonglynn.github.io/attest-agent-memory/) · [MCP 接入指南](docs/MCP_DEMO.md) · [English](README.md)

[![MCP server](https://img.shields.io/badge/MCP-server-255fb2)](docs/MCP_DEMO.md)
[![CI tests](https://github.com/tonglynn/attest-agent-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/tonglynn/attest-agent-memory/actions/workflows/ci.yml)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776ab)](pyproject.toml)
[![License: MIT](https://img.shields.io/badge/License-MIT-52677f)](LICENSE)

[![Main study: preregistered](https://img.shields.io/badge/Main_study-preregistered-226b53)](PREREGISTRATION.md)
[![Evidence: public run logs](https://img.shields.io/badge/Evidence-public_run_logs-52677f)](runs/)


CI 覆盖 Python **3.11、3.12、3.13**。主实验提供预注册方案，实验运行记录与负面结果均公开，可逐项核查。

## 从一次评审，到下一次任务

1. **采集依据。** 完成改动后，Attest 执行验证，收集评审原文与实际 diff；模型提出候选经验。
2. **判断准入。** 确定性证据网关将候选分为批准、拒绝或待人工。测试通过本身不代表建议正确。
3. **按需召回。** 新任务只检索适用仓库、版本与状态内的经验，并附带来源。
4. **人工治理。** 团队通过独立的 `attest-admin` 审核、取代或撤回经验；MCP 不暴露这些管理工具。

## 看一次真实运行

[![Claude Desktop 接入 Attest 的录制：学习、证据判定与人工审核](docs/assets/live_run.gif)](https://tonglynn.github.io/attest-agent-memory/app/)

这是 Claude Desktop 与 MCP 服务的真实运行录制。交互演示另外标明浏览器执行、实验回放和预先计算结果。

[观看 5 分钟实录](docs/attest_mcp_live.mp4) · [MCP 接入说明](docs/MCP_DEMO.md)

## 已验证什么

- **经验复用：33% → 70%。** 预注册主实验的留出任务首轮通过率；一个模型、作者设计的合成计费系统、11 个留出任务各重复 3 次。
- **投毒准入：0/60 成为规则。** 后续 D70 合成攻击中，v4 网关未将攻击存为规则；空记忆条件下仍有 23/60 以未确认笔记保留。这不等于没有存储或暴露风险。
- **效果与代价需要一起看。** 后续探索性 D71 中，v3.1 网关干净流通过率为 82%，与无门槛持平；原预注册门槛则有 −15 个百分点代价。

这些结果来自不同版本与实验，不能合并为生产环境效果或全面安全保证。[完整结果与局限](RESULTS.md) · [预注册方案](PREREGISTRATION.md)

## 系统结构

![写入、召回与独立人工治理的系统结构](docs/assets/architecture.svg)

核心记忆层支持 SQLite 与 JSONL；MCP 为智能体提供工具，`attest-admin` 为人工提供治理入口。事件保留在只追加的日志中。

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

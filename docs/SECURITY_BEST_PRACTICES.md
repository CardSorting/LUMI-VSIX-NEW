---
title: "Security & Best Practices"
sidebarTitle: "Security"
description: "How LUMI protects your code — approval gates, hooks, ignore files, and completion checks."
---

# Security & Best Practices

LUMI has physical access to your workspace (files, terminal, browser, MCP). Security is implemented as **layers in code**, not policy PDFs.

## Security model (implemented)

| Layer | What it does | Where |
|-------|--------------|-------|
| **Execution admission** | Every operation receives one recorded execution decision before a permit can exist | `ExecutionFunnel` + webview projection |
| **Autonomous mode** | In-scope operations proceed without per-tool consent prompts. Command permissions, hooks, workspace/lane authority, and MCP policy remain active | `src/core/task/tools/execution/ExecutionFunnel.ts` |
| **Read-only allowlist** | 13 tools may run without blocking checkpoints | `READ_ONLY_TOOLS` in `src/shared/tools.ts` |
| **Hooks** | Cancel or modify context at 8 lifecycle points | `src/core/hooks/hook-factory.ts` |
| **Completion gates** | `attempt_completion` blocked until audit/roadmap/focus checks pass | `completionGatePipeline.ts` |
| **Ignore file** | Exclude paths from agent context | `.dietcodeignore` → `DietCodeIgnoreController` |
| **Command permissions** | Restrict shell commands when configured | `CommandPermissionController` |
| **Credential storage** | API keys in VS Code secret storage | `StateManager` / `state-keys.ts` |
| **Roadmap fail-closed** | Optional block when `ROADMAP.md` invalid | `lumi.roadmap.failClosedCompletionGates` |

## Consent boundaries

Every operation goes through the tool execution pipeline. Autonomous mode is enabled for new installations and removes per-tool consent prompts for agent-selected operations within the user's task scope. The funnel still applies execution policy, hooks, workspace and lane authority, cancellation, and lifecycle checks before dispatch. In-scope subagent delegation and child operations follow the same autonomous flow while lane allowlists, locks, budgets, and merge checks remain active. Turning autonomous mode off makes per-capability Auto Approve settings and handler eligibility authoritative for automatic execution.

Read-only exploration, routine workspace edits, verification, and in-scope command execution proceed without repeated prompts. `requires_approval=true` records command risk; in autonomous mode it does not pause execution. Skip actions outside the request or with unclear target/scope, and let command policy and hooks decide whether dispatch is allowed.

See [Philosophy — Approval is the contract](papers/philosophy.md#iv-approval-is-the-contract).

## Data flow

| Data | Stays local? | Notes |
|------|--------------|-------|
| Source files | Yes | Read/written only through approved tools |
| Task history | Yes | Extension global storage + disk under task ULID |
| API keys | Yes (OS secret store) | Sent only to **your chosen provider** |
| LLM prompts/responses | Provider-dependent | OpenRouter, NousResearch, Cloudflare, or OpenAI Codex |
| BroccoliDB SQLite | Yes | `@noorm/broccolidb` on your machine |
| Telemetry | Configurable | See enterprise monitoring docs if enabled |

This build wires **four providers** (`src/shared/providers/providers.json`). Keys are not routed through a LUMI backend unless you use hosted auth (`AuthService`).

## Best practices

### 1. Use `.dietcodeignore`

Exclude secrets and noise from context:

```gitignore
.env
.env.*
**/.ssh/
**/credentials.json
node_modules/
dist/
*.pem
```

Patterns work like `.gitignore`. See [dietcodeignore](customization/dietcodeignore.mdx).

### 2. Review every diff

Before **Approve**, use the built-in diff view (`VscodeDiffViewProvider`). The companion is calm, not invisible.

### 3. Keep exceptional approval boundaries narrow

Autonomous mode covers routine, in-scope workspace work. Reserve explicit approval for high-impact or external side effects, and use command permissions or hooks when an organization needs a hard boundary. See [auto-approve](features/auto-approve.mdx).

### 4. Use hooks for org policy

`PreToolUse` can cancel dangerous tools. `UserPromptSubmit` can inject compliance context. Scripts live in `.dietcoderules/hooks/`. See [hooks](customization/hooks.mdx).

### 5. Enable roadmap gates for team projects

When using `ROADMAP.md` steering, keep `lumi.roadmap.blockKanbanOnValidationPending` enabled. Validation is **enforced automatically** at `attempt_completion` — agents do not need a manual `roadmap(action='validate')` step. If completion is blocked, agents should edit `ROADMAP.md` per the gate message. See [Roadmap steering](features/roadmap-steering.mdx) and the [auto-governance post-mortem](features/roadmap-auto-governance-postmortem.mdx).

### 6. Set provider spending limits

Use OpenRouter or provider dashboards to cap cost. Plan mode can use a cheaper model than Act mode.

### 7. Audit MCP servers

MCP tools run through `use_mcp_tool` with the same approval path. Only install servers you trust.

## Subagents

Subagents inherit parent approval and hooks. They do not bypass the tool coordinator. See [Working with subagents](WORKING_WITH_SUBAGENTS.md).

## Structural proof (BroccoliDB)

Repository structure and repair governance live in **BroccoliDB**, not the sidebar. LUMI integrates via cognitive memory tools, Spider policy (`src/core/policy/spider/`), and `dietcode_kernel`.

For substrate security (modes, policies, repair executor), read [BroccoliDB philosophy](../broccolidb/docs/papers/philosophy.md).

## Related

- [Security model in whitepaper](papers/whitepaper.md#13-security-model)
- [Completion gates](papers/whitepaper.md#73-completion-gate-pipeline)
- [Architecture (current)](architecture/current.md)

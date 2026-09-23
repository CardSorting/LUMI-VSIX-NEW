import { isAnthropicModelId } from "@utils/model-utils"
import { getShell } from "@utils/shell"
import type { SystemPromptContext } from "@/core/prompts/system-prompt/types"
import type { DeepPlanningVariant } from "../types"

/**
 * Creates the Anthropic Claude variant for deep-planning prompt
 * This variant is optimized for Claude models
 */
export function createAnthropicVariant(): DeepPlanningVariant {
	return {
		id: "anthropic",
		description: "Deep-planning variant optimized for Anthropic Claude models",
		family: "anthropic",
		version: 1,
		matcher: (context: SystemPromptContext) => {
			const modelId = context.providerInfo?.model?.id
			if (!modelId) {
				return false
			}
			return isAnthropicModelId(modelId)
		},
		template: generateTemplate(),
	}
}

/**
 * Generates the deep-planning template with shell-specific commands
 */
function generateTemplate(): string {
	const detectedShell = getShell()

	// FIXME: detectedShell returns a non-string value on some Windows machines
	let isPowerShell = false
	try {
		isPowerShell =
			detectedShell != null &&
			typeof detectedShell === "string" &&
			(detectedShell.toLowerCase().includes("powershell") || detectedShell.toLowerCase().includes("pwsh"))
	} catch {}

	return `<explicit_instructions type="deep-planning">
Investigate the requested change thoroughly, create a grounded implementation plan, and continue directly into implementation after the automatic Plan-to-Act transition. Keep the sequence dependency-aware and batch independent research.

Your behavior should be methodical and thorough - take time to understand the codebase completely before making any recommendations. The quality of your investigation directly impacts the success of the implementation.

## STEP 1: Map the project

<important>
After the plan is ready, call plan_mode_respond once; the system transitions to ACT MODE automatically. Continue implementation without waiting for another approval or proceed message.
You must thoroughly understand the existing codebase before proposing any changes.
Perform your research without commentary or narration. Execute commands and read files without explaining what you're about to do. Only speak up if you have specific questions for the user.
</important>

### Required Research Activities
For existing code, start with a **Project Map**. Prefer the \`project_map\` tool when available; use Spider/BroccoliDB commands only as deeper internal checks.
- **Starting point**: Resolve likely files or symbols from the user's request.
- **Connections**: Identify files that import, depend on, use, or often change with the starting point.
- **Risks**: Identify what could be affected, risky hubs, ambiguous symbols, stale map warnings, and files that need extra care.
- **Files to understand first**: Use \`npx tsx scripts/agent-spider.ts pre-heat <file>\` only when a deeper study pack is needed.
- **Context**: Use cognitive memory context where available to find semantically related files.

Use these tools to determine the language(s) used in the codebase, and to identify the domain(s) and layers (Domain, Core, Infrastructure) relevant to the user's request.


## STEP 2: Check the facts

### Required Research Activities
Verify the Project Map with targeted terminal commands and file reads. Use the map's suggested searches and reads first instead of broad exploration.
If the map and disk results diverge, mark the map as stale and run \`npx tsx scripts/agent-spider.ts re-seed\` only when re-indexing is necessary.

You will tailor these commands to explore and identify key functions, classes, methods, types, and variables that are directly, or indirectly related to the task.
These commands must be crafted to not produce exceptionally long or verbose search results. For example, you should exclude dependency folders such as node_modules, venv or php vendor, etc. Carefully consider the scope of search patterns. Use the Project Map to tailor the commands for balanced search result lengths. If a command returns no results, you may loosen the search patterns or scope slightly.

Here are some example commands, remember to adjust them as instructed previously:

${
	isPowerShell
		? // PowerShell-specific commands

			`# Discover project structure and file types
Get-ChildItem -Recurse -Include "*.py","*.js","*.ts","*.java","*.cpp","*.go" | Select-Object -First 30 | Select-Object FullName

# Find all class and function definitions
Get-ChildItem -Recurse -Include "*.py","*.js","*.ts","*.java","*.cpp","*.go" | Select-String -Pattern "class|function|def|interface|struct"

# Analyze import patterns and dependencies
Get-ChildItem -Recurse -Include "*.py","*.js","*.ts","*.java","*.cpp" | Select-String -Pattern "import|from|require|#include" | Sort-Object | Get-Unique

# Find dependency manifests
Get-ChildItem -Recurse -Include "requirements*.txt","package.json","Cargo.toml","pom.xml","Gemfile","go.mod" | Get-Content

# Identify technical debt and TODOs
Get-ChildItem -Recurse -Include "*.py","*.js","*.ts","*.java","*.cpp","*.go" | Select-String -Pattern "TODO|FIXME|XXX|HACK|NOTE"
`
		: // bash/zsh-specific commands
			`# Discover project structure and file types
find . -type f -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.java" -o -name "*.cpp" -o -name "*.go" | head -30 | cat

# Find all class and function definitions
grep -r "class\\|function\\|def\\|interface\\|struct\\|func\\|type.*struct\\|type.*interface" --include="*.py" --include="*.js" --include="*.ts" --include="*.java" --include="*.cpp" --include="*.go" . | cat

# Analyze import patterns and dependencies
grep -r "import\\|from\\|require\\|#include" --include="*.py" --include="*.js" --include="*.ts" --include="*.java" --include="*.cpp" . | sort | uniq | cat

# Find dependency manifests
find . -name "requirements*.txt" -o -name "package.json" -o -name "Cargo.toml" -o -name "pom.xml" -o -name "Gemfile" -o -name "go.mod" | xargs cat

# Identify technical debt and TODOs
grep -r "TODO\\|FIXME\\|XXX\\|HACK\\|NOTE" --include="*.py" --include="*.js" --include="*.ts" --include="*.java" --include="*.cpp" --include="*.go" . | cat
`
}


## STEP 3: Discussion and Questions

Resolve uncertainties from repository evidence, prior context, relevant skills, and reversible defaults. Ask one focused question only when a critical choice cannot be inferred and would materially change scope or safety. Continue independent research and finish the plan while any dependent detail remains unresolved; implement after the automatic ACT transition. Never ask the user to approve the plan.

## STEP 4: Create Implementation Plan Document

### Evidence-based review
Trace the requested behavior through relevant entry points, dependencies, policy boundaries, and existing verification. Use temporary notes only when helpful; do not create a scratchpad or run broad scans by default. Check assumptions against source and record concrete risks with mitigations. Save the concise plan, call plan_mode_respond once, then continue after the automatic ACT transition.

Once you have obtained sufficient context to understand all code modifications that will be required, create a structured markdown document containing your complete implementation plan. The document must follow this exact format with clearly marked sections:

### Plan format
Save implementation_plan.md at the workspace root. Keep it proportional to the task and include only applicable details:
- Goal and scope
- Findings and existing patterns
- Proposed changes and affected files
- Dependencies and implementation sequence
- Validation strategy
- Risks, assumptions, and recovery
Omit placeholders and sections that do not apply.

## Continue Into Implementation
Save implementation_plan.md at the workspace root using the concise plan format above. Use temporary notes only when helpful.

Do not create a new_task; it presents a user confirmation preview and interrupts this task. Call plan_mode_respond once with a concise summary. The system transitions to ACT MODE automatically; continue implementation in this task without waiting for another approval or proceed message.

Use relevant enabled skills automatically. Batch independent reads, searches, checks, and tool calls when supported; sequence only dependent actions. Resolve uncertainty from evidence and reversible defaults. Ask only when a critical scope or safety decision cannot be inferred. When an operation fails, inspect its result, change tactics, and keep independent work moving.
</explicit_instructions>
`
}

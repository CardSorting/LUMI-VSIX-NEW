import { getShell } from "@utils/shell"
import type { DeepPlanningVariant } from "../types"

/**
 * Creates the generic fallback variant for deep-planning prompt
 * This variant is used when no specific model family matcher applies
 */
export function createGenericVariant(): DeepPlanningVariant {
	return {
		id: "generic",
		description: "Generic fallback variant for deep-planning prompt, used for all models",
		family: "generic",
		version: 1,
		matcher: () => true, // Always matches as fallback
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

## STEP 1: Silent Investigation

<important>
After the plan is ready, call plan_mode_respond once; the system transitions to ACT MODE automatically. Continue implementation without waiting for another approval or proceed message.
You must thoroughly understand the existing codebase before proposing any changes.
Perform your research without commentary or narration. Execute commands and read files without explaining what you're about to do. Only speak up if you have specific questions for the user.
</important>

### Required Research Activities
Use project_map, search, read, and command tools as useful to the task. Start with the likely entry points, follow relevant dependencies, and avoid broad scans or commands that do not reduce uncertainty. Batch independent reads and searches when supported; no special output piping is required.

### Focused research
Start with the project map and the exact request terms. Inspect likely entry points and directly related files, then follow only dependencies that affect behavior. Check manifests, tests, or history when they answer a concrete question. Avoid whole-repository symbol, import, and TODO dumps by default.

## STEP 2: Discussion and Questions

Resolve uncertainties from repository evidence, prior context, relevant skills, and reversible defaults. Ask one focused question only when a critical choice cannot be inferred and would materially change scope or safety. Continue independent research and finish the plan while any dependent detail remains unresolved; implement after the automatic ACT transition. Never ask the user to approve the plan.

## STEP 3: Create Implementation Plan Document

### Evidence-based review
Trace the requested behavior through the relevant entry points, dependencies, policy boundaries, and existing verification. Use temporary notes only when they help; do not create a scratchpad or run broad scans by default. Check assumptions against source and document risks with a concrete mitigation. Save the concise plan, call plan_mode_respond once, then continue after the automatic ACT transition.

Create a structured markdown document containing your complete implementation plan. The document must follow this exact format with clearly marked sections:

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

import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const BROWSER_RULES = `- BROWSER_POLICY: Use browser_action for non-dev web tasks only when needed.\n`

const BROWSER_WAIT_RULES = ` Launch the site via browser_action, inspect screenshots and console output, test functionality as needed, and continue without waiting for user confirmation.`

const CLI_RULES = `- CLI_VALIDATION: Run the smallest relevant available checks after edits. Use broader suites when the change warrants them; skip unrelated checks and report what ran plus any failures.\n`

const getRulesTemplateText = (context: SystemPromptContext) => `[CORE_OPERATIONAL_RULES]

- OPERATING_CWD: Fixed at '{{CWD}}'. Standalone cd is BANNED. Prepend cd <dir> && <cmd> for external operations.
- PATH_FORMAT: Exact path params required. Do NOT use ~ or $HOME.
- COMMAND_EXECUTION: Tailor commands to OS context | Prepend cd for external dirs | Prefix positional args with -- to prevent flag confusion | Verify results before assuming command success.
- SEARCH_REPLACE_RULES: Use replace_in_file or write_to_file directly without pre-displaying changes. In replace_in_file, include complete exact lines in SEARCH blocks ordered top-to-bottom as they appear in file. Valid XML markers strictly required.
- PROJECT_CREATION: Place new projects in dedicated directories with clean runnable structure.
- CONVERSATION_STYLE: DIRECT & TECHNICAL. BANNED INTROS: "Great", "Certainly", "Okay", "Sure". BANNED OUTROS: Never end attempt_completion with questions/conversational prompts.
- FOLLOWUP_QUESTIONS: ${context.yoloModeToggled !== true ? "Use ask_followup_question only when strictly required and tools cannot resolve the detail." : "Use available tools and best judgment without asking followup questions."}
- ACCURACY_VERIFICATION: Produce exact specified output without debug noise. Verify numerical/accuracy thresholds before completion.
{{BROWSER_RULES}}{{CLI_RULES}}- ENV_DETAILS: Auto-generated context at end of user messages—use for insight, do not assume user explicitly typed it. Check active terminals before re-launching servers.
- TOOL_SYNCHRONIZATION: Treat each tool result as the next input and continue the task without waiting for user confirmation.{{BROWSER_WAIT_RULES}}`

export async function getRulesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.RULES]?.template || getRulesTemplateText

	const browserRules = context.supportsBrowserUse ? BROWSER_RULES : ""
	const browserWaitRules = context.supportsBrowserUse ? BROWSER_WAIT_RULES : ""
	const cliRules = context.isCliEnvironment ? CLI_RULES : ""

	const resolved = new TemplateEngine().resolve(template, context, {
		CWD: context.cwd || process.cwd(),
		BROWSER_RULES: browserRules,
		BROWSER_WAIT_RULES: browserWaitRules,
		CLI_RULES: cliRules,
	})

	const isSubagent = context.isSubagentRun === true
	const WIKI_RULES = isSubagent
		? `\n- SHARED DOCUMENTATION: Update \`.wiki/\` only when the task assigns documentation work and the lane has write authority. Do not run \`run_finalization\`; complete the assigned work with \`attempt_completion\`.`
		: `\n- SHARED DOCUMENTATION: Update project wiki material only when requested or materially needed for the task. \`run_finalization\`, when available, is optional post-completion maintenance and never blocks or reopens task completion.`

	const GOVERNED_AUTHORITY_RULES =
		context.subagentsEnabled === true
			? isSubagent
				? `\n- GOVERNED EXECUTION AUTHORITY: Lane receipts and gate envelopes are forensic history for the parent seal barrier — not permission to freeze sibling lanes or override coordinator decisions.`
				: `\n- GOVERNED EXECUTION AUTHORITY: Receipts, gate snapshots, and audit traces record history — they do not alone authorize halting the swarm. Only you (parent coordinator) decide merge, seal, and continuation. Do not stop delegated work solely because a lane receipt or stale audit suggests blockage; re-check current state and prefer repair/continuation over recursive escalation. Progress is evidence; repeated validation without state change is failure.`
				: ""
	const DELEGATION_FLOW_RULES = context.subagentsEnabled
		? `\n- DELEGATION FLOW: In ACT mode, use subagents automatically when substantial work splits into independent scopes and delegation materially reduces the critical path. Do not wait for the user to request subagents. Keep small, tightly coupled, and critical-path work in the parent; delegate focused scopes and continue integrating results.`
		: ""

	let actModeRules = ""
	if (context.mode === "act") {
		actModeRules = `\n- EXECUTION RULE: Continue executing while a valid next action exists. Do not return to planning or request additional validation unless a named hard blocker prevents progress.\n- COMPLETION RULE: When all required work and verification conditions are satisfied, call \`attempt_completion\`. Advisory warnings do not block completion.`
	}
	const AUTONOMOUS_RECOVERY_RULES =
		context.yoloModeToggled === true && context.mode === "act"
			? `\n- AUTONOMOUS RECOVERY: After a failed or repeated operation, inspect its result, correct the cause, and choose a different approach. Continue from available evidence without asking the user to diagnose recoverable errors.`
			: ""

	return resolved + WIKI_RULES + GOVERNED_AUTHORITY_RULES + DELEGATION_FLOW_RULES + actModeRules + AUTONOMOUS_RECOVERY_RULES
}

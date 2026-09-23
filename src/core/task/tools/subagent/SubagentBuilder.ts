import { buildApiHandler } from "@core/api"
import { PromptRegistry } from "@core/prompts/system-prompt"
import { DietCodeToolSet } from "@core/prompts/system-prompt/registry/DietCodeToolSet"
import type { SystemPromptContext } from "@core/prompts/system-prompt/types"
import { DietCodeDefaultTool } from "@shared/tools"
import { ApiConfiguration, ApiProvider } from "@/shared/api"
import { getProviderModelIdKey } from "@/shared/storage/provider-keys"
import type { TaskConfig } from "../types/TaskConfig"
import type { AgentBaseConfig } from "./AgentConfigLoader"
import { AgentConfigLoader } from "./AgentConfigLoader"

export type AgentConfig = Partial<AgentBaseConfig>

export const SUBAGENT_DEFAULT_ALLOWED_TOOLS: DietCodeDefaultTool[] = [
	DietCodeDefaultTool.FILE_READ,
	DietCodeDefaultTool.FILE_EDIT,
	DietCodeDefaultTool.FILE_NEW,
	DietCodeDefaultTool.LIST_FILES,
	DietCodeDefaultTool.SEARCH,
	DietCodeDefaultTool.LIST_CODE_DEF,
	DietCodeDefaultTool.PROJECT_MAP,
	DietCodeDefaultTool.STABILITY_QUERY,
	DietCodeDefaultTool.BASH,
	DietCodeDefaultTool.ATTEMPT,
	DietCodeDefaultTool.MEM_REFRESH,
	DietCodeDefaultTool.STABILITY_DIAGNOSE,
	DietCodeDefaultTool.STABILITY_SWEEP,
]

export const SUBAGENT_NON_MUTATING_ALLOWED_TOOLS = new Set<DietCodeDefaultTool>([
	DietCodeDefaultTool.FILE_READ,
	DietCodeDefaultTool.LIST_FILES,
	DietCodeDefaultTool.SEARCH,
	DietCodeDefaultTool.LIST_CODE_DEF,
	DietCodeDefaultTool.PROJECT_MAP,
	DietCodeDefaultTool.STABILITY_QUERY,
	DietCodeDefaultTool.USE_SKILL,
	DietCodeDefaultTool.STABILITY_DIAGNOSE,
	DietCodeDefaultTool.ATTEMPT,
])

export function constrainSubagentToolsForLane(tools: DietCodeDefaultTool[], mutatingAuthority: boolean): DietCodeDefaultTool[] {
	return mutatingAuthority ? tools : tools.filter((tool) => SUBAGENT_NON_MUTATING_ALLOWED_TOOLS.has(tool))
}

const CONSENSUS_PROTO = `
### REVIEW HANDOFF
Worker lanes do not spawn nested workers. Finish assigned work and local checks first. If independent review is material, signal its exact scope to the parent; do not wait for review before completing other work. Report consensus only when peer-review evidence is provided.
`

const AUTONOMOUS_NUDGE_PROTO = `
AUTONOMOUS NUDGE: Resolve uncertainty with the tools and skills available in your lane. For routine details, make the least disruptive in-scope assumption and continue. Report a blocker only when a missing external decision materially changes scope or safety; complete all independent work first.
`

const STRUCTURED_SIGNALING_PROTO = `
STRUCTURED SIGNALING: When signaling critical findings or final results, use structured markers [SIGNAL: ARCHITECTURE_VIOLATION] or [SIGNAL: SECURITY_RISK] followed by detailed JSON metadata if possible.
CONFIDENCE PRESERVATION: For the principal finding, report [confidence: high|medium|low|unknown], [confidence_reason: direct_evidence|indirect_evidence|underspecified_goal|conflicting_evidence|missing_context|exploratory_hypothesis|model_uncertainty|other], and [criticality: critical|important|advisory]. Low or unknown confidence is a valid exploratory result; do not inflate it to pass a gate. State material assumptions as "Assumption: ...".
`

const DELIVERY_PROTO = `
### DELIVERY
Stay within assigned scope, lane permissions, write set, locks, hooks, and tool policy. Use relevant skills and available tools; do not create extra wiki entries, ADRs, diagrams, environment audits, or other deliverables unless the task requests or materially needs them. Return a concise result with evidence, affected paths, verification performed and outcome, and material assumptions or unresolved external decisions. Optional documentation and advisory findings do not block completion.
`

export const SUBAGENT_SYSTEM_SUFFIX = `
${AUTONOMOUS_NUDGE_PROTO}
${STRUCTURED_SIGNALING_PROTO}
${CONSENSUS_PROTO}
${DELIVERY_PROTO}

`

export class SubagentBuilder {
	private readonly agentConfig: AgentConfig = {}
	private allowedTools: DietCodeDefaultTool[]
	private readonly apiHandler: ReturnType<typeof buildApiHandler>
	private parentStreamContext: string | null = null
	private siblingLanesContext = ""

	constructor(
		private readonly baseConfig: TaskConfig,
		subagentName?: string,
	) {
		const subagentConfig = AgentConfigLoader.getInstance().getCachedConfig(subagentName)
		this.agentConfig = subagentConfig ?? {}
		this.allowedTools = this.resolveAllowedTools(this.agentConfig.tools)

		const mode = this.baseConfig.services.stateManager.getGlobalSettingsKey("mode")
		const apiConfiguration = this.baseConfig.services.stateManager.getApiConfiguration()
		const effectiveApiConfiguration = {
			...apiConfiguration,
			ulid: this.baseConfig.ulid,
		}

		this.applyModelOverride(effectiveApiConfiguration as Record<string, unknown>, mode, this.agentConfig.modelId)
		this.apiHandler = buildApiHandler(effectiveApiConfiguration as typeof apiConfiguration, mode)
	}

	setAllowedTools(tools: DietCodeDefaultTool[]): void {
		this.allowedTools = Array.from(new Set([...tools, DietCodeDefaultTool.ATTEMPT, DietCodeDefaultTool.USE_SKILL]))
	}

	getApiHandler(): ReturnType<typeof buildApiHandler> {
		return this.apiHandler
	}

	setParentStreamContext(context: string): void {
		this.parentStreamContext = context
	}

	setSiblingLanesContext(context: string): void {
		this.siblingLanesContext = context
	}

	getAllowedTools(): DietCodeDefaultTool[] {
		return this.allowedTools
	}

	buildSystemPrompt(generatedSystemPrompt: string): string {
		const configuredSystemPrompt = this.agentConfig?.systemPrompt?.trim()
		const systemPrompt = configuredSystemPrompt || generatedSystemPrompt

		// Nesting depth awareness for the subagent
		const currentDepth = this.baseConfig.taskState?.recursionDepth || 0
		const depthBlock = `\n\n# SWARM NESTING CONTEXT\nYou are operating at nesting depth ${currentDepth} (Max: 3). ${currentDepth >= 2 ? "You are at a deep structural layer; avoid spawning further subagents unless absolutely critical." : ""}`

		// 1. Fetch current structural health signal
		let architectureSignal = ""
		architectureSignal = `\n\n# SUBSTRATE HEALTH SIGNAL\n[STATUS: JOY-ZONED]\n[SIGNAL: Every file you modify must respect the architecture axioms defined in 'SOVEREIGN_GUIDE.md'.]`

		const parentContextBlock = this.parentStreamContext
			? `\n\n# Parent Agent Context\n${this.parentStreamContext}\nUse the context above to prioritize your research within the broader task goals.`
			: ""

		const siblingLanesBlock = this.siblingLanesContext
			? `\n\n# SIBLING LANES CONTEXT\n${this.siblingLanesContext}\nUse the context above to coordinate with other completed lanes and prevent redundant work.`
			: ""

		// Cross-Agent Intelligence (Blackboard)
		const blackboard = this.baseConfig.taskState?.swarmBlackboard || []
		const blackboardBlock =
			blackboard.length > 0
				? `\n\n# SWARM BLACKBOARD (Shared Intelligence)\n${blackboard.map((f) => `- ${f}`).join("\n")}\nCONSIDER the findings above. If your research contradicts or supports these findings, signal it explicitly.`
				: ""

		return `${this.buildAgentIdentitySystemPrefix()}${systemPrompt}${depthBlock}${architectureSignal}${parentContextBlock}${siblingLanesBlock}${blackboardBlock}${SUBAGENT_SYSTEM_SUFFIX}`
	}

	buildNativeTools(context: SystemPromptContext) {
		const family = PromptRegistry.getInstance().getModelFamily(context)
		const toolSets = DietCodeToolSet.getToolsForVariantWithFallback(family, this.allowedTools)
		const filteredToolSpecs = toolSets
			.map((toolSet) => toolSet.config)
			.filter(
				(toolSpec) =>
					this.allowedTools.includes(toolSpec.id) &&
					(!toolSpec.contextRequirements || toolSpec.contextRequirements(context)),
			)

		const converter = DietCodeToolSet.getNativeConverter(context.providerInfo.providerId, context.providerInfo.model.id)
		return filteredToolSpecs.map((tool) => converter(tool, context))
	}

	private resolveAllowedTools(configuredTools?: DietCodeDefaultTool[]): DietCodeDefaultTool[] {
		const sourceTools = configuredTools && configuredTools.length > 0 ? configuredTools : SUBAGENT_DEFAULT_ALLOWED_TOOLS
		return Array.from(new Set([...sourceTools, DietCodeDefaultTool.ATTEMPT, DietCodeDefaultTool.USE_SKILL]))
	}

	private buildAgentIdentitySystemPrefix(): string {
		const name = this.agentConfig?.name?.trim()
		const description = this.agentConfig?.description?.trim()

		if (!name && !description) {
			return ""
		}

		const lines = ["# AGENT PROFILE"]
		if (name) {
			lines.push(`Identity: ${name}`)
		}
		if (description) {
			lines.push(`Objective: ${description}`)
		}

		return `${lines.join("\n")}\n\n`
	}

	private applyModelOverride(apiConfiguration: ApiConfiguration, _mode: string, modelId?: string): void {
		const trimmedModelId = modelId?.trim()
		if (!trimmedModelId) {
			// Even if no modelId is overridden, we still apply the thinking budget for subagents
			this.applyThinkingBudgetOverride(apiConfiguration)
			return
		}

		const modeKey = _mode === "plan" ? "plan" : "act"
		const providerKey = _mode === "plan" ? "planModeApiProvider" : "actModeApiProvider"
		const provider = apiConfiguration[providerKey as keyof ApiConfiguration] as ApiProvider
		if (provider) {
			const modelKey = getProviderModelIdKey(provider, modeKey)
			const config = apiConfiguration as Record<string, unknown>
			if (modelKey in config) {
				config[modelKey] = trimmedModelId
			}
		}

		// Apply thinking budget after model override
		this.applyThinkingBudgetOverride(apiConfiguration)
	}

	/**
	 * Applies a reduced thinking budget for subagents by default.
	 * Subagents often perform well with lower thinking budgets than parent agents.
	 * The budget is capped to 8k tokens unless explicitly overridden to a higher value.
	 * @param apiConfig The API configuration object.
	 */
	private applyThinkingBudgetOverride(apiConfig: ApiConfiguration): void {
		// Phase 3: Adaptive Thinking Budget Delegation
		// Subagents reach high performance with lower thinking budgets than parents.
		// We cap it to 8k by default for subagents unless explicitly overridden.
		const subagentDefaultThinkingBudget = 8192

		// If thinkingBudgetTokens is already set, we take the minimum of the current value and the subagent default.
		// This allows a parent to explicitly set a lower budget, but prevents a subagent from using a higher default.
		const config = apiConfig as Record<string, unknown>
		if (config.thinkingBudgetTokens !== undefined && config.thinkingBudgetTokens !== null) {
			config.thinkingBudgetTokens = Math.min(config.thinkingBudgetTokens as number, subagentDefaultThinkingBudget)
		} else {
			// If thinkingBudgetTokens is not set, we apply the subagent default.
			config.thinkingBudgetTokens = subagentDefaultThinkingBudget
		}
	}
}

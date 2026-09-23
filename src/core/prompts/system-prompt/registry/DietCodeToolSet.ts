import { AgentConfigLoader } from "@core/task/tools/subagent/AgentConfigLoader"
import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import { type DietCodeToolSpec, toolSpecFunctionDeclarations, toolSpecFunctionDefinition, toolSpecInputSchema } from "../spec"
import { PromptVariant, SystemPromptContext } from "../types"

export class DietCodeToolSet {
	private static readonly disabledTools = new Set<string>([
		DietCodeDefaultTool.MCP_USE,
		DietCodeDefaultTool.MCP_ACCESS,
		DietCodeDefaultTool.MCP_DOCS,
	])
	// A list of tools mapped by model group
	private static variants: Map<ModelFamily, Set<DietCodeToolSet>> = new Map()

	private constructor(
		public readonly id: string,
		public readonly config: DietCodeToolSpec,
	) {
		this._register()
	}

	public static register(config: DietCodeToolSpec): DietCodeToolSet {
		return new DietCodeToolSet(config.id, config)
	}

	private _register(): void {
		const existingTools = DietCodeToolSet.variants.get(this.config.variant) || new Set()
		if (!Array.from(existingTools).some((t) => t.config.id === this.config.id)) {
			existingTools.add(this)
			DietCodeToolSet.variants.set(this.config.variant, existingTools)
		}
	}

	public static getTools(variant: ModelFamily): DietCodeToolSet[] {
		const toolsSet = DietCodeToolSet.variants.get(variant) || new Set()
		const defaultSet = DietCodeToolSet.variants.get(ModelFamily.GENERIC) || new Set()

		return toolsSet ? Array.from(toolsSet) : Array.from(defaultSet)
	}

	public static getRegisteredModelIds(): string[] {
		return Array.from(DietCodeToolSet.variants.keys())
	}

	public static getToolByName(toolName: string, variant: ModelFamily): DietCodeToolSet | undefined {
		const tools = DietCodeToolSet.getTools(variant)
		return tools.find((tool) => tool.config.id === toolName)
	}

	// Return a tool by name with fallback to GENERIC and then any other variant where it exists
	public static getToolByNameWithFallback(toolName: string, variant: ModelFamily): DietCodeToolSet | undefined {
		if (DietCodeToolSet.disabledTools.has(toolName)) return undefined
		// Try exact variant first
		const exact = DietCodeToolSet.getToolByName(toolName, variant)
		if (exact) {
			return exact
		}

		// Fallback to GENERIC
		const generic = DietCodeToolSet.getToolByName(toolName, ModelFamily.GENERIC)
		if (generic) {
			return generic
		}

		// Final fallback: search across all registered variants
		for (const [, tools] of DietCodeToolSet.variants) {
			const found = Array.from(tools).find((t) => t.config.id === toolName)
			if (found) {
				return found
			}
		}

		return undefined
	}

	// Build a list of tools for a variant using requested ids, falling back to GENERIC when missing
	public static getToolsForVariantWithFallback(variant: ModelFamily, requestedIds: string[]): DietCodeToolSet[] {
		const resolved: DietCodeToolSet[] = []
		for (const id of requestedIds) {
			const tool = DietCodeToolSet.getToolByNameWithFallback(id, variant)
			if (tool) {
				// Avoid duplicates by id
				if (!resolved.some((t) => t.config.id === tool.config.id)) {
					resolved.push(tool)
				}
			}
		}
		return resolved
	}

	public static getEnabledTools(variant: PromptVariant, context: SystemPromptContext): DietCodeToolSet[] {
		const resolved: DietCodeToolSet[] = []
		const requestedIds = variant.tools ? [...variant.tools] : []
		if (context.skills?.length) requestedIds.push(DietCodeDefaultTool.USE_SKILL)
		if (context.goldenCartridgeAvailable === true) requestedIds.push(DietCodeDefaultTool.GOLDEN_CARTRIDGE)
		for (const id of requestedIds) {
			if (DietCodeToolSet.disabledTools.has(id)) continue
			const tool = DietCodeToolSet.getToolByNameWithFallback(id, variant.family)
			if (tool) {
				// Avoid duplicates by id
				if (!resolved.some((t) => t.config.id === tool.config.id)) {
					resolved.push(tool)
				}
			}
		}

		// Filter by context requirements
		const enabledTools = resolved.filter(
			(tool) => !tool.config.contextRequirements || tool.config.contextRequirements(context),
		)

		return enabledTools
	}

	private static getDynamicSubagentToolSpecs(variant: PromptVariant, context: SystemPromptContext): DietCodeToolSpec[] {
		if (context.subagentsEnabled !== true || context.isSubagentRun) {
			return []
		}

		const requestedIds = variant.tools ? [...variant.tools] : []
		const shouldIncludeSubagentTools = requestedIds.length === 0 || requestedIds.includes(DietCodeDefaultTool.USE_SUBAGENTS)
		if (!shouldIncludeSubagentTools) {
			return []
		}

		const agentConfigs = AgentConfigLoader.getInstance().getAllCachedConfigsWithToolNames()
		return agentConfigs.map(({ toolName, config }) => ({
			variant: variant.family,
			id: DietCodeDefaultTool.USE_SUBAGENTS,
			name: toolName,
			description: `Use the "${config.name}" subagent: ${config.description}. Keep final synthesis in the parent and declare lane authority in the prompt; non-mutating lanes are limited to local read/diagnostic tools.`,
			contextRequirements: (ctx) => ctx.subagentsEnabled === true && !ctx.isSubagentRun,
			parameters: [
				{
					name: "prompt",
					required: true,
					instruction:
						"Concrete, self-contained task prefixed with an execution_mode header; use mutation or write_set for writes, commands, or other side effects.",
				},
			],
		}))
	}

	public static getEnabledToolSpecs(variant: PromptVariant, context: SystemPromptContext): DietCodeToolSpec[] {
		const registeredTools = DietCodeToolSet.getEnabledTools(variant, context).map((tool) => tool.config)
		const dynamicSubagentTools = DietCodeToolSet.getDynamicSubagentToolSpecs(variant, context)

		const includesDynamicSubagents = dynamicSubagentTools.length > 0
		const filteredRegistered = includesDynamicSubagents
			? registeredTools.filter((tool) => tool.id !== DietCodeDefaultTool.USE_SUBAGENTS)
			: registeredTools

		return [...filteredRegistered, ...dynamicSubagentTools]
	}

	/**
	 * Get the appropriate native tool converter for the given provider
	 */
	public static getNativeConverter(providerId: string, modelId?: string) {
		switch (providerId) {
			case "minimax":
			case "anthropic":
			case "bedrock":
				return toolSpecInputSchema
			case "gemini":
				return toolSpecFunctionDeclarations
			case "vertex":
				if (modelId?.includes("gemini")) {
					return toolSpecFunctionDeclarations
				}
				return toolSpecInputSchema
			default:
				// Default to OpenAI Compatible converter
				return toolSpecFunctionDefinition
		}
	}

	public static getNativeTools(variant: PromptVariant, context: SystemPromptContext) {
		// Only return tool functions if the variant explicitly enables them
		// via the "use_native_tools" label set to 1
		// This avoids exposing tools to models that don't support them
		// or variants that aren't designed for tool use
		if (variant.labels.use_native_tools !== 1 || !context.enableNativeToolCalls) {
			return undefined
		}

		// Base set
		const toolConfigs = DietCodeToolSet.getEnabledToolSpecs(variant, context)

		const enabledTools = toolConfigs.filter(
			(tool) => typeof tool.description === "string" && tool.description.trim().length > 0,
		)
		const converter = DietCodeToolSet.getNativeConverter(context.providerInfo.providerId, context.providerInfo.model.id)

		return enabledTools.map((tool) => converter(tool, context))
	}
}

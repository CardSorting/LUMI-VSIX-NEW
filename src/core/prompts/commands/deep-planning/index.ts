import type { ApiProviderInfo } from "@/core/api"
import type { SystemPromptContext } from "@/core/prompts/system-prompt/types"
import { getDeepPlanningRegistry } from "./registry"
import { generateGemini3Template } from "./variants/gemini3"
import { generateGPT51Template } from "./variants/gpt51"

/**
 * Generates the deep-planning slash command response with model-family-aware variant selection
 * @param focusChainSettings Optional focus chain settings to include in the prompt
 * @param providerInfo Optional API provider info for model family detection
 * @returns The deep-planning prompt string with appropriate variant and focus chain settings applied
 */
export function getDeepPlanningPrompt(
	focusChainSettings?: { enabled: boolean },
	providerInfo?: ApiProviderInfo,
	modEnabled?: boolean,
): string {
	// Create context for variant selection
	const context: SystemPromptContext = {
		providerInfo: providerInfo || ({} as ApiProviderInfo),
		ide: "vscode",
		mode: "plan",
		modEnabled,
	}

	// Get the appropriate variant from registry
	const registry = getDeepPlanningRegistry()
	const variant = registry.get(context)

	// For variants with extensive focus chain prompting, generate template with focus chain flag
	let template: string
	if (variant.id === "gpt-51") {
		template = generateGPT51Template(focusChainSettings?.enabled ?? false)
	} else if (variant.id === "gemini-3") {
		template = generateGemini3Template(focusChainSettings?.enabled ?? false)
	} else {
		template = variant.template
	}

	return template
}

// Export types for external use
export type { DeepPlanningRegistry, DeepPlanningVariant } from "./types"

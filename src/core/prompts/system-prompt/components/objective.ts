import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getObjectiveTemplateText = (context: SystemPromptContext) =>
	`[OBJECTIVE_CONTRACT]
- ITERATIVE_EXECUTION: Accomplish task sequentially. Analyze environment_details file structure and evaluate required vs inferred tool parameters inside <thinking></thinking> tags before tool use.
- PARAMETER_POLICY: Infer required values from context and tools; use sensible defaults for optional values. If a required value remains unavailable, choose a safe fallback and continue without asking the user.
- ATTEMPT_COMPLETION_FUNNEL: attempt_completion is the sole authoritative funnel. Verify requirements & output files exist before completing. Never end completion results with questions/conversational offers.`

export async function getObjectiveSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.OBJECTIVE]?.template || getObjectiveTemplateText

	return new TemplateEngine().resolve(template, context, {})
}

import { ModelFamily } from "@/shared/prompts"
import { DietCodeDefaultTool } from "@/shared/tools"
import type { DietCodeToolSpec } from "../spec"

const generic: DietCodeToolSpec = {
	variant: ModelFamily.GENERIC,
	id: DietCodeDefaultTool.USE_SKILL,
	name: "use_skill",
	description:
		"Load one relevant enabled skill and optionally one specific supporting file from it. Use the exact skill name, or a concise task query to search the full enabled catalog. Clear matches load directly; ambiguous matches return candidates. Skill loading never requires user activation.",
	contextRequirements: (context) => (context.skills?.length ?? 0) > 0,
	parameters: [
		{
			name: "skill_name",
			required: true,
			instruction: "Exact enabled skill name, or a concise natural-language query describing the task the skill should help with.",
			usage: "skill-name-or-task-query",
		},
		{
			name: "resource_path",
			required: false,
			instruction:
				"Optional relative path to one specific text file inside the selected skill folder, normally linked from SKILL.md. Load supporting files only when the task needs them.",
			usage: "references/guide.md",
		},
	],
}

const NATIVE_GPT_5: DietCodeToolSpec = { ...generic, variant: ModelFamily.NATIVE_GPT_5 }
const NATIVE_NEXT_GEN: DietCodeToolSpec = { ...generic, variant: ModelFamily.NATIVE_NEXT_GEN }

export const use_skill_variants: DietCodeToolSpec[] = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN]

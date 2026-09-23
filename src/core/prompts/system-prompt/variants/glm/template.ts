import { SystemPromptSection } from "../../templates/placeholders"

export const baseTemplate = `{{${SystemPromptSection.AGENT_ROLE}}}
## {{${SystemPromptSection.JOY_ZONING}}}
{{${SystemPromptSection.ROADMAP_STEERING}}}

{{${SystemPromptSection.TOOL_USE}}}

## {{${SystemPromptSection.TASK_PROGRESS}}}

## {{${SystemPromptSection.RULES}}}

## {{${SystemPromptSection.ACT_VS_PLAN}}}

## {{${SystemPromptSection.CAPABILITIES}}}


## {{${SystemPromptSection.EDITING_FILES}}}

## {{${SystemPromptSection.TODO}}}


## {{${SystemPromptSection.SYSTEM_INFO}}}

## {{${SystemPromptSection.OBJECTIVE}}}

## {{${SystemPromptSection.USER_INSTRUCTIONS}}}`

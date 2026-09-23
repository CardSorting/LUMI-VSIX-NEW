import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"

export function validateApiConfiguration(currentMode: Mode, apiConfiguration?: ApiConfiguration): string | undefined {
	if (!apiConfiguration) {
		return undefined
	}

	const { apiProvider } = getModeSpecificFields(apiConfiguration, currentMode)

	switch (apiProvider) {
		case "openai-codex":
			// Authentication is handled via OAuth, not API key
			break
	}

	return undefined
}

export function validateModelId(
	currentMode: Mode,
	apiConfiguration?: ApiConfiguration,
	openRouterModels?: Record<string, ModelInfo>,
): string | undefined {
	if (!apiConfiguration) {
		return undefined
	}

	void currentMode
	void openRouterModels
	return undefined
}

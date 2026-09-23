import {
	OpenRouterModelInfo,
	ModelsApiConfiguration as ProtoApiConfiguration,
	ApiProvider as ProtoApiProvider,
	ThinkingConfig,
} from "@shared/proto/dietcode/models"
import { ApiConfiguration, ApiProvider, ModelInfo } from "../../api"

// Convert application ThinkingConfig to proto ThinkingConfig
function convertThinkingConfigToProto(config: ModelInfo["thinkingConfig"]): ThinkingConfig | undefined {
	if (!config) {
		return undefined
	}

	return {
		maxBudget: config.maxBudget,
		outputPrice: config.outputPrice,
		outputPriceTiers: config.outputPriceTiers || [], // Provide empty array if undefined
	}
}

// Convert proto ThinkingConfig to application ThinkingConfig
function convertProtoToThinkingConfig(config: ThinkingConfig | undefined): ModelInfo["thinkingConfig"] | undefined {
	if (!config) {
		return undefined
	}

	return {
		maxBudget: config.maxBudget,
		outputPrice: config.outputPrice,
		outputPriceTiers: config.outputPriceTiers.length > 0 ? config.outputPriceTiers : undefined,
	}
}

// Convert application ModelInfo to proto OpenRouterModelInfo
function convertModelInfoToProtoOpenRouter(info: ModelInfo | undefined): OpenRouterModelInfo | undefined {
	if (!info) {
		return undefined
	}

	return {
		maxTokens: info.maxTokens,
		contextWindow: info.contextWindow,
		supportsImages: info.supportsImages,
		supportsPromptCache: info.supportsPromptCache ?? false,
		inputPrice: info.inputPrice,
		outputPrice: info.outputPrice,
		cacheWritesPrice: info.cacheWritesPrice,
		cacheReadsPrice: info.cacheReadsPrice,
		description: info.description,
		thinkingConfig: convertThinkingConfigToProto(info.thinkingConfig),
		supportsGlobalEndpoint: info.supportsGlobalEndpoint,
		tiers: info.tiers || [],
	}
}

// Convert proto OpenRouterModelInfo to application ModelInfo
function convertProtoToModelInfo(info: OpenRouterModelInfo | undefined): ModelInfo | undefined {
	if (!info) {
		return undefined
	}

	return {
		maxTokens: info.maxTokens,
		contextWindow: info.contextWindow,
		supportsImages: info.supportsImages,
		supportsPromptCache: info.supportsPromptCache,
		inputPrice: info.inputPrice,
		outputPrice: info.outputPrice,
		cacheWritesPrice: info.cacheWritesPrice,
		cacheReadsPrice: info.cacheReadsPrice,
		description: info.description,
		thinkingConfig: convertProtoToThinkingConfig(info.thinkingConfig),
		supportsGlobalEndpoint: info.supportsGlobalEndpoint,
		tiers: info.tiers.length > 0 ? info.tiers : undefined,
	}
}

// Convert application ApiProvider to proto ApiProvider
function convertApiProviderToProto(provider: string | undefined): ProtoApiProvider {
	void provider
	return ProtoApiProvider.OPENAI_CODEX
}

// Convert proto ApiProvider to application ApiProvider
export function convertProtoToApiProvider(provider: ProtoApiProvider): ApiProvider {
	void provider
	return "openai-codex"
}

// Converts application ApiConfiguration to proto ApiConfiguration
export function convertApiConfigurationToProto(config: ApiConfiguration): ProtoApiConfiguration {
	return {
		// Global configuration fields
		apiKey: config.apiKey,
		dietcodeAccountId: config.dietcodeAccountId,
		ulid: config.ulid,
		openAiHeaders: config.openAiHeaders || {},
		openRouterApiKey: config.openRouterApiKey,
		openRouterProviderSorting: config.openRouterProviderSorting,
		galxApiKey: config.galxApiKey,
		galxBaseUrl: config.galxBaseUrl,
		xaiApiKey: config.xaiApiKey,
		nousResearchApiKey: config.nousResearchApiKey,
		cloudflareAccountId: config.cloudflareAccountId,
		cloudflareApiToken: config.cloudflareApiToken,
		cerebrasApiKey: config.cerebrasApiKey,
		clineApiKey: config.clineApiKey,
		qwenTokenPlanApiKey: config.qwenTokenPlanApiKey,
		zaiApiKey: config.zaiApiKey,
		zaiApiLine: config.zaiApiLine,
		embeddingProvider: config.embeddingProvider ? convertApiProviderToProto(config.embeddingProvider) : undefined,
		embeddingModelId: config.embeddingModelId,
		embeddingApiKey: config.embeddingApiKey,
		embeddingOpenAiBaseUrl: config.embeddingOpenAiBaseUrl,

		// Plan mode configurations
		planModeApiProvider: config.planModeApiProvider ? convertApiProviderToProto(config.planModeApiProvider) : undefined,
		planModeApiModelId: config.planModeApiModelId,
		planModeThinkingBudgetTokens: config.planModeThinkingBudgetTokens,
		planModeReasoningEffort: config.planModeReasoningEffort,
		planModeOpenRouterModelId: config.planModeOpenRouterModelId,
		planModeOpenRouterModelInfo: convertModelInfoToProtoOpenRouter(config.planModeOpenRouterModelInfo),
		planModeNousResearchModelId: config.planModeNousResearchModelId,
		planModeNousResearchModelInfo: convertModelInfoToProtoOpenRouter(config.planModeNousResearchModelInfo),
		planModeClinePassModelId: config.planModeClinePassModelId,
		planModeClinePassModelInfo: convertModelInfoToProtoOpenRouter(config.planModeClinePassModelInfo),
		planModeGalxModelId: config.planModeGalxModelId,
		planModeGalxModelInfo: convertModelInfoToProtoOpenRouter(config.planModeGalxModelInfo),

		// Act mode configurations
		actModeApiProvider: config.actModeApiProvider ? convertApiProviderToProto(config.actModeApiProvider) : undefined,
		actModeApiModelId: config.actModeApiModelId,
		actModeThinkingBudgetTokens: config.actModeThinkingBudgetTokens,
		actModeReasoningEffort: config.actModeReasoningEffort,
		actModeOpenRouterModelId: config.actModeOpenRouterModelId,
		actModeOpenRouterModelInfo: convertModelInfoToProtoOpenRouter(config.actModeOpenRouterModelInfo),
		actModeNousResearchModelId: config.actModeNousResearchModelId,
		actModeNousResearchModelInfo: convertModelInfoToProtoOpenRouter(config.actModeNousResearchModelInfo),
		actModeClinePassModelId: config.actModeClinePassModelId,
		actModeClinePassModelInfo: convertModelInfoToProtoOpenRouter(config.actModeClinePassModelInfo),
		actModeGalxModelId: config.actModeGalxModelId,
		actModeGalxModelInfo: convertModelInfoToProtoOpenRouter(config.actModeGalxModelInfo),
	}
}

// Converts proto ApiConfiguration to application ApiConfiguration
export function convertProtoToApiConfiguration(protoConfig: ProtoApiConfiguration): ApiConfiguration {
	return {
		// Global configuration fields
		apiKey: protoConfig.apiKey,
		dietcodeAccountId: protoConfig.dietcodeAccountId,
		ulid: protoConfig.ulid,
		openAiHeaders: Object.keys(protoConfig.openAiHeaders || {}).length > 0 ? protoConfig.openAiHeaders : undefined,
		openRouterApiKey: protoConfig.openRouterApiKey,
		openRouterProviderSorting: protoConfig.openRouterProviderSorting,
		galxApiKey: protoConfig.galxApiKey,
		galxBaseUrl: protoConfig.galxBaseUrl,
		xaiApiKey: protoConfig.xaiApiKey,
		nousResearchApiKey: protoConfig.nousResearchApiKey,
		cloudflareAccountId: protoConfig.cloudflareAccountId,
		cloudflareApiToken: protoConfig.cloudflareApiToken,
		cerebrasApiKey: protoConfig.cerebrasApiKey,
		clineApiKey: protoConfig.clineApiKey,
		qwenTokenPlanApiKey: protoConfig.qwenTokenPlanApiKey,
		zaiApiKey: protoConfig.zaiApiKey,
		zaiApiLine: protoConfig.zaiApiLine,
		embeddingProvider:
			protoConfig.embeddingProvider !== undefined ? convertProtoToApiProvider(protoConfig.embeddingProvider) : undefined,
		embeddingModelId: protoConfig.embeddingModelId,
		embeddingApiKey: protoConfig.embeddingApiKey,
		embeddingOpenAiBaseUrl: protoConfig.embeddingOpenAiBaseUrl,

		// Plan mode configurations
		planModeApiProvider:
			protoConfig.planModeApiProvider !== undefined
				? convertProtoToApiProvider(protoConfig.planModeApiProvider)
				: undefined,
		planModeApiModelId: protoConfig.planModeApiModelId,
		planModeThinkingBudgetTokens: protoConfig.planModeThinkingBudgetTokens,
		planModeReasoningEffort: protoConfig.planModeReasoningEffort,
		planModeOpenRouterModelId: protoConfig.planModeOpenRouterModelId,
		planModeOpenRouterModelInfo: convertProtoToModelInfo(protoConfig.planModeOpenRouterModelInfo),
		planModeNousResearchModelId: protoConfig.planModeNousResearchModelId,
		planModeNousResearchModelInfo: convertProtoToModelInfo(protoConfig.planModeNousResearchModelInfo),
		planModeClinePassModelId: protoConfig.planModeClinePassModelId,
		planModeClinePassModelInfo: convertProtoToModelInfo(protoConfig.planModeClinePassModelInfo),
		planModeGalxModelId: protoConfig.planModeGalxModelId,
		planModeGalxModelInfo: convertProtoToModelInfo(protoConfig.planModeGalxModelInfo),

		// Act mode configurations
		actModeApiProvider:
			protoConfig.actModeApiProvider !== undefined ? convertProtoToApiProvider(protoConfig.actModeApiProvider) : undefined,
		actModeApiModelId: protoConfig.actModeApiModelId,
		actModeThinkingBudgetTokens: protoConfig.actModeThinkingBudgetTokens,
		actModeReasoningEffort: protoConfig.actModeReasoningEffort,
		actModeOpenRouterModelId: protoConfig.actModeOpenRouterModelId,
		actModeOpenRouterModelInfo: convertProtoToModelInfo(protoConfig.actModeOpenRouterModelInfo),
		actModeNousResearchModelId: protoConfig.actModeNousResearchModelId,
		actModeNousResearchModelInfo: convertProtoToModelInfo(protoConfig.actModeNousResearchModelInfo),
		actModeClinePassModelId: protoConfig.actModeClinePassModelId,
		actModeClinePassModelInfo: convertProtoToModelInfo(protoConfig.actModeClinePassModelInfo),
		actModeGalxModelId: protoConfig.actModeGalxModelId,
		actModeGalxModelInfo: convertProtoToModelInfo(protoConfig.actModeGalxModelInfo),
	}
}

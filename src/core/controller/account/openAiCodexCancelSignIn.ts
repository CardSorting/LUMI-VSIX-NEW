import type { IController as Controller } from "@core/controller/types"
import { Empty, EmptyRequest } from "@shared/proto/dietcode/common"
import { openAiCodexOAuthManager } from "@/integrations/openai-codex/oauth"

/** Cancels the active OpenAI Codex browser authorization attempt. */
export async function openAiCodexCancelSignIn(controller: Controller, _: EmptyRequest): Promise<Empty> {
	openAiCodexOAuthManager.cancelAuthorizationFlow()
	await controller.postStateToWebview()
	return Empty.create({})
}

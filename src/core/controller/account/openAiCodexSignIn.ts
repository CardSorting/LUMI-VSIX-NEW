import type { IController as Controller } from "@core/controller/types"
import { Empty, EmptyRequest } from "@shared/proto/dietcode/common"
import { ShowMessageType } from "@shared/proto/host/window"
import { HostProvider } from "@/hosts/host-provider"
import { openAiCodexOAuthManager } from "@/integrations/openai-codex/oauth"
import { Logger } from "@/shared/services/Logger"
import { openExternal } from "@/utils/env"

/**
 * Initiates OpenAI Codex OAuth authentication flow
 * Opens the authorization URL in the user's browser
 */
export async function openAiCodexSignIn(controller: Controller, _: EmptyRequest): Promise<Empty> {
	try {
		// Start the authorization flow and get the auth URL
		openAiCodexOAuthManager.startAuthorizationFlow()
		const callbackPromise = openAiCodexOAuthManager.waitForCallback()
		const callbackOutcome = callbackPromise.then(
			(credentials) => ({ credentials }),
			(error: unknown) => ({ error }),
		)

		// Bind loopback before opening the browser so fast or remembered sessions cannot
		// redirect before the callback listener is ready.
		await openAiCodexOAuthManager.waitForCallbackReady()
		const authUrl = openAiCodexOAuthManager.getAuthorizationUrl()

		// Open the auth URL in the browser
		await openExternal(authUrl)

		void callbackOutcome
			.then(async (outcome) => {
				if ("error" in outcome) {
					const error = outcome.error
					Logger.error("[openAiCodexSignIn] OAuth callback failed:", error)
					openAiCodexOAuthManager.cancelAuthorizationFlow()
					const errorMessage = error instanceof Error ? error.message : String(error)
					if (!errorMessage.includes("cancelled")) {
						const userMessage = errorMessage.includes("timed out")
							? "Sign-in expired. Connect again to retry."
							: `Sign-in failed: ${errorMessage}`
						openAiCodexOAuthManager.setAuthorizationError(userMessage)
						await controller.postStateToWebview().catch(() => undefined)
						HostProvider.window.showMessage({ type: ShowMessageType.ERROR, message: userMessage })
					}
					return
				}

				HostProvider.window.showMessage({
					type: ShowMessageType.INFORMATION,
					message: "Successfully signed in to OpenAI Codex",
				})
				await controller.postStateToWebview()
			})
			.catch((error) => {
				Logger.error("[openAiCodexSignIn] Failed to update auth state after callback:", error)
			})
		await controller.postStateToWebview()
	} catch (error) {
		Logger.error("[openAiCodexSignIn] Failed to start OAuth flow:", error)
		openAiCodexOAuthManager.cancelAuthorizationFlow()
		throw error
	}

	return {}
}

import { openAiCodexModels } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AccountServiceClient } from "@/services/grpc-client"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import ReasoningEffortSelector from "../ReasoningEffortSelector"
import { normalizeApiConfiguration, supportsReasoningEffortForModelId } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

interface OpenAiCodexProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * OpenAI Codex (ChatGPT Plus/Pro) provider configuration component.
 * Uses OAuth authentication instead of API keys.
 */
export const OpenAiCodexProvider = ({ showModelOptions, isPopup, currentMode }: OpenAiCodexProviderProps) => {
	const { apiConfiguration, openAiCodexIsAuthenticated, openAiCodexAccountEmail, openAiCodexAuthError } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const [authAction, setAuthAction] = useState<"idle" | "starting" | "waiting" | "signing-out">("idle")
	const [isCancellingSignIn, setIsCancellingSignIn] = useState(false)
	const [authError, setAuthError] = useState<string | null>(null)
	const isBusy = authAction === "starting" || authAction === "signing-out"

	useEffect(() => {
		if (openAiCodexIsAuthenticated) {
			setAuthAction("idle")
			setAuthError(null)
		} else if (openAiCodexAuthError) {
			setAuthAction("idle")
			setAuthError(openAiCodexAuthError)
		} else if (authAction === "signing-out") {
			setAuthAction("idle")
		}
	}, [openAiCodexIsAuthenticated, openAiCodexAuthError, authAction])

	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)
	const showReasoningEffort = supportsReasoningEffortForModelId(selectedModelId, true)

	const handleSignIn = async () => {
		setAuthError(null)
		setAuthAction("starting")
		try {
			await AccountServiceClient.openAiCodexSignIn({})
			setAuthAction("waiting")
		} catch (error) {
			setAuthAction("idle")
			setAuthError(error instanceof Error ? error.message : "Could not start sign-in.")
		}
	}

	const handleSignOut = async () => {
		setAuthError(null)
		setAuthAction("signing-out")
		try {
			await AccountServiceClient.openAiCodexSignOut({})
		} catch (error) {
			setAuthAction("idle")
			setAuthError(error instanceof Error ? error.message : "Could not disconnect Codex.")
		}
	}

	const handleCancelSignIn = async () => {
		setAuthError(null)
		setIsCancellingSignIn(true)
		try {
			await AccountServiceClient.openAiCodexCancelSignIn({})
			setAuthAction("idle")
		} catch (error) {
			setAuthError(error instanceof Error ? error.message : "Could not cancel sign-in.")
		} finally {
			setIsCancellingSignIn(false)
		}
	}

	return (
		<div>
			<div style={{ marginBottom: "15px" }}>
				{openAiCodexIsAuthenticated ? (
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
						<div style={{ minWidth: 0 }}>
							<div style={{ color: "var(--vscode-foreground)" }}>Connected to ChatGPT</div>
							{openAiCodexAccountEmail && (
								<div style={{ color: "var(--vscode-descriptionForeground)", overflowWrap: "anywhere" }}>
									{openAiCodexAccountEmail}
								</div>
							)}
							<div style={{ color: "var(--vscode-descriptionForeground)", fontSize: "11px", marginTop: "4px" }}>
								Disconnecting only removes the connection from LUMI. Your ChatGPT browser session stays signed in.
							</div>
						</div>
						<VSCodeButton appearance="secondary" disabled={isBusy} onClick={handleSignOut}>
							{authAction === "signing-out" ? "Disconnecting…" : "Disconnect"}
						</VSCodeButton>
					</div>
				) : authAction === "waiting" ? (
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
						<output aria-live="polite" style={{ color: "var(--vscode-descriptionForeground)" }}>
							Finish signing in in your browser.
						</output>
						<VSCodeButton appearance="secondary" disabled={isCancellingSignIn} onClick={handleCancelSignIn}>
							{isCancellingSignIn ? "Cancelling…" : "Cancel"}
						</VSCodeButton>
					</div>
				) : (
					<div>
						<p
							style={{
								fontSize: "12px",
								color: "var(--vscode-descriptionForeground)",
								marginBottom: "10px",
							}}>
							Sign in with your ChatGPT Plus or Pro subscription to use GPT-5 models without an API key.
						</p>
						<VSCodeButton disabled={isBusy} onClick={handleSignIn}>
							{authAction === "starting" ? "Opening browser…" : "Connect ChatGPT"}
						</VSCodeButton>
					</div>
				)}
				{authError && (
					<div role="alert" style={{ color: "var(--vscode-errorForeground)", marginTop: "8px" }}>
						{authError}
					</div>
				)}
			</div>

			{showModelOptions && (
				<>
					<ModelSelector
						label="Model"
						models={openAiCodexModels}
						onChange={(e: any) =>
							handleModeFieldChange(
								{ plan: "planModeApiModelId", act: "actModeApiModelId" },
								e.target.value,
								currentMode,
							)
						}
						selectedModelId={selectedModelId}
					/>
					{showReasoningEffort && <ReasoningEffortSelector currentMode={currentMode} />}

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}

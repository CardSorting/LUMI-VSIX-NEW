import { BooleanRequest } from "@shared/proto/dietcode/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { memo, useEffect, useState } from "react"
import DietCodeLogoWhite from "@/assets/DietCodeLogoWhite"
import { LumiAmbientOrb } from "@/components/common/LumiAmbientOrb"
import { LumiProgressIndicator } from "@/components/common/LumiProgressIndicator"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import { VscIcon } from "@/components/ui/vsc-icon"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { resolveOrbMood, useLumiSessionComfort } from "@/hooks/useLumiSessionComfort"
import { AccountServiceClient, StateServiceClient } from "@/services/grpc-client"

const WelcomeView = memo(() => {
	const { mode, openAiCodexIsAuthenticated, openAiCodexAccountEmail, openAiCodexAuthError } = useExtensionState()
	const [isLoading, setIsLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const { isStill, calmTier } = useLumiSessionComfort()
	const { handleModeFieldChange } = useApiConfigurationHandlers()

	const [isWaitingForCallback, setIsWaitingForCallback] = useState(false)
	const [isCancellingSignIn, setIsCancellingSignIn] = useState(false)
	const [isSigningOut, setIsSigningOut] = useState(false)
	const [authError, setAuthError] = useState<string | null>(null)

	useEffect(() => {
		if (openAiCodexIsAuthenticated) {
			setIsWaitingForCallback(false)
			setIsCancellingSignIn(false)
			setIsSigningOut(false)
			setAuthError(null)
		} else if (openAiCodexAuthError) {
			setIsWaitingForCallback(false)
			setAuthError(openAiCodexAuthError)
		} else if (isSigningOut) {
			setIsSigningOut(false)
		}
	}, [openAiCodexIsAuthenticated, openAiCodexAuthError, isSigningOut])

	const handleCodexSignIn = async () => {
		setAuthError(null)
		setIsLoading(true)
		setIsWaitingForCallback(false)
		try {
			await AccountServiceClient.openAiCodexSignIn({})
			setIsWaitingForCallback(true)
		} catch (error) {
			setAuthError(error instanceof Error ? error.message : "Could not start sign-in.")
			setIsWaitingForCallback(false)
		} finally {
			setIsLoading(false)
		}
	}

	const handleCodexSignOut = async () => {
		setAuthError(null)
		setIsSigningOut(true)
		try {
			await AccountServiceClient.openAiCodexSignOut({})
		} catch (error) {
			setIsSigningOut(false)
			setAuthError(error instanceof Error ? error.message : "Could not disconnect Codex.")
		}
	}

	const handleCancelCodexSignIn = async () => {
		setIsCancellingSignIn(true)
		setAuthError(null)
		try {
			await AccountServiceClient.openAiCodexCancelSignIn({})
			setIsWaitingForCallback(false)
		} catch (error) {
			setAuthError(error instanceof Error ? error.message : "Could not cancel sign-in.")
		} finally {
			setIsCancellingSignIn(false)
		}
	}

	const handleProceed = async () => {
		setIsSaving(true)
		try {
			if (openAiCodexIsAuthenticated) {
				await handleModeFieldChange({ plan: "planModeApiProvider", act: "actModeApiProvider" }, "openai-codex", mode, {
					flushImmediately: true,
				})
			}
			await StateServiceClient.setWelcomeViewCompleted(BooleanRequest.create({ value: true }))
		} catch (error) {
			console.error("Failed to complete welcome view:", error)
		} finally {
			setIsSaving(false)
		}
	}

	const handleSkip = async () => {
		try {
			await StateServiceClient.setWelcomeViewCompleted(BooleanRequest.create({ value: true }))
		} catch (error) {
			console.error("Failed to skip welcome view:", error)
		}
	}

	const isProceedEnabled = openAiCodexIsAuthenticated

	return (
		<div className="fixed inset-0 p-0 flex flex-col items-center justify-center bg-background overflow-y-auto">
			<div className="max-w-[420px] w-[90%] my-8 glass-panel p-8 rounded-3xl flex flex-col gap-6 shadow-2xl animate-fade-slide-in">
				<div className="flex flex-col items-center gap-3">
					<h2 className="text-2xl font-bold tracking-tight text-foreground">Hi, I'm LUMI</h2>
					<p className="text-description text-center text-sm m-0">Your calm coding companion.</p>
					<LumiAmbientOrb calmTier={calmTier} mood={resolveOrbMood("idle", isStill)}>
						<DietCodeLogoWhite className="size-20 drop-shadow-lg" />
					</LumiAmbientOrb>
				</div>

				<p className="text-sm leading-relaxed text-center text-foreground m-0">
					Ask me something about your code. I'll help you explore, edit, and understand your project — nothing changes
					unless you say it's okay.
				</p>

				<div className="flex flex-col gap-3 mt-2">
					<p className="text-xs text-description text-center font-semibold tracking-wider uppercase m-0">
						Choose an AI provider to start
					</p>

					{/* OpenAI Codex Card */}
					<div className="flex flex-col gap-3 p-4 rounded-2xl border bg-lumi/10 border-lumi shadow-[0_4px_16px_rgba(99,102,160,0.15)]">
						<div className="w-full flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 rounded-lg transition-colors bg-lumi text-lumi-foreground">
									<VscIcon className="size-5" name="link" />
								</div>
								<div className="flex flex-col">
									<h3 className="font-semibold text-sm text-foreground m-0">ChatGPT Subscription (Codex)</h3>
									<p className="text-[11px] text-description m-0 mt-0.5 leading-normal">
										Connect with your ChatGPT subscription. No separate billing.
									</p>
								</div>
							</div>
							{openAiCodexIsAuthenticated && (
								<div className="flex items-center justify-center bg-success text-white p-1 rounded-full size-5">
									<VscIcon className="size-3.5" name="check" />
								</div>
							)}
						</div>

						<div className="mt-2 pt-2 border-t border-border-panel/40 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
							{openAiCodexIsAuthenticated ? (
								<div className="flex items-center justify-between gap-2">
									<div className="min-w-0">
										<span className="text-xs text-success flex items-center gap-1.5 font-medium">
											<VscIcon className="size-4" name="check" /> Connected to ChatGPT
										</span>
										{openAiCodexAccountEmail && (
											<p className="text-[11px] text-description m-0 mt-1 break-all">
												{openAiCodexAccountEmail}
											</p>
										)}
										<p className="text-[10px] text-description m-0 mt-1">
											Disconnecting only removes the connection from LUMI. Your ChatGPT browser session
											stays signed in.
										</p>
									</div>
									<VSCodeButton
										appearance="secondary"
										className="rounded-lg h-8"
										disabled={isSigningOut}
										onClick={handleCodexSignOut}>
										{isSigningOut ? "Disconnecting…" : "Disconnect"}
									</VSCodeButton>
								</div>
							) : isWaitingForCallback ? (
								<div className="flex flex-col gap-2 p-2 rounded-lg bg-lumi/5 border border-lumi/20">
									<output aria-live="polite" className="flex items-center gap-2">
										<LumiProgressIndicator />
										<span className="text-xs text-foreground font-medium">Waiting for authorization...</span>
									</output>
									<p className="text-[10px] text-description m-0 leading-normal">
										We opened a tab in your browser. Please sign in there and authorize the connection.
									</p>
									<VSCodeButton
										appearance="secondary"
										className="w-full h-8 rounded-lg mt-1"
										disabled={isCancellingSignIn}
										onClick={handleCancelCodexSignIn}>
										{isCancellingSignIn ? "Cancelling…" : "Cancel"}
									</VSCodeButton>
								</div>
							) : (
								<VSCodeButton
									className="btn-premium-lumi w-full h-9 rounded-lg"
									disabled={isLoading || isWaitingForCallback}
									onClick={handleCodexSignIn}>
									<span>Connect Subscription</span>
									{isLoading && <LumiProgressIndicator />}
								</VSCodeButton>
							)}
						</div>
					</div>
				</div>
				{authError && (
					<p className="text-xs m-0 text-[var(--vscode-errorForeground)]" role="alert">
						{authError}
					</p>
				)}

				<div className="flex flex-col gap-3 mt-2">
					<VSCodeButton
						className="btn-premium-lumi h-11 w-full rounded-xl"
						disabled={!isProceedEnabled || isSaving}
						onClick={handleProceed}>
						<span className="text-base font-semibold">Let's Go</span>
						{isSaving && <LumiProgressIndicator />}
					</VSCodeButton>

					<div className="flex flex-col items-center justify-center gap-1 mt-1">
						<button
							className="text-xs text-description hover:text-foreground underline bg-transparent border-none cursor-pointer focus:outline-none"
							onClick={handleSkip}
							type="button">
							Skip onboarding for now
						</button>
						<p className="text-[10px] text-description text-center m-0 leading-normal">
							You can configure your API settings at any time in Settings.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
})

export default WelcomeView

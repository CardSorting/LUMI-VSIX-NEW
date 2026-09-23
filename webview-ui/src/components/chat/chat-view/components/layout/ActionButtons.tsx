import { isApiRequestInProgress } from "@shared/agentActivity"
import type { DietCodeMessage } from "@shared/ExtensionMessage"
import type { Mode } from "@shared/storage/types"
import { CheckCircle2, ChevronDown, CircleAlert, File, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useIsCompact } from "@/context/DensityContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { cn } from "@/lib/utils"
import { getActionPresentation, resolveActionShortcut } from "../../shared/actionPresentation"
import { type ButtonActionType, getButtonConfig } from "../../shared/buttonConfig"
import type { ChatState, MessageHandlers } from "../../types/chatTypes"

interface ActionButtonsProps {
	task?: DietCodeMessage
	messages: DietCodeMessage[]
	chatState: ChatState
	messageHandlers: MessageHandlers
	mode: Mode
}

/** High-confidence approval, recovery, completion, and stop controls. */
export const ActionButtons: React.FC<ActionButtonsProps> = ({ task, messages, chatState, mode, messageHandlers }) => {
	const { inputValue, selectedImages, selectedFiles, setSendingDisabled } = chatState
	const { enableCheckpointsSetting, checkpointManagerErrorMessage, taskLifecycleEvent } = useExtensionState()
	const [isProcessing, setIsProcessing] = useState(false)
	const panelRef = useRef<HTMLElement>(null)

	const [lastMessage, secondLastMessage] = useMemo(() => {
		const len = messages.length
		return len > 0 ? [messages[len - 1], messages[len - 2]] : [undefined, undefined]
	}, [messages])

	const buttonConfig = useMemo(
		() => (lastMessage ? getButtonConfig(lastMessage, mode) : { sendingDisabled: false, enableButtons: false }),
		[lastMessage, mode],
	)
	const { primaryText, secondaryText, primaryAction, secondaryAction, enableButtons } = buttonConfig
	const hasButtons = Boolean(primaryText || secondaryText)
	const lifecycleCompleted =
		taskLifecycleEvent?.committed.state === "terminal" && taskLifecycleEvent.committed.terminalOutcome === "completed"
	const canInteract = enableButtons && !isProcessing
	const executionControlConfigured = secondaryAction === "cancel" && !primaryAction
	const isExecutionControl = Boolean(executionControlConfigured && lastMessage && isApiRequestInProgress(lastMessage))
	const checkpointAvailable = enableCheckpointsSetting !== false && !checkpointManagerErrorMessage
	const presentation = useMemo(
		() => getActionPresentation(lastMessage, buttonConfig, { checkpointAvailable, lifecycleCompleted }),
		[lastMessage, buttonConfig, checkpointAvailable, lifecycleCompleted],
	)

	useEffect(() => {
		setSendingDisabled(buttonConfig.sendingDisabled)
		setIsProcessing(false)
	}, [buttonConfig, setSendingDisabled])

	useEffect(() => {
		if (lastMessage?.type === "say" && lastMessage.say === "api_req_started" && secondLastMessage?.ask === "command_output") {
			chatState.setInputValue("")
			chatState.setSelectedImages([])
			chatState.setSelectedFiles([])
		}
	}, [lastMessage?.type, lastMessage?.say, secondLastMessage?.ask, chatState])

	const handleActionClick = useCallback(
		(action: ButtonActionType, text?: string, images?: string[], files?: string[]) => {
			if (isProcessing) return
			setIsProcessing(true)

			void messageHandlers.executeButtonAction(action, text, images, files).catch(() => setIsProcessing(false))
		},
		[messageHandlers, isProcessing],
	)

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!canInteract || event.defaultPrevented || event.isComposing) return

			const action = resolveActionShortcut({
				key: event.key,
				metaKey: event.metaKey,
				ctrlKey: event.ctrlKey,
				isPanelFocused: Boolean(panelRef.current?.contains(document.activeElement)),
				isExecutionControl,
				isApproval: presentation.kind === "approval",
				isDestructive: presentation.isDestructive,
				primaryAction,
				secondaryAction,
			})

			if (!action) return
			event.preventDefault()
			event.stopPropagation()
			handleActionClick(action, inputValue, selectedImages, selectedFiles)
		},
		[
			canInteract,
			handleActionClick,
			inputValue,
			isExecutionControl,
			presentation.isDestructive,
			presentation.kind,
			primaryAction,
			secondaryAction,
			selectedFiles,
			selectedImages,
		],
	)

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [handleKeyDown])

	const isCompact = useIsCompact()

	const isMac = useMemo(() => typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent), [])

	const resourceDisplay = useMemo(() => {
		if (!presentation.resource) return null
		return (
			<code className="min-w-0 truncate bg-transparent font-mono text-[9px]" title={presentation.resource}>
				{presentation.resource}
			</code>
		)
	}, [presentation.resource])

	if (!task || !hasButtons || (executionControlConfigured && !isExecutionControl)) return null

	const opacity = canInteract || task.partial === true ? 1 : 0.62
	const detailId = `lumi-action-detail-${lastMessage?.ts ?? "current"}`

	if (isExecutionControl && secondaryText && secondaryAction) {
		return (
			<fieldset
				aria-label="Execution controls"
				className="m-0 flex items-center justify-between gap-2 border-0 px-2 pb-1.5"
				style={{ opacity }}>
				<div className="flex min-w-0 items-center gap-1.5 text-[9px] text-description font-medium">
					<LoaderCircle aria-hidden className="size-3 motion-safe:animate-spin" strokeWidth={2} />
					<span className="truncate">Execution active</span>
				</div>
				<Button
					aria-keyshortcuts="Escape"
					className="h-8 shrink-0 px-3 text-xs text-error"
					disabled={!canInteract}
					onClick={() => handleActionClick(secondaryAction, inputValue, selectedImages, selectedFiles)}
					variant="outline">
					Stop execution
				</Button>
			</fieldset>
		)
	}

	const sectionLabel =
		presentation.kind === "recovery"
			? "Something went wrong"
			: presentation.kind === "completion"
				? "Task completed"
				: presentation.kind === "other"
					? "Task state pending"
					: "Needs your approval"
	const isCompletion = presentation.kind === "completion"
	const isRecovery = presentation.kind === "recovery"
	const runAction = (action: ButtonActionType) => handleActionClick(action, inputValue, selectedImages, selectedFiles)

	const primaryLabel = presentation.approveLabel ?? primaryText
	const secondaryIsRecommended = presentation.recommendedAction === secondaryAction

	return (
		<section
			aria-describedby={!isCompletion ? detailId : undefined}
			aria-label={sectionLabel}
			className="mx-2 mb-1 border-t border-border/40 py-2"
			ref={panelRef}
			style={{ opacity }}>
			{/* ── Main Flex Row ── */}
			<div className={cn("flex items-center justify-between gap-3", isCompact ? "flex-col items-stretch" : "flex-row")}>
				<div className="flex items-center gap-1.5 min-w-0 flex-1">
					{isRecovery ? (
						<CircleAlert aria-hidden className="size-3.5 shrink-0 text-error" strokeWidth={2} />
					) : isCompletion ? (
						<CheckCircle2 aria-hidden className="size-3.5 shrink-0 text-success" strokeWidth={2} />
					) : presentation.isDestructive ? (
						<ShieldAlert aria-hidden className="size-3.5 shrink-0 text-error" strokeWidth={2} />
					) : (
						<ShieldCheck
							aria-hidden
							className="size-3.5 shrink-0 text-amber-500 dark:text-amber-400"
							strokeWidth={2}
						/>
					)}
					<div className="min-w-0 flex-1 flex flex-col justify-center">
						<div className="flex items-center gap-1.5 min-w-0 flex-wrap">
							<span className="font-semibold text-[10.5px] leading-tight text-foreground truncate">
								{presentation.summary}
							</span>
							{!isCompletion && presentation.resource && (
								<>
									<span className="text-description/40 text-[9px]">·</span>
									<code
										className="text-[9px] text-description/70 font-mono truncate"
										title={presentation.resource}>
										{presentation.resource}
									</code>
								</>
							)}
						</div>
					</div>
				</div>

				<div className={cn("flex items-center gap-1.5 shrink-0", isCompact ? "w-full grid grid-cols-2" : "flex-row")}>
					{/* Secondary Action (Cancel/Decline) */}
					{secondaryText && secondaryAction && (
						<Button
							aria-keyshortcuts={
								secondaryAction === "reject" || secondaryAction === "cancel" ? "Escape" : undefined
							}
							className={cn("h-8 px-3 text-xs font-medium", isCompact ? "w-full" : "shrink-0")}
							disabled={!canInteract}
							onClick={() => runAction(secondaryAction)}
							variant={secondaryIsRecommended ? "secondary" : "outline"}>
							<span className="truncate">{secondaryText}</span>
						</Button>
					)}

					{/* Primary Action (Approve/Confirm) */}
					{primaryText && primaryAction && (
						<Button
							aria-keyshortcuts={presentation.kind === "approval" ? "Control+Enter Meta+Enter" : undefined}
							className={cn("h-8 shrink-0 px-3 text-xs font-medium")}
							disabled={!canInteract}
							onClick={() => runAction(primaryAction)}
							variant={presentation.isDestructive ? "danger" : secondaryIsRecommended ? "outline" : "default"}>
							{isProcessing ? <LoaderCircle aria-hidden className="size-3 animate-spin mr-1" /> : null}
							<span className="truncate">{primaryLabel}</span>
							{!isCompact && presentation.kind === "approval" && (
								<kbd className="ml-1 rounded bg-background/25 px-0.5 py-[1px] text-[7px] font-normal opacity-85">
									{isMac ? "⌘↵" : "Ctrl+Enter"}
								</kbd>
							)}
						</Button>
					)}
				</div>
			</div>

			{/* ── Collapsible details panel at bottom ── */}
			{!isCompletion && (presentation.resource || presentation.riskDetail) && (
				<details className="lumi-inline-disclosure mt-1 border-t border-border/30 pt-1">
					<summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
						<ChevronDown
							aria-hidden
							className="size-2.5 shrink-0 transition-transform [[open]>&]:rotate-0 -rotate-90"
							strokeWidth={2}
						/>
						<span>Safety details</span>
					</summary>
					<div className="grid gap-1 px-4 pb-1 pt-1 text-xs leading-relaxed text-muted-foreground" id={detailId}>
						{isCompact && presentation.resource && (
							<div className="mb-1 flex min-w-0 items-center gap-1.5 text-foreground/90">
								<File aria-hidden className="size-3 shrink-0 text-description/80" strokeWidth={1.75} />
								{resourceDisplay}
							</div>
						)}
						<div className="flex items-start gap-1.5">
							<ShieldAlert aria-hidden className="mt-px size-3 shrink-0 text-description/80" strokeWidth={1.75} />
							<span>
								<strong className="font-semibold text-foreground">{presentation.riskLabel}.</strong>{" "}
								{presentation.riskDetail}
								<span className="text-description/70"> {presentation.reversibility}</span>
							</span>
						</div>
					</div>
				</details>
			)}
		</section>
	)
}

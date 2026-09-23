import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { LockKeyhole } from "lucide-react"
import React, { useMemo } from "react"
import ChatTextArea from "@/components/chat/ChatTextArea"
import QuotedMessagePreview from "@/components/chat/QuotedMessagePreview"
import { QuoteSelectionBar } from "@/components/chat/QuoteSelectionBar"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { isChatInputEnabled } from "../../shared/chatInputPolicy"
import { deriveComposerMode } from "../../shared/composerState"
import { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"

interface InputSectionProps {
	messages: DietCodeMessage[]
	taskSessionActive: boolean
	chatState: ChatState
	messageHandlers: MessageHandlers
	scrollBehavior: ScrollBehavior
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
}

/**
 * Input section including quoted message preview and chat text area
 */
export const InputSection: React.FC<InputSectionProps> = ({
	messages,
	taskSessionActive,
	chatState,
	messageHandlers,
	scrollBehavior,
	placeholderText,
	shouldDisableFilesAndImages,
	selectFilesAndImages,
}) => {
	const { taskLifecycleEvent } = useExtensionState()
	const {
		activeQuote,
		setActiveQuote,
		pendingQuote,
		setPendingQuote,
		isTextAreaFocused,
		inputValue,
		setInputValue,
		sendingDisabled,
		dietcodeAsk,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		textAreaRef,
		handleFocusChange,
	} = chatState

	const sendRouteOptions = useMemo(() => ({ taskSessionActive }), [taskSessionActive])

	const inputEnabled = useMemo(
		() => isChatInputEnabled(messages, dietcodeAsk, { sendingDisabled }, sendRouteOptions),
		[messages, dietcodeAsk, sendingDisabled, sendRouteOptions],
	)
	const composerMode = useMemo(
		() => deriveComposerMode(messages, dietcodeAsk, inputEnabled, taskLifecycleEvent),
		[messages, dietcodeAsk, inputEnabled, taskLifecycleEvent],
	)
	const { isAtBottom, scrollToBottomAuto } = scrollBehavior

	return (
		<>
			{pendingQuote && !activeQuote && (
				<div className="mx-2.5 mb-1">
					<QuoteSelectionBar
						onQuote={() => {
							setActiveQuote(pendingQuote)
							setPendingQuote(null)
							window.getSelection()?.removeAllRanges()
						}}
					/>
				</div>
			)}
			{activeQuote && (
				<QuotedMessagePreview isFocused={isTextAreaFocused} onDismiss={() => setActiveQuote(null)} text={activeQuote} />
			)}

			{composerMode === "disabled" ? (
				<div className="px-3 pb-2">
					<div className="flex min-h-9 items-center gap-2 rounded-lg border border-border/45 bg-foreground/[0.025] px-3 text-[10px] text-description">
						<LockKeyhole aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
						<span>Messages are unavailable right now.</span>
					</div>
				</div>
			) : (
				<ChatTextArea
					activeQuote={activeQuote}
					composerMode={composerMode}
					inputValue={inputValue}
					onFocusChange={handleFocusChange}
					onHeightChange={() => {
						if (isAtBottom) {
							scrollToBottomAuto()
						}
					}}
					onSelectFilesAndImages={selectFilesAndImages}
					onSend={(value) => messageHandlers.handleSendMessage(value || inputValue, selectedImages, selectedFiles)}
					placeholderText={placeholderText}
					ref={textAreaRef}
					selectedFiles={selectedFiles}
					selectedImages={selectedImages}
					sendingDisabled={!inputEnabled}
					setInputValue={setInputValue}
					setSelectedFiles={setSelectedFiles}
					setSelectedImages={setSelectedImages}
					shouldDisableFilesAndImages={shouldDisableFilesAndImages}
				/>
			)}
		</>
	)
}

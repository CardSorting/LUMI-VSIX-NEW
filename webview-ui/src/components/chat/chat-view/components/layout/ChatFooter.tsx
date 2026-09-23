import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { memo } from "react"

import type { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"
import { InputSection } from "./InputSection"
import { ScrollToBottomBar } from "./ScrollToBottomBar"

interface ChatFooterProps {
	showHistory: boolean
	task?: DietCodeMessage
	scrollBehavior: ScrollBehavior
	chatState: ChatState
	messageHandlers: MessageHandlers
	messages: DietCodeMessage[]
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
	taskSessionActive: boolean
}

const getComposerMessageSignature = (messages: DietCodeMessage[]) => {
	const lastMessage = messages.at(-1)
	return [
		messages.length,
		lastMessage?.ts,
		lastMessage?.type,
		lastMessage?.ask,
		lastMessage?.say,
		lastMessage?.partial,
		// API request cost is encoded in this small JSON payload and can change
		// the composer route; normal streamed text does not need to invalidate it.
		lastMessage?.say === "api_req_started" ? lastMessage.text : undefined,
		// Terminal completion evidence can change the completion composer mode.
		lastMessage?.type === "ask" && lastMessage.ask === "completion_result" ? lastMessage.text : undefined,
	].join("\u0000")
}

const areChatFooterPropsEqual = (previous: ChatFooterProps, next: ChatFooterProps) => {
	const previousChatState = previous.chatState
	const nextChatState = next.chatState

	return (
		previous.showHistory === next.showHistory &&
		previous.task === next.task &&
		previous.scrollBehavior === next.scrollBehavior &&
		previous.messageHandlers === next.messageHandlers &&
		previous.placeholderText === next.placeholderText &&
		previous.shouldDisableFilesAndImages === next.shouldDisableFilesAndImages &&
		previous.selectFilesAndImages === next.selectFilesAndImages &&
		previous.taskSessionActive === next.taskSessionActive &&
		getComposerMessageSignature(previous.messages) === getComposerMessageSignature(next.messages) &&
		previousChatState.inputValue === nextChatState.inputValue &&
		previousChatState.activeQuote === nextChatState.activeQuote &&
		previousChatState.pendingQuote === nextChatState.pendingQuote &&
		previousChatState.isTextAreaFocused === nextChatState.isTextAreaFocused &&
		previousChatState.sendingDisabled === nextChatState.sendingDisabled &&
		previousChatState.dietcodeAsk === nextChatState.dietcodeAsk &&
		previousChatState.selectedImages === nextChatState.selectedImages &&
		previousChatState.selectedFiles === nextChatState.selectedFiles
	)
}

export const ChatFooter = memo(
	({
		showHistory,
		task,
		scrollBehavior,
		chatState,
		messageHandlers,
		messages,
		placeholderText,
		shouldDisableFilesAndImages,
		selectFilesAndImages,
		taskSessionActive,
	}: ChatFooterProps) => {
		if (showHistory || !task) {
			return null
		}

		return (
			<footer className="shrink-0 flex w-full flex-col border-t border-border bg-background">
				{scrollBehavior.showScrollToBottom && (
					<ScrollToBottomBar
						onClick={() => {
							scrollBehavior.scrollToBottomSmooth()
							scrollBehavior.disableAutoScrollRef.current = false
						}}
					/>
				)}

				{/* Input Form Section */}
				<div className="w-full p-3">
					<InputSection
						chatState={chatState}
						messageHandlers={messageHandlers}
						messages={messages}
						placeholderText={placeholderText}
						scrollBehavior={scrollBehavior}
						selectFilesAndImages={selectFilesAndImages}
						shouldDisableFilesAndImages={shouldDisableFilesAndImages}
						taskSessionActive={taskSessionActive}
					/>
				</div>
			</footer>
		)
	},
	areChatFooterPropsEqual,
)

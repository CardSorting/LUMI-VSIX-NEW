import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { memo, useCallback, useMemo } from "react"
import { Virtuoso } from "react-virtuoso"
import { InitialTaskPrompt } from "@/components/chat/InitialTaskPrompt"
import type { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"
import { SCROLL_CONSTANTS } from "../../utils/scrollUtils"
import { createMessageRenderer } from "../messages/MessageRenderer"

const MESSAGE_VIEWPORT_INCREASE = {
	top: SCROLL_CONSTANTS.VIEWPORT_INCREASE_TOP,
	// Keep a small tail mounted for streaming layout changes. Following the
	// output is handled by Virtuoso itself, so the tail does not need to be
	// effectively unbounded (which would defeat virtualization when scrolled up).
	bottom: SCROLL_CONSTANTS.VIEWPORT_INCREASE_BOTTOM,
} as const

interface MessagesAreaProps {
	task: DietCodeMessage
	groupedMessages: (DietCodeMessage | DietCodeMessage[])[]
	modifiedMessages: DietCodeMessage[]
	scrollBehavior: ScrollBehavior
	chatState: ChatState
	messageHandlers: MessageHandlers
}

/**
 * The scrollable messages area with virtualized list
 * Handles rendering of chat rows and browser sessions
 */
export const MessagesArea = memo<MessagesAreaProps>(
	({ task, groupedMessages, modifiedMessages, scrollBehavior, chatState, messageHandlers }) => {
		const {
			virtuosoRef,
			scrollContainerRef,
			toggleRowExpansion,
			handleRowHeightChange,
			setIsAtBottom,
			setShowScrollToBottom,
			disableAutoScrollRef,
			handleRangeChanged,
		} = scrollBehavior
		const followOutput = useCallback(
			(isAtBottom: boolean) => (isAtBottom && !disableAutoScrollRef.current ? "auto" : false),
			[disableAutoScrollRef],
		)

		const { expandedRows, inputValue, setPendingQuote } = chatState

		const itemContent = useMemo(
			() =>
				createMessageRenderer(
					groupedMessages,
					modifiedMessages,
					expandedRows,
					toggleRowExpansion,
					handleRowHeightChange,
					setPendingQuote,
					inputValue,
					messageHandlers,
					false,
					chatState,
					task,
				),
			[
				groupedMessages,
				modifiedMessages,
				expandedRows,
				toggleRowExpansion,
				handleRowHeightChange,
				setPendingQuote,
				inputValue,
				messageHandlers,
				chatState,
				task,
			],
		)

		// Leave a small tail after the last message for scroll stability.
		const virtuosoComponents = useMemo(
			() => ({
				Header: () => (
					<InitialTaskPrompt
						key={task.ts}
						onSendMessage={messageHandlers.handleSendMessage}
						showPreparingStatus={groupedMessages.length === 0}
						task={task}
					/>
				),
				Footer: () => <div className="min-h-1" />,
			}),
			[groupedMessages.length, messageHandlers.handleSendMessage, task],
		)

		return (
			<section aria-label="Chat conversation" className="overflow-hidden flex flex-col h-full">
				<div className="grow flex" ref={scrollContainerRef}>
					<Virtuoso
						aria-label="Chat messages"
						atBottomStateChange={(isAtBottom) => {
							setIsAtBottom(isAtBottom)
							if (isAtBottom) {
								disableAutoScrollRef.current = false
							}
							setShowScrollToBottom(disableAutoScrollRef.current && !isAtBottom)
						}}
						atBottomThreshold={SCROLL_CONSTANTS.AT_BOTTOM_THRESHOLD}
						className="scrollable grow overflow-y-scroll"
						components={virtuosoComponents}
						data={groupedMessages}
						// Keep enough content mounted to absorb row expansion without jumps,
						// while followOutput handles bottom anchoring during streaming.
						followOutput={followOutput}
						increaseViewportBy={MESSAGE_VIEWPORT_INCREASE}
						initialTopMostItemIndex={Math.max(0, groupedMessages.length - 1)}
						itemContent={itemContent}
						key={task.ts}
						rangeChanged={handleRangeChanged}
						ref={virtuosoRef}
						role="feed"
						style={{
							scrollbarWidth: "none", // Firefox
							msOverflowStyle: "none", // IE/Edge
							overflowAnchor: "none", // prevent scroll jump when content expands
						}}
					/>
				</div>
			</section>
		)
	},
)

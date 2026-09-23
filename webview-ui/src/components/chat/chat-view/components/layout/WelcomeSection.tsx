import { DietCodeMessage } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/dietcode/common"
import { Mode } from "@shared/storage/types"
import React, { useCallback, useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { TaskServiceClient } from "@/services/grpc-client"
import { ChatState, MessageHandlers, ScrollBehavior, WelcomeSectionProps } from "../../types/chatTypes"
import { InputSection } from "./InputSection"

interface RedesignedWelcomeSectionProps extends WelcomeSectionProps {
	chatState?: ChatState
	messageHandlers?: MessageHandlers
	messages?: DietCodeMessage[]
	mode?: Mode
	placeholderText?: string
	shouldDisableFilesAndImages?: boolean
	selectFilesAndImages?: () => Promise<void>
	taskSessionActive?: boolean
}

const formatRelativeTime = (ts: number) => {
	const now = Date.now()
	const diff = now - ts
	const sec = Math.floor(diff / 1000)
	const min = Math.floor(sec / 60)
	const hr = Math.floor(min / 60)
	const day = Math.floor(hr / 24)

	if (sec < 60) return "Just now"
	if (min < 60) return `${min}m ago`
	if (hr < 24) return `${hr}h ago`
	if (day === 1) return "Yesterday"
	return `${day}d ago`
}

export const WelcomeSection: React.FC<RedesignedWelcomeSectionProps> = ({
	showHistoryView,
	chatState,
	messageHandlers,
	messages,
	mode,
	placeholderText,
	shouldDisableFilesAndImages,
	selectFilesAndImages,
	taskSessionActive,
}) => {
	const { taskHistory } = useExtensionState()

	const recentChats = useMemo(() => {
		return [...taskHistory]
			.filter((item) => item.ts && item.task)
			.sort((a, b) => b.ts - a.ts)
			.slice(0, 2)
	}, [taskHistory])

	const handleOpenTask = useCallback((id: string) => {
		TaskServiceClient.showTaskWithId(StringRequest.create({ value: id })).catch((error) =>
			console.error("Error opening task:", error),
		)
	}, [])
	return (
		<div className="flex-1 overflow-y-auto px-4 py-2 md:px-6 max-w-[1000px] mx-auto w-full select-none flex flex-col justify-between">
			<div>
				{/* Welcome Hero Area */}
				<div className="mb-4 mt-1">
					<h1 className="text-sm font-medium leading-tight text-foreground">How can I help you build today?</h1>
				</div>

				{/* Recent-chat section */}
				{recentChats.length > 0 && (
					<div className="mb-3">
						<div className="flex items-center justify-between mb-1.5">
							<h2 className="text-xs font-medium text-muted-foreground">Recent</h2>
							<button
								className="text-xs text-foreground/75 transition-colors hover:text-foreground"
								onClick={showHistoryView}
								type="button">
								All
							</button>
						</div>

						<div className="space-y-1">
							{recentChats.map((item) => {
								const title = item.task.split("\n")[0] || ""
								return (
									<button
										className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-list-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										key={item.id}
										onClick={() => handleOpenTask(item.id)}
										type="button">
										<span className="min-w-0 flex-1 truncate pr-4 font-medium">{title}</span>
										<span className="shrink-0 text-[10px] text-muted-foreground">
											{formatRelativeTime(item.ts)}
										</span>
									</button>
								)
							})}
						</div>
					</div>
				)}
			</div>

			{/* Inline Composer & status bar at the bottom of the welcome page */}
			{chatState && messageHandlers && messages && mode && placeholderText && (
				<div className="mt-auto border-t border-border/60 pt-2.5">
					{/* Textarea */}
					<InputSection
						chatState={chatState}
						messageHandlers={messageHandlers}
						messages={messages}
						placeholderText={placeholderText}
						scrollBehavior={{ isAtBottom: true, scrollToBottomAuto: () => {} } as unknown as ScrollBehavior}
						selectFilesAndImages={selectFilesAndImages ?? (async () => {})}
						shouldDisableFilesAndImages={shouldDisableFilesAndImages ?? false}
						taskSessionActive={taskSessionActive ?? false}
					/>
				</div>
			)}
		</div>
	)
}

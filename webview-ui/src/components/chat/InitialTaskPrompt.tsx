import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { useEffect, useState } from "react"
import { LumiProgressIndicator } from "@/components/common/LumiProgressIndicator"
import type { MessageHandlers } from "./chat-view/types/chatTypes"
import UserMessage from "./UserMessage"

interface InitialTaskPromptProps {
	task: DietCodeMessage
	showPreparingStatus: boolean
	onSendMessage?: MessageHandlers["handleSendMessage"]
}

function formatElapsedTime(elapsedSeconds: number): string {
	const minutes = Math.floor(elapsedSeconds / 60)
	const seconds = elapsedSeconds % 60
	return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `0:${seconds.toString().padStart(2, "0")}`
}

/** Shows the submitted first prompt while the agent prepares its first visible response. */
export function InitialTaskPrompt({ task, showPreparingStatus, onSendMessage }: InitialTaskPromptProps) {
	const [now, setNow] = useState(() => Date.now())
	const [hasSettled, setHasSettled] = useState(false)

	useEffect(() => {
		if (!showPreparingStatus) {
			setHasSettled(false)
			return
		}

		// Keep short start-up times quiet, but never leave the user with an empty transcript.
		const revealTimer = window.setTimeout(() => setHasSettled(true), 400)
		const elapsedTimer = window.setInterval(() => setNow(Date.now()), 1000)
		return () => {
			window.clearTimeout(revealTimer)
			window.clearInterval(elapsedTimer)
		}
	}, [showPreparingStatus])

	const elapsedSeconds = Math.max(0, Math.floor((now - task.ts) / 1000))
	const statusLabel = elapsedSeconds >= 10 ? "Still working on your request" : "Preparing a response"

	return (
		<div className="w-full px-3 pt-3" data-message-ts={task.ts}>
			<div className="ml-auto w-fit max-w-[92%]">
				<div className="mb-1 text-right text-[10px] font-medium text-description">You</div>
				<UserMessage
					files={task.files}
					images={task.images}
					messageTs={task.ts}
					sendMessageFromChatRow={onSendMessage}
					text={task.text}
				/>
			</div>
			{showPreparingStatus && hasSettled && (
				<output aria-live="polite" className="flex items-center gap-1.5 px-1 py-2 text-xs text-description">
					<LumiProgressIndicator />
					<span>{statusLabel}</span>
					<span aria-hidden="true" className="tabular-nums text-description/75">
						· {formatElapsedTime(elapsedSeconds)}
					</span>
				</output>
			)}
		</div>
	)
}

import type { DietCodeMessage } from "@shared/ExtensionMessage"
import type { MessageHandlers } from "./chat-view/types/chatTypes"
import UserMessage from "./UserMessage"

interface InitialTaskPromptProps {
	task: DietCodeMessage
	onSendMessage?: MessageHandlers["handleSendMessage"]
}

/** Shows the submitted first prompt at the top of the conversation timeline. */
export function InitialTaskPrompt({ task, onSendMessage }: InitialTaskPromptProps) {
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
		</div>
	)
}

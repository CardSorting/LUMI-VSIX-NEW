import { AtSign, Mic, MicOff, Paperclip, Plus } from "lucide-react"
import { memo, useRef, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { isMac } from "@/utils/platformUtils"

interface ChatInputActionsProps {
	onContextClick: () => void
	onAttachClick: () => void
	attachDisabled: boolean
	isListening?: boolean
	isSpeechSupported?: boolean
	onVoiceClick?: () => void
}

const ACTION_CLASS =
	"lumi-icon-action flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-transparent text-foreground/70 transition-colors hover:bg-list-hover hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"

/** Composer utilities share one bottom-aligned control row with the send action. */
export const ChatInputActions = memo(
	({
		onContextClick,
		onAttachClick,
		attachDisabled,
		isListening = false,
		isSpeechSupported = true,
		onVoiceClick,
	}: ChatInputActionsProps) => {
		const [addContextOpen, setAddContextOpen] = useState(false)
		const keepTextareaFocusOnClose = useRef(false)
		const shortcutHint = isMac() ? "⌘⇧V" : "Ctrl+Shift+V"

		return (
			<div className="flex min-w-0 flex-1 items-center gap-1.5 select-none">
				<Popover onOpenChange={setAddContextOpen} open={addContextOpen}>
					<PopoverTrigger asChild>
						<button
							aria-label="Add context"
							className={ACTION_CLASS}
							data-testid="context-button"
							title="Add context"
							type="button">
							<Plus aria-hidden className="size-3.5" strokeWidth={2} />
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="w-60 p-1.5"
						onCloseAutoFocus={(event) => {
							if (keepTextareaFocusOnClose.current) {
								event.preventDefault()
								keepTextareaFocusOnClose.current = false
							}
						}}
						side="top"
						sideOffset={8}>
						<div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">Add context</div>
						<button
							className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-list-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							data-testid="mention-context-action"
							onClick={() => {
								keepTextareaFocusOnClose.current = true
								setAddContextOpen(false)
								onContextClick()
							}}
							type="button">
							<AtSign aria-hidden className="size-4 text-muted-foreground" />
							<span className="flex-1">Mention workspace item</span>
							<kbd className="text-[10px] text-muted-foreground">@</kbd>
						</button>
						<button
							className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-list-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
							data-testid="attach-context-action"
							disabled={attachDisabled}
							onClick={() => {
								setAddContextOpen(false)
								onAttachClick()
							}}
							title={attachDisabled ? "Attachment limit reached" : undefined}
							type="button">
							<Paperclip aria-hidden className="size-4 text-muted-foreground" />
							<span>Attach file or image</span>
						</button>
					</PopoverContent>
				</Popover>

				{onVoiceClick && isSpeechSupported && (
					<button
						aria-keyshortcuts={isMac() ? "Meta+Shift+V" : "Control+Shift+V"}
						aria-label={isListening ? "Stop voice input" : "Start voice input"}
						className={cn(ACTION_CLASS, isListening && "border-error/50 bg-error/10 text-error hover:bg-error/15")}
						data-testid="voice-button"
						onClick={onVoiceClick}
						title={`${isListening ? "Stop voice input" : "Start voice input"} (${shortcutHint})`}
						type="button">
						{isListening ? (
							<MicOff aria-hidden className="size-3.5" strokeWidth={2} />
						) : (
							<Mic aria-hidden className="size-3.5" strokeWidth={2} />
						)}
					</button>
				)}
			</div>
		)
	},
)

ChatInputActions.displayName = "ChatInputActions"

import { ArrowLeft } from "lucide-react"
import { useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icons"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { CHAT_NAV_BY_ID, CHAT_NAV_ITEMS, type ChatNavItemId } from "./chatNavConfig"
import { WorkspaceNavigationMenu } from "./WorkspaceNavigationMenu"

interface ChatToolbarProps {
	conversationTitle?: string
	onRequestNewChat: () => void
}

/** Compact app bar with direct high-frequency actions and labeled overflow navigation. */
export const ChatToolbar = ({ conversationTitle, onRequestNewChat }: ChatToolbarProps) => {
	const {
		navigateToHistory,
		navigateToSettings,
		navigateToChat,
		navigateToWorktrees,
		showHistory,
		showSettings,
		showWorktrees,
		setExpandTaskHeader,
	} = useExtensionState()

	const isSubViewActive = useMemo(() => {
		return showHistory || showSettings || showWorktrees
	}, [showHistory, showSettings, showWorktrees])

	const activePanel = useMemo((): ChatNavItemId | null => {
		if (showHistory) return "history"
		if (showSettings) return "settings"
		if (showWorktrees) return "worktrees"
		if (!isSubViewActive) return "chat"
		return null
	}, [showHistory, showSettings, showWorktrees, isSubViewActive])

	const overflowItems = CHAT_NAV_ITEMS

	const collapseTaskDetails = useCallback(() => {
		setExpandTaskHeader(false)
	}, [setExpandTaskHeader])

	const handleBackToChat = useCallback(() => {
		collapseTaskDetails()
		navigateToChat()
	}, [collapseTaskDetails, navigateToChat])

	const handleNavigate = useCallback(
		(id: ChatNavItemId) => {
			switch (id) {
				case "chat":
					handleBackToChat()
					break
				case "newChat":
					collapseTaskDetails()
					onRequestNewChat()
					break
				case "history":
					collapseTaskDetails()
					navigateToHistory()
					break
				case "worktrees":
					collapseTaskDetails()
					navigateToWorktrees()
					break
				case "settings":
					collapseTaskDetails()
					navigateToSettings()
					break
			}
		},
		[collapseTaskDetails, handleBackToChat, navigateToHistory, navigateToSettings, navigateToWorktrees, onRequestNewChat],
	)

	const newChatItem = CHAT_NAV_BY_ID.newChat
	const centerLabel = useMemo(() => {
		if (showHistory) return CHAT_NAV_BY_ID.history?.label || "Chat history"
		if (showSettings) return CHAT_NAV_BY_ID.settings?.label || "Settings"
		if (showWorktrees) return CHAT_NAV_BY_ID.worktrees?.label || "Branch workspaces"
		return conversationTitle?.trim() || "Chat"
	}, [showHistory, showSettings, showWorktrees, conversationTitle])

	return (
		<header className="z-10 flex-none border-b border-border/40 bg-background select-none">
			<div className="flex h-10 items-center gap-1.5 px-2" id="lumi-chat-toolbar">
				{isSubViewActive ? (
					<Button
						aria-label="Back to chat"
						className="h-8 w-8 shrink-0 rounded-md text-foreground/80 transition-colors hover:bg-toolbar-hover hover:text-foreground focus-visible:ring-2"
						data-testid="chat-nav-back"
						onClick={handleBackToChat}
						size="icon"
						title="Back to chat"
						variant="icon">
						<ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
					</Button>
				) : (
					<Button
						aria-label={newChatItem.label}
						className="h-8 w-8 shrink-0 rounded-md text-foreground/80 transition-colors hover:bg-toolbar-hover hover:text-foreground focus-visible:ring-2"
						data-testid="chat-nav-new"
						onClick={() => handleNavigate("newChat")}
						size="icon"
						title={newChatItem.tooltip}
						variant="icon">
						<Icon name={newChatItem.icon} size={16} />
					</Button>
				)}

				<div className="min-w-0 flex-1 px-0.5">
					<h1
						aria-atomic="true"
						aria-live="polite"
						className="m-0 truncate text-xs font-semibold leading-none text-foreground"
						id="lumi-view-title"
						title={centerLabel}>
						{centerLabel}
					</h1>
				</div>

				<nav aria-label="Navigation" className="flex shrink-0 items-center">
					<WorkspaceNavigationMenu activePanel={activePanel} menuItems={overflowItems} onNavigate={handleNavigate} />
				</nav>
			</div>
		</header>
	)
}

import type { AuditHealthSummary } from "@shared/audit/auditRollup"
import type { ResolvedCompletionFunnelSnapshot } from "@shared/completion/completionFunnelMessages"
import type { DietCodeMessage, TaskAuditMetadata } from "@shared/ExtensionMessage"
import type { TaskLifecycleEvent } from "@shared/lifecycle/taskLifecycleEvent"
import { ChevronDown } from "lucide-react"
import { memo, useMemo } from "react"
import { useIsCompact } from "@/context/DensityContext"
import { cn } from "@/lib/utils"
import { deriveExecutionStatus } from "./executionStatus"

interface ExecutionStatusHeaderProps {
	messages: readonly DietCodeMessage[]
	auditMetadata?: TaskAuditMetadata
	auditHealth?: AuditHealthSummary
	completionFunnel?: ResolvedCompletionFunnelSnapshot
	lifecycleEvent?: TaskLifecycleEvent
	checkpointError?: string
	isDetailsOpen: boolean
	onToggleDetails: () => void
	onReviewBlock?: () => void
	children?: React.ReactNode
}

export const ExecutionStatusHeader = memo(
	({
		messages,
		auditMetadata,
		auditHealth,
		completionFunnel,
		lifecycleEvent,
		checkpointError,
		isDetailsOpen,
		onToggleDetails,
		onReviewBlock,
		children,
	}: ExecutionStatusHeaderProps) => {
		const status = useMemo(
			() =>
				deriveExecutionStatus({
					messages,
					auditMetadata,
					auditHealth,
					completionFunnel,
					lifecycleEvent,
					checkpointError,
				}),
			[messages, auditMetadata, auditHealth, completionFunnel, lifecycleEvent, checkpointError],
		)
		const isCompact = useIsCompact()

		return (
			<section
				aria-label="Task details"
				className="overflow-hidden border-b border-border/40"
				data-execution-state={status.state}>
				<div className={cn("flex items-center gap-2", isCompact ? "px-2 py-1" : "px-3 py-1.5")}>
					<div className="min-w-0 flex-1">
						<h2
							className={cn(
								"m-0 truncate font-medium leading-tight text-foreground",
								isCompact ? "text-[11px]" : "text-xs",
							)}>
							Task details
						</h2>
					</div>
					<button
						aria-expanded={isDetailsOpen}
						aria-label={isDetailsOpen ? "Hide task details" : "Show task details"}
						className={cn(
							"flex shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-description transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							"size-7",
						)}
						onClick={onToggleDetails}
						title={isDetailsOpen ? "Hide task details" : "Show task details"}
						type="button">
						<ChevronDown
							aria-hidden
							className={cn("size-3.5", "transition-transform", !isDetailsOpen && "-rotate-90")}
							strokeWidth={1.8}
						/>
					</button>
				</div>

				{isDetailsOpen && (
					<div className="px-3 pb-2 text-[11px] leading-relaxed text-description">
						<p aria-atomic="true" aria-live="polite" className="mb-1 mt-0 font-medium text-foreground">
							{status.title}
						</p>
						{status.detail}
						{["blocked", "failed", "cancelled"].includes(status.state) && (
							<p className="mb-0 mt-1 text-foreground/85">{status.nextAction}</p>
						)}
						{status.state === "blocked" && onReviewBlock ? (
							<button
								className="ml-2 text-foreground underline underline-offset-2"
								onClick={onReviewBlock}
								type="button">
								Review details
							</button>
						) : null}
					</div>
				)}
				{isDetailsOpen && children}
			</section>
		)
	},
)

ExecutionStatusHeader.displayName = "ExecutionStatusHeader"

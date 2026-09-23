import { isApiRequestInProgress } from "@shared/agentActivity"
import { sanitizeWebviewMessageContent } from "@shared/diagnostics/webviewDiagnostics"
import type {
	DietCodeMessage,
	DietCodePlanModeResponse,
	DietCodeSaySubagentStatus,
	DietCodeSayTool,
} from "@shared/ExtensionMessage"
import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage"
import { parseFocusChainItem } from "@shared/focus-chain-utils"
import { AlertCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { LumiProgressIndicator } from "@/components/common/LumiProgressIndicator"
import { isLowStakesTool } from "./chat-view/utils/messageUtils"

type ActivityTone = "active" | "waiting" | "no-response"

interface ActivityTimeout {
	afterMs: number
	title: string
	detail: string
	tone: ActivityTone
}

interface AgentActivity {
	title: string
	detail: string
	since: number
	tone: ActivityTone
	timeout?: ActivityTimeout
	checklist?: ChecklistProgress
}

interface ChecklistProgress {
	completed: number
	total: number
	nextStep?: string
}

function parseJson<T>(text: string | undefined): T | undefined {
	try {
		return JSON.parse(text || "{}") as T
	} catch {
		return undefined
	}
}

function formatElapsedTime(milliseconds: number): string {
	const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`
}

function getToolActivity(tool: DietCodeSayTool): string | undefined {
	const path = tool.path?.trim()
	const target = path ? ` ${path}` : ""

	switch (tool.tool) {
		case "readFile":
			return path ? `Reading file: ${path}` : "Reading a file"
		case "listFilesTopLevel":
		case "listFilesRecursive":
			return `Listing files${target ? ` in${target}` : ""}`
		case "searchFiles":
			return `Searching files${target ? ` in${target}` : ""}`
		case "listCodeDefinitionNames":
			return `Checking code definitions${target ? ` in${target}` : ""}`
		case "webSearch":
			return "Searching the web"
		case "webFetch":
			return "Reading a webpage"
		case "editedExistingFile":
			return path ? `Editing file: ${path}` : "Editing a file"
		case "newFileCreated":
			return path ? `Creating file: ${path}` : "Creating a file"
		case "fileDeleted":
			return path ? `Deleting file: ${path}` : "Deleting a file"
		case "summarizeTask":
			return "Summarizing the task"
		case "useSkill":
			return "Loading a skill"
		default:
			return undefined
	}
}

function getLatestUserPromptIndex(messages: DietCodeMessage[]): number {
	for (let messageIndex = messages.length - 1; messageIndex > 0; messageIndex--) {
		const message = messages[messageIndex]
		if (message.say === "user_feedback" || message.say === "user_feedback_diff") {
			return messageIndex
		}
	}
	return 0
}

function hasVisibleResponse(messages: DietCodeMessage[]): boolean {
	return messages.some((message) => {
		if (message.type === "ask") {
			if (message.ask === "completion_result") {
				const text = message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG)
					? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
					: message.text
				return Boolean(text?.trim())
			}
			return message.ask !== "api_req_failed"
		}
		if (message.say === "text") {
			return Boolean(message.text?.trim())
		}
		if (message.say === "plan_summary") {
			const plan = parseJson<DietCodePlanModeResponse>(message.text)
			return Boolean((plan?.response ?? message.text)?.trim())
		}
		if (message.say === "completion_result") {
			const text = message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG)
				? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
				: message.text
			return Boolean(text?.trim())
		}
		return message.say === "info" && Boolean(message.text?.trim())
	})
}

function noResponseActivity(since: number, detail: string): AgentActivity {
	return {
		title: "No response received",
		detail,
		since,
		tone: "no-response",
	}
}

function resolveActivityTimeout(activity: AgentActivity | null, now: number): AgentActivity | null {
	if (!activity?.timeout || now - activity.since < activity.timeout.afterMs) return activity

	return {
		...activity,
		title: activity.timeout.title,
		detail: activity.timeout.detail,
		tone: activity.timeout.tone,
		timeout: undefined,
	}
}

function deriveChecklistProgress(messages: DietCodeMessage[]): ChecklistProgress | undefined {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index]
		if (message.say !== "task_progress" || !message.text) continue

		const items = message.text
			.split("\n")
			.map((line) => parseFocusChainItem(line.trim()))
			.filter((item): item is NonNullable<typeof item> => item !== null)
		if (items.length === 0) return undefined

		return {
			completed: items.filter((item) => item.checked).length,
			total: items.length,
			nextStep: items.find((item) => !item.checked)?.text,
		}
	}
	return undefined
}

function isRequestStillInProgress(messages: DietCodeMessage[], request: DietCodeMessage): boolean {
	const requestIndex = messages.indexOf(request)
	const hasLegacyFinishedEvent =
		requestIndex !== -1 && messages.slice(requestIndex + 1).some((message) => message.say === "api_req_finished")
	return !hasLegacyFinishedEvent && isApiRequestInProgress(request)
}

function getMessageBeforePrompt(messages: DietCodeMessage[], promptIndex: number): DietCodeMessage | undefined {
	for (let index = promptIndex - 1; index >= 0; index--) {
		if (messages[index].say !== "api_req_finished") return messages[index]
	}
	return undefined
}

function deriveAgentActivity(conversation: DietCodeMessage[]): AgentActivity | null {
	if (conversation.length === 0) return null
	const promptIndex = getLatestUserPromptIndex(conversation)
	const afterPrompt = conversation.slice(promptIndex + 1)
	const checklist = deriveChecklistProgress(afterPrompt)
	const activity = deriveCurrentTurnActivity(conversation, promptIndex, afterPrompt, checklist)
	return activity ? { ...activity, checklist } : null
}

function deriveCurrentTurnActivity(
	conversation: DietCodeMessage[],
	promptIndex: number,
	afterPrompt: DietCodeMessage[],
	checklist: ChecklistProgress | undefined,
): AgentActivity | null {
	const prompt = conversation[promptIndex] ?? conversation[0]
	let latestIndex = afterPrompt.length - 1
	// Legacy request-finished rows are terminal markers, not visible activity.
	while (afterPrompt[latestIndex]?.say === "api_req_finished") latestIndex--
	const latest = afterPrompt[latestIndex]
	const hasResponse = hasVisibleResponse(afterPrompt)

	if (!latest) {
		const activityBeforeFollowup = getMessageBeforePrompt(conversation, promptIndex)
		if (activityBeforeFollowup?.say === "api_req_started" && isRequestStillInProgress(conversation, activityBeforeFollowup)) {
			return {
				title: "Waiting for the model response",
				detail: "LUMI received your follow-up while the model request is still active. No response text has arrived yet.",
				since: activityBeforeFollowup.ts,
				tone: "active",
			}
		}
		if (activityBeforeFollowup?.say === "text" && activityBeforeFollowup.partial === true) {
			return {
				title: "LUMI is still writing a response",
				detail: "Your follow-up was received while the response was streaming.",
				since: activityBeforeFollowup.ts,
				tone: "active",
			}
		}
		if (activityBeforeFollowup?.say === "reasoning") {
			return {
				title: "Preparing the next step",
				detail: "LUMI received your follow-up and has not sent response text yet.",
				since: activityBeforeFollowup.ts,
				tone: "active",
			}
		}
		if (activityBeforeFollowup?.ask === "tool" && isLowStakesTool(activityBeforeFollowup)) {
			const tool = parseJson<DietCodeSayTool>(activityBeforeFollowup.text)
			const activity = tool ? getToolActivity(tool) : undefined
			if (activity) {
				return {
					title: activity,
					detail: "LUMI received your follow-up while using this workspace tool. No response text has arrived yet.",
					since: activityBeforeFollowup.ts,
					tone: "active",
				}
			}
		}
		if (activityBeforeFollowup?.say === "tool" && isLowStakesTool(activityBeforeFollowup)) {
			const tool = parseJson<DietCodeSayTool>(activityBeforeFollowup.text)
			const activity = tool ? getToolActivity(tool) : undefined
			if (activity) {
				return {
					title: `Last completed step: ${activity}`,
					detail: "Your follow-up arrived after this workspace step. Waiting for LUMI's next update.",
					since: activityBeforeFollowup.ts,
					tone: "waiting",
				}
			}
		}
		if (
			(activityBeforeFollowup?.say === "command" || activityBeforeFollowup?.say === "command_output") &&
			activityBeforeFollowup.commandCompleted !== true
		) {
			return {
				title:
					activityBeforeFollowup.say === "command_output"
						? "Waiting for the terminal command to finish"
						: "Running a terminal command",
				detail: "LUMI received your follow-up while the command is still running.",
				since: activityBeforeFollowup.ts,
				tone: "active",
			}
		}

		return {
			title: "Waiting for the first agent update",
			detail: "LUMI received your message. No activity update has arrived yet.",
			since: prompt.ts,
			tone: "active",
			timeout: {
				afterMs: 10_000,
				title: "No agent update received yet",
				detail: "No response has arrived. LUMI has not reported an activity step yet.",
				tone: "waiting",
			},
		}
	}

	// Approval and question rows already state exactly what LUMI needs from the user.
	if (latest.type === "ask") {
		if (latest.ask === "completion_result" && !hasVisibleResponse([latest])) {
			return noResponseActivity(
				latest.ts,
				"The task ended without visible response text. Send another message to try again.",
			)
		}
		if (latest.ask === "api_req_failed") {
			return null
		}
		if (latest.ask === "tool" && isLowStakesTool(latest)) {
			const tool = parseJson<DietCodeSayTool>(latest.text)
			const activity = tool ? getToolActivity(tool) : undefined
			if (activity) {
				return {
					title: activity,
					detail: "LUMI is using this workspace tool. No response text has arrived yet.",
					since: latest.ts,
					tone: "active",
				}
			}
		}
		return null
	}

	if (latest.say === "api_req_started") {
		if (isRequestStillInProgress(afterPrompt, latest)) {
			return {
				title: "Waiting for the model response",
				detail: "The request is active. No response text has arrived yet.",
				since: latest.ts,
				tone: "active",
				timeout: {
					afterMs: 30_000,
					title: "No model response has arrived yet",
					detail: "The model request is still active. You can add guidance or stop execution.",
					tone: "waiting",
				},
			}
		}

		if (!hasResponse) {
			return {
				title: "No response received",
				detail: "The latest model request finished without sending visible text. Send another message to try again.",
				since: latest.ts,
				tone: "no-response",
			}
		}
	}

	if (latest.say === "text") {
		if (latest.partial === true) {
			return {
				title: "LUMI is writing a response",
				detail: latest.text?.trim()
					? "Response text is streaming."
					: "The response has started, but no text is visible yet.",
				since: latest.ts,
				tone: "active",
			}
		}
		if (latest.text?.trim()) return null
		return noResponseActivity(latest.ts, "LUMI sent an empty response. Send another message to try again.")
	}

	if (latest.say === "plan_summary" || latest.say === "completion_result") {
		if (latest.partial === true) {
			return {
				title: latest.say === "plan_summary" ? "LUMI is preparing the plan" : "LUMI is preparing the result",
				detail: hasVisibleResponse([latest]) ? "Response content is streaming." : "No response text is visible yet.",
				since: latest.ts,
				tone: "active",
			}
		}
		if (hasVisibleResponse([latest])) return null
		return noResponseActivity(
			latest.ts,
			"LUMI finished without sending visible response text. Send another message to try again.",
		)
	}

	if (latest.say === "reasoning") {
		return {
			title: "Preparing the next step",
			detail: "LUMI has not sent response text yet.",
			since: latest.ts,
			tone: "active",
		}
	}

	if (latest.ask === "tool" || latest.say === "tool") {
		if (latest.ask === "tool" && !isLowStakesTool(latest)) {
			return null
		}
		const tool = parseJson<DietCodeSayTool>(latest.text)
		const activity = tool ? getToolActivity(tool) : undefined
		if (activity) {
			return {
				title: `Last completed step: ${activity}`,
				detail:
					latest.say === "tool" ? "No response text has arrived after this step." : "No response text has arrived yet.",
				since: latest.ts,
				tone: latest.say === "tool" ? "waiting" : "active",
			}
		}
	}

	if (latest.say === "mcp_server_request_started") {
		const request = parseJson<{ serverName?: string; toolName?: string }>(latest.text)
		const target = [request?.toolName, request?.serverName].filter(Boolean).join(" on ")
		return {
			title: target ? `Waiting for ${target}` : "Waiting for the connected tool",
			detail: "The external tool has not returned a result yet.",
			since: latest.ts,
			tone: "active",
		}
	}

	if (latest.say === "api_req_retried" || latest.say === "error_retry") {
		return {
			title: "Retrying the model request",
			detail: "The previous attempt did not finish. LUMI is trying again.",
			since: latest.ts,
			tone: "active",
		}
	}

	if (latest.say === "command" || latest.say === "command_output") {
		if (latest.commandCompleted !== true) {
			return {
				title:
					latest.say === "command_output" ? "Waiting for the terminal command to finish" : "Running a terminal command",
				detail: "LUMI has not sent response text yet.",
				since: latest.ts,
				tone: "active",
			}
		}
	}

	if (latest.say === "subagent") {
		const status = parseJson<DietCodeSaySubagentStatus & { stage?: string; progress?: number }>(latest.text)
		if (status?.status === "running" || status?.stage) {
			const current = status.items?.find((item) => item.status === "running")
			const detail = current?.latestToolCall?.trim()
			const stage = status.stage?.replaceAll("-", " ")
			return {
				title: stage
					? `Design agent stage: ${stage}`
					: current?.name
						? `${current.name} is working`
						: "Delegated agent work is in progress",
				detail:
					detail ||
					(status.progress !== undefined
						? `Stage progress: ${status.progress}%. No response text has arrived yet.`
						: "LUMI is waiting for delegated work to finish."),
				since: latest.ts,
				tone: "active",
			}
		}
	}

	if (latest.say === "task_progress") {
		const currentStep = checklist?.nextStep
		return {
			title: currentStep ? `Working on: ${currentStep}` : "Updating the task progress",
			detail: "LUMI has not sent response text yet.",
			since: latest.ts,
			tone: "active",
		}
	}

	if (latest.say === "checkpoint_created") {
		return {
			title: "Workspace checkpoint created",
			detail: hasResponse ? "LUMI is continuing the task." : "LUMI has not sent response text yet.",
			since: latest.ts,
			tone: "active",
		}
	}

	if (latest.say === "error" || latest.say === "diff_error" || latest.say === "command_permission_denied") {
		return null
	}

	if (!hasResponse) {
		return {
			title: "No response text yet",
			detail: "LUMI has not sent a user-facing response. Waiting for the next visible update.",
			since: latest.ts,
			tone: "waiting",
		}
	}

	return null
}

interface AgentActivityStatusProps {
	messages: DietCodeMessage[]
}

export function AgentActivityStatus({ messages }: AgentActivityStatusProps) {
	const [now, setNow] = useState(() => Date.now())
	const baseActivity = useMemo(() => deriveAgentActivity(messages), [messages])
	const activity = useMemo(() => resolveActivityTimeout(baseActivity, now), [baseActivity, now])
	const activitySince = baseActivity?.since

	useEffect(() => {
		if (activitySince === undefined) return
		setNow(Date.now())
		const timer = window.setInterval(() => setNow(Date.now()), 1000)
		return () => window.clearInterval(timer)
	}, [activitySince])

	if (!activity) return null

	const since = Number.isFinite(activity.since) ? activity.since : now
	const elapsed = formatElapsedTime(now - since)
	const isNoResponse = activity.tone === "no-response"
	const title = sanitizeWebviewMessageContent(activity.title)
	const detail = sanitizeWebviewMessageContent(activity.detail)

	return (
		<section aria-label="LUMI activity" className="shrink-0 border-t border-border/50 bg-background px-3 py-2">
			<div className="flex min-w-0 items-start gap-2 text-xs">
				{isNoResponse ? (
					<AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-error" />
				) : (
					<LumiProgressIndicator />
				)}
				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
						<span className="font-medium text-foreground">LUMI:</span>
						<output aria-atomic="true" aria-live="polite" className="font-medium text-foreground">
							{title}
						</output>
						<time
							className="tabular-nums text-[10px] text-description"
							dateTime={new Date(since).toISOString()}
							title={`Elapsed time ${elapsed}`}>
							{elapsed}
						</time>
					</div>
					<p className="m-0 mt-0.5 break-words text-[11px] leading-snug text-description">{detail}</p>
					{activity.checklist && (
						<div className="mt-1.5 min-w-0">
							<div className="flex min-w-0 items-center gap-2">
								<div
									aria-label="Task checklist progress"
									aria-valuemax={activity.checklist.total}
									aria-valuemin={0}
									aria-valuenow={activity.checklist.completed}
									aria-valuetext={`${activity.checklist.completed} of ${activity.checklist.total} steps complete`}
									className="h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-foreground/10"
									role="progressbar">
									<div
										aria-hidden
										className="h-full rounded-full bg-link transition-[width] duration-300"
										style={{ width: `${(activity.checklist.completed / activity.checklist.total) * 100}%` }}
									/>
								</div>
								<span className="shrink-0 text-[10px] tabular-nums text-description">
									{activity.checklist.completed} of {activity.checklist.total} steps complete
								</span>
							</div>
							{activity.checklist.nextStep && (
								<p className="m-0 mt-1 break-words text-[10px] leading-snug text-description">
									Next checklist item: {sanitizeWebviewMessageContent(activity.checklist.nextStep)}
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</section>
	)
}

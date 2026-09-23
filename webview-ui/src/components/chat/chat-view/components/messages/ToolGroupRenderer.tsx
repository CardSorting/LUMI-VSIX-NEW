import { DietCodeMessage, DietCodeSayTool } from "@shared/ExtensionMessage"
import { StringRequest } from "@shared/proto/dietcode/common"
import { Check, ChevronRight } from "lucide-react"
import { memo, useCallback, useMemo, useState } from "react"
import { cleanPathPrefix } from "@/components/common/CodeAccordian"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileServiceClient } from "@/services/grpc-client"
import { getIconByToolName, getToolsNotInCurrentActivities, isLowStakesTool } from "../../utils/messageUtils"

interface ToolGroupRendererProps {
	messages: DietCodeMessage[]
	allMessages: DietCodeMessage[]
	isLastGroup: boolean
}

interface WorkspaceToolReference {
	tool: DietCodeMessage
	parsedTool: DietCodeSayTool
}

interface ActiveWorkspaceTool {
	tool: DietCodeMessage
	parsedTool: DietCodeSayTool
	activityText: string
}

const EXPANDABLE_TOOLS = new Set(["listFilesTopLevel", "listFilesRecursive", "listCodeDefinitionNames", "searchFiles"])

// Helper to format activity text for active items (from RequestStartRow logic)
const getActivityText = (tool: DietCodeSayTool): string | null => {
	const cleanedPath = cleanPathPrefix(tool.path || "")
	const formatSearchRegex = (regex: string, path: string, filePattern?: string): string => {
		const cleanedPath = cleanPathPrefix(path)
		const terms = regex
			.split("|")
			.map((t) => t.trim().replace(/\\b/g, "").replace(/\\s\?/g, " "))
			.filter(Boolean)
			.join(" | ")
		return filePattern && filePattern !== "*"
			? `"${terms}" in ${cleanedPath}/ (${filePattern})`
			: `"${terms}" in ${cleanedPath}/`
	}

	switch (tool.tool) {
		case "readFile":
			return tool.path ? `Reading file: ${cleanedPath}…` : "Reading a file…"
		case "listFilesTopLevel":
		case "listFilesRecursive":
			return tool.path ? `Listing files in ${cleanedPath}/…` : "Listing files…"
		case "searchFiles":
			return tool.regex && tool.path
				? `Searching ${formatSearchRegex(tool.regex, tool.path, tool.filePattern)}…`
				: tool.path
					? `Searching files in ${cleanedPath}/…`
					: "Searching files…"
		case "listCodeDefinitionNames":
			return tool.path ? `Checking code definitions in ${cleanedPath}/…` : "Checking code definitions…"
		default:
			return null
	}
}

// Calculate current activities (from RequestStartRow logic)
const getCurrentActivities = (allMessages: DietCodeMessage[]): DietCodeMessage[] => {
	// Find current api_req
	let currentApiReqIndex = -1
	for (let i = allMessages.length - 1; i >= 0; i--) {
		const msg = allMessages[i]
		if (msg.say === "api_req_started" && msg.text) {
			try {
				const info = JSON.parse(msg.text)
				const hasCost = info.cost != null
				if (!hasCost) {
					currentApiReqIndex = i
					break
				}
			} catch {
				// ignore
			}
		}
	}

	if (currentApiReqIndex === -1) {
		return []
	}

	// Collect tools AFTER the current api_req_started
	const activities: DietCodeMessage[] = []
	for (let i = currentApiReqIndex + 1; i < allMessages.length; i++) {
		const msg = allMessages[i]
		// Only collect tools that are currently executing (ask === "tool")
		// Skip completed tools (say === "tool") - they should be in the completed list
		if (msg.say === "tool" || msg.ask !== "tool") {
			continue
		}
		if (isLowStakesTool(msg)) {
			activities.push(msg)
		}
	}

	return activities
}

/** Shows the live workspace action trail and collapsible file/search references. */
export const ToolGroupRenderer = memo(({ messages, allMessages, isLastGroup }: ToolGroupRendererProps) => {
	const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({})
	const [detailsExpanded, setDetailsExpanded] = useState(false)

	// Filter out tools in the "current activities" range (being shown in loading state)
	const filteredMessages = useMemo(() => getToolsNotInCurrentActivities(messages, allMessages), [messages, allMessages])

	// Get current activities (active reading/exploring) - only for last group
	const currentActivities = useMemo(() => {
		if (!isLastGroup) {
			return []
		}
		return getCurrentActivities(allMessages)
	}, [allMessages, isLastGroup])

	// Build completed tool items
	const completedTools = useMemo(() => buildCompletedWorkspaceTools(filteredMessages), [filteredMessages])

	// Build active tool items
	const activeTools = useMemo(() => {
		return currentActivities.flatMap((msg): ActiveWorkspaceTool[] => {
			const parsedTool = parseToolSafe(msg.text)
			const activityText = getActivityText(parsedTool)
			return activityText ? [{ tool: msg, parsedTool, activityText }] : []
		})
	}, [currentActivities])

	const handleOpenFile = useCallback((filePath: string) => {
		FileServiceClient.openFileRelativePath(StringRequest.create({ value: filePath })).catch((err) =>
			console.error("Failed to open file:", err),
		)
	}, [])

	const handleItemToggle = useCallback((ts: number) => {
		setExpandedItems((prev) => ({ ...prev, [ts]: !prev[ts] }))
	}, [])

	const showDetails = detailsExpanded

	if (activeTools.length > 0) {
		return (
			<section aria-label="Workspace activity" className="ml-1 px-4 py-1 text-description/80">
				<div className="text-[10px] font-medium text-muted-foreground">Workspace activity</div>
				<ul className="m-0 mt-1 max-h-28 list-none space-y-0.5 overflow-y-auto p-0">
					{completedTools.map(({ tool, parsedTool }) => {
						const info = getToolDisplayInfo(parsedTool)
						if (!info) return null

						const isExpandable = EXPANDABLE_TOOLS.has(parsedTool.tool)
						const isItemExpanded = expandedItems[tool.ts] ?? false
						const content = parsedTool.content || null
						const completedText = info.displayText || cleanPathPrefix(info.path)

						return (
							<li className="min-w-0" key={tool.ts}>
								<Button
									className="flex min-w-0 max-w-full cursor-pointer items-center gap-[3px] px-0 py-[1px] text-left text-[12px] leading-tight text-description hover:text-link"
									onClick={() => (isExpandable ? handleItemToggle(tool.ts) : handleOpenFile(info.path))}
									size="icon"
									variant="text">
									<Check aria-hidden className="size-3 shrink-0 text-success" />
									<span className="min-w-0 flex-1 truncate text-left">
										<span className="sr-only">Completed: </span>
										{completedText}
									</span>
								</Button>
								{isExpandable && isItemExpanded && content && (
									<pre className="m-1 ml-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xs p-2 text-xs opacity-80">
										{content}
									</pre>
								)}
							</li>
						)
					})}
					{activeTools.map(({ tool, parsedTool, activityText }) => {
						const info = getToolDisplayInfo(parsedTool)
						if (!info) return null

						return (
							<li
								className="flex min-w-0 items-start gap-1.5 text-[12px] leading-snug text-description"
								key={tool.ts}>
								<info.icon aria-hidden className="mt-0.5 size-3 shrink-0 opacity-70" />
								<span className="min-w-0 break-words">{activityText}</span>
							</li>
						)
					})}
				</ul>
			</section>
		)
	}

	if (completedTools.length === 0) {
		return null
	}

	return (
		<div className="ml-1 px-4 py-1 text-description/80">
			<button
				aria-expanded={showDetails}
				className="flex items-center gap-1.5 bg-transparent p-0 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
				onClick={() => setDetailsExpanded((prev) => !prev)}
				type="button">
				<ChevronRight aria-hidden className={cn("size-3 transition-transform", showDetails && "rotate-90")} />
				<span>Files and searches</span>
			</button>

			{showDetails && (
				<div className="min-w-0 mt-1 animate-lumi-reveal">
					{completedTools.map(({ tool, parsedTool }) => {
						const info = getToolDisplayInfo(parsedTool)
						if (!info) {
							return null
						}

						const isExpandable = EXPANDABLE_TOOLS.has(parsedTool.tool)
						const isItemExpanded = expandedItems[tool.ts] ?? false
						const content = parsedTool.content || null

						return (
							<div className="min-w-0" key={tool.ts}>
								<Button
									className="flex items-center gap-[3px] cursor-pointer text-[13px] text-description py-[1px] hover:text-link min-w-0 max-w-full px-0 leading-tight -my-0.5"
									onClick={() => (isExpandable ? handleItemToggle(tool.ts) : handleOpenFile(info.path))}
									size="icon"
									variant="text">
									<info.icon className="opacity-70 shrink-0 size-[12px]" />
									<span
										className={cn(
											"flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-left [direction:rtl] text-[13px]",
											{
												"[direction:ltr]": !!info.displayText,
											},
										)}>
										{`${info.displayText || cleanPathPrefix(info.path)}\u200E`}
									</span>
								</Button>
								{/* Expanded content for folders/search/definitions - file lists only */}
								{isExpandable && isItemExpanded && content && (
									<pre className="m-1 ml-4 text-xs opacity-80 whitespace-pre-wrap break-words p-2 max-h-40 overflow-auto rounded-xs">
										{content}
									</pre>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
})

/** Build file/search references from completed workspace tools only. */
function buildCompletedWorkspaceTools(messages: DietCodeMessage[]): WorkspaceToolReference[] {
	const result: WorkspaceToolReference[] = []

	for (const msg of messages) {
		// Skip reasoning messages - they should not be in file lists
		if (msg.say === "reasoning") {
			continue
		}

		if (msg.say === "tool" && isLowStakesTool(msg)) {
			const parsedTool = parseToolSafe(msg.text)
			result.push({ tool: msg, parsedTool })
		}
	}

	return result
}

/**
 * Safely parse tool JSON, returning empty tool on failure.
 */
function parseToolSafe(text: string | undefined): DietCodeSayTool {
	try {
		return JSON.parse(text || "{}") as DietCodeSayTool
	} catch {
		return {} as DietCodeSayTool
	}
}

/**
 * Get display info for a tool.
 */
function getToolDisplayInfo(tool: DietCodeSayTool) {
	const icon = getIconByToolName(tool.tool)
	const filePath = tool.path || ""
	const folderPath = `${filePath}/`

	switch (tool.tool) {
		case "readFile":
			return { icon, path: filePath, label: "looked at" }
		case "listFilesTopLevel":
			return { icon, path: folderPath, label: "browsed" }
		case "listFilesRecursive":
			return { icon, path: folderPath, label: "explored" }
		case "listCodeDefinitionNames":
			return { icon, path: folderPath, label: "checked" }
		case "searchFiles":
			return {
				icon,
				path: folderPath,
				label: `search: ${tool.regex}`,
				displayText: formatSearchDisplay(tool.regex || "", filePath, tool.filePattern),
			}
		default:
			return null
	}
}

/**
 * Format search regex for display - simplify complex patterns
 */
function formatSearchDisplay(regex: string, path: string, filePattern?: string): string {
	// Split by | and clean up regex syntax
	const terms = regex
		.split("|")
		.map((t) => t.trim().replace(/\\b/g, "").replace(/\\s\?/g, " "))
		.filter(Boolean)

	const termDisplay = terms.length > 3 ? `${terms.length} patterns` : `"${terms.join(" | ")}"`
	let result = `${termDisplay} in ${cleanPathPrefix(path)}/`

	if (filePattern && filePattern !== "*") {
		result += ` (${filePattern})`
	}

	return result
}

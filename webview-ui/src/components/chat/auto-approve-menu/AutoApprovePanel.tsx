import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import React from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getAsVar, VSC_DESCRIPTION_FOREGROUND } from "@/utils/vscStyles"
import { updateAutoApproveSettings } from "./AutoApproveSettingsAPI"

/** Inline panel inside <details> — single column for narrow sidebars. */
const AutoApprovePanel: React.FC = () => {
	const { autoApprovalSettings } = useExtensionState()

	return (
		<div className="overflow-y-auto pb-2 px-2 overscroll-contain max-h-[40vh]">
			<p className="mb-2 text-muted-foreground text-[11px] m-0 leading-snug">
				LUMI proceeds through tool calls and workspace changes automatically. Use Stop in the chat to interrupt a run.
			</p>

			<div
				style={{
					height: "0.5px",
					background: getAsVar(VSC_DESCRIPTION_FOREGROUND),
					opacity: 0.1,
					margin: "8px 0",
				}}
			/>

			<div className="flex items-center gap-2">
				<VSCodeCheckbox
					checked={autoApprovalSettings.enableNotifications}
					onChange={async (e: unknown) => {
						const target = e as { target: { checked: boolean } }
						const checked = target.target.checked === true
						await updateAutoApproveSettings({
							...autoApprovalSettings,
							version: (autoApprovalSettings.version ?? 1) + 1,
							enableNotifications: checked,
						})
					}}>
					<span className="text-xs">Notify me when something runs automatically</span>
				</VSCodeCheckbox>
			</div>
		</div>
	)
}

export default AutoApprovePanel

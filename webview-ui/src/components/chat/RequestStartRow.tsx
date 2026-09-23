import type { DietCodeMessage } from "@shared/ExtensionMessage"
import type React from "react"
import ErrorRow from "./ErrorRow"

interface RequestStartRowProps {
	message: DietCodeMessage
	apiRequestFailedMessage?: string
	apiReqStreamingFailedMessage?: string
}

/** Keeps routine request starts out of the transcript and shows only errors. */
export const RequestStartRow: React.FC<RequestStartRowProps> = ({
	apiRequestFailedMessage,
	apiReqStreamingFailedMessage,
	message,
}) => {
	if (!apiRequestFailedMessage && !apiReqStreamingFailedMessage) {
		return <div aria-hidden className="h-px" />
	}

	return (
		<ErrorRow
			apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
			apiRequestFailedMessage={apiRequestFailedMessage}
			errorType="error"
			message={message}
		/>
	)
}

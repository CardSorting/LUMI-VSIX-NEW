import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ToolGroupRenderer } from "./ToolGroupRenderer"

describe("ToolGroupRenderer", () => {
	it("shows each active workspace action in the transcript", () => {
		const request: DietCodeMessage = {
			ts: 1,
			type: "say",
			say: "api_req_started",
			text: '{"request":"Inspect the workspace"}',
		}
		const completedRead: DietCodeMessage = {
			ts: 2,
			type: "say",
			say: "tool",
			text: JSON.stringify({ tool: "readFile", path: "src/Boot.tsx" }),
		}
		const activeRead: DietCodeMessage = {
			ts: 3,
			type: "ask",
			ask: "tool",
			text: JSON.stringify({ tool: "readFile", path: "src/App.tsx" }),
		}
		const activeSearch: DietCodeMessage = {
			ts: 4,
			type: "ask",
			ask: "tool",
			text: JSON.stringify({ tool: "searchFiles", path: "src", regex: "AgentActivity" }),
		}

		render(
			<ToolGroupRenderer
				allMessages={[request, completedRead, activeRead, activeSearch]}
				isLastGroup={true}
				messages={[completedRead, activeRead, activeSearch]}
			/>,
		)

		const activity = screen.getByRole("region", { name: "Workspace activity" })
		expect(activity).toHaveTextContent("Completed: src/Boot.tsx")
		expect(activity).toHaveTextContent("Reading file: src/App.tsx…")
		expect(activity).toHaveTextContent('"AgentActivity" in src/')
	})
})

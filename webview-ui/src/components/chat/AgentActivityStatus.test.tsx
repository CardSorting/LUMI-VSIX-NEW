import type { DietCodeMessage } from "@shared/ExtensionMessage"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AgentActivityStatus } from "./AgentActivityStatus"

const task: DietCodeMessage = {
	ts: 1,
	type: "say",
	say: "task",
	text: "Update the workspace",
}

const activityView = (messages: DietCodeMessage[]) => <AgentActivityStatus messages={[task, ...messages]} />

describe("AgentActivityStatus", () => {
	afterEach(() => vi.useRealTimers())

	it("keeps progress visible while response text is streaming", () => {
		const { rerender } = render(
			activityView([{ ts: 2, type: "say", say: "text", text: "The first part of the answer", partial: true }]),
		)

		expect(screen.getByRole("status")).toHaveTextContent("LUMI is writing a response")
		expect(screen.getByLabelText("LUMI activity")).toHaveTextContent("Response text is streaming.")

		rerender(activityView([{ ts: 2, type: "say", say: "text", text: "The complete answer", partial: false }]))
		expect(screen.queryByLabelText("LUMI activity")).not.toBeInTheDocument()
	})

	it("keeps the empty initial state explicit and calls out a delayed first update", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(1_000))
		render(activityView([]))

		expect(screen.getByRole("status")).toHaveTextContent("Waiting for the first agent update")

		act(() => vi.advanceTimersByTime(10_000))
		expect(screen.getByRole("status")).toHaveTextContent("No agent update received yet")
		expect(screen.getByLabelText("LUMI activity")).toHaveTextContent("No response has arrived.")
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
	})

	it("states that an active model request has not returned response text", () => {
		const requestStartedAt = Date.now()
		render(
			activityView([{ ts: requestStartedAt, type: "say", say: "api_req_started", text: '{"request":"GET /completion"}' }]),
		)

		expect(screen.getByRole("status")).toHaveTextContent("Waiting for the model response")
		expect(screen.getByLabelText("LUMI activity")).toHaveTextContent(
			"The request is active. No response text has arrived yet.",
		)
	})

	it("shows checklist progress only from actual reported steps", () => {
		render(
			activityView([
				{
					ts: 2,
					type: "say",
					say: "task_progress",
					text: "- [x] Inspect the workspace\n- [ ] Make the change\n- [ ] Review the result",
				},
			]),
		)

		expect(screen.getByRole("progressbar", { name: "Task checklist progress" })).toHaveAttribute("aria-valuenow", "1")
		expect(screen.getByText("1 of 3 steps complete")).toBeInTheDocument()
		expect(screen.getByText("Next checklist item: Make the change")).toBeInTheDocument()
	})

	it("does not carry a previous turn's checklist into a new follow-up", () => {
		const followUpAt = Date.now()
		render(
			activityView([
				{
					ts: 2,
					type: "say",
					say: "task_progress",
					text: "- [x] Finish the earlier request\n- [x] Send its result",
				},
				{ ts: followUpAt, type: "say", say: "user_feedback", text: "Now update the follow-up" },
			]),
		)

		expect(screen.getByRole("status")).toHaveTextContent("Waiting for the first agent update")
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
	})

	it("keeps the last completed workspace step visible after a follow-up", () => {
		const followUpAt = Date.now()
		render(
			activityView([
				{
					ts: followUpAt - 1_000,
					type: "say",
					say: "tool",
					text: JSON.stringify({ tool: "readFile", path: "src/App.tsx" }),
				},
				{ ts: followUpAt, type: "say", say: "user_feedback", text: "Continue from there" },
			]),
		)

		expect(screen.getByRole("status")).toHaveTextContent("Last completed step: Reading file: src/App.tsx")
		expect(screen.getByLabelText("LUMI activity")).toHaveTextContent("Your follow-up arrived after this workspace step.")
	})

	it("reports an empty final response instead of leaving the activity area blank", () => {
		render(activityView([{ ts: 2, type: "say", say: "text", text: "  ", partial: false }]))

		expect(screen.getByRole("status")).toHaveTextContent("No response received")
		expect(screen.getByLabelText("LUMI activity")).toHaveTextContent("LUMI sent an empty response.")
	})

	it("recognizes a legacy API finish event as a completed request", () => {
		render(
			activityView([
				{ ts: 2, type: "say", say: "api_req_started", text: '{"request":"GET /completion"}' },
				{ ts: 3, type: "say", say: "api_req_finished", text: '{"cost":0.005}' },
			]),
		)

		expect(screen.getByRole("status")).toHaveTextContent("No response received")
		expect(screen.getByLabelText("LUMI activity")).toHaveTextContent("finished without sending visible text")
	})
})

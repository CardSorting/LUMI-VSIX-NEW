import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ChatInputActions } from "./ChatInputActions"

describe("ChatInputActions keyboard ergonomics", () => {
	it("opens the add-context menu from the keyboard", async () => {
		const user = userEvent.setup()
		const onContextClick = vi.fn()
		const onAttachClick = vi.fn()
		const onModelClick = vi.fn()

		render(
			<ChatInputActions
				attachDisabled={false}
				modelDisplayName="provider:model"
				onAttachClick={onAttachClick}
				onContextClick={onContextClick}
				onModelClick={onModelClick}
			/>,
		)

		await user.tab()
		const addContextButton = screen.getByRole("button", { name: "Add context" })
		expect(addContextButton).toHaveFocus()
		await user.keyboard("{Enter}")
		await user.click(screen.getByRole("button", { name: /Mention workspace item/ }))
		expect(onContextClick).toHaveBeenCalledOnce()

		expect(screen.getByRole("button", { name: /Change model/ })).toBeInTheDocument()
	})

	it("exposes disabled attachment semantics", async () => {
		render(
			<ChatInputActions
				attachDisabled
				modelDisplayName="provider:model"
				onAttachClick={() => {}}
				onContextClick={() => {}}
				onModelClick={() => {}}
			/>,
		)

		await userEvent.setup().click(screen.getByRole("button", { name: "Add context" }))
		expect(screen.getByRole("button", { name: "Attach file or image" })).toBeDisabled()
	})

	it("renders voice input button and triggers callback when clicked", async () => {
		const user = userEvent.setup()
		const onVoiceClick = vi.fn()

		render(
			<ChatInputActions
				attachDisabled={false}
				isListening={false}
				isSpeechSupported={true}
				modelDisplayName="provider:model"
				onAttachClick={() => {}}
				onContextClick={() => {}}
				onModelClick={() => {}}
				onVoiceClick={onVoiceClick}
			/>,
		)

		const voiceButton = screen.getByRole("button", { name: "Start voice input" })
		expect(voiceButton).toBeEnabled()
		await user.click(voiceButton)
		expect(onVoiceClick).toHaveBeenCalledOnce()
	})

	it("hides voice input when speech recognition is unsupported", () => {
		render(
			<ChatInputActions
				attachDisabled={false}
				isListening={false}
				isSpeechSupported={false}
				modelDisplayName="provider:model"
				onAttachClick={() => {}}
				onContextClick={() => {}}
				onModelClick={() => {}}
				onVoiceClick={() => {}}
			/>,
		)

		expect(screen.queryByRole("button", { name: "Start voice input" })).not.toBeInTheDocument()
	})
})

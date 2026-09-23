import { ApiConfiguration } from "@shared/api"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ExtensionStateContextProvider, useExtensionState } from "@/context/ExtensionStateContext"
import ApiOptions from "../ApiOptions"

vi.mock("../../../context/ExtensionStateContext", async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...(actual || {}),
		useExtensionState: vi.fn(() => ({
			apiConfiguration: {
				planModeApiProvider: "openai-codex",
				actModeApiProvider: "openai-codex",
			},
			setApiConfiguration: vi.fn(),
			openRouterModels: {},
			planActSeparateModelsSetting: false,
			favoritedModelIds: [],
			refreshOpenRouterModels: vi.fn(),
			navigateToSettingsModelPicker: vi.fn(),
		})),
	}
})

const mockExtensionState = (apiConfiguration: Partial<ApiConfiguration>) => {
	vi.mocked(useExtensionState).mockReturnValue({
		apiConfiguration,
		setApiConfiguration: vi.fn(),
		openRouterModels: {},
		planActSeparateModelsSetting: false,
		favoritedModelIds: [],
		refreshOpenRouterModels: vi.fn(),
		navigateToSettingsModelPicker: vi.fn(),
	} as unknown as ReturnType<typeof useExtensionState>)
}

describe("ApiOptions Component", () => {
	const mockPostMessage = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		//@ts-expect-error - vscode is not defined in the global namespace in test environment
		global.vscode = { postMessage: mockPostMessage }
		mockExtensionState({
			planModeApiProvider: "openai-codex",
			actModeApiProvider: "openai-codex",
		})
	})

	it("shows the Codex subscription provider option", () => {
		render(
			<ExtensionStateContextProvider>
				<ApiOptions currentMode="plan" showModelOptions={true} />
			</ExtensionStateContextProvider>,
		)
		expect(screen.getByText("ChatGPT Subscription")).toBeInTheDocument()
	})

	it("renders the Codex sign in control", () => {
		render(
			<ExtensionStateContextProvider>
				<ApiOptions currentMode="plan" showModelOptions={true} />
			</ExtensionStateContextProvider>,
		)
		expect(screen.getByText("Sign in to OpenAI Codex")).toBeInTheDocument()
	})

	it("renders OpenAI Codex provider when selected", () => {
		mockExtensionState({
			planModeApiProvider: "openai-codex",
			actModeApiProvider: "openai-codex",
		})

		render(
			<ExtensionStateContextProvider>
				<ApiOptions currentMode="plan" showModelOptions={true} />
			</ExtensionStateContextProvider>,
		)

		expect(screen.getByText("Sign in to OpenAI Codex")).toBeInTheDocument()
	})
})

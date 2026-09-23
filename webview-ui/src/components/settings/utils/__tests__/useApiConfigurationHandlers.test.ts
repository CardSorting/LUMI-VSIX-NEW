import { ApiProvider as ProtoApiProvider } from "@shared/proto/dietcode/models"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"
import { useApiConfigurationHandlers } from "../useApiConfigurationHandlers"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		updateApiConfigurationPartial: vi.fn().mockResolvedValue({}),
	},
}))

describe("useApiConfigurationHandlers", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useExtensionState).mockReturnValue({
			planActSeparateModelsSetting: true,
		} as unknown as ReturnType<typeof useExtensionState>)
	})

	it("updates Codex without sending a stale full configuration", async () => {
		const { result } = renderHook(() => useApiConfigurationHandlers())

		await act(() =>
			result.current.handleModeFieldChange(
				{ plan: "planModeApiProvider", act: "actModeApiProvider" },
				"openai-codex",
				"act",
			),
		)

		expect(ModelsServiceClient.updateApiConfigurationPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				updateMask: ["actModeApiProvider"],
				apiConfiguration: expect.objectContaining({
					actModeApiProvider: ProtoApiProvider.OPENAI_CODEX,
					planModeApiProvider: undefined,
				}),
			}),
		)
	})

	it("updates both provider fields atomically when Plan and Act are linked", async () => {
		vi.mocked(useExtensionState).mockReturnValue({
			planActSeparateModelsSetting: false,
		} as unknown as ReturnType<typeof useExtensionState>)
		const { result } = renderHook(() => useApiConfigurationHandlers())

		await act(() =>
			result.current.handleModeFieldChange(
				{ plan: "planModeApiProvider", act: "actModeApiProvider" },
				"openai-codex",
				"act",
			),
		)

		expect(ModelsServiceClient.updateApiConfigurationPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				updateMask: ["planModeApiProvider", "actModeApiProvider"],
				apiConfiguration: expect.objectContaining({
					planModeApiProvider: ProtoApiProvider.OPENAI_CODEX,
					actModeApiProvider: ProtoApiProvider.OPENAI_CODEX,
				}),
			}),
		)
	})
})

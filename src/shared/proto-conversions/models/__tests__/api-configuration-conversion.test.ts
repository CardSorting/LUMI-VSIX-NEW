import { ModelsApiConfiguration, ApiProvider as ProtoApiProvider } from "@shared/proto/dietcode/models"
import { expect } from "chai"
import { describe, it } from "mocha"
import { convertApiConfigurationToProto, convertProtoToApiConfiguration } from "../api-configuration-conversion"

describe("API configuration protobuf conversion", () => {
	it("uses ChatGPT Subscription (Codex) as the sole API provider", () => {
		const proto = convertApiConfigurationToProto({
			planModeApiProvider: "openai-codex",
			actModeApiProvider: "openai-codex",
			planModeApiModelId: "gpt-5.4",
			actModeApiModelId: "gpt-5.4",
		})

		expect(proto.planModeApiProvider).to.equal(ProtoApiProvider.OPENAI_CODEX)
		expect(proto.actModeApiProvider).to.equal(ProtoApiProvider.OPENAI_CODEX)

		const wireRoundTrip = ModelsApiConfiguration.fromJSON(ModelsApiConfiguration.toJSON(proto))
		const restored = convertProtoToApiConfiguration(wireRoundTrip)

		expect(restored.planModeApiProvider).to.equal("openai-codex")
		expect(restored.actModeApiProvider).to.equal("openai-codex")
		expect(restored.planModeApiModelId).to.equal("gpt-5.4")
		expect(restored.actModeApiModelId).to.equal("gpt-5.4")
	})
})

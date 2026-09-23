import { describe, expect, it } from "vitest"
import { getMatchingSlashCommands, slashCommandRegex, validateSlashCommand } from "../slash-commands"

describe("slash-commands", () => {
	describe("slashCommandRegex with MCP format", () => {
		it("should match MCP command format with colons", () => {
			const text = "/mcp:server:prompt"
			const match = text.match(slashCommandRegex)
			expect(match).not.toBeNull()
			expect(match?.[2]).toBe("/mcp:server:prompt")
		})

		it("should match MCP command in middle of text", () => {
			const text = "Please run /mcp:server:prompt now"
			const match = text.match(slashCommandRegex)
			expect(match).not.toBeNull()
			expect(match?.[2]).toBe("/mcp:server:prompt")
		})

		it("should not match MCP-like pattern in URL", () => {
			const text = "http://example.com/mcp:test"
			const match = text.match(slashCommandRegex)
			// Should not match because / is not preceded by whitespace or start
			expect(match).toBeNull()
		})
	})
})

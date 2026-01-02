/**
 * Tests for batch tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderBatchTool } from "./batch"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderBatchTool", () => {
  describe("basic rendering", () => {
    test("renders batch tool with tool calls", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: { command: "ls" } },
              { tool: "read", parameters: { filePath: "/file.txt" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="tool-call tool-batch"')
      expect(html).toContain("Batch (2 calls)")
      expect(html).toContain("bash")
      expect(html).toContain("read")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows batch icon", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="tool-icon">&#128230;</span>')
    })
  })

  describe("tool call summary", () => {
    test("shows count summary", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: { command: "ls" } },
              { tool: "bash", parameters: { command: "pwd" } },
              { tool: "read", parameters: { filePath: "/file.txt" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-summary"')
      expect(html).toContain("2 bash")
      expect(html).toContain("1 read")
    })

    test("handles multiple tool types", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "read", parameters: {} },
              { tool: "write", parameters: {} },
              { tool: "edit", parameters: {} },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain("1 read, 1 write, 1 edit")
    })

    test("escapes HTML in summary", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "<script>", parameters: {} },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("nested tool list", () => {
    test("renders list of tool calls", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: { command: "npm install", description: "Install deps" } },
              { tool: "read", parameters: { filePath: "/package.json" } },
              { tool: "write", parameters: { filePath: "/output.txt", content: "test" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-tool-list"')
      expect(html).toContain('class="batch-tool-item"')
      expect(html).toContain('class="batch-tool-index">1</span>')
      expect(html).toContain('class="batch-tool-index">2</span>')
      expect(html).toContain('class="batch-tool-index">3</span>')
    })

    test("shows tool names", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: {} },
              { tool: "glob", parameters: {} },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-tool-name">bash</span>')
      expect(html).toContain('class="batch-tool-name">glob</span>')
    })

    test("shows tool info for bash", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: { command: "ls -la" } },
              { tool: "bash", parameters: { description: "Run tests" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-tool-info">ls -la</span>')
      expect(html).toContain('class="batch-tool-info">Run tests</span>')
    })

    test("shows tool info for file operations", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "read", parameters: { filePath: "/src/index.ts" } },
              { tool: "write", parameters: { filePath: "/output.txt" } },
              { tool: "edit", parameters: { filePath: "/config.json" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain("/src/index.ts")
      expect(html).toContain("/output.txt")
      expect(html).toContain("/config.json")
    })

    test("shows tool info for search operations", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "glob", parameters: { pattern: "**/*.ts" } },
              { tool: "grep", parameters: { pattern: "function.*test" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain("**/*.ts")
      expect(html).toContain("function.*test")
    })

    test("shows tool info for webfetch", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "webfetch", parameters: { url: "https://example.com" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain("https://example.com")
    })

    test("escapes HTML in tool info", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: { command: "<script>alert(1)</script>" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("shows message when no tool calls", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-empty"')
      expect(html).toContain("No tool calls")
    })
  })

  describe("combined output", () => {
    test("shows combined output in collapsible section", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "bash", parameters: { command: "ls" } },
            ],
          },
          output: "file1.txt\nfile2.txt\nfile3.txt",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-output"')
      expect(html).toContain("<details")
      expect(html).toContain("<summary")
      expect(html).toContain("3 lines")
    })

    test("keeps short output open by default", () => {
      const shortOutput = "line1\nline2\nline3"
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [{ tool: "bash", parameters: {} }],
          },
          output: shortOutput,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      // Short output should be open
      expect(html).toMatch(/<details[^>]*open/)
    })

    test("keeps long output closed by default", () => {
      const longOutput = Array(40).fill("line").join("\n")
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [{ tool: "bash", parameters: {} }],
          },
          output: longOutput,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      // Long output should not have open attribute
      expect(html).toContain("<details >")
      expect(html).not.toContain("<details open>")
    })

    test("escapes HTML in output", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [{ tool: "bash", parameters: {} }],
          },
          output: "<script>alert('xss')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits output section when no output", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [{ tool: "bash", parameters: {} }],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).not.toContain('class="batch-output"')
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "error",
          input: {
            tool_calls: [{ tool: "bash", parameters: {} }],
          },
          error: "Batch execution failed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="batch-error"')
      expect(html).toContain("Batch execution failed")
      expect(html).toContain("&#9888;")
    })

    test("escapes HTML in error", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "error",
          input: {
            tool_calls: [],
          },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).not.toContain('class="batch-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain('class="tool-call tool-batch"')
      expect(html).toContain("Batch (0 calls)")
    })

    test("handles unknown tool type gracefully", () => {
      const part = createToolPart({
        tool: "batch",
        state: {
          status: "completed",
          input: {
            tool_calls: [
              { tool: "unknown-tool", parameters: { foo: "bar" } },
            ],
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBatchTool(part)

      expect(html).toContain("unknown-tool")
      // Should use default icon
      expect(html).toContain("&#128295;")
    })
  })
})

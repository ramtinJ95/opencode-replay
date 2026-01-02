/**
 * Tests for bash tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderBashTool } from "./bash"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderBashTool", () => {
  describe("basic rendering", () => {
    test("renders bash tool with command", () => {
      const part = createToolPart({
        tool: "bash",
        state: {
          status: "completed",
          input: { command: "ls -la" },
          output: "total 0",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="tool-call tool-bash"')
      expect(html).toContain("ls -la")
      expect(html).toContain("total 0")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "echo hello" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows command in header", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "npm install" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="bash-command"')
      expect(html).toContain("npm install")
    })

    test("escapes HTML in command", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "echo '<script>alert(1)</script>'" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("description handling", () => {
    test("shows description when provided in input", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: {
            command: "bun test",
            description: "Run all tests",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="bash-description"')
      expect(html).toContain("Run all tests")
    })

    test("falls back to state.title when no description in input", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          title: "Install dependencies",
          input: { command: "npm install" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain("Install dependencies")
    })

    test("omits description when not provided", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain('class="bash-description"')
    })

    test("escapes HTML in description", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: {
            command: "ls",
            description: "<b>List files</b>",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain("&lt;b&gt;List files&lt;/b&gt;")
    })
  })

  describe("workdir handling", () => {
    test("shows working directory when provided", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: {
            command: "ls",
            workdir: "/home/user/project",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="bash-workdir"')
      expect(html).toContain("/home/user/project")
      expect(html).toContain('title="Working directory"')
    })

    test("omits workdir when not provided", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain('class="bash-workdir"')
    })

    test("escapes HTML in workdir", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: {
            command: "ls",
            workdir: "/path/<script>",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("output handling", () => {
    test("renders output in pre/code block", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "echo hello" },
          output: "hello\nworld",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="bash-output"')
      expect(html).toContain("<pre><code>")
      expect(html).toContain("hello\nworld")
    })

    test("escapes HTML in output", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "cat file.html" },
          output: "<html><body>Test</body></html>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain("<html><body>")
      expect(html).toContain("&lt;html&gt;")
    })

    test("omits output section when no output", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain('class="bash-output"')
    })

    test("marks long output as collapsed", () => {
      const longOutput = Array(25).fill("line").join("\n")
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "cat file.txt" },
          output: longOutput,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">+</span>')
    })

    test("does not collapse short output", () => {
      const shortOutput = Array(10).fill("line").join("\n")
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          output: shortOutput,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">-</span>')
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        state: {
          status: "error",
          input: { command: "invalid-command" },
          error: "Command not found",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="bash-error"')
      expect(html).toContain("Command not found")
    })

    test("escapes HTML in error", () => {
      const part = createToolPart({
        state: {
          status: "error",
          input: { command: "ls" },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          output: "file.txt",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).not.toContain('class="bash-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })

    test("includes bash icon", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "ls" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="tool-icon">$</span>')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="tool-call tool-bash"')
      expect(html).toContain('class="bash-command">') // Empty command
    })

    test("handles empty command string", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: { command: "" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain('class="bash-command"></span>')
    })

    test("handles multiline command", () => {
      const part = createToolPart({
        state: {
          status: "completed",
          input: {
            command: "npm install && \\\nnpm test && \\\nnpm build",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderBashTool(part)

      expect(html).toContain("npm install")
      expect(html).toContain("npm test")
      expect(html).toContain("npm build")
    })
  })
})

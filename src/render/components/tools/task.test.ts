/**
 * Task tool renderer tests
 * Tests agent badges, prompt/result sections, and collapsing behavior
 */

import { describe, test, expect } from "bun:test"
import { renderTaskTool } from "./task"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderTaskTool", () => {
  describe("basic rendering", () => {
    test("renders with tool-task class", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test task",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="tool-call tool-task"')
    })

    test("renders with correct data-status attribute", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test task",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("renders agent icon", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test task",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      // Agent icon: 👥 (&#128101;)
      expect(html).toContain("&#128101;")
    })

    test("renders description in header", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Explore codebase",
            prompt: "Find all tests",
            subagent_type: "explore",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("Explore codebase")
    })

    test("uses title as fallback for description", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          title: "Fallback Title",
          input: {
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("Fallback Title")
    })

    test("uses 'Task' as default when no description or title", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="task-description">Task</span>')
    })

    test("renders toggle button", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="tool-toggle"')
    })
  })

  describe("agent badges", () => {
    test("renders general agent badge with blue colors", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "General task",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="task-agent-badge"')
      expect(html).toContain("color: #1565c0")
      expect(html).toContain("background: #e3f2fd")
      expect(html).toContain("General")
    })

    test("renders explore agent badge with purple colors", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Explore task",
            prompt: "Find files",
            subagent_type: "explore",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("color: #6a1b9a")
      expect(html).toContain("background: #f3e5f5")
      expect(html).toContain("Explore")
    })

    test("renders reviewer agent badge with red colors", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Review code",
            prompt: "Check code quality",
            subagent_type: "reviewer",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("color: #c62828")
      expect(html).toContain("background: #ffebee")
      expect(html).toContain("Reviewer")
    })

    test("renders docs agent badge with green colors", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Fetch docs",
            prompt: "Get API docs",
            subagent_type: "docs",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("color: #2e7d32")
      expect(html).toContain("background: #e8f5e9")
      expect(html).toContain("Docs")
    })

    test("renders unknown agent type with gray fallback", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Custom task",
            prompt: "Do custom thing",
            subagent_type: "custom-agent",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("color: #757575")
      expect(html).toContain("background: #f5f5f5")
      expect(html).toContain("custom-agent")
    })

    test("defaults to general agent type when missing", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Task",
            prompt: "Do something",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("General")
      expect(html).toContain("color: #1565c0")
    })
  })

  describe("command section", () => {
    test("renders command when provided", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Run command",
            prompt: "Execute test",
            subagent_type: "general",
            command: "/check-file src/index.ts",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="task-command"')
      expect(html).toContain("Command:")
      expect(html).toContain("/check-file src/index.ts")
    })

    test("does not render command section when not provided", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "No command",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain('class="task-command"')
    })

    test("escapes HTML in command", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Test",
            subagent_type: "general",
            command: "/test <script>alert('xss')</script>",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("prompt section", () => {
    test("renders prompt with line count", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Find all files",
            subagent_type: "explore",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="task-prompt"')
      expect(html).toContain("Prompt (1 lines)")
      expect(html).toContain("Find all files")
    })

    test("short prompt is open by default", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Line 1\nLine 2\nLine 3",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("<details open>")
      expect(html).toContain("Prompt (3 lines)")
    })

    test("long prompt (>5 lines) is collapsed by default", () => {
      const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n")
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: lines,
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      // Should have <details> without open attribute for prompt
      expect(html).toContain('class="task-prompt"')
      expect(html).toContain("Prompt (10 lines)")
      // Check that prompt details is NOT open (doesn't have "open" before next summary)
      const promptMatch = html.match(/<div class="task-prompt">\s*<details\s*>/)
      expect(promptMatch).toBeTruthy()
    })

    test("does not render prompt section when empty", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain('class="task-prompt"')
    })

    test("escapes HTML in prompt", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "<script>alert('xss')</script>",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("result section", () => {
    test("renders result with line count", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Do something",
            subagent_type: "general",
          },
          output: "Task completed successfully",
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="task-result"')
      expect(html).toContain("Result (1 lines)")
      expect(html).toContain("Task completed successfully")
    })

    test("result is always open by default", () => {
      const lines = Array.from({ length: 50 }, (_, i) => `Result line ${i + 1}`).join("\n")
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Do something",
            subagent_type: "general",
          },
          output: lines,
        },
      })

      const html = renderTaskTool(part)

      // Result should be open even for long content
      expect(html).toContain('class="task-result"')
      expect(html).toContain("Result (50 lines)")
      // Check that result details has "open" attribute
      const resultMatch = html.match(/<div class="task-result">\s*<details open>/)
      expect(resultMatch).toBeTruthy()
    })

    test("does not render result section when empty", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Do something",
            subagent_type: "general",
          },
          output: "",
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain('class="task-result"')
    })

    test("escapes HTML in result", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Do something",
            subagent_type: "general",
          },
          output: "<script>alert('xss')</script>",
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("error handling", () => {
    test("renders error section when error present", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "error",
          input: {
            description: "Failed task",
            prompt: "Do something",
            subagent_type: "general",
          },
          error: "Agent failed to complete task",
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="task-error"')
      expect(html).toContain("Agent failed to complete task")
      expect(html).toContain('class="error-icon"')
      // Warning icon: ⚠ (&#9888;)
      expect(html).toContain("&#9888;")
    })

    test("does not render error section when no error", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Successful task",
            prompt: "Do something",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain('class="task-error"')
    })

    test("escapes HTML in error message", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "error",
          input: {
            description: "Test",
            prompt: "Do something",
            subagent_type: "general",
          },
          error: "<script>alert('xss')</script>",
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("HTML escaping", () => {
    test("escapes HTML in description", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "<img src=x onerror=alert('xss')>",
            prompt: "Test",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<img src=x")
      expect(html).toContain("&lt;img")
    })

    test("escapes HTML in unknown agent type", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Test",
            prompt: "Test",
            subagent_type: "<script>bad</script>",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<script>bad")
      expect(html).toContain("&lt;script&gt;")
    })

    test("escapes status attribute", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: '"><script>alert(1)</script><div class="' as any,
          input: {
            description: "Test",
            prompt: "Test",
            subagent_type: "general",
          },
        },
      })

      const html = renderTaskTool(part)

      expect(html).not.toContain("<script>alert(1)")
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="tool-call tool-task"')
      expect(html).toContain("Task") // Default description
      expect(html).toContain("General") // Default agent type
    })

    test("handles undefined state properties", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "pending",
          input: undefined,
          output: undefined,
          error: undefined,
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain('class="tool-call tool-task"')
      expect(html).toContain('data-status="pending"')
    })

    test("handles multiline prompt and result", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Multi-line test",
            prompt: "Line 1\nLine 2\nLine 3",
            subagent_type: "general",
          },
          output: "Result 1\nResult 2\nResult 3\nResult 4",
        },
      })

      const html = renderTaskTool(part)

      expect(html).toContain("Prompt (3 lines)")
      expect(html).toContain("Result (4 lines)")
    })

    test("handles session_id in input", () => {
      const part = createToolPart({
        tool: "task",
        state: {
          status: "completed",
          input: {
            description: "Continue session",
            prompt: "Continue work",
            subagent_type: "general",
            session_id: "ses_abc123",
          },
        },
      })

      const html = renderTaskTool(part)

      // session_id shouldn't affect rendering, just ensure no errors
      expect(html).toContain('class="tool-call tool-task"')
      expect(html).toContain("Continue session")
    })
  })
})

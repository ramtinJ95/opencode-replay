/**
 * TodoWrite tool renderer tests
 * Tests status icons, priority badges, and status counts
 */

import { describe, test, expect } from "bun:test"
import { renderTodoWriteTool } from "./todowrite"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderTodoWriteTool", () => {
  describe("basic rendering", () => {
    test("renders with tool-todowrite class", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "First task", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="tool-call tool-todowrite"')
    })

    test("renders with correct data-status attribute", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("renders clipboard icon", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // Clipboard icon: 📋 (&#128203;)
      expect(html).toContain("&#128203;")
    })

    test("renders tool name", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="tool-name">Todo List</span>')
    })

    test("renders toggle button", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="tool-toggle"')
    })
  })

  describe("todo list rendering", () => {
    test("renders todo items in a list", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "First task", status: "pending", priority: "medium" },
              { id: "2", content: "Second task", status: "completed", priority: "high" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-list"')
      expect(html).toContain("First task")
      expect(html).toContain("Second task")
    })

    test("renders empty message when no todos", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-empty"')
      expect(html).toContain("No todos")
    })

    test("renders todo item with status class", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "In progress task", status: "in_progress", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-item todo-in_progress"')
    })
  })

  describe("status icons", () => {
    test("renders checkmark for completed status", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Done task", status: "completed", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // Checkmark: ✓ (&#10003;)
      expect(html).toContain("&#10003;")
    })

    test("renders arrow for in_progress status", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Working task", status: "in_progress", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // Right arrow: → (&#8594;)
      expect(html).toContain("&#8594;")
    })

    test("renders circle for pending status", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Waiting task", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // Circle: ○ (&#9675;)
      expect(html).toContain("&#9675;")
    })

    test("renders x mark for cancelled status", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Cancelled task", status: "cancelled", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // X mark: ✗ (&#10007;)
      expect(html).toContain("&#10007;")
    })

    test("renders circle for unknown status", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Unknown task", status: "unknown" as any, priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // Default circle: ○ (&#9675;)
      expect(html).toContain("&#9675;")
    })
  })

  describe("priority badges", () => {
    test("renders high priority badge", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Urgent task", status: "pending", priority: "high" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-priority priority-high"')
      expect(html).toContain(">high</span>")
    })

    test("renders medium priority badge", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Normal task", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-priority priority-medium"')
      expect(html).toContain(">medium</span>")
    })

    test("does not render badge for low priority", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Low priority task", status: "pending", priority: "low" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain('class="todo-priority')
      expect(html).not.toContain("priority-low")
    })
  })

  describe("status counts", () => {
    test("renders X/Y done summary", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Done 1", status: "completed", priority: "medium" },
              { id: "2", content: "Done 2", status: "completed", priority: "medium" },
              { id: "3", content: "Pending", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain("2/3 done")
    })

    test("renders 0/N done when nothing completed", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Task 1", status: "pending", priority: "medium" },
              { id: "2", content: "Task 2", status: "in_progress", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain("0/2 done")
    })

    test("renders in progress count when present", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Working 1", status: "in_progress", priority: "medium" },
              { id: "2", content: "Working 2", status: "in_progress", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-stat-progress"')
      expect(html).toContain("2 in progress")
    })

    test("does not render in progress count when zero", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Task", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain("in progress")
    })

    test("renders pending count when present", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Pending 1", status: "pending", priority: "medium" },
              { id: "2", content: "Pending 2", status: "pending", priority: "medium" },
              { id: "3", content: "Pending 3", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-stat-pending"')
      expect(html).toContain("3 pending")
    })

    test("does not render pending count when zero", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Task", status: "completed", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain("pending")
    })

    test("renders cancelled count when present", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Cancelled 1", status: "cancelled", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-stat-cancelled"')
      expect(html).toContain("1 cancelled")
    })

    test("does not render cancelled count when zero", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Task", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain("cancelled")
    })

    test("renders all counts together", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Done", status: "completed", priority: "medium" },
              { id: "2", content: "Working", status: "in_progress", priority: "medium" },
              { id: "3", content: "Waiting", status: "pending", priority: "medium" },
              { id: "4", content: "Dropped", status: "cancelled", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain("1/4 done")
      expect(html).toContain("1 in progress")
      expect(html).toContain("1 pending")
      expect(html).toContain("1 cancelled")
    })
  })

  describe("error handling", () => {
    test("renders error section when error present", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "error",
          input: {
            todos: [],
          },
          error: "Failed to update todo list",
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-error"')
      expect(html).toContain("Failed to update todo list")
      expect(html).toContain('class="error-icon"')
      // Warning icon: ⚠ (&#9888;)
      expect(html).toContain("&#9888;")
    })

    test("does not render error section when no error", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain('class="todo-error"')
    })

    test("escapes HTML in error message", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "error",
          input: {
            todos: [],
          },
          error: "<script>alert('xss')</script>",
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("HTML escaping", () => {
    test("escapes HTML in todo content", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "<script>alert('xss')</script>", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("escapes status attribute", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: '"><script>alert(1)</script>' as any,
          input: {
            todos: [],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).not.toContain("<script>alert(1)")
    })

    test("escapes special characters in content", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "Task with <tag> & 'quotes' and \"double\"", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain("&lt;tag&gt;")
      expect(html).toContain("&amp;")
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="tool-call tool-todowrite"')
      expect(html).toContain("0/0 done")
      expect(html).toContain("No todos")
    })

    test("handles undefined todos array", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {},
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain("0/0 done")
      expect(html).toContain("No todos")
    })

    test("handles large todo lists", () => {
      const todos = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        content: `Task ${i + 1}`,
        status: i % 4 === 0 ? "completed" : i % 4 === 1 ? "in_progress" : i % 4 === 2 ? "pending" : "cancelled",
        priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
      }))

      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: { todos },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-list"')
      expect(html).toContain("25/100 done") // Every 4th is completed
    })

    test("handles todos with same id", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "First", status: "pending", priority: "medium" },
              { id: "1", content: "Duplicate ID", status: "completed", priority: "high" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      // Should render both even with duplicate IDs
      expect(html).toContain("First")
      expect(html).toContain("Duplicate ID")
    })

    test("handles empty content string", () => {
      const part = createToolPart({
        tool: "todowrite",
        state: {
          status: "completed",
          input: {
            todos: [
              { id: "1", content: "", status: "pending", priority: "medium" },
            ],
          },
        },
      })

      const html = renderTodoWriteTool(part)

      expect(html).toContain('class="todo-item')
      expect(html).toContain('class="todo-content"')
    })
  })
})

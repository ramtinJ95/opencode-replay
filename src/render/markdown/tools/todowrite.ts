/**
 * TodoWrite tool markdown renderer
 * Renders todo list updates
 */

import type { ToolPart } from "../../../storage/types"

interface TodoItem {
  id: string
  content: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "high" | "medium" | "low"
}

interface TodoWriteToolInput {
  todos: TodoItem[]
}

/**
 * Render a todowrite tool call as markdown
 */
export function renderTodoWriteToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as TodoWriteToolInput | undefined
  const todos = input?.todos || []
  const error = state.error

  const lines: string[] = []

  // Count by status
  const completed = todos.filter(t => t.status === "completed").length
  const inProgress = todos.filter(t => t.status === "in_progress").length
  const pending = todos.filter(t => t.status === "pending").length
  const cancelled = todos.filter(t => t.status === "cancelled").length

  // Header
  lines.push(`**Todo List:** ${completed}/${todos.length} done`)
  if (inProgress > 0 || pending > 0 || cancelled > 0) {
    const stats = []
    if (inProgress > 0) stats.push(`${inProgress} in progress`)
    if (pending > 0) stats.push(`${pending} pending`)
    if (cancelled > 0) stats.push(`${cancelled} cancelled`)
    lines.push(`*(${stats.join(", ")})*`)
  }
  lines.push("")

  // Todo items
  if (todos.length > 0) {
    for (const todo of todos) {
      const checkbox = getStatusCheckbox(todo.status)
      const priorityBadge = todo.priority === "high" ? " **[HIGH]**" : todo.priority === "medium" ? " *[MEDIUM]*" : ""
      lines.push(`- ${checkbox} ${todo.content}${priorityBadge}`)
    }
    lines.push("")
  } else {
    lines.push("*No todos*")
    lines.push("")
  }

  // Error
  if (error) {
    lines.push(`> **Error:** ${error}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Get checkbox representation for status
 */
function getStatusCheckbox(status: string): string {
  switch (status) {
    case "completed":
      return "[x]"
    case "in_progress":
      return "[-]"
    case "pending":
      return "[ ]"
    case "cancelled":
      return "[~]"
    default:
      return "[ ]"
  }
}

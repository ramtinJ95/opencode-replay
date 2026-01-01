/**
 * TodoWrite tool renderer
 * Renders todo list updates with status icons and priority indicators
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

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
 * Render a todowrite tool call with checklist
 */
export function renderTodoWriteTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as TodoWriteToolInput | undefined
  const todos = input?.todos || []
  const error = state.error
  const status = state.status

  // Count by status
  const completed = todos.filter(t => t.status === "completed").length
  const inProgress = todos.filter(t => t.status === "in_progress").length
  const pending = todos.filter(t => t.status === "pending").length
  const cancelled = todos.filter(t => t.status === "cancelled").length

  // Format summary
  const summary = `${completed}/${todos.length} done`

  // Format todo list
  const todoListHtml = todos.length > 0
    ? `<ul class="todo-list">
        ${todos.map(todo => renderTodoItem(todo)).join("\n")}
      </ul>`
    : `<div class="todo-empty">No todos</div>`

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="todo-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-todowrite" data-status="${status}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128203;</span>
    <span class="tool-name">Todo List</span>
    <span class="todo-summary">${escapeHtml(summary)}</span>
    <span class="todo-stats">
      ${inProgress > 0 ? `<span class="todo-stat-progress">${inProgress} in progress</span>` : ""}
      ${pending > 0 ? `<span class="todo-stat-pending">${pending} pending</span>` : ""}
      ${cancelled > 0 ? `<span class="todo-stat-cancelled">${cancelled} cancelled</span>` : ""}
    </span>
    <span class="tool-toggle">-</span>
  </div>
  <div class="tool-body">
    ${todoListHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Render a single todo item
 */
function renderTodoItem(todo: TodoItem): string {
  const statusIcon = getStatusIcon(todo.status)
  const priorityBadge = getPriorityBadge(todo.priority)

  return `<li class="todo-item todo-${todo.status}">
    <span class="todo-status">${statusIcon}</span>
    <span class="todo-content">${escapeHtml(todo.content)}</span>
    ${priorityBadge}
  </li>`
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "&#10003;" // checkmark
    case "in_progress":
      return "&#8594;" // right arrow
    case "pending":
      return "&#9675;" // circle
    case "cancelled":
      return "&#10007;" // x mark
    default:
      return "&#9675;"
  }
}

/**
 * Get priority badge
 */
function getPriorityBadge(priority: string): string {
  if (priority === "high") {
    return `<span class="todo-priority priority-high">high</span>`
  }
  if (priority === "medium") {
    return `<span class="todo-priority priority-medium">medium</span>`
  }
  // Don't show badge for low priority
  return ""
}

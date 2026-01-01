/**
 * Batch tool renderer
 * Renders batch tool calls that contain multiple nested tool invocations
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface BatchToolCall {
  tool: string
  parameters: Record<string, unknown>
}

interface BatchToolInput {
  tool_calls: BatchToolCall[]
}

/**
 * Render a batch tool call with nested tool summaries
 */
export function renderBatchTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as BatchToolInput | undefined
  const toolCalls = input?.tool_calls || []
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Count tools by type
  const toolCounts = new Map<string, number>()
  for (const call of toolCalls) {
    const count = toolCounts.get(call.tool) || 0
    toolCounts.set(call.tool, count + 1)
  }

  // Format tool count summary
  const toolSummary = Array.from(toolCounts.entries())
    .map(([tool, count]) => `${count} ${tool}`)
    .join(", ")

  // Format nested tool list
  const toolListHtml = toolCalls.length > 0
    ? `<ul class="batch-tool-list">
        ${toolCalls.map((call, i) => renderNestedTool(call, i)).join("\n")}
      </ul>`
    : `<div class="batch-empty">No tool calls</div>`

  // Format output section (combined results from all calls)
  let outputHtml = ""
  if (output) {
    const outputLines = output.split("\n").length
    const isLongOutput = outputLines > 30
    outputHtml = `<div class="batch-output">
      <details ${isLongOutput ? "" : "open"}>
        <summary class="batch-output-label">Combined Output (${outputLines} lines)</summary>
        <pre><code>${escapeHtml(output)}</code></pre>
      </details>
    </div>`
  }

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="batch-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-batch" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128230;</span>
    <span class="batch-title">Batch (${toolCalls.length} calls)</span>
    <span class="batch-summary">${escapeHtml(toolSummary)}</span>
    <span class="tool-toggle">-</span>
  </div>
  <div class="tool-body">
    ${toolListHtml}
    ${outputHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Render a summary of a nested tool call
 */
function renderNestedTool(call: BatchToolCall, index: number): string {
  const toolIcon = getToolIcon(call.tool)
  
  // Extract key info from parameters based on tool type
  const info = getToolInfo(call.tool, call.parameters)

  return `<li class="batch-tool-item">
    <span class="batch-tool-index">${index + 1}</span>
    <span class="batch-tool-icon">${toolIcon}</span>
    <span class="batch-tool-name">${escapeHtml(call.tool)}</span>
    <span class="batch-tool-info">${escapeHtml(info)}</span>
  </li>`
}

/**
 * Get an icon for a tool
 */
function getToolIcon(tool: string): string {
  const icons: Record<string, string> = {
    bash: "$",
    read: "&#128196;",
    write: "&#128221;",
    edit: "&#9998;",
    glob: "&#128269;",
    grep: "&#128270;",
    task: "&#128101;",
    todowrite: "&#128203;",
    webfetch: "&#127760;",
  }
  return icons[tool] || "&#128295;"
}

/**
 * Extract key info from tool parameters for display
 */
function getToolInfo(tool: string, params: Record<string, unknown>): string {
  switch (tool) {
    case "bash":
      return String(params.command || params.description || "")
    case "read":
    case "write":
    case "edit":
      return String(params.filePath || "")
    case "glob":
      return String(params.pattern || "")
    case "grep":
      return String(params.pattern || "")
    case "webfetch":
      return String(params.url || "")
    default:
      return ""
  }
}

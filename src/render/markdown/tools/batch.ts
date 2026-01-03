/**
 * Batch tool markdown renderer
 * Renders batch tool calls with multiple nested tool invocations
 */

import type { ToolPart } from "../../../storage/types"

interface BatchToolCall {
  tool: string
  parameters: Record<string, unknown>
}

interface BatchToolInput {
  tool_calls: BatchToolCall[]
}

/**
 * Render a batch tool call as markdown
 */
export function renderBatchToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as BatchToolInput | undefined
  const toolCalls = input?.tool_calls || []
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

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

  // Header
  lines.push(`**Batch:** ${toolCalls.length} calls (${toolSummary})`)
  lines.push("")

  // Nested tool list
  if (toolCalls.length > 0) {
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i]!
      const info = getToolInfo(call.tool, call.parameters)
      lines.push(`${i + 1}. **${call.tool}**: ${info}`)
    }
    lines.push("")
  }

  // Combined output (collapsible if long)
  if (output) {
    const outputLines = output.split("\n").length
    if (outputLines > 30) {
      lines.push("<details>")
      lines.push(`<summary>Combined Output (${outputLines} lines)</summary>`)
      lines.push("")
      lines.push("```")
      lines.push(output)
      lines.push("```")
      lines.push("")
      lines.push("</details>")
    } else {
      lines.push("```")
      lines.push(output)
      lines.push("```")
    }
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
 * Extract key info from tool parameters for display
 */
function getToolInfo(tool: string, params: Record<string, unknown>): string {
  switch (tool) {
    case "bash":
      return `\`${String(params.command || params.description || "")}\``
    case "read":
    case "write":
    case "edit":
      return `\`${String(params.filePath || "")}\``
    case "glob":
    case "grep":
      return `\`${String(params.pattern || "")}\``
    case "webfetch":
      return String(params.url || "")
    case "task":
      return String(params.description || "")
    default:
      return ""
  }
}

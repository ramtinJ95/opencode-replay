/**
 * Write tool markdown renderer
 * Renders file write operations
 */

import type { ToolPart } from "../../../storage/types"
import { formatBytes } from "../../../utils/format"

interface WriteToolInput {
  filePath: string
  content: string
}

/**
 * Render a write tool call as markdown
 */
export function renderWriteToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as WriteToolInput | undefined
  const filePath = input?.filePath || state.title || "Unknown file"
  const content = input?.content || ""
  const error = state.error
  const status = state.status

  const lines: string[] = []

  // Count lines and size
  const lineCount = content ? content.split("\n").length : 0
  const sizeText = formatBytes(content.length)

  // Status badge
  const statusText = status === "completed" ? "Created" : status === "error" ? "Failed" : "Writing..."

  // Header
  lines.push(`**Write:** \`${filePath}\` - ${statusText} (${lineCount} lines, ${sizeText})`)
  lines.push("")

  // Content preview (collapsible if long)
  if (content) {
    if (lineCount > 30) {
      lines.push("<details>")
      lines.push(`<summary>Content (${lineCount} lines)</summary>`)
      lines.push("")
      lines.push("```")
      lines.push(content)
      lines.push("```")
      lines.push("")
      lines.push("</details>")
    } else {
      lines.push("```")
      lines.push(content)
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

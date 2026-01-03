/**
 * Read tool markdown renderer
 * Renders file read operations
 */

import type { ToolPart } from "../../../storage/types"

interface ReadToolInput {
  filePath: string
  offset?: number
  limit?: number
}

/**
 * Render a read tool call as markdown
 */
export function renderReadToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as ReadToolInput | undefined
  const filePath = input?.filePath || state.title || "Unknown file"
  const offset = input?.offset
  const limit = input?.limit
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

  // Format range info
  let rangeInfo = ""
  if (offset !== undefined || limit !== undefined) {
    const parts = []
    if (offset !== undefined) parts.push(`from line ${offset}`)
    if (limit !== undefined) parts.push(`${limit} lines`)
    rangeInfo = ` (${parts.join(", ")})`
  }

  // Header
  lines.push(`**Read:** \`${filePath}\`${rangeInfo}`)
  lines.push("")

  // Content (collapsible if long)
  if (output) {
    const contentLines = output.split("\n").length
    if (contentLines > 30) {
      lines.push("<details>")
      lines.push(`<summary>Content (${contentLines} lines)</summary>`)
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

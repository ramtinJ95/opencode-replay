/**
 * Edit tool markdown renderer
 * Renders file edit operations with diff view
 */

import type { ToolPart } from "../../../storage/types"

interface EditToolInput {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

/**
 * Render an edit tool call as markdown
 */
export function renderEditToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as EditToolInput | undefined
  const filePath = input?.filePath || state.title || "Unknown file"
  const oldString = input?.oldString || ""
  const newString = input?.newString || ""
  const replaceAll = input?.replaceAll || false
  const error = state.error

  const lines: string[] = []

  // Count lines
  const oldLines = oldString.split("\n").length
  const newLines = newString.split("\n").length

  // Header
  const replaceAllText = replaceAll ? " (replace all)" : ""
  lines.push(`**Edit:** \`${filePath}\`${replaceAllText} - ${oldLines} lines -> ${newLines} lines`)
  lines.push("")

  // Diff view
  lines.push("```diff")
  for (const line of oldString.split("\n")) {
    lines.push(`- ${line}`)
  }
  for (const line of newString.split("\n")) {
    lines.push(`+ ${line}`)
  }
  lines.push("```")
  lines.push("")

  // Error
  if (error) {
    lines.push(`> **Error:** ${error}`)
    lines.push("")
  }

  return lines.join("\n")
}

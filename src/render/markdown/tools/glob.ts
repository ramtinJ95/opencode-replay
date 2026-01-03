/**
 * Glob tool markdown renderer
 * Renders file pattern matching operations
 */

import type { ToolPart } from "../../../storage/types"

interface GlobToolInput {
  pattern: string
  path?: string
}

/**
 * Render a glob tool call as markdown
 */
export function renderGlobToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as GlobToolInput | undefined
  const pattern = input?.pattern || ""
  const searchPath = input?.path || "."
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

  // Parse output as file list
  const files = output.trim() ? output.trim().split("\n").filter(Boolean) : []
  const fileCount = files.length

  // Header
  lines.push(`**Glob:** \`${pattern}\` in \`${searchPath}\` - ${fileCount} files`)
  lines.push("")

  // File list (collapsible if long)
  if (files.length > 0) {
    if (files.length > 20) {
      lines.push("<details>")
      lines.push(`<summary>Files (${fileCount})</summary>`)
      lines.push("")
      for (const file of files) {
        lines.push(`- \`${file}\``)
      }
      lines.push("")
      lines.push("</details>")
    } else {
      for (const file of files) {
        lines.push(`- \`${file}\``)
      }
    }
    lines.push("")
  } else if (!error) {
    lines.push("*No matching files*")
    lines.push("")
  }

  // Error
  if (error) {
    lines.push(`> **Error:** ${error}`)
    lines.push("")
  }

  return lines.join("\n")
}

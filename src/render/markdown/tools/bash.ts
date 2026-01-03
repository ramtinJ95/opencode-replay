/**
 * Bash tool markdown renderer
 * Renders shell command executions
 */

import type { ToolPart } from "../../../storage/types"

interface BashToolInput {
  command: string
  description?: string
  timeout?: number
  workdir?: string
}

/**
 * Render a bash tool call as markdown
 */
export function renderBashToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as BashToolInput | undefined
  const command = input?.command || ""
  const description = input?.description || state.title || ""
  const workdir = input?.workdir
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

  // Header with description
  const workdirText = workdir ? ` (in \`${workdir}\`)` : ""
  lines.push(`**Bash:** ${description}${workdirText}`)
  lines.push("")

  // Command
  lines.push("```bash")
  lines.push(`$ ${command}`)
  lines.push("```")
  lines.push("")

  // Output (collapsible if long)
  if (output) {
    const outputLines = output.split("\n").length
    if (outputLines > 15) {
      lines.push("<details>")
      lines.push("<summary>Output (click to expand)</summary>")
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

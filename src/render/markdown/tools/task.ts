/**
 * Task tool markdown renderer
 * Renders sub-agent invocations
 */

import type { ToolPart } from "../../../storage/types"

interface TaskToolInput {
  description: string
  prompt: string
  subagent_type: string
  command?: string
  session_id?: string
}

/**
 * Render a task tool call as markdown
 */
export function renderTaskToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as TaskToolInput | undefined
  const description = input?.description || state.title || "Task"
  const prompt = input?.prompt || ""
  const agentType = input?.subagent_type || "general"
  const command = input?.command
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

  // Header
  lines.push(`**Task:** ${description} (\`${agentType}\` agent)`)
  lines.push("")

  // Command if present
  if (command) {
    lines.push(`Command: \`${command}\``)
    lines.push("")
  }

  // Prompt (collapsible if long)
  if (prompt) {
    const promptLines = prompt.split("\n").length
    if (promptLines > 5) {
      lines.push("<details>")
      lines.push(`<summary>Prompt (${promptLines} lines)</summary>`)
      lines.push("")
      lines.push(prompt)
      lines.push("")
      lines.push("</details>")
    } else {
      lines.push("**Prompt:**")
      lines.push("> " + prompt.split("\n").join("\n> "))
    }
    lines.push("")
  }

  // Result (collapsible if long)
  if (output) {
    const resultLines = output.split("\n").length
    if (resultLines > 15) {
      lines.push("<details>")
      lines.push(`<summary>Result (${resultLines} lines)</summary>`)
      lines.push("")
      lines.push(output)
      lines.push("")
      lines.push("</details>")
    } else {
      lines.push("**Result:**")
      lines.push(output)
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

/**
 * Bash tool renderer
 * Renders shell command executions with styled command box and output
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface BashToolInput {
  command: string
  description?: string
  timeout?: number
  workdir?: string
}

/**
 * Render a bash tool call with command and output
 */
export function renderBashTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as BashToolInput | undefined
  const command = input?.command || ""
  const description = input?.description || state.title || ""
  const workdir = input?.workdir
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Format workdir if present
  const workdirHtml = workdir
    ? `<span class="bash-workdir" title="Working directory">${escapeHtml(workdir)}</span>`
    : ""

  // Format description if present
  const descriptionHtml = description
    ? `<span class="bash-description">${escapeHtml(description)}</span>`
    : ""

  // Determine if output should be collapsed by default (long output)
  const outputLines = output.split("\n").length
  const isLongOutput = outputLines > 20
  const collapsedClass = isLongOutput ? "collapsed" : ""

  // Format output section
  let outputHtml = ""
  if (output) {
    outputHtml = `<div class="bash-output">
      <pre><code>${escapeHtml(output)}</code></pre>
    </div>`
  }

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="bash-error">
      <pre><code>${escapeHtml(error)}</code></pre>
    </div>`
  }

  return `<div class="tool-call tool-bash" data-status="${status}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">$</span>
    <span class="bash-command">${escapeHtml(command)}</span>
    ${descriptionHtml}
    ${workdirHtml}
    <span class="tool-toggle">${isLongOutput ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
    ${outputHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Task tool renderer
 * Renders sub-agent invocations with agent type, prompt, and result
 */

import type { ToolPart } from "../../../storage/types"
import { escapeHtml } from "../../../utils/html"

interface TaskToolInput {
  description: string
  prompt: string
  subagent_type: string
  command?: string
  session_id?: string
}

/**
 * Render a task tool call with agent type, prompt, and result
 */
export function renderTaskTool(part: ToolPart): string {
  const { state } = part
  const input = state.input as TaskToolInput | undefined
  const description = input?.description || state.title || "Task"
  const prompt = input?.prompt || ""
  const agentType = input?.subagent_type || "general"
  const command = input?.command
  const output = state.output || ""
  const error = state.error
  const status = state.status

  // Agent type badge with color
  const agentBadge = getAgentBadge(agentType)

  // Format command if present
  const commandHtml = command
    ? `<div class="task-command">
        <span class="task-command-label">Command:</span>
        <code>${escapeHtml(command)}</code>
      </div>`
    : ""

  // Format prompt section (collapsible if long)
  const promptLines = prompt.split("\n").length
  const isLongPrompt = promptLines > 5
  const promptHtml = prompt
    ? `<div class="task-prompt">
        <details ${isLongPrompt ? "" : "open"}>
          <summary class="task-prompt-label">Prompt (${promptLines} lines)</summary>
          <pre><code>${escapeHtml(prompt)}</code></pre>
        </details>
      </div>`
    : ""

  // Format result section
  const resultLines = output.split("\n").length
  const resultHtml = output
    ? `<div class="task-result">
        <details open>
          <summary class="task-result-label">Result (${resultLines} lines)</summary>
          <pre><code>${escapeHtml(output)}</code></pre>
        </details>
      </div>`
    : ""

  // Format error section
  let errorHtml = ""
  if (error) {
    errorHtml = `<div class="task-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(error)}</span>
    </div>`
  }

  return `<div class="tool-call tool-task" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">&#128101;</span>
    ${agentBadge}
    <span class="task-description">${escapeHtml(description)}</span>
    <span class="tool-toggle">-</span>
  </div>
  <div class="tool-body">
    ${commandHtml}
    ${promptHtml}
    ${resultHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Get a colored badge for agent type
 */
function getAgentBadge(agentType: string): string {
  const badges: Record<string, { color: string; bg: string; label: string }> = {
    general: { color: "#1565c0", bg: "#e3f2fd", label: "General" },
    explore: { color: "#6a1b9a", bg: "#f3e5f5", label: "Explore" },
    reviewer: { color: "#c62828", bg: "#ffebee", label: "Reviewer" },
    docs: { color: "#2e7d32", bg: "#e8f5e9", label: "Docs" },
  }

  const badge = badges[agentType] || { color: "#757575", bg: "#f5f5f5", label: agentType }

  return `<span class="task-agent-badge" style="color: ${badge.color}; background: ${badge.bg}">
    ${escapeHtml(badge.label)}
  </span>`
}

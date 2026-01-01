/**
 * Part rendering component
 * Renders different types of message parts (text, tool, reasoning, etc.)
 */

import type {
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  FilePart,
} from "../../storage/types"
import { escapeHtml, renderMarkdown } from "../../utils/html"
import { renderBashTool } from "./tools/bash"
import { renderReadTool } from "./tools/read"

/**
 * Render a text part
 */
function renderTextPart(part: TextPart): string {
  if (part.ignored) return ""

  // Use markdown rendering for text content
  return `<div class="part part-text">
  ${renderMarkdown(part.text)}
</div>`
}

/**
 * Render a reasoning part (extended thinking)
 */
function renderReasoningPart(part: ReasoningPart): string {
  return `<div class="reasoning">
  <div class="reasoning-header">
    <span>Thinking...</span>
  </div>
  <div class="reasoning-content">
    ${escapeHtml(part.text)}
  </div>
</div>`
}

/**
 * Render a tool call
 * Dispatches to specialized renderers for known tools, falls back to generic
 */
function renderToolPart(part: ToolPart): string {
  const { tool } = part

  // Use specialized renderers for known tools
  switch (tool) {
    case "bash":
      return renderBashTool(part)
    case "read":
      return renderReadTool(part)
    default:
      return renderGenericToolPart(part)
  }
}

/**
 * Generic tool renderer for unknown or unsupported tools
 */
function renderGenericToolPart(part: ToolPart): string {
  const { tool, state } = part
  const status = state.status
  const title = state.title || tool

  // Get tool input as formatted JSON or specific fields
  const inputHtml = state.input
    ? `<div class="tool-input">
      <pre><code>${escapeHtml(JSON.stringify(state.input, null, 2))}</code></pre>
    </div>`
    : ""

  // Get output (may be truncated)
  const outputHtml = state.output
    ? `<div class="tool-output">
      <pre><code>${escapeHtml(state.output)}</code></pre>
    </div>`
    : ""

  // Error message if any
  const errorHtml = state.error
    ? `<div class="tool-error">
      <pre><code>${escapeHtml(state.error)}</code></pre>
    </div>`
    : ""

  return `<div class="tool-call tool-${escapeHtml(tool)}" data-status="${status}">
  <div class="tool-header" onclick="this.querySelector('.tool-body')?.classList.toggle('collapsed')">
    <span class="tool-icon">${getToolIcon(tool)}</span>
    <span class="tool-name">${escapeHtml(tool)}</span>
    <span class="tool-title">${escapeHtml(title)}</span>
    <span class="tool-toggle">-</span>
  </div>
  <div class="tool-body">
    ${inputHtml}
    ${outputHtml}
    ${errorHtml}
  </div>
</div>`
}

/**
 * Get an icon for a tool
 */
function getToolIcon(tool: string): string {
  const icons: Record<string, string> = {
    bash: "$",
    read: "&#128196;", // document
    write: "&#128221;", // memo
    edit: "&#9998;", // pencil
    glob: "&#128269;", // magnifying glass
    grep: "&#128270;", // magnifying glass tilted
    task: "&#128101;", // busts in silhouette
    todowrite: "&#128203;", // clipboard
    webfetch: "&#127760;", // globe
    batch: "&#128230;", // package
  }
  return icons[tool] || "&#128295;" // wrench
}

/**
 * Render a file part
 */
function renderFilePart(part: FilePart): string {
  const filename = part.filename || "file"

  return `<div class="part part-file">
  <span class="file-icon">&#128206;</span>
  <span class="file-name">${escapeHtml(filename)}</span>
  <span class="file-mime">${escapeHtml(part.mime)}</span>
</div>`
}

/**
 * Render a generic/unknown part type
 */
function renderGenericPart(part: Part): string {
  return `<div class="part part-generic">
  <span class="part-type">${escapeHtml(part.type)}</span>
</div>`
}

/**
 * Render any part based on its type
 */
export function renderPart(part: Part): string {
  switch (part.type) {
    case "text":
      return renderTextPart(part)
    case "reasoning":
      return renderReasoningPart(part)
    case "tool":
      return renderToolPart(part)
    case "file":
      return renderFilePart(part)
    // These parts are metadata and don't need visual rendering
    case "snapshot":
    case "patch":
    case "compaction":
      return ""
    // Show basic info for other types
    case "agent":
    case "subtask":
    case "retry":
    default:
      return renderGenericPart(part)
  }
}

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
  SnapshotPart,
  PatchPart,
  AgentPart,
  CompactionPart,
  SubtaskPart,
  RetryPart,
} from "../../storage/types"
import { escapeHtml, renderMarkdown, isSafeUrl } from "../../utils/html"
import { formatDuration, formatBytes } from "../../utils/format"
import { renderBashTool } from "./tools/bash"
import { renderReadTool } from "./tools/read"
import { renderWriteTool } from "./tools/write"
import { renderEditTool } from "./tools/edit"
import { renderGlobTool } from "./tools/glob"
import { renderGrepTool } from "./tools/grep"
import { renderTaskTool } from "./tools/task"
import { renderTodoWriteTool } from "./tools/todowrite"
import { renderWebFetchTool } from "./tools/webfetch"
import { renderBatchTool } from "./tools/batch"

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
 * Now with collapsible content and duration display
 */
function renderReasoningPart(part: ReasoningPart): string {
  // Calculate duration if timing info is available
  const hasTiming = part.time?.start && part.time?.end
  const durationHtml = hasTiming
    ? `<span class="reasoning-duration">${formatDuration(part.time.start, part.time.end!)}</span>`
    : ""

  // Determine if content should be collapsed by default (long content)
  const contentLines = part.text.split("\n").length
  const isLong = contentLines > 20
  const collapsedClass = isLong ? "collapsed" : ""
  const toggleIndicator = isLong ? "+" : "-"

  return `<div class="reasoning">
  <div class="reasoning-header" onclick="this.nextElementSibling.classList.toggle('collapsed'); this.querySelector('.reasoning-toggle').textContent = this.nextElementSibling.classList.contains('collapsed') ? '+' : '-';">
    <span class="reasoning-icon">&#128161;</span>
    <span class="reasoning-label">Thinking...</span>
    ${durationHtml}
    <span class="reasoning-toggle">${toggleIndicator}</span>
  </div>
  <div class="reasoning-content ${collapsedClass}">
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
    case "write":
      return renderWriteTool(part)
    case "edit":
      return renderEditTool(part)
    case "glob":
      return renderGlobTool(part)
    case "grep":
      return renderGrepTool(part)
    case "task":
      return renderTaskTool(part)
    case "todowrite":
      return renderTodoWriteTool(part)
    case "webfetch":
      return renderWebFetchTool(part)
    case "batch":
      return renderBatchTool(part)
    default:
      return renderGenericToolPart(part)
  }
}

/**
 * Generic tool renderer for unknown or unsupported tools
 * Provides a fallback for tools without specialized renderers
 */
function renderGenericToolPart(part: ToolPart): string {
  const { tool, state } = part
  const status = state.status
  const title = state.title || tool

  // Get tool input as formatted JSON
  const inputHtml = state.input
    ? `<div class="tool-input">
      <div class="tool-input-label">Input</div>
      <pre><code>${escapeHtml(JSON.stringify(state.input, null, 2))}</code></pre>
    </div>`
    : ""

  // Get output (may be truncated)
  const outputHtml = state.output
    ? `<div class="tool-output">
      <div class="tool-output-label">Output</div>
      <pre><code>${escapeHtml(state.output)}</code></pre>
    </div>`
    : ""

  // Error message if any
  const errorHtml = state.error
    ? `<div class="tool-error">
      <span class="error-icon">&#9888;</span>
      <span class="error-message">${escapeHtml(state.error)}</span>
    </div>`
    : ""

  // Determine if should be collapsed
  const outputLines = (state.output || "").split("\n").length
  const isLongOutput = outputLines > 20
  const collapsedClass = isLongOutput ? "collapsed" : ""

  return `<div class="tool-call tool-generic tool-${escapeHtml(tool)}" data-status="${escapeHtml(status)}">
  <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
    <span class="tool-icon">${getToolIcon(tool)}</span>
    <span class="tool-name">${escapeHtml(tool)}</span>
    <span class="tool-title">${escapeHtml(title)}</span>
    <span class="tool-toggle">${isLongOutput ? "+" : "-"}</span>
  </div>
  <div class="tool-body ${collapsedClass}">
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
 * Enhanced with image preview and file size display
 */
function renderFilePart(part: FilePart): string {
  const filename = part.filename || "file"
  const isImage = part.mime.startsWith("image/")
  const isDataUrl = part.url.startsWith("data:")
  
  // Get file icon based on mime type
  const icon = getFileIcon(part.mime)
  
  // Estimate size from data URL if available
  let sizeHtml = ""
  if (isDataUrl) {
    // Data URLs are base64 encoded, estimate actual size
    const base64Part = part.url.split(",")[1]
    if (base64Part) {
      const estimatedBytes = Math.floor(base64Part.length * 0.75)
      sizeHtml = `<span class="file-size">${formatBytes(estimatedBytes)}</span>`
    }
  }
  
  // Source info (from user or tool)
  const sourceHtml = part.source
    ? `<span class="file-source">from ${escapeHtml(part.source.type)}${part.source.toolName ? `: ${escapeHtml(part.source.toolName)}` : ""}</span>`
    : ""
  
  // Image preview for image files with data URLs
  let previewHtml = ""
  if (isImage && isDataUrl && isSafeUrl(part.url)) {
    previewHtml = `<div class="file-preview">
      <img src="${part.url}" alt="${escapeHtml(filename)}" loading="lazy">
    </div>`
  } else if (isDataUrl) {
    // For non-image data URLs, offer download link
    previewHtml = `<div class="file-preview">
      <a href="${part.url}" download="${escapeHtml(filename)}" class="file-preview-link">
        <span>&#128190;</span> Download file
      </a>
    </div>`
  }

  return `<div class="part part-file">
  <div class="file-header">
    <span class="file-icon">${icon}</span>
    <div class="file-info">
      <span class="file-name">${escapeHtml(filename)}</span>
      <div class="file-meta">
        <span class="file-mime">${escapeHtml(part.mime)}</span>
        ${sizeHtml}
        ${sourceHtml}
      </div>
    </div>
  </div>
  ${previewHtml}
</div>`
}

/**
 * Get an appropriate icon for a file based on its mime type
 */
function getFileIcon(mime: string): string {
  if (mime.startsWith("image/")) return "&#128444;" // framed picture
  if (mime.startsWith("video/")) return "&#127910;" // film frames
  if (mime.startsWith("audio/")) return "&#127925;" // musical note
  if (mime.startsWith("text/")) return "&#128196;" // document
  if (mime.includes("pdf")) return "&#128203;" // clipboard
  if (mime.includes("zip") || mime.includes("compressed")) return "&#128230;" // package
  return "&#128206;" // paperclip
}

/**
 * Render a snapshot part (undo/redo marker)
 */
function renderSnapshotPart(part: SnapshotPart): string {
  return `<div class="part part-snapshot">
  <span class="snapshot-icon">&#128247;</span>
  <span class="snapshot-label">Snapshot created</span>
  <span class="snapshot-id">${escapeHtml(part.snapshot)}</span>
</div>`
}

/**
 * Render a patch part (file changes checkpoint)
 */
function renderPatchPart(part: PatchPart): string {
  const fileCount = part.files.length
  const filesHtml = part.files.length > 0
    ? `<ul class="patch-files">
        ${part.files.map(file => `<li class="patch-file-item">
          <span class="patch-file-icon">&#128196;</span>
          <span class="patch-file-name">${escapeHtml(file)}</span>
        </li>`).join("")}
      </ul>`
    : ""

  return `<div class="part part-patch">
  <div class="patch-header">
    <span class="patch-icon">&#128190;</span>
    <span class="patch-label">File changes</span>
    <span class="patch-file-count">${fileCount} file${fileCount !== 1 ? "s" : ""}</span>
    <span class="patch-hash">${escapeHtml(part.hash.slice(0, 8))}</span>
  </div>
  ${filesHtml}
</div>`
}

/**
 * Render an agent part (sub-agent invocation)
 */
function renderAgentPart(part: AgentPart): string {
  const sourceHtml = part.source?.value
    ? `<span class="agent-source">${escapeHtml(part.source.value.slice(0, 100))}${part.source.value.length > 100 ? "..." : ""}</span>`
    : ""

  return `<div class="part part-agent">
  <span class="agent-icon">&#129302;</span>
  <span class="agent-label">Agent:</span>
  <span class="agent-name-badge">${escapeHtml(part.name)}</span>
  ${sourceHtml}
</div>`
}

/**
 * Render a compaction part (context compaction marker)
 */
function renderCompactionPart(part: CompactionPart): string {
  const typeLabel = part.auto ? "Auto-compacted" : "Manual compaction"
  const icon = part.auto ? "&#9881;" : "&#128477;" // gear vs wastebasket

  return `<div class="part part-compaction">
  <div class="compaction-badge">
    <span class="compaction-icon">${icon}</span>
    <span class="compaction-type">${typeLabel}</span>
  </div>
</div>`
}

/**
 * Render a subtask part (task metadata)
 */
function renderSubtaskPart(part: SubtaskPart): string {
  const agentClass = `agent-${escapeHtml(part.agent.toLowerCase())}`
  
  const commandHtml = part.command
    ? `<div class="subtask-command">
        <span class="subtask-command-label">Command:</span>
        <code>${escapeHtml(part.command)}</code>
      </div>`
    : ""

  return `<div class="part part-subtask">
  <div class="subtask-header">
    <span class="subtask-icon">&#128101;</span>
    <span class="subtask-agent-badge ${agentClass}">${escapeHtml(part.agent)}</span>
    <span class="subtask-description">${escapeHtml(part.description)}</span>
  </div>
  <div class="subtask-body">
    ${commandHtml}
    <div class="subtask-prompt">
      <div class="subtask-prompt-label">Prompt</div>
      <div class="subtask-prompt-text">${escapeHtml(part.prompt)}</div>
    </div>
  </div>
</div>`
}

/**
 * Render a retry part (retry attempt marker)
 */
function renderRetryPart(part: RetryPart): string {
  const codeHtml = part.error.code
    ? `<span class="retry-error-code">Code: ${escapeHtml(part.error.code)}</span>`
    : ""

  return `<div class="part part-retry">
  <div class="retry-header">
    <span class="retry-icon">&#128260;</span>
    <span class="retry-label">Retry</span>
    <span class="retry-attempt">Attempt #${part.attempt}</span>
  </div>
  <div class="retry-error">
    <div class="retry-error-name">${escapeHtml(part.error.name)}</div>
    <div class="retry-error-message">${escapeHtml(part.error.message)}</div>
    ${codeHtml}
  </div>
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
    case "snapshot":
      return renderSnapshotPart(part)
    case "patch":
      return renderPatchPart(part)
    case "agent":
      return renderAgentPart(part)
    case "compaction":
      return renderCompactionPart(part)
    case "subtask":
      return renderSubtaskPart(part)
    case "retry":
      return renderRetryPart(part)
    default:
      return renderGenericPart(part)
  }
}

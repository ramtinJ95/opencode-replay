/**
 * Markdown part renderer
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
import { formatDuration, formatBytes } from "../../utils/format"
import { renderBashToolMd } from "./tools/bash"
import { renderReadToolMd } from "./tools/read"
import { renderWriteToolMd } from "./tools/write"
import { renderEditToolMd } from "./tools/edit"
import { renderGlobToolMd } from "./tools/glob"
import { renderGrepToolMd } from "./tools/grep"
import { renderTaskToolMd } from "./tools/task"
import { renderTodoWriteToolMd } from "./tools/todowrite"
import { renderWebFetchToolMd } from "./tools/webfetch"
import { renderBatchToolMd } from "./tools/batch"

// =============================================================================
// PART RENDERING
// =============================================================================

/**
 * Render a text part as markdown
 */
function renderTextPartMd(part: TextPart): string {
  if (part.ignored) return ""
  // Text content is already markdown, return as-is
  return part.text
}

/**
 * Render a reasoning part (extended thinking) as markdown
 * Uses collapsible details element
 */
function renderReasoningPartMd(part: ReasoningPart): string {
  // Calculate duration if timing info is available
  const hasTiming = part.time?.start && part.time?.end
  const durationText = hasTiming
    ? ` (${formatDuration(part.time.start, part.time.end!)})`
    : ""

  return `<details>
<summary>Thinking...${durationText}</summary>

${part.text}

</details>`
}

/**
 * Render a tool call as markdown
 * Dispatches to specialized renderers for known tools
 */
function renderToolPartMd(part: ToolPart): string {
  const { tool } = part

  // Use specialized renderers for known tools
  switch (tool) {
    case "bash":
      return renderBashToolMd(part)
    case "read":
      return renderReadToolMd(part)
    case "write":
      return renderWriteToolMd(part)
    case "edit":
      return renderEditToolMd(part)
    case "glob":
      return renderGlobToolMd(part)
    case "grep":
      return renderGrepToolMd(part)
    case "task":
      return renderTaskToolMd(part)
    case "todowrite":
      return renderTodoWriteToolMd(part)
    case "webfetch":
      return renderWebFetchToolMd(part)
    case "batch":
      return renderBatchToolMd(part)
    default:
      return renderGenericToolPartMd(part)
  }
}

/**
 * Generic tool renderer for unknown tools
 */
function renderGenericToolPartMd(part: ToolPart): string {
  const { tool, state } = part
  const title = state.title || tool
  const lines: string[] = []

  lines.push(`**${tool}:** ${title}`)
  lines.push("")

  // Input
  if (state.input) {
    lines.push("<details>")
    lines.push("<summary>Input</summary>")
    lines.push("")
    lines.push("```json")
    lines.push(JSON.stringify(state.input, null, 2))
    lines.push("```")
    lines.push("")
    lines.push("</details>")
    lines.push("")
  }

  // Output
  if (state.output) {
    const outputLines = state.output.split("\n").length
    if (outputLines > 15) {
      lines.push("<details>")
      lines.push("<summary>Output (click to expand)</summary>")
      lines.push("")
      lines.push("```")
      lines.push(state.output)
      lines.push("```")
      lines.push("")
      lines.push("</details>")
    } else {
      lines.push("```")
      lines.push(state.output)
      lines.push("```")
    }
    lines.push("")
  }

  // Error
  if (state.error) {
    lines.push(`> **Error:** ${state.error}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Render a file part as markdown
 */
function renderFilePartMd(part: FilePart): string {
  const filename = part.filename || "file"
  const isImage = part.mime.startsWith("image/")
  const isDataUrl = part.url.startsWith("data:")

  const lines: string[] = []

  // Estimate size from data URL
  let sizeText = ""
  if (isDataUrl) {
    const base64Part = part.url.split(",")[1]
    if (base64Part) {
      const estimatedBytes = Math.floor(base64Part.length * 0.75)
      sizeText = ` (${formatBytes(estimatedBytes)})`
    }
  }

  lines.push(`**File:** \`${filename}\` - ${part.mime}${sizeText}`)
  lines.push("")

  // Image preview for image files
  if (isImage && isDataUrl) {
    lines.push(`![${filename}](${part.url})`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Render a snapshot part as markdown
 */
function renderSnapshotPartMd(part: SnapshotPart): string {
  return `*Snapshot created: \`${part.snapshot}\`*`
}

/**
 * Render a patch part as markdown
 */
function renderPatchPartMd(part: PatchPart): string {
  const fileCount = part.files.length
  const lines: string[] = []

  lines.push(`**File changes:** ${fileCount} file${fileCount !== 1 ? "s" : ""} (\`${part.hash.slice(0, 8)}\`)`)
  lines.push("")

  if (part.files.length > 0) {
    for (const file of part.files) {
      lines.push(`- \`${file}\``)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Render an agent part as markdown
 */
function renderAgentPartMd(part: AgentPart): string {
  const sourceText = part.source?.value
    ? `: ${part.source.value.slice(0, 100)}${part.source.value.length > 100 ? "..." : ""}`
    : ""
  return `**Agent:** \`${part.name}\`${sourceText}`
}

/**
 * Render a compaction part as markdown
 */
function renderCompactionPartMd(part: CompactionPart): string {
  const typeLabel = part.auto ? "Auto-compacted" : "Manual compaction"
  return `*${typeLabel}*`
}

/**
 * Render a subtask part as markdown
 */
function renderSubtaskPartMd(part: SubtaskPart): string {
  const lines: string[] = []

  lines.push(`**Subtask:** ${part.description} (${part.agent})`)
  lines.push("")

  if (part.command) {
    lines.push(`Command: \`${part.command}\``)
    lines.push("")
  }

  // Show prompt in collapsible
  const promptLines = part.prompt.split("\n").length
  if (promptLines > 5) {
    lines.push("<details>")
    lines.push("<summary>Prompt</summary>")
    lines.push("")
    lines.push(part.prompt)
    lines.push("")
    lines.push("</details>")
  } else {
    lines.push("> " + part.prompt.split("\n").join("\n> "))
  }
  lines.push("")

  return lines.join("\n")
}

/**
 * Render a retry part as markdown
 */
function renderRetryPartMd(part: RetryPart): string {
  const codeText = part.error.code ? ` (code: ${part.error.code})` : ""
  return `**Retry #${part.attempt}:** ${part.error.name} - ${part.error.message}${codeText}`
}

/**
 * Render a generic/unknown part type as markdown
 */
function renderGenericPartMd(part: Part): string {
  return `*[${part.type}]*`
}

/**
 * Render any part based on its type as markdown
 */
export function renderPartMd(part: Part): string {
  switch (part.type) {
    case "text":
      return renderTextPartMd(part)
    case "reasoning":
      return renderReasoningPartMd(part)
    case "tool":
      return renderToolPartMd(part)
    case "file":
      return renderFilePartMd(part)
    case "snapshot":
      return renderSnapshotPartMd(part)
    case "patch":
      return renderPatchPartMd(part)
    case "agent":
      return renderAgentPartMd(part)
    case "compaction":
      return renderCompactionPartMd(part)
    case "subtask":
      return renderSubtaskPartMd(part)
    case "retry":
      return renderRetryPartMd(part)
    default:
      return renderGenericPartMd(part)
  }
}

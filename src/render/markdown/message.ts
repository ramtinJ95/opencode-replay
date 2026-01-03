/**
 * Markdown message renderer
 * Renders user and assistant messages with their parts
 */

import type {
  UserMessage,
  AssistantMessage,
  MessageWithParts,
  Part,
} from "../../storage/types"
import { formatTime, formatTokens, formatCost } from "../../utils/format"
import { renderPartMd } from "./part"

// =============================================================================
// MESSAGE RENDERING
// =============================================================================

/**
 * Render a user message as markdown
 */
function renderUserMessageMd(message: UserMessage, parts: Part[]): string {
  const time = formatTime(message.time.created)
  const model = message.model
    ? `${message.model.providerID}/${message.model.modelID}`
    : ""

  const lines: string[] = []

  // Header
  lines.push("### User")
  lines.push("")
  lines.push(`*${time}*${model ? ` - ${model}` : ""}`)
  lines.push("")

  // Render all parts
  for (const part of parts) {
    const partMd = renderPartMd(part)
    if (partMd) {
      lines.push(partMd)
      lines.push("")
    }
  }

  return lines.join("\n")
}

/**
 * Render an assistant message as markdown
 */
function renderAssistantMessageMd(message: AssistantMessage, parts: Part[]): string {
  const time = formatTime(message.time.created)
  const model = message.modelID || ""

  const lines: string[] = []

  // Header
  lines.push("### Assistant")
  lines.push("")
  lines.push(`*${time}*${model ? ` - ${model}` : ""}`)
  lines.push("")

  // Render all parts
  for (const part of parts) {
    const partMd = renderPartMd(part)
    if (partMd) {
      lines.push(partMd)
      lines.push("")
    }
  }

  // Stats section
  const stats = formatStatsMd(message)
  if (stats) {
    lines.push(`> ${stats}`)
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Format assistant message stats as markdown
 */
function formatStatsMd(message: AssistantMessage): string | null {
  const parts: string[] = []

  if (message.tokens) {
    parts.push(`Tokens: ${formatTokens(message.tokens.input)} in / ${formatTokens(message.tokens.output)} out`)
    if (message.tokens.cache?.read) {
      parts.push(`Cache: ${formatTokens(message.tokens.cache.read)} read`)
    }
  }

  if (message.cost !== undefined && message.cost > 0) {
    parts.push(`Cost: ${formatCost(message.cost)}`)
  }

  if (message.finish) {
    parts.push(`Finish: ${message.finish}`)
  }

  return parts.length > 0 ? parts.join(" | ") : null
}

/**
 * Render a message (user or assistant) as markdown
 */
export function renderMessageMd(messageWithParts: MessageWithParts): string {
  const { message, parts } = messageWithParts

  if (message.role === "user") {
    return renderUserMessageMd(message, parts)
  } else {
    return renderAssistantMessageMd(message, parts)
  }
}

/**
 * Render a list of messages as markdown
 */
export function renderMessagesMd(messages: MessageWithParts[]): string {
  const rendered = messages.map(renderMessageMd)
  return rendered.join("\n---\n\n")
}

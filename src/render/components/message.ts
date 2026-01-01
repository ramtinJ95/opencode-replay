/**
 * Message rendering component
 * Renders user and assistant messages with their parts
 */

import type {
  UserMessage,
  AssistantMessage,
  MessageWithParts,
  Part,
} from "../../storage/types"
import { escapeHtml } from "../../utils/html"
import { formatTime, formatTokens, formatCost } from "../../utils/format"
import { renderPart } from "./part"

/**
 * Render a user message
 */
function renderUserMessage(message: UserMessage, parts: Part[]): string {
  const time = formatTime(message.time.created)
  const model = message.model
    ? `${message.model.providerID}/${message.model.modelID}`
    : ""

  // Render all parts
  const partsHtml = parts.map((part) => renderPart(part)).join("\n")

  return `<div class="message message-user" id="${escapeHtml(message.id)}">
  <div class="message-header">
    <span class="message-role">User</span>
    <span class="message-time">${time}</span>
    ${model ? `<span class="message-model">${escapeHtml(model)}</span>` : ""}
  </div>
  <div class="message-content">
    ${partsHtml}
  </div>
</div>`
}

/**
 * Render an assistant message
 */
function renderAssistantMessage(message: AssistantMessage, parts: Part[]): string {
  const time = formatTime(message.time.created)
  const model = message.modelID || ""

  // Calculate stats
  const tokens = message.tokens
  const cost = message.cost

  // Render all parts
  const partsHtml = parts.map((part) => renderPart(part)).join("\n")

  // Stats section
  const statsHtml: string[] = []
  if (tokens) {
    statsHtml.push(`<span class="stat">Tokens: ${formatTokens(tokens.input)} in / ${formatTokens(tokens.output)} out</span>`)
    if (tokens.cache?.read) {
      statsHtml.push(`<span class="stat">Cache: ${formatTokens(tokens.cache.read)} read</span>`)
    }
  }
  if (cost !== undefined && cost > 0) {
    statsHtml.push(`<span class="stat">Cost: ${formatCost(cost)}</span>`)
  }
  if (message.finish) {
    statsHtml.push(`<span class="stat">Finish: ${message.finish}</span>`)
  }

  return `<div class="message message-assistant" id="${escapeHtml(message.id)}">
  <div class="message-header">
    <span class="message-role">Assistant</span>
    <span class="message-time">${time}</span>
    ${model ? `<span class="message-model">${escapeHtml(model)}</span>` : ""}
  </div>
  <div class="message-content">
    ${partsHtml}
  </div>
  ${statsHtml.length > 0 ? `<div class="message-stats">${statsHtml.join("\n")}</div>` : ""}
</div>`
}

/**
 * Render a message (user or assistant)
 */
export function renderMessage(messageWithParts: MessageWithParts): string {
  const { message, parts } = messageWithParts

  if (message.role === "user") {
    return renderUserMessage(message, parts)
  } else {
    return renderAssistantMessage(message, parts)
  }
}

/**
 * Render a list of messages
 */
export function renderMessages(messages: MessageWithParts[]): string {
  return `<div class="messages">
  ${messages.map(renderMessage).join("\n")}
</div>`
}

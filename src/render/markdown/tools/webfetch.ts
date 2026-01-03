/**
 * WebFetch tool markdown renderer
 * Renders URL fetching operations
 */

import type { ToolPart } from "../../../storage/types"
import { formatBytes } from "../../../utils/format"

interface WebFetchToolInput {
  url: string
  format?: "text" | "markdown" | "html"
  timeout?: number
}

/**
 * Render a webfetch tool call as markdown
 */
export function renderWebFetchToolMd(part: ToolPart): string {
  const { state } = part
  const input = state.input as WebFetchToolInput | undefined
  const url = input?.url || ""
  const format = input?.format || "markdown"
  const output = state.output || ""
  const error = state.error

  const lines: string[] = []

  // Content size
  const contentSize = formatBytes(output.length)

  // Header with link
  lines.push(`**WebFetch:** [${truncateUrl(url)}](${url}) - ${format} (${contentSize})`)
  lines.push("")

  // Content (collapsible if long)
  if (output) {
    const contentLines = output.split("\n").length
    if (contentLines > 30) {
      lines.push("<details>")
      lines.push(`<summary>Content (${contentLines} lines)</summary>`)
      lines.push("")
      lines.push(output)
      lines.push("")
      lines.push("</details>")
    } else {
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

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength = 60): string {
  if (url.length <= maxLength) return url

  try {
    const parsed = new URL(url)
    const domain = parsed.hostname
    const path = parsed.pathname

    if (domain.length + path.length <= maxLength) {
      return domain + path
    }

    const availableForPath = maxLength - domain.length - 3
    if (availableForPath > 10) {
      return domain + path.slice(0, availableForPath) + "..."
    }

    return url.slice(0, maxLength - 3) + "..."
  } catch {
    return url.slice(0, maxLength - 3) + "..."
  }
}

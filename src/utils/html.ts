/**
 * HTML escaping and rendering utilities
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char)
}

/**
 * Escape HTML attribute values
 */
export function escapeAttr(str: string): string {
  return escapeHtml(str)
}

/**
 * Convert newlines to <br> tags (escapes HTML first)
 */
export function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, "<br>")
}

/**
 * Check if a URL is safe (not javascript:, data:, or other dangerous protocols)
 */
function isSafeUrl(url: string): boolean {
  // Allow relative URLs, hash links, and http(s) URLs
  return /^(https?:\/\/|\/|#|\.\.?\/)/.test(url) || !/^[a-z]+:/i.test(url)
}

/**
 * Render basic markdown-like content to HTML
 * Supports: code blocks, inline code, bold, italic, links
 */
export function renderMarkdown(text: string): string {
  let html = escapeHtml(text)

  // Code blocks (```language\ncode\n```)
  // Language can include non-word chars like c++, c#, f#
  html = html.replace(
    /```([^\n]*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      // Sanitize language to only allow safe chars for CSS class
      const safeLang = (lang || "text").replace(/[^a-zA-Z0-9_-]/g, "")
      return `<pre><code class="language-${safeLang || "text"}">${code.trim()}</code></pre>`
    }
  )

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")

  // Italic (*text*)
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>")

  // Links [text](url) - validate URL to prevent XSS
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, linkText, url) => {
      const safeUrl = isSafeUrl(url) ? url : "#"
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
    }
  )

  // Convert double newlines to paragraph breaks
  html = html
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n")

  return html
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

/**
 * Create a slug from a string (for URLs/IDs)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

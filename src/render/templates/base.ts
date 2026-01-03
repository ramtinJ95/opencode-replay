/**
 * Base HTML template wrapper
 * All pages extend this template
 */

import { escapeHtml, escapeAttr, isSafeUrl } from "../../utils/html"

export interface BaseTemplateOptions {
  title: string
  content: string
  /** Relative path to assets directory (e.g., "../assets" or "../../assets") */
  assetsPath?: string
  /** Additional head content (e.g., meta tags) */
  headExtra?: string
  /** Additional body classes */
  bodyClass?: string
  /** Total number of pages for session (used by search.js) */
  totalPages?: number
  /** Include gist-preview.js for gisthost.github.io compatibility */
  gistMode?: boolean
}

/**
 * Inline script to prevent Flash of Unstyled Content (FOUC)
 * Must be in <head> before CSS loads
 */
const FOUC_PREVENTION_SCRIPT = `<script>
(function() {
  var theme = localStorage.getItem('opencode-replay-theme');
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>`

/**
 * Render the base HTML page template
 */
export function renderBasePage(options: BaseTemplateOptions): string {
  const {
    title,
    content,
    assetsPath = "./assets",
    headExtra = "",
    bodyClass = "",
    totalPages,
    gistMode = false,
  } = options

  // Build body attributes
  const bodyAttrs: string[] = []
  if (bodyClass) bodyAttrs.push(`class="${bodyClass}"`)
  if (totalPages !== undefined) bodyAttrs.push(`data-total-pages="${totalPages}"`)
  const bodyAttrStr = bodyAttrs.length > 0 ? ` ${bodyAttrs.join(" ")}` : ""

  // Conditionally include gist-preview.js for gisthost.github.io compatibility
  const gistScript = gistMode
    ? `\n  <script src="${assetsPath}/gist-preview.js"></script>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="opencode-replay">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)} - OpenCode Replay</title>
  ${FOUC_PREVENTION_SCRIPT}
  <link rel="stylesheet" href="${assetsPath}/styles.css">
  <link rel="stylesheet" href="${assetsPath}/prism.css">
  ${headExtra}
</head>
<body${bodyAttrStr}>
  <div class="container">
    ${content}
  </div>
  <script src="${assetsPath}/theme.js"></script>
  <script src="${assetsPath}/highlight.js"></script>
  <script src="${assetsPath}/search.js"></script>${gistScript}
</body>
</html>`
}

/**
 * Theme toggle button HTML with sun/moon icons
 */
const THEME_TOGGLE_BUTTON = `<button 
  id="theme-toggle" 
  class="theme-toggle" 
  type="button"
  aria-label="Toggle dark mode"
  aria-pressed="false"
  title="Toggle theme"
>
  <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
  <svg class="icon-moon" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
</button>`

/**
 * Render a simple header with navigation
 */
export function renderHeader(options: {
  title: string
  subtitle?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  showSearch?: boolean
  showThemeToggle?: boolean
}): string {
  const { 
    title, 
    subtitle, 
    breadcrumbs = [], 
    showSearch = true,
    showThemeToggle = true 
  } = options

  const breadcrumbHtml =
    breadcrumbs.length > 0
      ? `<nav class="breadcrumbs">
        ${breadcrumbs
          .map((b, i) => {
            const isLast = i === breadcrumbs.length - 1
            if (isLast || !b.href) {
              return `<span class="breadcrumb-item current">${escapeHtml(b.label)}</span>`
            }
            // Validate and escape href to prevent XSS via javascript: URLs
            const safeHref = isSafeUrl(b.href) ? escapeAttr(b.href) : "#"
            return `<a href="${safeHref}" class="breadcrumb-item">${escapeHtml(b.label)}</a>`
          })
          .join('<span class="breadcrumb-separator">/</span>')}
      </nav>`
      : ""

  const headerActions = (showSearch || showThemeToggle) 
    ? `<div class="header-actions">
    ${showSearch ? `<button class="search-trigger" type="button" aria-label="Search">
      <span class="search-icon">&#128269;</span>
      <span class="search-text">Search...</span>
      <kbd>Ctrl+K</kbd>
    </button>` : ''}
    ${showThemeToggle ? THEME_TOGGLE_BUTTON : ''}
  </div>`
    : ''

  return `<header class="page-header">
  <div class="header-top">
    ${breadcrumbHtml}
    ${headerActions}
  </div>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
</header>`
}

/**
 * Render a simple footer
 */
export function renderFooter(): string {
  return `<footer class="page-footer">
  <p>Generated by <a href="https://github.com/opencode-replay" target="_blank" rel="noopener">opencode-replay</a></p>
</footer>`
}

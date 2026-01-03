/**
 * Shared types for multi-format rendering (HTML, Markdown, JSON)
 * Used by both HTML and Markdown renderers
 */

import type { Session, MessageWithParts } from "../storage/types"
import type { TimelineEntry } from "./templates"
import type { GenerationStats } from "./html"

// =============================================================================
// OUTPUT FORMAT
// =============================================================================

/** Supported output formats */
export type OutputFormat = "html" | "markdown" | "json"

// =============================================================================
// RENDER CONTEXT
// =============================================================================

/** Context passed to renderers for format-specific behavior */
export interface RenderContext {
  /** Output format being generated */
  format: OutputFormat
  /** For gist mode: inject gisthost.github.io JS (HTML only) */
  gistMode?: boolean
  /** Assets path relative to current file (HTML only) */
  assetsPath?: string
}

// =============================================================================
// RENDER DATA STRUCTURES
// =============================================================================

/** Data needed to render a session overview page */
export interface SessionRenderData {
  session: Session
  projectName?: string
  timeline: TimelineEntry[]
  messageCount: number
  totalTokens?: { input: number; output: number }
  totalCost?: number
  pageCount: number
  model?: string
}

/** Data needed to render a conversation page */
export interface ConversationRenderData {
  session: Session
  projectName?: string
  messages: MessageWithParts[]
  pageNumber: number
  totalPages: number
}

/** Data needed to render a full transcript (markdown) */
export interface FullTranscriptData {
  session: Session
  projectName?: string
  messages: MessageWithParts[]
  timeline: TimelineEntry[]
  stats: GenerationStats
}

// =============================================================================
// FORMAT RENDERER INTERFACE
// =============================================================================

/**
 * Interface for format-specific renderers
 * Both HTML and Markdown renderers should implement this
 */
export interface FormatRenderer {
  /** Render session overview/index page */
  renderSession(data: SessionRenderData, context: RenderContext): string

  /** Render a conversation page (paginated messages) */
  renderConversation(data: ConversationRenderData, context: RenderContext): string

  /** 
   * Render full transcript as a single output (markdown only)
   * HTML uses pagination, so this is optional
   */
  renderFullTranscript?(data: FullTranscriptData, context: RenderContext): string
}

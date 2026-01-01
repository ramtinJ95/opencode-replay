/**
 * TypeScript types matching OpenCode's storage schema
 * Based on analysis of sst/opencode source code
 */

// =============================================================================
// BASE TYPES
// =============================================================================

export interface TimeStamps {
  created: number // Unix milliseconds
  updated: number
}

export interface SessionTime extends TimeStamps {
  compacting?: number
  archived?: number
}

// =============================================================================
// PROJECT
// =============================================================================

export interface Project {
  id: string // SHA-1 hash of worktree path
  worktree: string // Absolute path to project root
  vcsDir?: string // Path to .git directory
  vcs?: "git"
  name?: string
  time: TimeStamps
}

// =============================================================================
// SESSION
// =============================================================================

export interface SessionSummary {
  additions?: number
  deletions?: number
  files?: number
}

export interface SessionShare {
  url: string
}

export interface SessionRevert {
  messageID: string
  partID?: string
}

export interface Session {
  id: string // "ses_{timestamp}{random}"
  projectID: string // References Project.id
  directory: string // Working directory
  title: string // Auto-generated or user-set
  version: string // OpenCode version (e.g., "1.0.207")
  time: SessionTime
  parentID?: string // For branched sessions
  share?: SessionShare
  revert?: SessionRevert
  summary?: SessionSummary
}

// =============================================================================
// MESSAGE
// =============================================================================

export interface MessageModel {
  providerID: string // "anthropic", "openai", etc.
  modelID: string // "claude-sonnet-4-20250514", etc.
}

export interface MessagePath {
  cwd: string
  root: string
}

export interface TokenUsage {
  input: number
  output: number
  reasoning: number
  cache?: {
    read: number
    write: number
  }
}

export interface FileDiff {
  file: string
  additions: number
  deletions: number
}

export interface UserMessageSummary {
  title?: string
  diffs?: FileDiff[]
}

// Base message fields
interface MessageBase {
  id: string // "msg_{timestamp}{random}"
  sessionID: string
}

// User message
export interface UserMessage extends MessageBase {
  role: "user"
  time: { created: number }
  model: MessageModel
  agent?: string // "build", "docs", "plan", etc.
  system?: string // Custom system prompt
  tools?: Record<string, boolean> // Tool permissions
  summary?: UserMessageSummary
}

// Assistant message
export interface AssistantMessage extends MessageBase {
  role: "assistant"
  time: { created: number; completed?: number }
  parentID: string // Links to UserMessage.id
  providerID: string
  modelID: string
  mode: string // "code", "compaction", etc.
  agent?: string
  path?: MessagePath
  cost?: number
  tokens?: TokenUsage
  finish?: "stop" | "tool-calls" | "length" | "content-filter" | "error" | "unknown"
  summary?: string
  error?: {
    name: string
    message: string
  }
}

export type Message = UserMessage | AssistantMessage

// Type guard for user messages
export function isUserMessage(msg: Message): msg is UserMessage {
  return msg.role === "user"
}

// Type guard for assistant messages
export function isAssistantMessage(msg: Message): msg is AssistantMessage {
  return msg.role === "assistant"
}

// =============================================================================
// PARTS
// =============================================================================

interface PartBase {
  id: string // "prt_{timestamp}{sequence}"
  sessionID: string
  messageID: string
}

// Text Part - User input or assistant response text
export interface TextPart extends PartBase {
  type: "text"
  text: string
  synthetic?: boolean // Generated, not from model
  ignored?: boolean
  time?: { start?: number; end?: number }
  metadata?: Record<string, unknown>
}

// Reasoning Part - Extended thinking
export interface ReasoningPart extends PartBase {
  type: "reasoning"
  text: string
  time: { start: number; end?: number }
  metadata?: Record<string, unknown>
}

// Tool Part - Tool invocation with state
export interface ToolPartState {
  status: "pending" | "running" | "completed" | "error"
  input?: Record<string, unknown>
  output?: string
  error?: string
  metadata?: Record<string, unknown>
  title?: string
  time?: { start: number; end: number }
}

export interface ToolPart extends PartBase {
  type: "tool"
  tool: string // Tool name: "bash", "read", "edit", etc.
  callID: string // Unique call identifier
  state: ToolPartState
  metadata?: Record<string, unknown>
}

// File Part - Attachments
export interface FilePart extends PartBase {
  type: "file"
  mime: string
  filename?: string
  url: string // data: URL or file path
  source?: {
    type: "user" | "tool"
    toolName?: string
    toolCallID?: string
  }
}

// Snapshot Part - Undo/redo markers
export interface SnapshotPart extends PartBase {
  type: "snapshot"
  snapshot: string // Snapshot ID
}

// Patch Part - File changes
export interface PatchPart extends PartBase {
  type: "patch"
  hash: string
  files: string[]
}

// Agent Part - Sub-agent invocations
export interface AgentPart extends PartBase {
  type: "agent"
  name: string // Agent name
  source?: { value: string }
}

// Compaction Part - Context compaction marker
export interface CompactionPart extends PartBase {
  type: "compaction"
  auto: boolean
}

// Subtask Part - Task tool invocations
export interface SubtaskPart extends PartBase {
  type: "subtask"
  prompt: string
  description: string
  agent: string
  command?: string
}

// Retry Part - Retry attempt marker
export interface RetryPart extends PartBase {
  type: "retry"
  attempt: number
  error: {
    name: string
    message: string
    code?: string
  }
}

// Union of all part types
export type Part =
  | TextPart
  | ReasoningPart
  | ToolPart
  | FilePart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | CompactionPart
  | SubtaskPart
  | RetryPart

// Type guards for parts
export function isTextPart(part: Part): part is TextPart {
  return part.type === "text"
}

export function isReasoningPart(part: Part): part is ReasoningPart {
  return part.type === "reasoning"
}

export function isToolPart(part: Part): part is ToolPart {
  return part.type === "tool"
}

export function isFilePart(part: Part): part is FilePart {
  return part.type === "file"
}

// Message with its parts
export interface MessageWithParts {
  message: Message
  parts: Part[]
}

// =============================================================================
// ADDITIONAL STORAGE ENTITIES
// =============================================================================

// Session Diff - File changes for undo/redo
export interface SessionDiffEntry {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}

export type SessionDiff = SessionDiffEntry[]

// Todo - Task list
export interface TodoItem {
  id: string
  content: string
  priority: "high" | "medium" | "low"
  status: "pending" | "in_progress" | "completed" | "cancelled"
}

export type TodoList = TodoItem[]

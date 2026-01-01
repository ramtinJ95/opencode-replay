/**
 * Storage reader functions for OpenCode's file-based storage
 */

import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { homedir } from "node:os"
import type {
  Project,
  Session,
  Message,
  Part,
  MessageWithParts,
  SessionDiff,
  TodoList,
} from "./types"

// =============================================================================
// STORAGE PATH
// =============================================================================

/**
 * Get the default OpenCode storage path
 * - macOS/Linux: ~/.local/share/opencode/storage
 * - Windows: %USERPROFILE%\.local\share\opencode\storage
 */
export function getDefaultStoragePath(): string {
  return join(homedir(), ".local", "share", "opencode", "storage")
}

// =============================================================================
// LOW-LEVEL HELPERS
// =============================================================================

/**
 * Read and parse a JSON file, returning null if it doesn't exist or is invalid
 */
async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      return null
    }
    return (await file.json()) as T
  } catch {
    // File doesn't exist or invalid JSON
    return null
  }
}

/**
 * List all JSON files in a directory (non-recursive)
 * Returns the file names without .json extension
 */
async function listJsonFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => e.name.replace(".json", ""))
  } catch {
    // Directory doesn't exist
    return []
  }
}

/**
 * List subdirectories in a directory
 */
async function _listDirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    // Directory doesn't exist
    return []
  }
}

// Reserved for future use (e.g., listing session directories)
void _listDirs

// =============================================================================
// PROJECT FUNCTIONS
// =============================================================================

/**
 * List all projects in storage
 * Returns projects sorted by most recently updated
 */
export async function listProjects(storagePath: string): Promise<Project[]> {
  const projectDir = join(storagePath, "project")
  const projectIds = await listJsonFiles(projectDir)

  const projects: Project[] = []
  for (const id of projectIds) {
    const project = await readJson<Project>(join(projectDir, `${id}.json`))
    if (project) projects.push(project)
  }

  // Sort by most recently updated
  return projects.sort((a, b) => b.time.updated - a.time.updated)
}

/**
 * Get a specific project by ID
 */
export async function getProject(
  storagePath: string,
  projectId: string
): Promise<Project | null> {
  return readJson<Project>(join(storagePath, "project", `${projectId}.json`))
}

/**
 * Find a project by its worktree path
 * Returns the project whose worktree matches or contains the given path
 */
export async function findProjectByPath(
  storagePath: string,
  workdir: string
): Promise<Project | null> {
  const projects = await listProjects(storagePath)
  // Find project where workdir starts with the project's worktree
  return projects.find((p) => workdir.startsWith(p.worktree)) ?? null
}

// =============================================================================
// SESSION FUNCTIONS
// =============================================================================

/**
 * List all sessions for a project
 * Returns sessions sorted by most recently updated
 */
export async function listSessions(
  storagePath: string,
  projectId: string
): Promise<Session[]> {
  const sessionDir = join(storagePath, "session", projectId)
  const sessionIds = await listJsonFiles(sessionDir)

  const sessions: Session[] = []
  for (const id of sessionIds) {
    const session = await readJson<Session>(join(sessionDir, `${id}.json`))
    if (session) sessions.push(session)
  }

  // Sort by most recently updated
  return sessions.sort((a, b) => b.time.updated - a.time.updated)
}

/**
 * Get a specific session by ID
 */
export async function getSession(
  storagePath: string,
  projectId: string,
  sessionId: string
): Promise<Session | null> {
  return readJson<Session>(
    join(storagePath, "session", projectId, `${sessionId}.json`)
  )
}

/**
 * List all sessions across all projects
 * Returns sessions with their project info, sorted by most recently updated
 */
export async function listAllSessions(
  storagePath: string
): Promise<Array<{ project: Project; session: Session }>> {
  const projects = await listProjects(storagePath)
  const results: Array<{ project: Project; session: Session }> = []

  for (const project of projects) {
    const sessions = await listSessions(storagePath, project.id)
    for (const session of sessions) {
      results.push({ project, session })
    }
  }

  // Sort by session update time
  return results.sort((a, b) => b.session.time.updated - a.session.time.updated)
}

// =============================================================================
// MESSAGE FUNCTIONS
// =============================================================================

/**
 * List all messages for a session
 * Returns messages sorted chronologically by ID
 */
export async function listMessages(
  storagePath: string,
  sessionId: string
): Promise<Message[]> {
  const messageDir = join(storagePath, "message", sessionId)
  const messageIds = await listJsonFiles(messageDir)

  const messages: Message[] = []
  for (const id of messageIds) {
    const message = await readJson<Message>(join(messageDir, `${id}.json`))
    if (message) messages.push(message)
  }

  // Sort by ID (which contains timestamp) - chronological order
  return messages.sort((a, b) => (a.id > b.id ? 1 : -1))
}

/**
 * Get a specific message by ID
 */
export async function getMessage(
  storagePath: string,
  sessionId: string,
  messageId: string
): Promise<Message | null> {
  return readJson<Message>(
    join(storagePath, "message", sessionId, `${messageId}.json`)
  )
}

// =============================================================================
// PART FUNCTIONS
// =============================================================================

/**
 * List all parts for a message
 * Returns parts sorted chronologically by ID
 */
export async function listParts(
  storagePath: string,
  messageId: string
): Promise<Part[]> {
  const partDir = join(storagePath, "part", messageId)
  const partIds = await listJsonFiles(partDir)

  const parts: Part[] = []
  for (const id of partIds) {
    const part = await readJson<Part>(join(partDir, `${id}.json`))
    if (part) parts.push(part)
  }

  // Sort by ID - chronological order
  return parts.sort((a, b) => (a.id > b.id ? 1 : -1))
}

// =============================================================================
// COMBINED QUERIES
// =============================================================================

/**
 * Get all messages with their parts for a session
 * This is the main function for reading a complete conversation
 */
export async function getMessagesWithParts(
  storagePath: string,
  sessionId: string
): Promise<MessageWithParts[]> {
  const messages = await listMessages(storagePath, sessionId)

  const result: MessageWithParts[] = []
  for (const message of messages) {
    const parts = await listParts(storagePath, message.id)
    result.push({ message, parts })
  }

  return result
}

// =============================================================================
// ADDITIONAL STORAGE ENTITIES
// =============================================================================

/**
 * Get the session diff (file changes) for a session
 */
export async function getSessionDiff(
  storagePath: string,
  sessionId: string
): Promise<SessionDiff | null> {
  return readJson<SessionDiff>(
    join(storagePath, "session_diff", `${sessionId}.json`)
  )
}

/**
 * Get the todo list for a session
 */
export async function getTodoList(
  storagePath: string,
  sessionId: string
): Promise<TodoList | null> {
  return readJson<TodoList>(join(storagePath, "todo", `${sessionId}.json`))
}

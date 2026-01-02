/**
 * Tests for storage reader functions
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  getDefaultStoragePath,
  listProjects,
  getProject,
  findProjectByPath,
  listSessions,
  getSession,
  listAllSessions,
  listMessages,
  getMessage,
  listParts,
  getMessagesWithParts,
  getSessionDiff,
  getTodoList,
} from "./reader"
import {
  createProject,
  createSession,
  createUserMessage,
  createAssistantMessage,
  createTextPart,
  createToolPart,
  BASE_TIMESTAMP,
} from "../../tests/fixtures"

// =============================================================================
// TEST SETUP
// =============================================================================

let testStoragePath: string

/**
 * Create storage directory structure and write JSON files
 */
async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true })
  await Bun.write(path, JSON.stringify(data))
}

beforeAll(async () => {
  // Create unique temp directory for tests
  testStoragePath = join(tmpdir(), `opencode-test-${Date.now()}`)
  await mkdir(testStoragePath, { recursive: true })

  // Create project directory structure
  const projectDir = join(testStoragePath, "project")
  await mkdir(projectDir, { recursive: true })

  // Create two projects
  const project1 = createProject({
    id: "proj_001",
    name: "project-one",
    worktree: "/home/user/project-one",
    time: { created: BASE_TIMESTAMP, updated: BASE_TIMESTAMP + 1000 },
  })
  const project2 = createProject({
    id: "proj_002",
    name: "project-two",
    worktree: "/home/user/project-two",
    time: { created: BASE_TIMESTAMP, updated: BASE_TIMESTAMP + 2000 },
  })

  await writeJsonFile(join(projectDir, "proj_001.json"), project1)
  await writeJsonFile(join(projectDir, "proj_002.json"), project2)

  // Create sessions for project 1
  const sessionDir1 = join(testStoragePath, "session", "proj_001")
  await mkdir(sessionDir1, { recursive: true })

  const session1 = createSession({
    id: "ses_001",
    projectID: "proj_001",
    title: "First Session",
    time: { created: BASE_TIMESTAMP, updated: BASE_TIMESTAMP + 5000 },
  })
  const session2 = createSession({
    id: "ses_002",
    projectID: "proj_001",
    title: "Second Session",
    time: { created: BASE_TIMESTAMP + 1000, updated: BASE_TIMESTAMP + 6000 },
  })

  await writeJsonFile(join(sessionDir1, "ses_001.json"), session1)
  await writeJsonFile(join(sessionDir1, "ses_002.json"), session2)

  // Create sessions for project 2
  const sessionDir2 = join(testStoragePath, "session", "proj_002")
  await mkdir(sessionDir2, { recursive: true })

  const session3 = createSession({
    id: "ses_003",
    projectID: "proj_002",
    title: "Third Session",
    time: { created: BASE_TIMESTAMP + 2000, updated: BASE_TIMESTAMP + 7000 },
  })

  await writeJsonFile(join(sessionDir2, "ses_003.json"), session3)

  // Create messages for session 1
  const messageDir = join(testStoragePath, "message", "ses_001")
  await mkdir(messageDir, { recursive: true })

  const msg1 = createUserMessage({
    id: "msg_001",
    sessionID: "ses_001",
    time: { created: BASE_TIMESTAMP },
  })
  const msg2 = createAssistantMessage({
    id: "msg_002",
    sessionID: "ses_001",
    parentID: "msg_001",
    time: { created: BASE_TIMESTAMP + 1000, completed: BASE_TIMESTAMP + 2000 },
  })
  const msg3 = createUserMessage({
    id: "msg_003",
    sessionID: "ses_001",
    time: { created: BASE_TIMESTAMP + 3000 },
  })

  await writeJsonFile(join(messageDir, "msg_001.json"), msg1)
  await writeJsonFile(join(messageDir, "msg_002.json"), msg2)
  await writeJsonFile(join(messageDir, "msg_003.json"), msg3)

  // Create parts for message 1 (user message)
  const partDir1 = join(testStoragePath, "part", "msg_001")
  await mkdir(partDir1, { recursive: true })

  const part1 = createTextPart({
    id: "prt_001a",
    messageID: "msg_001",
    sessionID: "ses_001",
    text: "Hello, world!",
  })

  await writeJsonFile(join(partDir1, "prt_001a.json"), part1)

  // Create parts for message 2 (assistant message)
  const partDir2 = join(testStoragePath, "part", "msg_002")
  await mkdir(partDir2, { recursive: true })

  const part2 = createTextPart({
    id: "prt_002a",
    messageID: "msg_002",
    sessionID: "ses_001",
    text: "Hi there!",
  })
  const part3 = createToolPart({
    id: "prt_002b",
    messageID: "msg_002",
    sessionID: "ses_001",
    tool: "bash",
  })

  await writeJsonFile(join(partDir2, "prt_002a.json"), part2)
  await writeJsonFile(join(partDir2, "prt_002b.json"), part3)

  // Create session diff
  const diffDir = join(testStoragePath, "session_diff")
  await mkdir(diffDir, { recursive: true })

  const sessionDiff = [
    {
      file: "src/index.ts",
      before: "old content",
      after: "new content",
      additions: 5,
      deletions: 2,
    },
  ]
  await writeJsonFile(join(diffDir, "ses_001.json"), sessionDiff)

  // Create todo list
  const todoDir = join(testStoragePath, "todo")
  await mkdir(todoDir, { recursive: true })

  const todoList = [
    { id: "todo_1", content: "Fix bug", priority: "high", status: "pending" },
    {
      id: "todo_2",
      content: "Add tests",
      priority: "medium",
      status: "completed",
    },
  ]
  await writeJsonFile(join(todoDir, "ses_001.json"), todoList)
})

afterAll(async () => {
  // Clean up temp directory
  await rm(testStoragePath, { recursive: true, force: true })
})

// =============================================================================
// getDefaultStoragePath
// =============================================================================

describe("getDefaultStoragePath", () => {
  test("returns path containing opencode/storage", () => {
    const path = getDefaultStoragePath()
    expect(path).toContain("opencode")
    expect(path).toContain("storage")
  })

  test("returns absolute path", () => {
    const path = getDefaultStoragePath()
    expect(path.startsWith("/") || path.match(/^[A-Z]:\\/)).toBeTruthy()
  })
})

// =============================================================================
// listProjects
// =============================================================================

describe("listProjects", () => {
  test("lists all projects", async () => {
    const projects = await listProjects(testStoragePath)
    expect(projects).toHaveLength(2)
  })

  test("sorts projects by most recently updated", async () => {
    const projects = await listProjects(testStoragePath)
    expect(projects[0]?.id).toBe("proj_002") // More recently updated
    expect(projects[1]?.id).toBe("proj_001")
  })

  test("returns empty array for non-existent directory", async () => {
    const projects = await listProjects("/non/existent/path")
    expect(projects).toEqual([])
  })
})

// =============================================================================
// getProject
// =============================================================================

describe("getProject", () => {
  test("returns project by ID", async () => {
    const project = await getProject(testStoragePath, "proj_001")
    expect(project).not.toBeNull()
    expect(project?.id).toBe("proj_001")
    expect(project?.name).toBe("project-one")
  })

  test("returns null for non-existent project", async () => {
    const project = await getProject(testStoragePath, "non_existent")
    expect(project).toBeNull()
  })
})

// =============================================================================
// findProjectByPath
// =============================================================================

describe("findProjectByPath", () => {
  test("finds project by exact worktree match", async () => {
    const project = await findProjectByPath(
      testStoragePath,
      "/home/user/project-one"
    )
    expect(project).not.toBeNull()
    expect(project?.id).toBe("proj_001")
  })

  test("finds project by subdirectory", async () => {
    const project = await findProjectByPath(
      testStoragePath,
      "/home/user/project-one/src/components"
    )
    expect(project).not.toBeNull()
    expect(project?.id).toBe("proj_001")
  })

  test("returns null for unmatched path", async () => {
    const project = await findProjectByPath(
      testStoragePath,
      "/home/user/other-project"
    )
    expect(project).toBeNull()
  })

  test("does not match partial directory names", async () => {
    // /home/user/project-one-extended should NOT match /home/user/project-one
    const project = await findProjectByPath(
      testStoragePath,
      "/home/user/project-one-extended"
    )
    expect(project).toBeNull()
  })
})

// =============================================================================
// listSessions
// =============================================================================

describe("listSessions", () => {
  test("lists sessions for a project", async () => {
    const sessions = await listSessions(testStoragePath, "proj_001")
    expect(sessions).toHaveLength(2)
  })

  test("sorts sessions by most recently updated", async () => {
    const sessions = await listSessions(testStoragePath, "proj_001")
    expect(sessions[0]?.id).toBe("ses_002") // More recently updated
    expect(sessions[1]?.id).toBe("ses_001")
  })

  test("returns empty array for project with no sessions", async () => {
    const sessions = await listSessions(testStoragePath, "non_existent_project")
    expect(sessions).toEqual([])
  })
})

// =============================================================================
// getSession
// =============================================================================

describe("getSession", () => {
  test("returns session by ID", async () => {
    const session = await getSession(testStoragePath, "proj_001", "ses_001")
    expect(session).not.toBeNull()
    expect(session?.id).toBe("ses_001")
    expect(session?.title).toBe("First Session")
  })

  test("returns null for non-existent session", async () => {
    const session = await getSession(testStoragePath, "proj_001", "non_existent")
    expect(session).toBeNull()
  })
})

// =============================================================================
// listAllSessions
// =============================================================================

describe("listAllSessions", () => {
  test("lists sessions across all projects", async () => {
    const results = await listAllSessions(testStoragePath)
    expect(results).toHaveLength(3)
  })

  test("includes project info with each session", async () => {
    const results = await listAllSessions(testStoragePath)
    for (const result of results) {
      expect(result.project).toBeDefined()
      expect(result.session).toBeDefined()
      expect(result.project.id).toBeDefined()
      expect(result.session.projectID).toBe(result.project.id)
    }
  })

  test("sorts by session update time", async () => {
    const results = await listAllSessions(testStoragePath)
    // ses_003 has the highest update time
    expect(results[0]?.session.id).toBe("ses_003")
  })
})

// =============================================================================
// listMessages
// =============================================================================

describe("listMessages", () => {
  test("lists messages for a session", async () => {
    const messages = await listMessages(testStoragePath, "ses_001")
    expect(messages).toHaveLength(3)
  })

  test("sorts messages chronologically by creation time", async () => {
    const messages = await listMessages(testStoragePath, "ses_001")
    expect(messages[0]?.id).toBe("msg_001")
    expect(messages[1]?.id).toBe("msg_002")
    expect(messages[2]?.id).toBe("msg_003")
  })

  test("returns empty array for non-existent session", async () => {
    const messages = await listMessages(testStoragePath, "non_existent")
    expect(messages).toEqual([])
  })
})

// =============================================================================
// getMessage
// =============================================================================

describe("getMessage", () => {
  test("returns message by ID", async () => {
    const message = await getMessage(testStoragePath, "ses_001", "msg_001")
    expect(message).not.toBeNull()
    expect(message?.id).toBe("msg_001")
    expect(message?.role).toBe("user")
  })

  test("returns null for non-existent message", async () => {
    const message = await getMessage(testStoragePath, "ses_001", "non_existent")
    expect(message).toBeNull()
  })
})

// =============================================================================
// listParts
// =============================================================================

describe("listParts", () => {
  test("lists parts for a message", async () => {
    const parts = await listParts(testStoragePath, "msg_002")
    expect(parts).toHaveLength(2)
  })

  test("sorts parts by ID (chronologically)", async () => {
    const parts = await listParts(testStoragePath, "msg_002")
    expect(parts[0]?.id).toBe("prt_002a")
    expect(parts[1]?.id).toBe("prt_002b")
  })

  test("returns empty array for message with no parts", async () => {
    const parts = await listParts(testStoragePath, "non_existent")
    expect(parts).toEqual([])
  })
})

// =============================================================================
// getMessagesWithParts
// =============================================================================

describe("getMessagesWithParts", () => {
  test("returns messages with their parts", async () => {
    const result = await getMessagesWithParts(testStoragePath, "ses_001")
    expect(result).toHaveLength(3)
  })

  test("includes parts for each message", async () => {
    const result = await getMessagesWithParts(testStoragePath, "ses_001")

    // First message (user) should have 1 text part
    expect(result[0]?.parts).toHaveLength(1)
    expect(result[0]?.parts[0]?.type).toBe("text")

    // Second message (assistant) should have 2 parts
    expect(result[1]?.parts).toHaveLength(2)
  })

  test("message and parts are correctly associated", async () => {
    const result = await getMessagesWithParts(testStoragePath, "ses_001")

    for (const { message, parts } of result) {
      for (const part of parts) {
        expect(part.messageID).toBe(message.id)
      }
    }
  })
})

// =============================================================================
// getSessionDiff
// =============================================================================

describe("getSessionDiff", () => {
  test("returns session diff for existing session", async () => {
    const diff = await getSessionDiff(testStoragePath, "ses_001")
    expect(diff).not.toBeNull()
    expect(diff).toHaveLength(1)
    expect(diff?.[0]?.file).toBe("src/index.ts")
    expect(diff?.[0]?.additions).toBe(5)
    expect(diff?.[0]?.deletions).toBe(2)
  })

  test("returns null for session without diff", async () => {
    const diff = await getSessionDiff(testStoragePath, "ses_002")
    expect(diff).toBeNull()
  })
})

// =============================================================================
// getTodoList
// =============================================================================

describe("getTodoList", () => {
  test("returns todo list for existing session", async () => {
    const todos = await getTodoList(testStoragePath, "ses_001")
    expect(todos).not.toBeNull()
    expect(todos).toHaveLength(2)
    expect(todos?.[0]?.content).toBe("Fix bug")
    expect(todos?.[1]?.status).toBe("completed")
  })

  test("returns null for session without todos", async () => {
    const todos = await getTodoList(testStoragePath, "ses_002")
    expect(todos).toBeNull()
  })
})

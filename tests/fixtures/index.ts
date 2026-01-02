/**
 * Test fixtures for OpenCode Replay
 * Provides factory functions to create test data matching storage types
 */

import type {
  Project,
  Session,
  UserMessage,
  AssistantMessage,
  Message,
  TextPart,
  ToolPart,
  ReasoningPart,
  FilePart,
  Part,
  MessageWithParts,
} from "../../src/storage/types"

// =============================================================================
// BASE TIMESTAMPS
// =============================================================================

/** Fixed timestamp for deterministic tests: Jan 15, 2024, 2:30:00 PM UTC */
export const BASE_TIMESTAMP = 1705329000000

/** Create a timestamp offset from BASE_TIMESTAMP */
export function offsetTimestamp(offsetMs: number): number {
  return BASE_TIMESTAMP + offsetMs
}

// =============================================================================
// PROJECT FIXTURES
// =============================================================================

export function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj_abc123",
    worktree: "/home/user/my-project",
    vcs: "git",
    vcsDir: "/home/user/my-project/.git",
    name: "my-project",
    time: {
      created: BASE_TIMESTAMP,
      updated: BASE_TIMESTAMP,
    },
    ...overrides,
  }
}

// =============================================================================
// SESSION FIXTURES
// =============================================================================

export function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "ses_4957d04cdffeJwdujYPBCKpIsb",
    projectID: "proj_abc123",
    directory: "/home/user/my-project",
    title: "Test Session",
    version: "1.0.207",
    time: {
      created: BASE_TIMESTAMP,
      updated: BASE_TIMESTAMP + 60000, // 1 minute later
    },
    ...overrides,
  }
}

// =============================================================================
// MESSAGE FIXTURES
// =============================================================================

export function createUserMessage(
  overrides: Partial<UserMessage> = {}
): UserMessage {
  return {
    id: "msg_b6a82fb38001Ei3X3A63gRCfuN",
    sessionID: "ses_4957d04cdffeJwdujYPBCKpIsb",
    role: "user",
    time: { created: BASE_TIMESTAMP },
    model: {
      providerID: "anthropic",
      modelID: "claude-sonnet-4-20250514",
    },
    ...overrides,
  }
}

export function createAssistantMessage(
  overrides: Partial<AssistantMessage> = {}
): AssistantMessage {
  return {
    id: "msg_c7b93fc49002Fi4Y4B74hSCguO",
    sessionID: "ses_4957d04cdffeJwdujYPBCKpIsb",
    role: "assistant",
    time: {
      created: BASE_TIMESTAMP + 1000,
      completed: BASE_TIMESTAMP + 5000,
    },
    parentID: "msg_b6a82fb38001Ei3X3A63gRCfuN",
    providerID: "anthropic",
    modelID: "claude-sonnet-4-20250514",
    mode: "code",
    tokens: {
      input: 1500,
      output: 500,
      reasoning: 0,
      cache: { read: 1000, write: 200 },
    },
    cost: 0.0125,
    finish: "stop",
    ...overrides,
  }
}

// =============================================================================
// PART FIXTURES
// =============================================================================

export function createTextPart(overrides: Partial<TextPart> = {}): TextPart {
  return {
    id: "prt_990882f75002cw7B1Eg1BdaxzV",
    sessionID: "ses_4957d04cdffeJwdujYPBCKpIsb",
    messageID: "msg_b6a82fb38001Ei3X3A63gRCfuN",
    type: "text",
    text: "Hello, this is a test message.",
    ...overrides,
  }
}

export function createToolPart(overrides: Partial<ToolPart> = {}): ToolPart {
  return {
    id: "prt_a91993g86003dx8C2Fh2CebyAW",
    sessionID: "ses_4957d04cdffeJwdujYPBCKpIsb",
    messageID: "msg_c7b93fc49002Fi4Y4B74hSCguO",
    type: "tool",
    tool: "bash",
    callID: "call_xyz123",
    state: {
      status: "completed",
      input: { command: "ls -la" },
      output: "total 0\ndrwxr-xr-x  2 user user  40 Jan 15 14:30 .",
      time: { start: BASE_TIMESTAMP + 1000, end: BASE_TIMESTAMP + 2000 },
    },
    ...overrides,
  }
}

export function createReasoningPart(
  overrides: Partial<ReasoningPart> = {}
): ReasoningPart {
  return {
    id: "prt_b02004h97004ey9D3Gi3DfczBX",
    sessionID: "ses_4957d04cdffeJwdujYPBCKpIsb",
    messageID: "msg_c7b93fc49002Fi4Y4B74hSCguO",
    type: "reasoning",
    text: "Let me think about this problem...",
    time: { start: BASE_TIMESTAMP + 1000, end: BASE_TIMESTAMP + 1500 },
    ...overrides,
  }
}

export function createFilePart(overrides: Partial<FilePart> = {}): FilePart {
  return {
    id: "prt_c13115i08005fz0E4Hj4EgdaAY",
    sessionID: "ses_4957d04cdffeJwdujYPBCKpIsb",
    messageID: "msg_b6a82fb38001Ei3X3A63gRCfuN",
    type: "file",
    mime: "image/png",
    filename: "screenshot.png",
    url: "data:image/png;base64,iVBORw0KGgo=",
    ...overrides,
  }
}

// =============================================================================
// MESSAGE WITH PARTS FIXTURES
// =============================================================================

export function createMessageWithParts(
  message: Message,
  parts: Part[]
): MessageWithParts {
  return { message, parts }
}

export function createUserMessageWithParts(
  messageOverrides: Partial<UserMessage> = {},
  text: string = "Hello, this is a test message."
): MessageWithParts {
  const message = createUserMessage(messageOverrides)
  const textPart = createTextPart({
    messageID: message.id,
    sessionID: message.sessionID,
    text,
  })
  return { message, parts: [textPart] }
}

export function createAssistantMessageWithParts(
  messageOverrides: Partial<AssistantMessage> = {},
  options: {
    text?: string
    tools?: Array<{ tool: string; output?: string; input?: Record<string, unknown> }>
  } = {}
): MessageWithParts {
  const message = createAssistantMessage(messageOverrides)
  const parts: Part[] = []

  // Add text part if provided
  if (options.text) {
    parts.push(
      createTextPart({
        id: `prt_text_${message.id}`,
        messageID: message.id,
        sessionID: message.sessionID,
        text: options.text,
      })
    )
  }

  // Add tool parts if provided
  if (options.tools) {
    options.tools.forEach((t, i) => {
      parts.push(
        createToolPart({
          id: `prt_tool_${i}_${message.id}`,
          messageID: message.id,
          sessionID: message.sessionID,
          tool: t.tool,
          state: {
            status: "completed",
            input: t.input ?? { command: `${t.tool} command` },
            output: t.output ?? "OK",
            time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
          },
        })
      )
    })
  }

  return { message, parts }
}

// =============================================================================
// CONVERSATION FIXTURES
// =============================================================================

/**
 * Create a simple conversation with alternating user/assistant messages
 */
export function createConversation(
  exchanges: Array<{ userText: string; assistantText: string }>
): MessageWithParts[] {
  const messages: MessageWithParts[] = []
  let timestamp = BASE_TIMESTAMP

  exchanges.forEach((exchange, i) => {
    const userMsgId = `msg_user_${i}`
    const assistantMsgId = `msg_assistant_${i}`

    // User message
    messages.push(
      createUserMessageWithParts(
        {
          id: userMsgId,
          time: { created: timestamp },
        },
        exchange.userText
      )
    )

    timestamp += 1000

    // Assistant message
    messages.push(
      createAssistantMessageWithParts(
        {
          id: assistantMsgId,
          parentID: userMsgId,
          time: { created: timestamp, completed: timestamp + 2000 },
        },
        { text: exchange.assistantText }
      )
    )

    timestamp += 3000
  })

  return messages
}

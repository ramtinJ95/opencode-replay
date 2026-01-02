/**
 * Tests for storage type guards
 */

import { describe, test, expect } from "bun:test"
import {
  isUserMessage,
  isAssistantMessage,
  isTextPart,
  isReasoningPart,
  isToolPart,
  isFilePart,
  type Message,
  type Part,
} from "./types"
import {
  createUserMessage,
  createAssistantMessage,
  createTextPart,
  createToolPart,
  createReasoningPart,
  createFilePart,
} from "../../tests/fixtures"

// =============================================================================
// isUserMessage
// =============================================================================

describe("isUserMessage", () => {
  test("returns true for user messages", () => {
    const userMsg = createUserMessage()
    expect(isUserMessage(userMsg)).toBe(true)
  })

  test("returns false for assistant messages", () => {
    const assistantMsg = createAssistantMessage()
    expect(isUserMessage(assistantMsg)).toBe(false)
  })

  test("correctly narrows type", () => {
    const msg: Message = createUserMessage()
    if (isUserMessage(msg)) {
      // TypeScript should allow accessing user-specific fields
      expect(msg.model).toBeDefined()
      expect(msg.role).toBe("user")
    }
  })
})

// =============================================================================
// isAssistantMessage
// =============================================================================

describe("isAssistantMessage", () => {
  test("returns true for assistant messages", () => {
    const assistantMsg = createAssistantMessage()
    expect(isAssistantMessage(assistantMsg)).toBe(true)
  })

  test("returns false for user messages", () => {
    const userMsg = createUserMessage()
    expect(isAssistantMessage(userMsg)).toBe(false)
  })

  test("correctly narrows type", () => {
    const msg: Message = createAssistantMessage()
    if (isAssistantMessage(msg)) {
      // TypeScript should allow accessing assistant-specific fields
      expect(msg.modelID).toBeDefined()
      expect(msg.providerID).toBeDefined()
      expect(msg.role).toBe("assistant")
    }
  })
})

// =============================================================================
// isTextPart
// =============================================================================

describe("isTextPart", () => {
  test("returns true for text parts", () => {
    const textPart = createTextPart()
    expect(isTextPart(textPart)).toBe(true)
  })

  test("returns false for tool parts", () => {
    const toolPart = createToolPart()
    expect(isTextPart(toolPart)).toBe(false)
  })

  test("returns false for reasoning parts", () => {
    const reasoningPart = createReasoningPart()
    expect(isTextPart(reasoningPart)).toBe(false)
  })

  test("returns false for file parts", () => {
    const filePart = createFilePart()
    expect(isTextPart(filePart)).toBe(false)
  })

  test("correctly narrows type", () => {
    const part: Part = createTextPart({ text: "Hello world" })
    if (isTextPart(part)) {
      expect(part.text).toBe("Hello world")
      expect(part.type).toBe("text")
    }
  })
})

// =============================================================================
// isReasoningPart
// =============================================================================

describe("isReasoningPart", () => {
  test("returns true for reasoning parts", () => {
    const reasoningPart = createReasoningPart()
    expect(isReasoningPart(reasoningPart)).toBe(true)
  })

  test("returns false for text parts", () => {
    const textPart = createTextPart()
    expect(isReasoningPart(textPart)).toBe(false)
  })

  test("returns false for tool parts", () => {
    const toolPart = createToolPart()
    expect(isReasoningPart(toolPart)).toBe(false)
  })

  test("correctly narrows type", () => {
    const part: Part = createReasoningPart({ text: "Thinking..." })
    if (isReasoningPart(part)) {
      expect(part.text).toBe("Thinking...")
      expect(part.type).toBe("reasoning")
      expect(part.time).toBeDefined()
    }
  })
})

// =============================================================================
// isToolPart
// =============================================================================

describe("isToolPart", () => {
  test("returns true for tool parts", () => {
    const toolPart = createToolPart()
    expect(isToolPart(toolPart)).toBe(true)
  })

  test("returns false for text parts", () => {
    const textPart = createTextPart()
    expect(isToolPart(textPart)).toBe(false)
  })

  test("returns false for reasoning parts", () => {
    const reasoningPart = createReasoningPart()
    expect(isToolPart(reasoningPart)).toBe(false)
  })

  test("correctly narrows type", () => {
    const part: Part = createToolPart({ tool: "bash" })
    if (isToolPart(part)) {
      expect(part.tool).toBe("bash")
      expect(part.type).toBe("tool")
      expect(part.callID).toBeDefined()
      expect(part.state).toBeDefined()
    }
  })

  test("handles different tool types", () => {
    const bashTool = createToolPart({ tool: "bash" })
    const readTool = createToolPart({ tool: "read" })
    const editTool = createToolPart({ tool: "edit" })

    expect(isToolPart(bashTool)).toBe(true)
    expect(isToolPart(readTool)).toBe(true)
    expect(isToolPart(editTool)).toBe(true)
  })
})

// =============================================================================
// isFilePart
// =============================================================================

describe("isFilePart", () => {
  test("returns true for file parts", () => {
    const filePart = createFilePart()
    expect(isFilePart(filePart)).toBe(true)
  })

  test("returns false for text parts", () => {
    const textPart = createTextPart()
    expect(isFilePart(textPart)).toBe(false)
  })

  test("returns false for tool parts", () => {
    const toolPart = createToolPart()
    expect(isFilePart(toolPart)).toBe(false)
  })

  test("correctly narrows type", () => {
    const part: Part = createFilePart({
      mime: "image/png",
      filename: "screenshot.png",
    })
    if (isFilePart(part)) {
      expect(part.mime).toBe("image/png")
      expect(part.filename).toBe("screenshot.png")
      expect(part.type).toBe("file")
      expect(part.url).toBeDefined()
    }
  })

  test("handles different file types", () => {
    const pngFile = createFilePart({ mime: "image/png" })
    const jpegFile = createFilePart({ mime: "image/jpeg" })
    const pdfFile = createFilePart({ mime: "application/pdf" })

    expect(isFilePart(pngFile)).toBe(true)
    expect(isFilePart(jpegFile)).toBe(true)
    expect(isFilePart(pdfFile)).toBe(true)
  })
})

// =============================================================================
// Combined type guard usage
// =============================================================================

describe("combined type guards", () => {
  test("can identify part type from mixed array", () => {
    const parts: Part[] = [
      createTextPart({ text: "Hello" }),
      createToolPart({ tool: "bash" }),
      createReasoningPart({ text: "Thinking" }),
      createFilePart({ mime: "image/png" }),
    ]

    const textParts = parts.filter(isTextPart)
    const toolParts = parts.filter(isToolPart)
    const reasoningParts = parts.filter(isReasoningPart)
    const fileParts = parts.filter(isFilePart)

    expect(textParts).toHaveLength(1)
    expect(textParts[0]?.text).toBe("Hello")

    expect(toolParts).toHaveLength(1)
    expect(toolParts[0]?.tool).toBe("bash")

    expect(reasoningParts).toHaveLength(1)
    expect(reasoningParts[0]?.text).toBe("Thinking")

    expect(fileParts).toHaveLength(1)
    expect(fileParts[0]?.mime).toBe("image/png")
  })

  test("can identify message type from mixed array", () => {
    const messages: Message[] = [
      createUserMessage({ id: "msg_user_1" }),
      createAssistantMessage({ id: "msg_asst_1" }),
      createUserMessage({ id: "msg_user_2" }),
      createAssistantMessage({ id: "msg_asst_2" }),
    ]

    const userMessages = messages.filter(isUserMessage)
    const assistantMessages = messages.filter(isAssistantMessage)

    expect(userMessages).toHaveLength(2)
    expect(assistantMessages).toHaveLength(2)
    expect(userMessages.map((m) => m.id)).toEqual(["msg_user_1", "msg_user_2"])
    expect(assistantMessages.map((m) => m.id)).toEqual([
      "msg_asst_1",
      "msg_asst_2",
    ])
  })
})

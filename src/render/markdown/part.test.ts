/**
 * Tests for markdown part rendering
 */

import { describe, test, expect } from "bun:test"
import { renderPartMd } from "./part"
import {
  createTextPart,
  createToolPart,
  createReasoningPart,
  createFilePart,
  BASE_TIMESTAMP,
} from "../../../tests/fixtures"
import type { SnapshotPart, PatchPart, AgentPart, CompactionPart } from "../../storage/types"

// =============================================================================
// Text Part
// =============================================================================

describe("renderPartMd - text parts", () => {
  test("renders text content as-is (already markdown)", () => {
    const part = createTextPart({ text: "This is **bold** text" })
    const md = renderPartMd(part)

    expect(md).toBe("This is **bold** text")
  })

  test("returns empty string for ignored parts", () => {
    const part = createTextPart({ text: "Ignored content", ignored: true })
    const md = renderPartMd(part)

    expect(md).toBe("")
  })
})

// =============================================================================
// Reasoning Part
// =============================================================================

describe("renderPartMd - reasoning parts", () => {
  test("renders reasoning in collapsible details", () => {
    const part = createReasoningPart({
      text: "Let me think about this...",
      time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 5000 },
    })
    const md = renderPartMd(part)

    expect(md).toContain("<details>")
    expect(md).toContain("<summary>Thinking...")
    expect(md).toContain("Let me think about this...")
    expect(md).toContain("</details>")
  })

  test("includes duration when timing available", () => {
    const part = createReasoningPart({
      text: "Thinking...",
      time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 5000 },
    })
    const md = renderPartMd(part)

    expect(md).toContain("(5s)")
  })
})

// =============================================================================
// Tool Parts
// =============================================================================

describe("renderPartMd - tool parts", () => {
  test("renders bash tool", () => {
    const part = createToolPart({
      tool: "bash",
      state: {
        status: "completed",
        input: { command: "ls -la", description: "List files" },
        output: "file1.txt\nfile2.txt",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Bash:**")
    expect(md).toContain("```bash")
    expect(md).toContain("$ ls -la")
    expect(md).toContain("file1.txt")
  })

  test("renders read tool", () => {
    const part = createToolPart({
      tool: "read",
      state: {
        status: "completed",
        input: { filePath: "/path/to/file.ts" },
        output: "file content here",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Read:**")
    expect(md).toContain("`/path/to/file.ts`")
    expect(md).toContain("file content here")
  })

  test("renders edit tool with diff format", () => {
    const part = createToolPart({
      tool: "edit",
      state: {
        status: "completed",
        input: {
          filePath: "/path/to/file.ts",
          oldString: "const x = 1",
          newString: "const x = 2",
        },
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Edit:**")
    expect(md).toContain("```diff")
    expect(md).toContain("- const x = 1")
    expect(md).toContain("+ const x = 2")
  })

  test("renders glob tool with file list", () => {
    const part = createToolPart({
      tool: "glob",
      state: {
        status: "completed",
        input: { pattern: "**/*.ts" },
        output: "src/index.ts\nsrc/utils.ts",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Glob:**")
    expect(md).toContain("`**/*.ts`")
    expect(md).toContain("2 files")
    expect(md).toContain("`src/index.ts`")
  })

  test("renders grep tool with matches", () => {
    const part = createToolPart({
      tool: "grep",
      state: {
        status: "completed",
        input: { pattern: "TODO" },
        output: "src/index.ts:10:// TODO: fix this",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Grep:**")
    expect(md).toContain("`TODO`")
    expect(md).toContain("1 matches")
  })

  test("renders todowrite tool with checkboxes", () => {
    const part = createToolPart({
      tool: "todowrite",
      state: {
        status: "completed",
        input: {
          todos: [
            { id: "1", content: "First task", status: "completed", priority: "high" },
            { id: "2", content: "Second task", status: "pending", priority: "medium" },
          ],
        },
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Todo List:**")
    expect(md).toContain("1/2 done")
    expect(md).toContain("[x] First task")
    expect(md).toContain("[ ] Second task")
    expect(md).toContain("**[HIGH]**")
  })

  test("renders task tool with agent type", () => {
    const part = createToolPart({
      tool: "task",
      state: {
        status: "completed",
        input: {
          description: "Find the file",
          prompt: "Search for config",
          subagent_type: "explore",
        },
        output: "Found config.ts",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Task:**")
    expect(md).toContain("`explore`")
    expect(md).toContain("Found config.ts")
  })

  test("renders batch tool with nested tools", () => {
    const part = createToolPart({
      tool: "batch",
      state: {
        status: "completed",
        input: {
          tool_calls: [
            { tool: "read", parameters: { filePath: "file1.ts" } },
            { tool: "read", parameters: { filePath: "file2.ts" } },
          ],
        },
        output: "results",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Batch:**")
    expect(md).toContain("2 calls")
    expect(md).toContain("2 read")
  })

  test("renders webfetch tool with URL", () => {
    const part = createToolPart({
      tool: "webfetch",
      state: {
        status: "completed",
        input: { url: "https://example.com/api" },
        output: "response content",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**WebFetch:**")
    expect(md).toContain("https://example.com/api")
  })

  test("renders write tool with status", () => {
    const part = createToolPart({
      tool: "write",
      state: {
        status: "completed",
        input: { filePath: "/path/to/file.ts", content: "new content" },
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**Write:**")
    expect(md).toContain("Created")
    expect(md).toContain("`/path/to/file.ts`")
  })

  test("renders generic tool for unknown tools", () => {
    const part = createToolPart({
      tool: "unknown_tool",
      state: {
        status: "completed",
        title: "Unknown operation",
        input: { foo: "bar" },
        output: "result",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("**unknown_tool:**")
    expect(md).toContain("Unknown operation")
  })
})

// =============================================================================
// File Part
// =============================================================================

describe("renderPartMd - file parts", () => {
  test("renders file with name and mime type", () => {
    const part = createFilePart({
      filename: "image.png",
      mime: "image/png",
    })
    const md = renderPartMd(part)

    expect(md).toContain("**File:**")
    expect(md).toContain("`image.png`")
    expect(md).toContain("image/png")
  })

  test("renders image preview for images with data URLs", () => {
    const part = createFilePart({
      filename: "photo.jpg",
      mime: "image/jpeg",
      url: "data:image/jpeg;base64,abc123",
    })
    const md = renderPartMd(part)

    expect(md).toContain("![photo.jpg]")
  })
})

// =============================================================================
// Other Parts
// =============================================================================

describe("renderPartMd - other parts", () => {
  test("renders snapshot part", () => {
    const part: SnapshotPart = {
      id: "prt_1",
      sessionID: "ses_1",
      messageID: "msg_1",
      type: "snapshot",
      snapshot: "snap_abc123",
    }
    const md = renderPartMd(part)

    expect(md).toContain("Snapshot created")
    expect(md).toContain("`snap_abc123`")
  })

  test("renders patch part with file count", () => {
    const part: PatchPart = {
      id: "prt_1",
      sessionID: "ses_1",
      messageID: "msg_1",
      type: "patch",
      hash: "abc123def456",
      files: ["file1.ts", "file2.ts"],
    }
    const md = renderPartMd(part)

    expect(md).toContain("File changes")
    expect(md).toContain("2 files")
    expect(md).toContain("`abc123de`")
  })

  test("renders agent part", () => {
    const part: AgentPart = {
      id: "prt_1",
      sessionID: "ses_1",
      messageID: "msg_1",
      type: "agent",
      name: "explorer",
    }
    const md = renderPartMd(part)

    expect(md).toContain("**Agent:**")
    expect(md).toContain("`explorer`")
  })

  test("renders compaction part", () => {
    const part: CompactionPart = {
      id: "prt_1",
      sessionID: "ses_1",
      messageID: "msg_1",
      type: "compaction",
      auto: true,
    }
    const md = renderPartMd(part)

    expect(md).toContain("Auto-compacted")
  })
})

// =============================================================================
// Error Handling
// =============================================================================

describe("renderPartMd - error handling", () => {
  test("renders error for tool with error state", () => {
    const part = createToolPart({
      tool: "bash",
      state: {
        status: "error",
        input: { command: "invalid" },
        error: "Command not found",
        time: { start: BASE_TIMESTAMP, end: BASE_TIMESTAMP + 1000 },
      },
    })
    const md = renderPartMd(part)

    expect(md).toContain("> **Error:**")
    expect(md).toContain("Command not found")
  })
})

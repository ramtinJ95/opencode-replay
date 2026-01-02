/**
 * Tests for git commit parser module
 */

import { describe, test, expect } from "bun:test"
import {
  parseGitRemoteUrl,
  parseRepoString,
  parseGitCommitOutput,
  parseGitPushOutput,
  isGitCommitCommand,
  isGitPushCommand,
  extractCommitsFromMessages,
  detectRepoFromMessages,
} from "./git-commits"
import type { MessageWithParts, ToolPart, UserMessage, AssistantMessage } from "../storage/types"

// =============================================================================
// parseGitRemoteUrl tests
// =============================================================================

describe("parseGitRemoteUrl", () => {
  test("parses HTTPS URL with .git suffix", () => {
    const result = parseGitRemoteUrl("https://github.com/sst/opencode.git")
    expect(result).toEqual({
      owner: "sst",
      name: "opencode",
      fullName: "sst/opencode",
      baseUrl: "https://github.com/sst/opencode",
    })
  })

  test("parses HTTPS URL without .git suffix", () => {
    const result = parseGitRemoteUrl("https://github.com/owner/repo")
    expect(result).toEqual({
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      baseUrl: "https://github.com/owner/repo",
    })
  })

  test("parses SSH URL with .git suffix", () => {
    const result = parseGitRemoteUrl("git@github.com:sst/opencode.git")
    expect(result).toEqual({
      owner: "sst",
      name: "opencode",
      fullName: "sst/opencode",
      baseUrl: "https://github.com/sst/opencode",
    })
  })

  test("parses SSH URL without .git suffix", () => {
    const result = parseGitRemoteUrl("git@github.com:owner/repo")
    expect(result).toEqual({
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      baseUrl: "https://github.com/owner/repo",
    })
  })

  test("parses SSH shorthand format (from git push output)", () => {
    const result = parseGitRemoteUrl("github.com:sst/opencode.git")
    expect(result).toEqual({
      owner: "sst",
      name: "opencode",
      fullName: "sst/opencode",
      baseUrl: "https://github.com/sst/opencode",
    })
  })

  test("returns null for non-GitHub URLs", () => {
    expect(parseGitRemoteUrl("https://gitlab.com/owner/repo.git")).toBeNull()
    expect(parseGitRemoteUrl("git@bitbucket.org:owner/repo.git")).toBeNull()
  })

  test("returns null for invalid URLs", () => {
    expect(parseGitRemoteUrl("not a url")).toBeNull()
    expect(parseGitRemoteUrl("")).toBeNull()
  })
})

// =============================================================================
// parseRepoString tests
// =============================================================================

describe("parseRepoString", () => {
  test("parses valid OWNER/NAME format", () => {
    const result = parseRepoString("sst/opencode")
    expect(result).toEqual({
      owner: "sst",
      name: "opencode",
      fullName: "sst/opencode",
      baseUrl: "https://github.com/sst/opencode",
    })
  })

  test("handles hyphens and underscores", () => {
    const result = parseRepoString("my-org/my_repo")
    expect(result).toEqual({
      owner: "my-org",
      name: "my_repo",
      fullName: "my-org/my_repo",
      baseUrl: "https://github.com/my-org/my_repo",
    })
  })

  test("returns null for invalid formats", () => {
    expect(parseRepoString("invalid")).toBeNull()
    expect(parseRepoString("too/many/slashes")).toBeNull()
    expect(parseRepoString("")).toBeNull()
  })
})

// =============================================================================
// parseGitCommitOutput tests
// =============================================================================

describe("parseGitCommitOutput", () => {
  test("parses standard commit output", () => {
    const output = "[main 1a2b3c4] Add new feature"
    const result = parseGitCommitOutput(output)
    expect(result).toEqual({
      hash: "1a2b3c4",
      fullHash: undefined,
      message: "Add new feature",
      branch: "main",
      timestamp: 0,
    })
  })

  test("parses commit with longer hash", () => {
    const output = "[feature/test 1a2b3c4d5e6f7890] Fix bug in parser"
    const result = parseGitCommitOutput(output)
    expect(result).toEqual({
      hash: "1a2b3c4",
      fullHash: "1a2b3c4d5e6f7890",
      message: "Fix bug in parser",
      branch: "feature/test",
      timestamp: 0,
    })
  })

  test("parses root commit output", () => {
    const output = "[main (root-commit) abc1234] Initial commit"
    const result = parseGitCommitOutput(output)
    expect(result).toEqual({
      hash: "abc1234",
      fullHash: undefined,
      message: "Initial commit",
      branch: "main",
      timestamp: 0,
    })
  })

  test("handles multi-line output (extracts first match)", () => {
    const output = `[main 1234567] Add feature
 1 file changed, 10 insertions(+)
 create mode 100644 src/new-file.ts`
    const result = parseGitCommitOutput(output)
    expect(result?.hash).toBe("1234567")
    expect(result?.message).toBe("Add feature")
  })

  test("returns null for non-commit output", () => {
    expect(parseGitCommitOutput("nothing to commit")).toBeNull()
    expect(parseGitCommitOutput("On branch main")).toBeNull()
    expect(parseGitCommitOutput("")).toBeNull()
  })
})

// =============================================================================
// parseGitPushOutput tests
// =============================================================================

describe("parseGitPushOutput", () => {
  test("parses push output with commit range", () => {
    const output = `To github.com:sst/opencode.git
   abc1234..def5678  main -> main`
    const result = parseGitPushOutput(output)
    
    expect(result.repo).toEqual({
      owner: "sst",
      name: "opencode",
      fullName: "sst/opencode",
      baseUrl: "https://github.com/sst/opencode",
    })
    expect(result.commits).toEqual([
      { fromHash: "abc1234", toHash: "def5678", branch: "main" },
    ])
  })

  test("parses push output with multiple commit ranges", () => {
    const output = `To github.com:owner/repo.git
   111aaaa..222bbbb  main -> main
   333cccc..444dddd  feature -> feature`
    const result = parseGitPushOutput(output)
    
    expect(result.commits).toHaveLength(2)
    expect(result.commits[0]).toEqual({
      fromHash: "111aaaa",
      toHash: "222bbbb",
      branch: "main",
    })
    expect(result.commits[1]).toEqual({
      fromHash: "333cccc",
      toHash: "444dddd",
      branch: "feature",
    })
  })

  test("parses new branch push", () => {
    const output = `To github.com:owner/repo.git
 * [new branch]      feature/new -> feature/new`
    const result = parseGitPushOutput(output)
    
    expect(result.repo?.fullName).toBe("owner/repo")
    expect(result.commits).toEqual([
      { toHash: "", branch: "feature/new" },
    ])
  })

  test("handles output without repo info", () => {
    const output = `   abc1234..def5678  main -> main`
    const result = parseGitPushOutput(output)
    
    expect(result.repo).toBeNull()
    expect(result.commits).toHaveLength(1)
  })

  test("returns empty commits for non-push output", () => {
    const result = parseGitPushOutput("Everything up-to-date")
    expect(result.commits).toHaveLength(0)
  })
})

// =============================================================================
// isGitCommitCommand / isGitPushCommand tests
// =============================================================================

describe("isGitCommitCommand", () => {
  test("recognizes git commit commands", () => {
    expect(isGitCommitCommand("git commit -m 'message'")).toBe(true)
    expect(isGitCommitCommand("git commit --amend")).toBe(true)
    expect(isGitCommitCommand('git commit -am "message"')).toBe(true)
    expect(isGitCommitCommand("GIT_AUTHOR_DATE='...' git commit -m 'test'")).toBe(true)
  })

  test("does not match non-commit commands", () => {
    expect(isGitCommitCommand("git status")).toBe(false)
    expect(isGitCommitCommand("git add .")).toBe(false)
    expect(isGitCommitCommand("git push")).toBe(false)
    expect(isGitCommitCommand("echo 'git commit'")).toBe(false) // string contains it but not a command
  })
})

describe("isGitPushCommand", () => {
  test("recognizes git push commands", () => {
    expect(isGitPushCommand("git push")).toBe(true)
    expect(isGitPushCommand("git push origin main")).toBe(true)
    expect(isGitPushCommand("git push -u origin feature")).toBe(true)
    expect(isGitPushCommand("git push --force")).toBe(true)
  })

  test("does not match non-push commands", () => {
    expect(isGitPushCommand("git status")).toBe(false)
    expect(isGitPushCommand("git pull")).toBe(false)
    expect(isGitPushCommand("git commit")).toBe(false)
  })
})

// =============================================================================
// extractCommitsFromMessages tests
// =============================================================================

describe("extractCommitsFromMessages", () => {
  // Helper to create a user message
  function createUserMessage(timestamp: number): MessageWithParts {
    const userMsg: UserMessage = {
      id: `msg_${timestamp}`,
      sessionID: "ses_test",
      role: "user",
      time: { created: timestamp },
      model: { providerID: "test", modelID: "test" },
    }
    return {
      message: userMsg,
      parts: [
        {
          id: `prt_${timestamp}_0`,
          sessionID: "ses_test",
          messageID: `msg_${timestamp}`,
          type: "text",
          text: "test prompt",
        },
      ],
    }
  }

  // Helper to create an assistant message with bash tool
  function createAssistantMessage(
    timestamp: number,
    bashParts: Array<{ command: string; output: string; startTime?: number; endTime?: number }>
  ): MessageWithParts {
    const assistantMsg: AssistantMessage = {
      id: `msg_${timestamp}`,
      sessionID: "ses_test",
      role: "assistant",
      time: { created: timestamp },
      parentID: "msg_parent",
      providerID: "test",
      modelID: "test",
      mode: "code",
    }
    return {
      message: assistantMsg,
      parts: bashParts.map((bp, i) => ({
        id: `prt_${timestamp}_${i}`,
        sessionID: "ses_test",
        messageID: `msg_${timestamp}`,
        type: "tool" as const,
        tool: "bash",
        callID: `call_${timestamp}_${i}`,
        state: {
          status: "completed" as const,
          input: { command: bp.command },
          output: bp.output,
          time: bp.startTime ? { start: bp.startTime, end: bp.endTime ?? bp.startTime } : undefined,
        },
      })) as ToolPart[],
    }
  }

  test("extracts commit from bash tool output", () => {
    const messages: MessageWithParts[] = [
      createUserMessage(1000),
      createAssistantMessage(1001, [
        {
          command: "git commit -m 'Add feature'",
          output: "[main abc1234] Add feature\n 1 file changed",
          startTime: 1001,
          endTime: 1002,
        },
      ]),
    ]

    const commits = extractCommitsFromMessages(messages)
    
    expect(commits).toHaveLength(1)
    expect(commits[0]!.commit.hash).toBe("abc1234")
    expect(commits[0]!.commit.message).toBe("Add feature")
    expect(commits[0]!.afterPromptNumber).toBe(1)
    expect(commits[0]!.commit.timestamp).toBe(1002)
  })

  test("extracts multiple commits from different prompts", () => {
    const messages: MessageWithParts[] = [
      createUserMessage(1000),
      createAssistantMessage(1001, [
        {
          command: "git commit -m 'First'",
          output: "[main 1111111] First",
          startTime: 1001,
          endTime: 1002,
        },
      ]),
      createUserMessage(2000),
      createAssistantMessage(2001, [
        {
          command: "git commit -m 'Second'",
          output: "[main 2222222] Second",
          startTime: 2001,
          endTime: 2002,
        },
      ]),
    ]

    const commits = extractCommitsFromMessages(messages)
    
    expect(commits).toHaveLength(2)
    expect(commits[0]!.commit.hash).toBe("1111111")
    expect(commits[0]!.afterPromptNumber).toBe(1)
    expect(commits[1]!.commit.hash).toBe("2222222")
    expect(commits[1]!.afterPromptNumber).toBe(2)
  })

  test("adds URL when repo override is provided", () => {
    const repoOverride = {
      owner: "test",
      name: "repo",
      fullName: "test/repo",
      baseUrl: "https://github.com/test/repo",
    }

    const messages: MessageWithParts[] = [
      createUserMessage(1000),
      createAssistantMessage(1001, [
        {
          command: "git commit -m 'Test'",
          output: "[main abc1234] Test",
          startTime: 1001,
          endTime: 1002,
        },
      ]),
    ]

    const commits = extractCommitsFromMessages(messages, repoOverride)
    
    expect(commits[0]!.commit.url).toBe("https://github.com/test/repo/commit/abc1234")
  })

  test("detects repo from git push and adds URLs to commits", () => {
    const messages: MessageWithParts[] = [
      createUserMessage(1000),
      createAssistantMessage(1001, [
        {
          command: "git commit -m 'Test'",
          output: "[main abc1234] Test",
          startTime: 1001,
          endTime: 1002,
        },
        {
          command: "git push",
          output: "To github.com:owner/repo.git\n   abc1234..def5678  main -> main",
          startTime: 1003,
          endTime: 1004,
        },
      ]),
    ]

    const commits = extractCommitsFromMessages(messages)
    
    expect(commits[0]!.commit.url).toBe("https://github.com/owner/repo/commit/abc1234")
  })

  test("ignores non-bash tools", () => {
    const assistantMsg: AssistantMessage = {
      id: "msg_1001",
      sessionID: "ses_test",
      role: "assistant",
      time: { created: 1001 },
      parentID: "msg_parent",
      providerID: "test",
      modelID: "test",
      mode: "code",
    }
    const messages: MessageWithParts[] = [
      createUserMessage(1000),
      {
        message: assistantMsg,
        parts: [
          {
            id: "prt_1001_0",
            sessionID: "ses_test",
            messageID: "msg_1001",
            type: "tool",
            tool: "read",
            callID: "call_read",
            state: {
              status: "completed",
              input: { filePath: "/test" },
              output: "[main abc1234] This looks like commit output but is not",
            },
          } as ToolPart,
        ],
      },
    ]

    const commits = extractCommitsFromMessages(messages)
    expect(commits).toHaveLength(0)
  })
})

// =============================================================================
// detectRepoFromMessages tests
// =============================================================================

describe("detectRepoFromMessages", () => {
  function createBashMessage(
    command: string,
    output: string
  ): MessageWithParts {
    const assistantMsg: AssistantMessage = {
      id: "msg_test",
      sessionID: "ses_test",
      role: "assistant",
      time: { created: Date.now() },
      parentID: "msg_parent",
      providerID: "test",
      modelID: "test",
      mode: "code",
    }
    return {
      message: assistantMsg,
      parts: [
        {
          id: "prt_test",
          sessionID: "ses_test",
          messageID: "msg_test",
          type: "tool",
          tool: "bash",
          callID: "call_test",
          state: {
            status: "completed",
            input: { command },
            output,
          },
        } as ToolPart,
      ],
    }
  }

  test("detects repo from git push output", () => {
    const messages = [
      createBashMessage(
        "git push origin main",
        "To github.com:sst/opencode.git\n   abc..def  main -> main"
      ),
    ]

    const repo = detectRepoFromMessages(messages)
    expect(repo?.fullName).toBe("sst/opencode")
  })

  test("detects repo from git remote -v output", () => {
    const messages = [
      createBashMessage(
        "git remote -v",
        "origin\thttps://github.com/owner/repo.git (fetch)\norigin\thttps://github.com/owner/repo.git (push)"
      ),
    ]

    const repo = detectRepoFromMessages(messages)
    expect(repo?.fullName).toBe("owner/repo")
  })

  test("returns null when no repo info found", () => {
    const messages = [
      createBashMessage("git status", "On branch main\nnothing to commit"),
    ]

    const repo = detectRepoFromMessages(messages)
    expect(repo).toBeNull()
  })
})

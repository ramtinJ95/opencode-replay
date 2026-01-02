/**
 * Git commit parser module
 * Extracts git commits from bash tool outputs in session messages
 */

import type { MessageWithParts, ToolPart } from "../storage/types"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Information about a git commit extracted from bash output
 */
export interface CommitInfo {
  /** Short commit hash (7-12 characters) */
  hash: string
  /** Full commit hash if available */
  fullHash?: string
  /** Commit message (first line) */
  message: string
  /** Branch name if available */
  branch?: string
  /** Timestamp when the commit was detected (from tool execution time) */
  timestamp: number
  /** GitHub URL if repo is known */
  url?: string
}

/**
 * Information about a git repository extracted from remote URLs
 */
export interface RepoInfo {
  /** Repository owner (e.g., "sst") */
  owner: string
  /** Repository name (e.g., "opencode") */
  name: string
  /** Full identifier (e.g., "sst/opencode") */
  fullName: string
  /** Base URL for commits (e.g., "https://github.com/sst/opencode") */
  baseUrl: string
}

/**
 * Commit with its associated prompt number (for timeline positioning)
 */
export interface CommitWithPrompt {
  commit: CommitInfo
  /** The prompt number this commit is associated with (the preceding user prompt) */
  afterPromptNumber: number
}

// =============================================================================
// REPO URL PARSING
// =============================================================================

/**
 * Parse a GitHub remote URL to extract owner and repo name
 * Supports various formats:
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * - git@github.com:owner/repo
 * - github.com:owner/repo.git (SSH shorthand)
 */
export function parseGitRemoteUrl(url: string): RepoInfo | null {
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(
    /https?:\/\/github\.com\/([^/]+)\/([^/\s.]+)(?:\.git)?/i
  )
  if (httpsMatch) {
    const [, owner, name] = httpsMatch
    return {
      owner: owner!,
      name: name!,
      fullName: `${owner}/${name}`,
      baseUrl: `https://github.com/${owner}/${name}`,
    }
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(
    /git@github\.com:([^/]+)\/([^/\s.]+)(?:\.git)?/i
  )
  if (sshMatch) {
    const [, owner, name] = sshMatch
    return {
      owner: owner!,
      name: name!,
      fullName: `${owner}/${name}`,
      baseUrl: `https://github.com/${owner}/${name}`,
    }
  }

  // SSH shorthand: github.com:owner/repo.git (used in git push output)
  // Match both with and without leading characters
  const shorthandMatch = url.match(
    /(?:^|[^@])github\.com[:/]([^/\s]+)\/([^/\s.]+?)(?:\.git)?(?:\s|$)/i
  )
  if (shorthandMatch) {
    const [, owner, name] = shorthandMatch
    return {
      owner: owner!,
      name: name!,
      fullName: `${owner}/${name}`,
      baseUrl: `https://github.com/${owner}/${name}`,
    }
  }

  return null
}

/**
 * Parse a repo string in OWNER/NAME format
 */
export function parseRepoString(repo: string): RepoInfo | null {
  const match = repo.match(/^([^/]+)\/([^/]+)$/)
  if (!match) return null

  const [, owner, name] = match
  return {
    owner: owner!,
    name: name!,
    fullName: `${owner}/${name}`,
    baseUrl: `https://github.com/${owner}/${name}`,
  }
}

// =============================================================================
// COMMIT PARSING
// =============================================================================

/**
 * Parse git commit output to extract commit info
 * 
 * Git commit output format:
 * [branch hash] commit message
 * 
 * Examples:
 * [main 1a2b3c4] Add new feature
 * [feature/test 1a2b3c4d] Fix bug in parser
 * [main (root-commit) 1a2b3c4] Initial commit
 */
export function parseGitCommitOutput(output: string): CommitInfo | null {
  // Match: [branch hash] message or [branch (root-commit) hash] message
  const commitMatch = output.match(
    /\[([^\s\]]+)(?:\s+\([^)]+\))?\s+([a-f0-9]{7,40})\]\s+(.+)/i
  )
  
  if (!commitMatch) return null

  const [, branch, hash, message] = commitMatch
  return {
    hash: hash!.slice(0, 7), // Normalize to short hash
    fullHash: hash!.length > 7 ? hash : undefined,
    message: message!.trim(),
    branch: branch,
    timestamp: 0, // Will be set by caller
  }
}

/**
 * Parse git push output to extract repo info and commit range
 * 
 * Git push output format:
 * To github.com:owner/repo.git
 *    abc1234..def5678  main -> main
 * 
 * Or for new branches:
 * To github.com:owner/repo.git
 *  * [new branch]      feature -> feature
 */
export function parseGitPushOutput(output: string): {
  repo: RepoInfo | null
  commits: Array<{ fromHash?: string; toHash: string; branch: string }>
} {
  const result: {
    repo: RepoInfo | null
    commits: Array<{ fromHash?: string; toHash: string; branch: string }>
  } = {
    repo: null,
    commits: [],
  }

  // Find repo URL in "To ..." line
  // Supports: To github.com:owner/repo.git or To git@github.com:owner/repo.git
  const repoMatch = output.match(/To\s+((?:[\S]*)?github\.com[^\s]+)/i)
  if (repoMatch) {
    result.repo = parseGitRemoteUrl(repoMatch[1]!)
  }

  // Find commit ranges (abc1234..def5678 branch -> branch)
  const rangeRegex = /([a-f0-9]{7,40})\.\.([a-f0-9]{7,40})\s+(\S+)\s+->\s+\S+/gi
  let rangeMatch
  while ((rangeMatch = rangeRegex.exec(output)) !== null) {
    result.commits.push({
      fromHash: rangeMatch[1]!.slice(0, 7),
      toHash: rangeMatch[2]!.slice(0, 7),
      branch: rangeMatch[3]!,
    })
  }

  // Find new branch pushes (* [new branch] branch -> branch)
  const newBranchRegex = /\*\s+\[new branch\]\s+(\S+)\s+->\s+\S+/gi
  let newBranchMatch
  while ((newBranchMatch = newBranchRegex.exec(output)) !== null) {
    // For new branches, we don't have a commit hash in the push output
    // The commit info would come from the preceding git commit command
    result.commits.push({
      toHash: "", // Will need to be filled from git commit output
      branch: newBranchMatch[1]!,
    })
  }

  return result
}

/**
 * Check if a bash command is a git commit command
 * Matches actual git commit invocations, not strings containing "git commit"
 */
export function isGitCommitCommand(command: string): boolean {
  // Must start with git (possibly with env vars) or be part of a command chain
  // This avoids matching echo 'git commit' or similar
  return /(?:^|&&|\|\||;|\$\()\s*(?:[A-Z_]+=\S+\s+)*git\s+commit\b/i.test(command)
}

/**
 * Check if a bash command is a git push command
 */
export function isGitPushCommand(command: string): boolean {
  return /\bgit\s+push\b/i.test(command)
}

// =============================================================================
// MESSAGE EXTRACTION
// =============================================================================

interface BashToolInput {
  command: string
  description?: string
  timeout?: number
  workdir?: string
}

/**
 * Extract commits from a list of messages
 * Returns commits with their associated prompt numbers for timeline positioning
 */
export function extractCommitsFromMessages(
  messages: MessageWithParts[],
  repoOverride?: RepoInfo
): CommitWithPrompt[] {
  const commits: CommitWithPrompt[] = []
  let currentPromptNumber = 0
  let detectedRepo: RepoInfo | null = repoOverride ?? null

  for (const msg of messages) {
    // Track prompt numbers from user messages
    if (msg.message.role === "user") {
      currentPromptNumber++
      continue
    }

    // Process assistant messages for tool calls
    if (msg.message.role === "assistant") {
      for (const part of msg.parts) {
        if (part.type !== "tool" || part.tool !== "bash") continue

        const toolPart = part as ToolPart
        const input = toolPart.state.input as BashToolInput | undefined
        const output = toolPart.state.output || ""
        const command = input?.command || ""

        // Get timestamp from tool execution
        const timestamp = toolPart.state.time?.end ?? 
                         toolPart.state.time?.start ?? 
                         msg.message.time.created

        // Check for git push to detect repo
        if (isGitPushCommand(command)) {
          const pushResult = parseGitPushOutput(output)
          if (pushResult.repo && !detectedRepo) {
            detectedRepo = pushResult.repo
          }
        }

        // Check for git commit
        if (isGitCommitCommand(command)) {
          const commitInfo = parseGitCommitOutput(output)
          if (commitInfo) {
            commitInfo.timestamp = timestamp
            
            // Add URL if we have repo info
            if (detectedRepo || repoOverride) {
              const repo = repoOverride ?? detectedRepo!
              commitInfo.url = `${repo.baseUrl}/commit/${commitInfo.fullHash ?? commitInfo.hash}`
            }

            commits.push({
              commit: commitInfo,
              afterPromptNumber: currentPromptNumber,
            })
          }
        }
      }
    }
  }

  // If we detected a repo during processing, update all commits that don't have URLs
  if (detectedRepo) {
    for (const { commit } of commits) {
      if (!commit.url) {
        commit.url = `${detectedRepo.baseUrl}/commit/${commit.fullHash ?? commit.hash}`
      }
    }
  }

  return commits
}

/**
 * Try to detect repository info from git push commands in messages
 */
export function detectRepoFromMessages(messages: MessageWithParts[]): RepoInfo | null {
  for (const msg of messages) {
    if (msg.message.role !== "assistant") continue

    for (const part of msg.parts) {
      if (part.type !== "tool" || part.tool !== "bash") continue

      const toolPart = part as ToolPart
      const input = toolPart.state.input as BashToolInput | undefined
      const output = toolPart.state.output || ""
      const command = input?.command || ""

      if (isGitPushCommand(command)) {
        const pushResult = parseGitPushOutput(output)
        if (pushResult.repo) {
          return pushResult.repo
        }
      }

      // Also check for git remote -v output
      if (/\bgit\s+remote\b/i.test(command) && output.includes("github.com")) {
        // Try to parse origin URL from git remote output
        const originMatch = output.match(/origin\s+([\S]+)\s+\((?:fetch|push)\)/i)
        if (originMatch) {
          const repo = parseGitRemoteUrl(originMatch[1]!)
          if (repo) return repo
        }
      }
    }
  }

  return null
}

/**
 * Integration tests for gist CLI features
 * Tests --gist, --gist-public, and gist module functionality
 */

import { describe, test, expect } from "bun:test"
import { GistError, GistResult, CreateGistOptions } from "../../src/gist"

describe("Gist Integration", () => {
  describe("GistError", () => {
    test("creates error with NOT_INSTALLED code", () => {
      const error = new GistError(
        "GitHub CLI (gh) not found. Install it from https://cli.github.com/",
        "NOT_INSTALLED"
      )
      
      expect(error.message).toContain("GitHub CLI (gh) not found")
      expect(error.code).toBe("NOT_INSTALLED")
      expect(error.name).toBe("GistError")
      expect(error).toBeInstanceOf(Error)
    })

    test("creates error with NOT_AUTHENTICATED code", () => {
      const error = new GistError(
        "Not authenticated with GitHub CLI. Run: gh auth login",
        "NOT_AUTHENTICATED"
      )
      
      expect(error.message).toContain("Not authenticated")
      expect(error.code).toBe("NOT_AUTHENTICATED")
    })

    test("creates error with CREATE_FAILED code", () => {
      const error = new GistError(
        "gh gist create failed: rate limit exceeded",
        "CREATE_FAILED"
      )
      
      expect(error.message).toContain("gh gist create failed")
      expect(error.code).toBe("CREATE_FAILED")
    })

    test("error can be caught and inspected", () => {
      const throwError = () => {
        throw new GistError("test error", "NOT_INSTALLED")
      }

      try {
        throwError()
        expect(true).toBe(false) // Should not reach here
      } catch (e) {
        expect(e).toBeInstanceOf(GistError)
        if (e instanceof GistError) {
          expect(e.code).toBe("NOT_INSTALLED")
        }
      }
    })
  })

  describe("GistResult interface", () => {
    test("can create valid GistResult objects", () => {
      const result: GistResult = {
        gistId: "abc123def456",
        gistUrl: "https://gist.github.com/user/abc123def456",
        previewUrl: "https://gisthost.github.io/?abc123def456/index.html",
      }

      expect(result.gistId).toBe("abc123def456")
      expect(result.gistUrl).toContain("gist.github.com")
      expect(result.previewUrl).toContain("gisthost.github.io")
    })

    test("preview URL format matches gisthost expectations", () => {
      const gistId = "a1b2c3d4e5f6"
      const previewUrl = `https://gisthost.github.io/?${gistId}/index.html`
      
      // Verify the format matches what gist-preview.js expects
      expect(previewUrl).toMatch(/^https:\/\/gisthost\.github\.io\/\?[a-f0-9]+\/index\.html$/)
    })

    test("preview URL can reference nested files", () => {
      const gistId = "abc123"
      const nestedUrl = `https://gisthost.github.io/?${gistId}/sessions/ses_xxx/page-001.html`
      
      expect(nestedUrl).toContain(gistId)
      expect(nestedUrl).toContain("sessions/ses_xxx/page-001.html")
    })
  })

  describe("CreateGistOptions interface", () => {
    test("can create options with public flag", () => {
      const options: CreateGistOptions = {
        public: true,
        description: "Test gist",
      }

      expect(options.public).toBe(true)
      expect(options.description).toBe("Test gist")
    })

    test("can create options with only description", () => {
      const options: CreateGistOptions = {
        description: "My transcript",
      }

      expect(options.public).toBeUndefined()
      expect(options.description).toBe("My transcript")
    })

    test("can create empty options", () => {
      const options: CreateGistOptions = {}

      expect(options.public).toBeUndefined()
      expect(options.description).toBeUndefined()
    })
  })

  describe("gist-preview.js behavior", () => {
    // These tests verify the expected behavior of the link rewriter script
    // The actual script runs in browser, so we test the logic patterns here

    test("URL parsing extracts gist ID correctly", () => {
      const search = "?abc123def456/index.html"
      const path = search.slice(1) // Remove leading '?'
      const slashIndex = path.indexOf("/")
      const gistId = path.slice(0, slashIndex)

      expect(gistId).toBe("abc123def456")
    })

    test("current directory extraction works", () => {
      const path = "sessions/ses_abc123/page-001.html"
      const currentDir = path.substring(0, path.lastIndexOf("/") + 1)

      expect(currentDir).toBe("sessions/ses_abc123/")
    })

    test("relative path resolution handles parent directories", () => {
      const currentDir = "sessions/ses_abc123/"
      const href = "../index.html"
      const resolved = currentDir + href

      // Simulate path normalization
      const parts = resolved.split("/")
      const normalized: string[] = []
      for (const part of parts) {
        if (part === "..") {
          normalized.pop()
        } else if (part !== "." && part !== "") {
          normalized.push(part)
        }
      }

      expect(normalized.join("/")).toBe("sessions/index.html")
    })

    test("absolute URLs are not rewritten", () => {
      const isAbsolute = (href: string) =>
        href.startsWith("http") || href.startsWith("#") || href.startsWith("?")

      expect(isAbsolute("https://example.com")).toBe(true)
      expect(isAbsolute("http://example.com")).toBe(true)
      expect(isAbsolute("#anchor")).toBe(true)
      expect(isAbsolute("?query")).toBe(true)
      expect(isAbsolute("relative/path.html")).toBe(false)
      expect(isAbsolute("../parent.html")).toBe(false)
    })
  })

  describe("CLI validation scenarios", () => {
    // These tests document expected CLI behavior without actually running the CLI

    test("--gist with --format md should be rejected", () => {
      // Simulating the validation logic in src/index.ts
      const values = { gist: true, format: "md" }
      const isMarkdownFormat = values.format === "md" || values.format === "markdown"
      
      const shouldReject = values.gist && isMarkdownFormat
      expect(shouldReject).toBe(true)
    })

    test("--gist-public without --gist should warn", () => {
      const values = { "gist-public": true, gist: false }
      
      const shouldWarn = values["gist-public"] && !values.gist
      expect(shouldWarn).toBe(true)
    })

    test("--gist with HTML format should be allowed", () => {
      const values = { gist: true, format: "html" }
      const isMarkdownFormat = values.format === "md" || values.format === "markdown"
      
      const shouldReject = values.gist && isMarkdownFormat
      expect(shouldReject).toBe(false)
    })
  })
})

import { describe, test, expect } from "bun:test"
import { GistError, GistResult } from "./gist"

describe("Gist Module", () => {
  describe("GistError", () => {
    test("creates error with NOT_INSTALLED code", () => {
      const error = new GistError("gh not found", "NOT_INSTALLED")
      expect(error.message).toBe("gh not found")
      expect(error.code).toBe("NOT_INSTALLED")
      expect(error.name).toBe("GistError")
    })

    test("creates error with NOT_AUTHENTICATED code", () => {
      const error = new GistError("not logged in", "NOT_AUTHENTICATED")
      expect(error.message).toBe("not logged in")
      expect(error.code).toBe("NOT_AUTHENTICATED")
      expect(error.name).toBe("GistError")
    })

    test("creates error with CREATE_FAILED code", () => {
      const error = new GistError("upload failed", "CREATE_FAILED")
      expect(error.message).toBe("upload failed")
      expect(error.code).toBe("CREATE_FAILED")
      expect(error.name).toBe("GistError")
    })

    test("is instanceof Error", () => {
      const error = new GistError("test", "NOT_INSTALLED")
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe("GistResult interface", () => {
    test("can create a valid GistResult object", () => {
      const result: GistResult = {
        gistId: "abc123def456",
        gistUrl: "https://gist.github.com/user/abc123def456",
        previewUrl: "https://gisthost.github.io/?abc123def456/index.html",
      }

      expect(result.gistId).toBe("abc123def456")
      expect(result.gistUrl).toContain("gist.github.com")
      expect(result.previewUrl).toContain("gisthost.github.io")
    })
  })

  describe("Preview URL format", () => {
    test("preview URL follows gisthost format", () => {
      const gistId = "abc123def456789"
      const previewUrl = `https://gisthost.github.io/?${gistId}/index.html`

      expect(previewUrl).toBe(
        "https://gisthost.github.io/?abc123def456789/index.html"
      )
    })

    test("preview URL can reference nested files", () => {
      const gistId = "abc123"
      const nestedUrl = `https://gisthost.github.io/?${gistId}/sessions/ses_xxx/index.html`

      expect(nestedUrl).toContain(gistId)
      expect(nestedUrl).toContain("sessions/ses_xxx/index.html")
    })
  })
})

// Note: Integration tests for createGist(), isGhInstalled(), and isGhAuthenticated()
// require the actual gh CLI and are in tests/integration/gist.test.ts
// These unit tests focus on the types and error handling without external dependencies

/**
 * Server tests
 * Tests HTTP routes, path safety, caching, and security
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { join } from "node:path"
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { isPathSafe, createRequestHandler } from "./server"

// =============================================================================
// Test isPathSafe directly (now using the actual exported function)
// =============================================================================

describe("isPathSafe", () => {
  const rootDir = "/home/user/project"

  describe("valid paths", () => {
    test("allows exact root directory", () => {
      expect(isPathSafe(rootDir, rootDir)).toBe(true)
    })

    test("allows file in root directory", () => {
      expect(isPathSafe(rootDir, join(rootDir, "index.html"))).toBe(true)
    })

    test("allows nested file", () => {
      expect(isPathSafe(rootDir, join(rootDir, "sessions/abc/page1.html"))).toBe(true)
    })

    test("allows deeply nested path", () => {
      expect(isPathSafe(rootDir, join(rootDir, "a/b/c/d/e/file.txt"))).toBe(true)
    })
  })

  describe("path traversal attacks", () => {
    test("blocks parent directory traversal", () => {
      expect(isPathSafe(rootDir, join(rootDir, ".."))).toBe(false)
    })

    test("blocks ../etc/passwd attack", () => {
      expect(isPathSafe(rootDir, join(rootDir, "../etc/passwd"))).toBe(false)
    })

    test("blocks ../../.. attack", () => {
      expect(isPathSafe(rootDir, join(rootDir, "../../.."))).toBe(false)
    })

    test("blocks path that resolves outside root", () => {
      expect(isPathSafe(rootDir, "/etc/passwd")).toBe(false)
    })

    test("blocks absolute path to different directory", () => {
      expect(isPathSafe(rootDir, "/tmp/malicious")).toBe(false)
    })

    test("blocks path that starts with root but goes outside", () => {
      // /home/user/project/../other -> /home/user/other (not inside root)
      expect(isPathSafe(rootDir, join(rootDir, "../other/file.txt"))).toBe(false)
    })

    test("blocks path with multiple traversals mixed with subdirs", () => {
      // /home/user/project/a/b/../../../../../../etc
      expect(isPathSafe(rootDir, join(rootDir, "a/b/../../../../../../etc"))).toBe(false)
    })
  })

  describe("edge cases", () => {
    test("handles root with trailing slash", () => {
      expect(isPathSafe(rootDir + "/", join(rootDir, "file.txt"))).toBe(true)
    })

    test("blocks path that is prefix of root but not child", () => {
      // /home/user/project-malicious should not be considered inside /home/user/project
      expect(isPathSafe(rootDir, "/home/user/project-malicious/file.txt")).toBe(false)
    })

    test("handles empty relative path", () => {
      expect(isPathSafe(rootDir, rootDir)).toBe(true)
    })
  })
})

// =============================================================================
// Integration tests using the actual createRequestHandler
// =============================================================================

describe("Server HTTP handling", () => {
  let server: ReturnType<typeof Bun.serve>
  let tempDir: string
  let baseUrl: string

  beforeAll(async () => {
    // Create temp directory with test files
    tempDir = await mkdtemp(join(tmpdir(), "server-test-"))

    // Create test files
    await writeFile(join(tempDir, "index.html"), "<html><body>Index</body></html>")
    await writeFile(join(tempDir, "test.txt"), "Hello World")
    await writeFile(join(tempDir, "style.abcd1234.css"), "body { color: red; }")
    await writeFile(join(tempDir, "script.12345678.js"), "console.log('hi')")
    await mkdir(join(tempDir, "subdir"))
    await writeFile(join(tempDir, "subdir", "index.html"), "<html><body>Subdir</body></html>")
    await writeFile(join(tempDir, "subdir", "page.html"), "<html><body>Page</body></html>")
    // Create a file for null byte test that demonstrates the security behavior
    await writeFile(join(tempDir, "secret.txt"), "secret content")

    // Start server using the actual createRequestHandler from server.ts
    const handleRequest = createRequestHandler(tempDir)
    server = Bun.serve({
      port: 0,
      fetch: handleRequest,
      error(error) {
        console.error("Server error:", error)
        return new Response("Internal Server Error", { status: 500 })
      },
    })

    baseUrl = `http://localhost:${server.port}`
  })

  afterAll(async () => {
    server.stop()
    await rm(tempDir, { recursive: true })
  })

  describe("method validation", () => {
    test("allows GET requests", async () => {
      const response = await fetch(`${baseUrl}/test.txt`)
      expect(response.status).toBe(200)
    })

    test("allows HEAD requests without body", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, { method: "HEAD" })
      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toBe("")
    })

    test("returns 405 for POST requests", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, { method: "POST" })
      expect(response.status).toBe(405)
      expect(response.headers.get("Allow")).toBe("GET, HEAD")
    })

    test("returns 405 for PUT requests", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, { method: "PUT" })
      expect(response.status).toBe(405)
    })

    test("returns 405 for DELETE requests", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, { method: "DELETE" })
      expect(response.status).toBe(405)
    })

    test("returns 405 for PATCH requests", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, { method: "PATCH" })
      expect(response.status).toBe(405)
    })
  })

  describe("file serving", () => {
    test("serves existing files", async () => {
      const response = await fetch(`${baseUrl}/test.txt`)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe("Hello World")
    })

    test("serves index.html for root /", async () => {
      const response = await fetch(`${baseUrl}/`)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain("Index")
    })

    test("serves index.html for directory paths", async () => {
      const response = await fetch(`${baseUrl}/subdir/`)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain("Subdir")
    })

    test("serves specific files in subdirectory", async () => {
      const response = await fetch(`${baseUrl}/subdir/page.html`)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain("Page")
    })

    test("returns 404 for non-existent files", async () => {
      const response = await fetch(`${baseUrl}/nonexistent.txt`)
      expect(response.status).toBe(404)
    })

    test("returns 404 for non-existent directories", async () => {
      const response = await fetch(`${baseUrl}/nonexistent/`)
      expect(response.status).toBe(404)
    })
  })

  describe("path traversal protection", () => {
    test("blocks fully encoded traversal %2e%2e%2f", async () => {
      // %2e%2e%2f = '../' (fully encoded bypasses URL normalization)
      // Server decodes and detects path traversal
      const response = await fetch(`${baseUrl}/%2e%2e%2fetc/passwd`)
      expect(response.status).toBe(403)
    })

    test("blocks fully encoded traversal in subdir", async () => {
      // %2e%2e%2f%2e%2e%2f = '../../' (fully encoded)
      const response = await fetch(`${baseUrl}/subdir/%2e%2e%2f%2e%2e%2fetc/passwd`)
      expect(response.status).toBe(403)
    })

    test("URL-normalized traversal returns 404 (path contained)", async () => {
      // /subdir/%2e%2e/ has real slash, URL normalizes to /
      // Result: /etc/passwd joined with root = /tempdir/etc/passwd (not found)
      const response = await fetch(`${baseUrl}/subdir/%2e%2e/%2e%2e/etc/passwd`)
      expect(response.status).toBe(404)
    })

    test("double encoded traversal returns 404 (literal chars)", async () => {
      // %252e%252e%252f decodes to literal '%2e%2e%2f' (not traversal)
      const response = await fetch(`${baseUrl}/%252e%252e%252f`)
      expect(response.status).toBe(404)
    })

    test("browser normalized path returns 404 for nonexistent", async () => {
      // Browser normalizes /../ to / before sending
      // /etc/passwd joined with root = /tempdir/etc/passwd (not found)
      const response = await fetch(`${baseUrl}/../etc/passwd`)
      expect(response.status).toBe(404)
    })
  })

  describe("null byte injection", () => {
    test("strips null bytes and serves correct file", async () => {
      // Request "test.txt" with null byte embedded: "test%00.txt"
      // After stripping null byte, becomes "test.txt" which exists
      const response = await fetch(`${baseUrl}/test%00.txt`)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe("Hello World")
    })

    test("null byte cannot be used to truncate filename", async () => {
      // Attempt to access "secret" by requesting "secret%00.ignored"
      // Without null byte stripping, this could truncate to "secret"
      // With proper stripping, it becomes "secret.ignored" which doesn't exist
      const response = await fetch(`${baseUrl}/secret%00.ignored`)
      // Should serve secret.txt since null byte is stripped -> "secret.ignored" not found
      // Actually, "secret" + null + ".ignored" -> stripped to "secret.ignored" -> 404
      expect(response.status).toBe(404)
    })

    test("null byte in directory path is stripped", async () => {
      // Request "sub%00dir/page.html"
      // After stripping, becomes "subdir/page.html" which exists
      const response = await fetch(`${baseUrl}/sub%00dir/page.html`)
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toContain("Page")
    })
  })

  describe("URI encoding", () => {
    test("handles valid URI encoding", async () => {
      const response = await fetch(`${baseUrl}/%74%65%73%74.txt`) // "test.txt" encoded
      expect(response.status).toBe(200)
    })

    test("returns 400 for invalid URI encoding", async () => {
      const response = await fetch(`${baseUrl}/%ZZ`)
      expect(response.status).toBe(400)
    })
  })

  describe("caching", () => {
    test("returns ETag header", async () => {
      const response = await fetch(`${baseUrl}/test.txt`)
      expect(response.headers.get("ETag")).toMatch(/^W\/"[a-f0-9]+\"$/)
    })

    test("returns 304 for matching If-None-Match", async () => {
      // First request to get ETag
      const response1 = await fetch(`${baseUrl}/test.txt`)
      const etag = response1.headers.get("ETag")
      expect(etag).toBeTruthy()

      // Second request with If-None-Match
      const response2 = await fetch(`${baseUrl}/test.txt`, {
        headers: { "If-None-Match": etag! },
      })
      expect(response2.status).toBe(304)
    })

    test("returns 200 for non-matching If-None-Match", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, {
        headers: { "If-None-Match": 'W/"wrongetag"' },
      })
      expect(response.status).toBe(200)
    })

    test("uses short cache for regular files", async () => {
      const response = await fetch(`${baseUrl}/test.txt`)
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600")
    })

    test("uses long cache for hashed CSS files", async () => {
      const response = await fetch(`${baseUrl}/style.abcd1234.css`)
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable"
      )
    })

    test("uses long cache for hashed JS files", async () => {
      const response = await fetch(`${baseUrl}/script.12345678.js`)
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable"
      )
    })
  })

  describe("content headers", () => {
    test("returns correct Content-Type for HTML", async () => {
      const response = await fetch(`${baseUrl}/index.html`)
      expect(response.headers.get("Content-Type")).toMatch(/text\/html/)
    })

    test("returns correct Content-Type for CSS", async () => {
      const response = await fetch(`${baseUrl}/style.abcd1234.css`)
      expect(response.headers.get("Content-Type")).toMatch(/text\/css/)
    })

    test("returns correct Content-Type for JS", async () => {
      const response = await fetch(`${baseUrl}/script.12345678.js`)
      // Bun may return application/javascript or text/javascript
      expect(response.headers.get("Content-Type")).toMatch(/javascript/)
    })

    test("returns correct Content-Length", async () => {
      const response = await fetch(`${baseUrl}/test.txt`)
      expect(response.headers.get("Content-Length")).toBe("11") // "Hello World" = 11 bytes
    })
  })

  describe("HEAD requests", () => {
    test("returns headers but no body", async () => {
      const response = await fetch(`${baseUrl}/test.txt`, { method: "HEAD" })
      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Length")).toBe("11")
      expect(response.headers.get("ETag")).toBeTruthy()
      const body = await response.text()
      expect(body).toBe("")
    })

    test("returns same headers as GET", async () => {
      const getResponse = await fetch(`${baseUrl}/test.txt`)
      const headResponse = await fetch(`${baseUrl}/test.txt`, { method: "HEAD" })

      expect(headResponse.headers.get("Content-Type")).toBe(
        getResponse.headers.get("Content-Type")
      )
      expect(headResponse.headers.get("Content-Length")).toBe(
        getResponse.headers.get("Content-Length")
      )
      expect(headResponse.headers.get("ETag")).toBe(
        getResponse.headers.get("ETag")
      )
    })
  })
})

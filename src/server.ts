/**
 * HTTP server for serving generated HTML transcripts
 * Uses Bun.serve() with security best practices
 */

import { resolve, join, sep } from "node:path"

export interface ServeOptions {
  /** Directory to serve files from */
  directory: string
  /** Port to listen on */
  port: number
  /** Whether to auto-open browser */
  open?: boolean
}

/**
 * Check if a path is safe (no directory traversal)
 * Uses platform-specific separator for Windows compatibility
 */
function isPathSafe(rootDir: string, targetPath: string): boolean {
  const resolvedRoot = resolve(rootDir)
  const resolvedTarget = resolve(targetPath)
  return (
    resolvedTarget.startsWith(resolvedRoot + sep) ||
    resolvedTarget === resolvedRoot
  )
}

/**
 * Start the static file server
 */
export async function serve(options: ServeOptions): Promise<void> {
  const { directory, port, open = true } = options
  const ROOT_DIR = resolve(directory)

  let server: ReturnType<typeof Bun.serve>

  try {
    server = Bun.serve({
    port,

    async fetch(req) {
      const url = new URL(req.url)

      // Only allow GET and HEAD methods
      if (req.method !== "GET" && req.method !== "HEAD") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" },
        })
      }

      // Decode and validate pathname
      let pathname: string
      try {
        pathname = decodeURIComponent(url.pathname)
      } catch {
        return new Response("Bad Request", { status: 400 })
      }

      // Security: remove null bytes
      pathname = pathname.replace(/\0/g, "")

      // Compute target path
      const targetPath = join(ROOT_DIR, pathname)

      // PATH TRAVERSAL PROTECTION
      if (!isPathSafe(ROOT_DIR, targetPath)) {
        return new Response("Forbidden", { status: 403 })
      }

      // Try to serve the file, or index.html for directories
      let file = Bun.file(targetPath)
      let fileExists = await file.exists()

      // For paths ending with / or non-existent paths, try index.html
      if (pathname.endsWith("/") || !fileExists) {
        const indexPath = join(targetPath, "index.html")
        const indexFile = Bun.file(indexPath)

        if (await indexFile.exists()) {
          file = indexFile
          fileExists = true
        }
      }

      // Return 404 if file doesn't exist
      if (!fileExists) {
        return new Response("Not Found", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        })
      }

      // Read file for ETag computation
      const content = await file.arrayBuffer()
      const etag = `W/"${Bun.hash(new Uint8Array(content)).toString(16)}"`

      // Check If-None-Match for 304 response
      const ifNoneMatch = req.headers.get("If-None-Match")
      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: etag },
        })
      }

      // Determine cache strategy (hashed assets get long cache)
      const isHashed =
        /\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$/i.test(
          targetPath
        )

      const responseHeaders: Record<string, string> = {
        "Content-Type": file.type,
        "Content-Length": String(content.byteLength),
        ETag: etag,
        "Cache-Control": isHashed
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      }

      // HEAD request - no body
      if (req.method === "HEAD") {
        return new Response(null, { headers: responseHeaders })
      }

      return new Response(content, { headers: responseHeaders })
    },

    error(error) {
      console.error("Server error:", error)
      return new Response("Internal Server Error", { status: 500 })
    },
  })
  } catch (err) {
    const error = err as NodeJS.ErrnoException
    if (error.code === "EADDRINUSE") {
      console.error(`Error: Port ${port} is already in use`)
      process.exit(1)
    }
    throw err
  }

  const serverUrl = `http://localhost:${port}`
  console.log(`\nServer running at ${serverUrl}`)
  console.log("Press Ctrl+C to stop\n")

  // Auto-open browser (cross-platform)
  if (open) {
    openBrowser(serverUrl)
  }

  // Graceful shutdown handlers with cleanup
  const sigintHandler = () => shutdown("SIGINT")
  const sigtermHandler = () => shutdown("SIGTERM")

  function shutdown(signal: string) {
    console.log(`\nReceived ${signal}, shutting down...`)
    // Remove signal handlers to prevent duplicate calls
    process.off("SIGINT", sigintHandler)
    process.off("SIGTERM", sigtermHandler)
    server.stop()
    console.log("Server stopped")
    process.exit(0)
  }

  process.on("SIGINT", sigintHandler)
  process.on("SIGTERM", sigtermHandler)

  // Keep process alive - server runs until signal
  await new Promise(() => {})
}

/**
 * Open a URL in the default browser (cross-platform)
 */
function openBrowser(url: string): void {
  const platform = process.platform
  
  if (platform === "darwin") {
    // macOS
    Bun.spawn(["open", url])
  } else if (platform === "win32") {
    // Windows - use cmd /c start with empty title
    Bun.spawn(["cmd", "/c", "start", "", url])
  } else {
    // Linux and others
    Bun.spawn(["xdg-open", url])
  }
}

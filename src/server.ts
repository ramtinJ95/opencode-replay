/**
 * HTTP server for serving generated HTML transcripts
 * Uses Bun.serve() with security best practices
 */

import { resolve, join } from "node:path"

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
 */
function isPathSafe(rootDir: string, targetPath: string): boolean {
  const resolvedRoot = resolve(rootDir)
  const resolvedTarget = resolve(targetPath)
  return (
    resolvedTarget.startsWith(resolvedRoot + "/") ||
    resolvedTarget === resolvedRoot
  )
}

/**
 * Start the static file server
 */
export async function serve(options: ServeOptions): Promise<void> {
  const { directory, port, open = true } = options
  const ROOT_DIR = resolve(directory)

  const server = Bun.serve({
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

      let file = Bun.file(targetPath)

      // Try index.html for directories or paths ending with /
      if (pathname.endsWith("/") || !(await file.exists())) {
        const indexPath = join(targetPath, "index.html")
        const indexFile = Bun.file(indexPath)

        if (await indexFile.exists()) {
          file = indexFile
        } else if (!(await Bun.file(targetPath).exists())) {
          return new Response("Not Found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          })
        }
      }

      // Check if file exists
      if (!(await file.exists())) {
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

  const serverUrl = `http://localhost:${port}`
  console.log(`\nServer running at ${serverUrl}`)
  console.log("Press Ctrl+C to stop\n")

  // Auto-open browser
  if (open) {
    const openCmd = process.platform === "darwin" ? "open" : "xdg-open"
    Bun.spawn([openCmd, serverUrl])
  }

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`)
    server.stop()
    console.log("Server stopped")
    process.exit(0)
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  // Keep process alive - server runs until signal
  await new Promise(() => {})
}

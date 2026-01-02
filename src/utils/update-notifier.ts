/**
 * Update notifier for opencode-replay CLI
 * Checks npm registry for newer versions and displays a notification
 */

import { homedir } from "node:os"
import { join } from "node:path"
import { mkdir } from "node:fs/promises"

const PACKAGE_NAME = "opencode-replay"
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheData {
  lastCheck: number
  latestVersion: string | null
}

interface UpdateInfo {
  current: string
  latest: string
  updateCommand: string
  packageManager: "bun" | "npm"
}

/**
 * Detect which package manager was used to install this package
 */
function detectPackageManager(): "bun" | "npm" {
  // Check the path of this module
  const modulePath = import.meta.dir
  
  // If installed via bun, path typically contains .bun
  if (modulePath.includes(".bun") || modulePath.includes("bun/install")) {
    return "bun"
  }
  
  // Check BUN_INSTALL environment variable (set when bun is the runtime)
  if (process.env.BUN_INSTALL) {
    return "bun"
  }
  
  // Check if we're running under bun runtime
  // @ts-ignore - Bun global exists in bun runtime
  if (typeof Bun !== "undefined") {
    // We're running in Bun, but could have been installed via npm
    // Check if bun is available as a command by checking common paths
    const bunInstallPath = join(homedir(), ".bun")
    try {
      // If .bun directory exists, likely installed with bun
      if (Bun.file(bunInstallPath).size) {
        return "bun"
      }
    } catch {
      // .bun doesn't exist
    }
  }
  
  // Default to npm
  return "npm"
}

/**
 * Get the cache file path
 */
function getCachePath(): string {
  // Use XDG cache directory or fallback
  const cacheDir = process.env.XDG_CACHE_HOME || join(homedir(), ".cache")
  return join(cacheDir, "opencode-replay", "update-check.json")
}

/**
 * Read the cache file
 */
async function readCache(): Promise<CacheData | null> {
  try {
    const cachePath = getCachePath()
    const file = Bun.file(cachePath)
    if (await file.exists()) {
      return await file.json()
    }
  } catch {
    // Cache doesn't exist or is invalid
  }
  return null
}

/**
 * Write to the cache file
 */
async function writeCache(data: CacheData): Promise<void> {
  try {
    const cachePath = getCachePath()
    // Ensure directory exists
    await mkdir(join(cachePath, ".."), { recursive: true })
    await Bun.write(cachePath, JSON.stringify(data))
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Fetch the latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      headers: {
        "Accept": "application/json",
      },
      // Short timeout to not slow down CLI
      signal: AbortSignal.timeout(3000),
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json() as { version?: string }
    return data.version || null
  } catch {
    // Network error or timeout
    return null
  }
}

/**
 * Compare two semver versions
 * Returns true if latest is newer than current
 */
function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split(".").map(Number)
  const latestParts = latest.split(".").map(Number)
  
  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0
    const l = latestParts[i] || 0
    if (l > c) return true
    if (l < c) return false
  }
  
  return false
}

/**
 * Check for updates and return info if an update is available
 * This is non-blocking and uses caching to avoid slowdowns
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const cache = await readCache()
    const now = Date.now()
    
    // Check if we should skip based on cache
    if (cache && (now - cache.lastCheck) < CHECK_INTERVAL_MS) {
      // Use cached result
      if (cache.latestVersion && isNewerVersion(currentVersion, cache.latestVersion)) {
        const pm = detectPackageManager()
        return {
          current: currentVersion,
          latest: cache.latestVersion,
          packageManager: pm,
          updateCommand: pm === "bun" 
            ? `bun update -g ${PACKAGE_NAME}`
            : `npm update -g ${PACKAGE_NAME}`,
        }
      }
      return null
    }
    
    // Fetch latest version (with timeout)
    const latestVersion = await fetchLatestVersion()
    
    // Update cache
    await writeCache({
      lastCheck: now,
      latestVersion,
    })
    
    // Check if update is available
    if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
      const pm = detectPackageManager()
      return {
        current: currentVersion,
        latest: latestVersion,
        packageManager: pm,
        updateCommand: pm === "bun" 
          ? `bun update -g ${PACKAGE_NAME}`
          : `npm update -g ${PACKAGE_NAME}`,
      }
    }
    
    return null
  } catch {
    // Don't let update check errors affect the CLI
    return null
  }
}

/**
 * Format the update notification message
 */
export function formatUpdateNotification(info: UpdateInfo): string {
  // ANSI codes for styling
  const reset = "\x1b[0m"
  const dim = "\x1b[2m"
  const bold = "\x1b[1m"
  const yellow = "\x1b[33m"
  const cyan = "\x1b[36m"
  const green = "\x1b[32m"
  
  // Box drawing characters
  const topLeft = "┌"
  const topRight = "┐"
  const bottomLeft = "└"
  const bottomRight = "┘"
  const horizontal = "─"
  const vertical = "│"
  
  // Build the message lines
  const line1 = `Update available: ${dim}${info.current}${reset} → ${green}${bold}${info.latest}${reset}`
  const line2 = `Run: ${cyan}${info.updateCommand}${reset}`
  
  // Calculate box width (account for ANSI codes)
  const contentWidth = Math.max(
    `Update available: ${info.current} → ${info.latest}`.length,
    `Run: ${info.updateCommand}`.length
  )
  const boxWidth = contentWidth + 4 // 2 padding on each side
  
  // Build the box
  const topBorder = `${yellow}${topLeft}${horizontal.repeat(boxWidth)}${topRight}${reset}`
  const bottomBorder = `${yellow}${bottomLeft}${horizontal.repeat(boxWidth)}${bottomRight}${reset}`
  
  // Pad lines to fit box
  const padLine = (line: string, visibleLength: number) => {
    const padding = boxWidth - visibleLength - 2
    return `${yellow}${vertical}${reset} ${line}${" ".repeat(padding)} ${yellow}${vertical}${reset}`
  }
  
  const paddedLine1 = padLine(line1, `Update available: ${info.current} → ${info.latest}`.length)
  const paddedLine2 = padLine(line2, `Run: ${info.updateCommand}`.length)
  
  return `\n${topBorder}\n${paddedLine1}\n${paddedLine2}\n${bottomBorder}\n`
}

/**
 * Check for updates and print notification if available
 * Call this at the end of CLI execution (non-blocking)
 */
export async function notifyIfUpdateAvailable(currentVersion: string): Promise<void> {
  // Don't show update notifications if stdout is not a TTY (e.g., piped output)
  if (!process.stdout.isTTY) {
    return
  }
  
  // Don't show if NO_COLOR is set (user prefers no decorations)
  if (process.env.NO_COLOR) {
    return
  }
  
  const updateInfo = await checkForUpdates(currentVersion)
  if (updateInfo) {
    console.error(formatUpdateNotification(updateInfo))
  }
}

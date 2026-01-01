/**
 * Quick test script to verify the storage reader works with real OpenCode data
 * Run with: bun src/test-reader.ts
 */

import {
  getDefaultStoragePath,
  listProjects,
  listSessions,
  listMessages,
  listParts,
  getMessagesWithParts,
} from "./storage"

async function main() {
  const storagePath = getDefaultStoragePath()
  console.log("Storage path:", storagePath)
  console.log("")

  // List projects
  console.log("=== PROJECTS ===")
  const projects = await listProjects(storagePath)
  console.log(`Found ${projects.length} projects`)

  if (projects.length === 0) {
    console.log("No projects found. Make sure OpenCode has been used.")
    return
  }

  for (const project of projects.slice(0, 3)) {
    console.log(`  - ${project.worktree} (${project.id.slice(0, 8)}...)`)
  }
  console.log("")

  // List sessions for first project
  const firstProject = projects[0]
  if (!firstProject) return

  console.log(`=== SESSIONS for ${firstProject.worktree} ===`)
  const sessions = await listSessions(storagePath, firstProject.id)
  console.log(`Found ${sessions.length} sessions`)

  for (const session of sessions.slice(0, 5)) {
    const date = new Date(session.time.created)
    console.log(`  - ${session.title.slice(0, 50)}...`)
    console.log(`    ID: ${session.id}`)
    console.log(`    Date: ${date.toLocaleDateString()}`)
  }
  console.log("")

  // Get messages for first session
  const firstSession = sessions[0]
  if (!firstSession) return

  console.log(`=== MESSAGES for session ${firstSession.id} ===`)
  const messages = await listMessages(storagePath, firstSession.id)
  console.log(`Found ${messages.length} messages`)

  for (const msg of messages.slice(0, 4)) {
    console.log(`  - [${msg.role}] ${msg.id}`)
  }
  console.log("")

  // Get parts for first message
  const firstMessage = messages[0]
  if (!firstMessage) return

  console.log(`=== PARTS for message ${firstMessage.id} ===`)
  const parts = await listParts(storagePath, firstMessage.id)
  console.log(`Found ${parts.length} parts`)

  for (const part of parts.slice(0, 5)) {
    console.log(`  - [${part.type}] ${part.id}`)
    if (part.type === "text") {
      console.log(`    Text: ${part.text.slice(0, 60)}...`)
    }
    if (part.type === "tool") {
      console.log(`    Tool: ${part.tool} (${part.state.status})`)
    }
  }
  console.log("")

  // Test combined query
  console.log("=== COMBINED: getMessagesWithParts ===")
  const messagesWithParts = await getMessagesWithParts(storagePath, firstSession.id)
  console.log(`Got ${messagesWithParts.length} messages with parts`)

  let totalParts = 0
  for (const { parts } of messagesWithParts) {
    totalParts += parts.length
  }
  console.log(`Total parts across all messages: ${totalParts}`)

  console.log("")
  console.log("All tests passed!")
}

main().catch(console.error)

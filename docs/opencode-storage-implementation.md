# OpenCode Storage Architecture

## Overview

This document provides a comprehensive explanation of how OpenCode stores session messages and information based on analysis of the official documentation and local storage structure.

## Storage Location

**Default Path:**
- **macOS/Linux**: `~/.local/share/opencode/`
- **Windows**: `%USERPROFILE%\.local\share\opencode`

---

## Directory Structure

```
~/.local/share/opencode/
├── auth.json              # API keys and OAuth tokens
├── bin/                   # OpenCode binaries
├── log/                   # Application logs (timestamped, keeps last 10)
├── snapshot/              # Project snapshots (by project hash)
│   └── {project_hash}/    # Per-project snapshot data
└── storage/               # Main data persistence layer
    ├── migration          # Migration version marker
    ├── project/           # Project entity files
    │   └── {project_hash}.json
    ├── session/           # Session entities (organized by project)
    │   └── {project_hash}/
    │       └── {session_id}.json
    ├── message/           # Message entities (organized by session)
    │   └── {session_id}/
    │       └── {message_id}.json
    ├── part/              # Message parts (organized by message)
    │   └── {message_id}/
    │       └── {part_id}.json
    ├── session_diff/      # File diffs per session
    │   └── {session_id}.json
    ├── todo/              # Todo lists per session
    │   └── {session_id}.json
    ├── plugin/            # Plugin data
    └── share/             # Shared session data
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PROJECT                                   │
│  - id: SHA-1 hash of worktree path                                 │
│  - worktree: "/path/to/project"                                    │
│  - vcsDir: "/path/to/project/.git"                                 │
│  - vcs: "git"                                                      │
│  - time: { created, updated }                                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ 1:N
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SESSION                                   │
│  - id: "ses_{timestamp}{random}"                                   │
│  - projectID: references Project.id                                │
│  - version: OpenCode version (e.g., "1.0.207")                     │
│  - directory: working directory                                    │
│  - title: auto-generated from first message                        │
│  - time: { created, updated }                                      │
│  - summary: { additions, deletions, files }                        │
│  - parentID: (optional) for branched sessions                      │
│  - revert/share: metadata for session features                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ 1:N
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           MESSAGE                                   │
│  - id: "msg_{timestamp}{random}"                                   │
│  - sessionID: references Session.id                                │
│  - role: "user" | "assistant"                                      │
│  - parentID: (for assistant) references parent user message        │
│  - time: { created, [completed] }                                  │
│  - agent: "build" | "docs" | "plan" | etc.                        │
│  - model: { providerID, modelID }                                  │
│  - tokens: { input, output, reasoning, cache }                     │
│  - cost: float                                                     │
│  - finish: "tool-calls" | "end_turn" | etc.                       │
│  - summary: { title, diffs[] }                                     │
│  - tools: { toolName: enabled }  (for user messages)               │
│  - path: { cwd, root }  (for assistant messages)                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ 1:N
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            PART                                     │
│  - id: "prt_{timestamp}{sequence}"                                 │
│  - messageID: references Message.id                                │
│  - sessionID: references Session.id                                │
│  - type: "text" | "tool" | "step-start" | "step-finish" |         │
│          "reasoning" | "file" | "snapshot" | "agent" | "retry"     │
│  - time: { start, end }                                            │
│  - [type-specific fields...]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity Details

### 1. Project (`storage/project/{hash}.json`)

The project is identified by a **SHA-1 hash** of the worktree path. This ensures unique identification across different directories.

```json
{
  "id": "437bb51279515345f7b879a07f651cfa601f1648",
  "worktree": "/home/user/workspace/my-project",
  "vcsDir": "/home/user/workspace/my-project/.git",
  "vcs": "git",
  "time": {
    "created": 1765304018823,
    "updated": 1767040841159
  }
}
```

### 2. Session (`storage/session/{project_hash}/{session_id}.json`)

Sessions are stored in a subdirectory named after the project hash. Each session file contains metadata about a conversation.

```json
{
  "id": "ses_4957d04cdffeJwdujYPBCKpIsb",
  "version": "1.0.207",
  "projectID": "437bb51279515345f7b879a07f651cfa601f1648",
  "directory": "/home/user/workspace/my-project",
  "title": "Migrating Salesforce loads from Matillion",
  "time": {
    "created": 1767018527538,
    "updated": 1767022799912
  },
  "summary": {
    "additions": 407,
    "deletions": 98,
    "files": 5
  }
}
```

**Key fields:**
- **parentID**: Links to a parent session (for branching/forking)
- **revert**: Contains undo/redo state
- **share**: Contains sharing metadata when using `/share`

### 3. Message (`storage/message/{session_id}/{message_id}.json`)

Messages are organized by session. There are two roles:

**User Message:**
```json
{
  "id": "msg_b6a82fb38001Ei3X3A63gRCfuN",
  "sessionID": "ses_4957d04cdffeJwdujYPBCKpIsb",
  "role": "user",
  "time": { "created": 1767018527551 },
  "summary": { "title": "Migrating Salesforce jobs to Prefect", "diffs": [] },
  "agent": "build",
  "model": { "providerID": "anthropic", "modelID": "claude-opus-4-5" },
  "tools": {
    "todowrite": false,
    "bash": true,
    "edit": false
  }
}
```

**Assistant Message:**
```json
{
  "id": "msg_b6a82fb4d001AV4Y5VjLn2J4MS",
  "sessionID": "ses_4957d04cdffeJwdujYPBCKpIsb",
  "role": "assistant",
  "parentID": "msg_b6a82fb38001Ei3X3A63gRCfuN",
  "time": { "created": 1767018527565, "completed": 1767018690875 },
  "modelID": "claude-opus-4-5",
  "providerID": "anthropic",
  "mode": "build",
  "agent": "build",
  "path": { "cwd": "/home/user/project", "root": "/home/user/project" },
  "cost": 0,
  "tokens": {
    "input": 2,
    "output": 438,
    "reasoning": 0,
    "cache": { "read": 0, "write": 18848 }
  },
  "finish": "tool-calls"
}
```

### 4. Part (`storage/part/{message_id}/{part_id}.json`)

Parts are the atomic content units within messages. They're organized by message ID.

**Part Types (from SDK analysis):**

| Type | Description |
|------|-------------|
| `text` | Plain text content (user input or AI response text) |
| `tool` | Tool call with input/output state |
| `step-start` | Marks the beginning of an AI response step |
| `step-finish` | Marks completion with token counts and cost |
| `reasoning` | Extended thinking/reasoning content |
| `file` | File reference or content |
| `snapshot` | Snapshot identifier for undo/redo |
| `agent` | Sub-agent invocation |
| `retry` | Retry attempt marker |

**Example - Text Part:**
```json
{
  "id": "prt_990882f75002cw7B1Eg1BdaxzV",
  "type": "text",
  "text": "I want to modify the bindings.conf file...",
  "synthetic": false,
  "time": { "start": 0, "end": 0 },
  "messageID": "msg_990882f75001T0nOQd4qo23BmY",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA"
}
```

**Example - Tool Part:**
```json
{
  "id": "prt_990884b1a001mwaFx5y2K922UF",
  "messageID": "msg_9908839fa001y36NNrb1hPFuOU",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA",
  "type": "tool",
  "tool": "list",
  "callID": "tooluse_g2DCZWIQR9OmPuANGXzq6w",
  "state": {
    "status": "completed",
    "input": { "path": "/home/ramtinj/.config/hypr" },
    "output": "/home/ramtinj/.config/hypr/\n  autostart.conf\n  ...",
    "metadata": { "count": 10, "truncated": false },
    "title": "home/ramtinj/.config/hypr",
    "time": { "start": 1759066475716, "end": 1759066475731 }
  }
}
```

**Example - Step Finish Part:**
```json
{
  "id": "prt_990884cd8001Y78uD2X7HO05Ev",
  "messageID": "msg_9908839fa001y36NNrb1hPFuOU",
  "sessionID": "ses_66f77d08fffe6XbrK2q9oQmmTA",
  "type": "step-finish",
  "tokens": {
    "input": 10444,
    "output": 84,
    "reasoning": 0,
    "cache": { "write": 0, "read": 7681 }
  },
  "cost": 0
}
```

---

## Additional Storage Entities

### 5. Session Diff (`storage/session_diff/{session_id}.json`)

Stores file changes (diffs) made during a session for undo/redo functionality:

```json
[
  {
    "file": ".github/workflows/deploy-prefect.yml",
    "before": "...(original content)...",
    "after": "...(modified content)...",
    "additions": 7,
    "deletions": 7
  }
]
```

### 6. Todo (`storage/todo/{session_id}.json`)

Stores the todo list for plan mode:

```json
[
  {
    "id": "1",
    "content": "Create Dockerfile with Prefect base image",
    "priority": "high",
    "status": "completed"
  },
  {
    "id": "2",
    "content": "Update GitHub workflow",
    "priority": "high",
    "status": "in-progress"
  }
]
```

### 7. Snapshots (`snapshot/{project_hash}/`)

File system snapshots for undo/redo operations.

---

## ID Format Patterns

| Entity | Pattern | Example |
|--------|---------|---------|
| Project | SHA-1 hash of worktree | `437bb51279515345f7b879a07f651cfa601f1648` |
| Session | `ses_{timestamp}{random}` | `ses_4957d04cdffeJwdujYPBCKpIsb` |
| Message | `msg_{timestamp}{random}` | `msg_b6a82fb38001Ei3X3A63gRCfuN` |
| Part | `prt_{timestamp}{sequence}` | `prt_990882f75002cw7B1Eg1BdaxzV` |

---

## Storage Implementation Notes

1. **File-based Storage**: OpenCode uses a simple JSON file-based storage system rather than SQLite or another database. Each entity is stored as a separate JSON file.

2. **Hierarchical Organization**: Data is organized hierarchically:
   - Project -> Sessions (by project hash directory)
   - Session -> Messages (by session ID directory)
   - Message -> Parts (by message ID directory)

3. **Timestamps**: The IDs contain embedded timestamps (Unix milliseconds), which helps with:
   - Natural chronological ordering when listing files
   - Unique ID generation without collisions

4. **Denormalization**: Both `sessionID` and `messageID` are stored in Part entities for efficient querying without needing to traverse the directory structure.

5. **Session Branching**: The `parentID` field in sessions supports session forking/branching features.

6. **Token Tracking**: Assistant messages track detailed token usage including cache read/write for cost optimization.

---

## Summary

OpenCode uses a **flat-file JSON storage system** with a clear entity hierarchy:

```
Project (1) ──┬── Session (N) ──┬── Message (N) ──┬── Part (N)
              │                 │                 │
              │                 ├── session_diff  │
              │                 └── todo          │
              └── snapshot                        └── (content: text, tool, reasoning, etc.)
```

This design prioritizes:
- **Simplicity**: No database dependencies
- **Portability**: Easy to move/backup data
- **Debuggability**: Human-readable JSON files
- **Flexibility**: Each session's data is self-contained

---

# Part 2: Source Code Deep Dive

The following sections provide a detailed analysis of the actual TypeScript implementation in the OpenCode repository (`sst/opencode`).

---

## Storage Module Implementation

**File**: `packages/opencode/src/storage/storage.ts`

### Core Architecture

The storage module uses a **file-based JSON storage system** with the following key characteristics:

```typescript
export namespace Storage {
  const log = Log.create({ service: "storage" })
  
  type Migration = (dir: string) => Promise<void>
  
  export const NotFoundError = NamedError.create(
    "NotFoundError",
    z.object({
      message: z.string(),
    }),
  )
}
```

### Storage Directory
- **Location**: `${Global.Path.data}/storage`
- Files are stored as JSON with `.json` extension
- Uses a key-based path system: `["session", projectId, sessionId]` → `storage/session/{projectId}/{sessionId}.json`

### CRUD Operations

#### Read (`storage.ts:167`)
```typescript
export async function read<T>(key: string[]) {
  const dir = await state().then((x) => x.dir)
  const target = path.join(dir, ...key) + ".json"
  return withErrorHandling(async () => {
    using _ = await Lock.read(target)  // Read lock for concurrency
    const result = await Bun.file(target).json()
    return result as T
  })
}
```

#### Write (`storage.ts:189`)
```typescript
export async function write<T>(key: string[], content: T) {
  const dir = await state().then((x) => x.dir)
  const target = path.join(dir, ...key) + ".json"
  return withErrorHandling(async () => {
    using _ = await Lock.write(target)  // Write lock for concurrency
    await Bun.write(target, JSON.stringify(content, null, 2))
  })
}
```

#### Update - Read-Modify-Write (`storage.ts:177`)
```typescript
export async function update<T>(key: string[], fn: (draft: T) => void) {
  const dir = await state().then((x) => x.dir)
  const target = path.join(dir, ...key) + ".json"
  return withErrorHandling(async () => {
    using _ = await Lock.write(target)
    const content = await Bun.file(target).json()
    fn(content)  // Mutate in place
    await Bun.write(target, JSON.stringify(content, null, 2))
    return content as T
  })
}
```

#### Remove (`storage.ts:159`)
```typescript
export async function remove(key: string[]) {
  const dir = await state().then((x) => x.dir)
  const target = path.join(dir, ...key) + ".json"
  return withErrorHandling(async () => {
    await fs.unlink(target).catch(() => {})
  })
}
```

#### List - Query (`storage.ts:206`)
```typescript
const glob = new Bun.Glob("**/*")
export async function list(prefix: string[]) {
  const dir = await state().then((x) => x.dir)
  try {
    const result = await Array.fromAsync(
      glob.scan({
        cwd: path.join(dir, ...prefix),
        // ... options
      })
    )
    // Returns array of key paths
  }
}
```

---

## File Locking System

**File**: `packages/opencode/src/util/lock.ts`

OpenCode implements a **read-write lock (RWLock)** pattern for concurrency control:

```typescript
export namespace Lock {
  const locks = new Map<
    string,
    {
      readers: number           // Count of active readers
      writer: boolean           // Is there an active writer?
      waitingReaders: (() => void)[]  // Queue of waiting readers
      waitingWriters: (() => void)[]  // Queue of waiting writers
    }
  >()
}
```

### Key Features:
- **Multiple concurrent readers** allowed when no writer is active
- **Exclusive writer access** - writers block all other operations
- **Writer priority** to prevent starvation
- Uses JavaScript's **`using` keyword** for automatic lock release (via `[Symbol.dispose]`)

---

## Migration System

**File**: `packages/opencode/src/storage/storage.ts:14-155`

### Migration Definition
```typescript
type Migration = (dir: string) => Promise<void>

const MIGRATIONS: Migration[] = [
  async (dir) => {
    // Migration 0: Project restructuring
    const project = path.resolve(dir, "../project")
    if (!fs.exists(project)) return
    // ... migrate session files
  },
]
```

### Migration Execution (`storage.ts:143-155`)
```typescript
const state = lazy(async () => {
  const dir = path.join(Global.Path.data, "storage")
  const migration = await Bun.file(path.join(dir, "migration"))
    .json()
    .then((x) => parseInt(x))
    .catch(() => 0)
    
  for (let index = migration; index < MIGRATIONS.length; index++) {
    log.info("running migration", { index })
    const migration = MIGRATIONS[index]
    await migration(dir).catch(() => log.error("failed to run migration", { index }))
    await Bun.write(path.join(dir, "migration"), (index + 1).toString())
  }
  return { dir }
})
```

### Migration Pattern:
1. **Version tracking**: Stored in `storage/migration` file as a number
2. **Sequential execution**: Runs all pending migrations in order
3. **Lazy initialization**: Only runs when storage is first accessed
4. **Error resilience**: Logs errors but continues on failure

---

## Entity Type Definitions (Zod Schemas)

### Project Type

**File**: `packages/opencode/src/project/project.ts:17`

```typescript
export namespace Project {
  export const Info = z.object({
    id: z.string(),
    worktree: z.string(),
    vcs: z.literal("git").optional(),
    name: z.string().optional(),
  }).meta({ ref: "Project" })
  export type Info = z.infer<typeof Info>
}
```

**Storage Key Pattern**: `["project", projectId]`

---

### Session Type

**File**: `packages/opencode/src/session/index.ts:38`

```typescript
export namespace Session {
  export const Info = z.object({
    id: Identifier.schema("session"),
    projectID: z.string(),
    directory: z.string(),
    parentID: Identifier.schema("session").optional(),
    share: z.object({
      url: z.string(),
    }).optional(),
    title: z.string(),
    version: z.string(),
    time: z.object({
      created: z.number(),
      updated: z.number(),
      compacting: z.number().optional(),
      archived: z.number().optional(),
    }),
    revert: z.object({
      messageID: z.string(),
      partID: z.string().optional(),
    }).optional(),
  }).meta({ ref: "Session" })
  export type Info = z.infer<typeof Info>
}
```

**Storage Key Pattern**: `["session", projectId, sessionId]`

---

### Message Types

**File**: `packages/opencode/src/session/message-v2.ts`

#### Base Message (`message-v2.ts:287`)
```typescript
const Base = z.object({
  id: z.string(),
  sessionID: z.string(),
})
```

#### User Message (`message-v2.ts:291`)
```typescript
export const User = Base.extend({
  role: z.literal("user"),
  time: z.object({
    created: z.number(),
  }),
  summary: z.object({
    title: z.string().optional(),
    diffs: z.array(/* FileDiff schema */).optional(),
  }).optional(),
  model: z.object({
    providerID: z.string(),
    modelID: z.string(),
  }),
  system: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
}).meta({ ref: "UserMessage" })
export type User = z.infer<typeof User>
```

#### Assistant Message (`message-v2.ts:335`)
```typescript
export const Assistant = Base.extend({
  role: z.literal("assistant"),
  time: z.object({
    created: z.number(),
    completed: z.number().optional(),
  }),
  parentID: z.string(),  // Links to user message
  providerID: z.string(),
  modelID: z.string(),
  mode: z.string(),  // "code", "compaction", etc.
  finish: z.enum(["stop", "tool-calls", "length", "content-filter", "error", "unknown"]).optional(),
  summary: z.string().optional(),
  error: /* error schema */.optional(),
  // ... usage stats
}).meta({ ref: "AssistantMessage" })
export type Assistant = z.infer<typeof Assistant>
```

#### Discriminated Union (`message-v2.ts:380`)
```typescript
export const Info = z.discriminatedUnion("role", [User, Assistant]).meta({
  ref: "Message",
})
export type Info = z.infer<typeof Info>
```

**Storage Key Pattern**: `["message", sessionId, messageId]`

---

### Part Types

**File**: `packages/opencode/src/session/message-v2.ts`

#### Part Base (`message-v2.ts:39`)
```typescript
const PartBase = z.object({
  id: z.string(),
  sessionID: z.string(),
  messageID: z.string(),
})
```

#### All Part Type Definitions

1. **TextPart** (`message-v2.ts:62`)
```typescript
export const TextPart = PartBase.extend({
  type: z.literal("text"),
  text: z.string(),
  synthetic: z.boolean().optional(),
  ignored: z.boolean().optional(),
  time: z.object({
    start: z.number().optional(),
    end: z.number().optional(),
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).meta({ ref: "TextPart" })
```

2. **ReasoningPart** (`message-v2.ts:80`)
```typescript
export const ReasoningPart = PartBase.extend({
  type: z.literal("reasoning"),
  text: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  time: z.object({
    start: z.number(),
    end: z.number().optional(),
  }),
}).meta({ ref: "ReasoningPart" })
```

3. **ToolPart** (`message-v2.ts:276`)
```typescript
export const ToolPart = PartBase.extend({
  type: z.literal("tool"),
  callID: z.string(),
  tool: z.string(),
  state: ToolState,  // pending | running | completed | error
  metadata: z.record(z.string(), z.any()).optional(),
}).meta({ ref: "ToolPart" })
export type ToolPart = z.infer<typeof ToolPart>
```

4. **FilePart** (`message-v2.ts:126`)
```typescript
export const FilePart = PartBase.extend({
  type: z.literal("file"),
  mime: z.string(),
  filename: z.string().optional(),
  url: z.string(),
  source: FilePartSource.optional(),
}).meta({ ref: "FilePart" })
```

5. **SnapshotPart** (`message-v2.ts:46`)
```typescript
export const SnapshotPart = PartBase.extend({
  type: z.literal("snapshot"),
  snapshot: z.string(),
}).meta({ ref: "SnapshotPart" })
```

6. **PatchPart** (`message-v2.ts:53`)
```typescript
export const PatchPart = PartBase.extend({
  type: z.literal("patch"),
  hash: z.string(),
  files: z.string().array(),
}).meta({ ref: "PatchPart" })
```

7. **AgentPart** (`message-v2.ts:137`)
```typescript
export const AgentPart = PartBase.extend({
  type: z.literal("agent"),
  name: z.string(),
  source: z.object({
    value: z.string(),
  }).optional(),
}).meta({ ref: "AgentPart" })
```

8. **CompactionPart** (`message-v2.ts:152`)
```typescript
export const CompactionPart = PartBase.extend({
  type: z.literal("compaction"),
  auto: z.boolean(),
}).meta({ ref: "CompactionPart" })
```

9. **SubtaskPart** (`message-v2.ts:160`)
```typescript
export const SubtaskPart = PartBase.extend({
  type: z.literal("subtask"),
  prompt: z.string(),
  description: z.string(),
  agent: z.string(),
  command: z.string().optional(),
})
```

10. **RetryPart** (`message-v2.ts:169`)
```typescript
export const RetryPart = PartBase.extend({
  type: z.literal("retry"),
  attempt: z.number(),
  error: APIError.Schema,
})
```

#### Part Discriminated Union (`message-v2.ts:317`)
```typescript
export const Part = z.discriminatedUnion("type", [
  TextPart,
  SubtaskPart,
  ReasoningPart,
  FilePart,
  AgentPart,
  CompactionPart,
  RetryPart,
  ToolPart,
  PatchPart,
  SnapshotPart,
]).meta({ ref: "Part" })
export type Part = z.infer<typeof Part>
```

**Storage Key Pattern**: `["part", messageId, partId]`

#### WithParts Aggregation (`message-v2.ts:416`)
```typescript
export const WithParts = z.object({
  info: Info,
  parts: z.array(Part),
})
export type WithParts = z.infer<typeof WithParts>
```

---

## Session API Functions

**File**: `packages/opencode/src/session/index.ts`

### Create Session (`index.ts:124`)
```typescript
export const create = fn(
  z.object({
    parentID: Identifier.schema("session").optional(),
    title: z.string().optional(),
  }).optional(),
  async (input) => {
    const result: Info = {
      id: Identifier.ascending("session"),
      projectID: Instance.project.id,
      directory: Instance.directory,
      parentID: input?.parentID,
      title: input?.title || `New session - ${new Date().toISOString()}`,
      version: Global.version,
      time: {
        created: Date.now(),
        updated: Date.now(),
      },
    }
    await Storage.write(["session", Instance.project.id, result.id], result)
    Bus.publish(Event.Created, { info: result })
    return result
  }
)
```

### Get Session (`index.ts:213`)
```typescript
export const get = fn(Identifier.schema("session"), async (id) => {
  const read = await Storage.read<Info>(["session", Instance.project.id, id])
  return read as Info
})
```

### List Sessions - Generator (`index.ts:278`)
```typescript
export async function* list() {
  const project = Instance.project
  for (const item of await Storage.list(["session", project.id])) {
    yield Storage.read<Info>(item)
  }
}
```

### Get Children Sessions (`index.ts:284`)
```typescript
export const children = fn(Identifier.schema("session"), async (parentID) => {
  const project = Instance.project
  const result = [] as Session.Info[]
  for (const item of await Storage.list(["session", project.id])) {
    const session = await Storage.read<Info>(item)
    if (session.parentID !== parentID) continue
    result.push(session)
  }
  return result
})
```

### Remove Session - Cascade Delete (`index.ts:296`)
```typescript
export const remove = fn(Identifier.schema("session"), async (sessionID) => {
  const project = Instance.project
  const session = await get(sessionID)
  
  // Remove children first
  for (const child of await children(sessionID)) {
    await remove(child.id)
  }
  
  // Remove all messages and parts
  for (const msg of await Storage.list(["message", sessionID])) {
    for (const part of await Storage.list(["part", msg.at(-1)!])) {
      await Storage.remove(part)
    }
    await Storage.remove(msg)
  }
  
  await Storage.remove(["session", project.id, sessionID])
  Bus.publish(Event.Deleted, { info: session })
})
```

### Get Messages with Parts (`index.ts:262`)
```typescript
export const messages = fn(
  z.object({
    sessionID: Identifier.schema("session"),
    limit: z.number().optional(),
  }),
  async (input) => {
    const result: MessageV2.WithParts[] = []
    for (const item of await Storage.list(["message", input.sessionID])) {
      const msg = await Storage.read<MessageV2.Info>(item)
      const parts = await MessageV2.parts(msg.id)
      result.push({ info: msg, parts })
    }
    return result
  }
)
```

### Update Message (`index.ts:318`)
```typescript
export const updateMessage = fn(MessageV2.Info, async (msg) => {
  await Storage.write(["message", msg.sessionID, msg.id], msg)
  Bus.publish(MessageV2.Event.Updated, { info: msg })
})
```

### Update Part (`index.ts:371`)
```typescript
export const updatePart = fn(UpdatePartInput, async (input) => {
  const part = "delta" in input ? input.part : input
  const delta = "delta" in input ? input.delta : undefined
  await Storage.write(["part", part.messageID, part.id], part)
  Bus.publish(MessageV2.Event.PartUpdated, { part, delta })
})
```

### Get Parts for Message (`message-v2.ts:555`)
```typescript
export const parts = fn(Identifier.schema("message"), async (messageID) => {
  const result = [] as MessageV2.Part[]
  for (const item of await Storage.list(["part", messageID])) {
    const read = await Storage.read<MessageV2.Part>(item)
    result.push(read)
  }
  result.sort((a, b) => (a.id > b.id ? 1 : -1))
  return result
})
```

---

## Event System

**File**: `packages/opencode/src/bus/index.ts`

### Bus Namespace
```typescript
export namespace Bus {
  const log = Log.create({ service: "bus" })
  type Subscription = (event: any) => void
}
```

### Event Definitions (`index.ts:88`)
```typescript
export namespace Session {
  export const Event = {
    Created: BusEvent.define("session.created", z.object({ info: Info })),
    Updated: BusEvent.define("session.updated", z.object({ info: Info })),
    Deleted: BusEvent.define("session.deleted", z.object({ info: Info })),
    Diff: BusEvent.define("session.diff", z.object({ sessionID: z.string(), diff: /* ... */ })),
    Error: BusEvent.define("session.error", z.object({ sessionID: z.string(), error: /* ... */ })),
  }
}
```

### Message Events (`message-v2.ts:384`)
```typescript
export namespace MessageV2 {
  export const Event = {
    Updated: BusEvent.define("message.updated", z.object({ info: Info })),
    Removed: BusEvent.define("message.removed", z.object({ sessionID: z.string(), messageID: z.string() })),
    PartUpdated: BusEvent.define("message.part.updated", z.object({ part: Part, delta: z.string().optional() })),
    PartRemoved: BusEvent.define("message.part.removed", z.object({ sessionID: z.string(), messageID: z.string(), partID: z.string() })),
  }
}
```

### Publishing Events
```typescript
Bus.publish(Event.Created, { info: result })
Bus.publish(MessageV2.Event.PartUpdated, { part, delta })
```

### Subscribing to Events (`bus/index.ts:66`)
```typescript
export function subscribe<Definition extends BusEvent.Definition>(
  def: Definition,
  callback: (event: { type: Definition["type"]; properties: z.infer<Definition["properties"]> }) => void,
) {
  return raw(def.type, callback)
}
```

---

## Message/Part Flow During Conversation

### User Sends Input

```typescript
// 1. Create user message
const userMsg: MessageV2.User = {
  id: Identifier.ascending("message"),
  role: "user",
  sessionID,
  time: { created: Date.now() },
  model: { providerID, modelID },
}
await Session.updateMessage(userMsg)

// 2. Create text part for user input
const userPart: MessageV2.Part = {
  type: "text",
  id: Identifier.ascending("part"),
  messageID: userMsg.id,
  sessionID,
  text: userInput,
}
await Session.updatePart(userPart)
```

### Assistant Response (Streaming)

**File**: `packages/opencode/src/session/processor.ts`

```typescript
// 1. Create assistant message
const assistantMessage: MessageV2.Assistant = {
  id: Identifier.ascending("message"),
  role: "assistant",
  parentID: userMsg.id,
  sessionID,
  mode: "code",
  providerID,
  modelID,
  time: { created: Date.now() },
}
await Session.updateMessage(assistantMessage)

// 2. Stream text parts (delta updates) - processor.ts:72
case "text-delta":
  if (value.id in textMap) {
    const part = textMap[value.id]
    part.text += value.text
    await Session.updatePart({ part, delta: value.text })  // Delta for streaming UI
  }
  break

// 3. Handle reasoning - processor.ts:80
case "reasoning-delta":
  if (value.id in reasoningMap) {
    const part = reasoningMap[value.id]
    part.text += value.text
    if (value.providerMetadata) part.metadata = value.providerMetadata
    if (part.text) await Session.updatePart({ part, delta: value.text })
  }
  break

// 4. Handle tool calls
case "tool-call":
  const toolPart: MessageV2.ToolPart = {
    id: Identifier.ascending("part"),
    messageID: assistantMessage.id,
    sessionID,
    type: "tool",
    callID: value.id,
    tool: value.name,
    state: { status: "pending", args: value.args },
  }
  await Session.updatePart(toolPart)
  break

// 5. Complete message - processor.ts:395
assistantMessage.time.completed = Date.now()
assistantMessage.finish = "stop"
await Session.updateMessage(assistantMessage)
```

---

## Querying Entities Programmatically

### List All Sessions for Current Project
```typescript
import { Session } from "@/session"
import { Instance } from "@/project/instance"

// Using generator
for await (const session of Session.list()) {
  console.log(session.id, session.title)
}

// Or collect all
const sessions: Session.Info[] = []
for await (const s of Session.list()) {
  sessions.push(s)
}
```

### Get Messages with Parts
```typescript
const messages = await Session.messages({ sessionID: "ses_xxx" })
for (const msg of messages) {
  console.log(msg.info.role, msg.info.id)
  for (const part of msg.parts) {
    console.log("  Part:", part.type, part.id)
  }
}
```

### Low-Level Storage Queries
```typescript
import { Storage } from "@/storage/storage"

// List all sessions for a project
const sessionKeys = await Storage.list(["session", projectId])
const sessions = await Promise.all(
  sessionKeys.map(key => Storage.read<Session.Info>(key))
)

// List all messages in a session
const messageKeys = await Storage.list(["message", sessionId])
const messages = await Promise.all(
  messageKeys.map(key => Storage.read<MessageV2.Info>(key))
)

// List all parts for a message
const partKeys = await Storage.list(["part", messageId])
const parts = await Promise.all(
  partKeys.map(key => Storage.read<MessageV2.Part>(key))
)
parts.sort((a, b) => (a.id > b.id ? 1 : -1))  // Sort by ID (chronological)
```

---

## Key Patterns & Abstractions

### 1. Namespace Pattern
All entities are organized in TypeScript namespaces with co-located types, events, and functions:
```typescript
export namespace Session {
  export const Info = z.object({ ... })
  export type Info = z.infer<typeof Info>
  export const Event = { ... }
  export const create = fn(...)
  export const get = fn(...)
}
```

### 2. Zod Schema-First Design
- All types defined with Zod schemas
- Runtime validation built-in
- Schema introspection with `.meta({ ref: "..." })`

### 3. `fn()` Wrapper Pattern
Function definitions use a wrapper for input validation:
```typescript
export const get = fn(Identifier.schema("session"), async (id) => { ... })
```

### 4. Event-Driven Updates
- All mutations publish events via `Bus.publish()`
- UI/consumers subscribe to events for reactivity

### 5. Hierarchical Key System
Storage keys follow a hierarchy pattern:
- `["project", projectId]`
- `["session", projectId, sessionId]`
- `["message", sessionId, messageId]`
- `["part", messageId, partId]`

---

## Implementation Summary Table

| Aspect | Implementation |
|--------|----------------|
| **Storage Backend** | File-based JSON (Bun.file, fs) |
| **Concurrency** | Read-Write Locks with writer priority |
| **Querying** | Glob-based key listing + individual reads |
| **Indexing** | None - relies on file system hierarchy |
| **Events** | Typed bus with publish/subscribe pattern |
| **Migrations** | Sequential version-tracked migrations |
| **Schema** | Zod schemas with discriminated unions |
| **Caching** | None at storage layer (lazy init only) |

---

## Source File Reference

| Component | File Path |
|-----------|-----------|
| Storage Core | `packages/opencode/src/storage/storage.ts` |
| Lock System | `packages/opencode/src/util/lock.ts` |
| Session Module | `packages/opencode/src/session/index.ts` |
| Message Types | `packages/opencode/src/session/message-v2.ts` |
| Project Module | `packages/opencode/src/project/project.ts` |
| Bus/Events | `packages/opencode/src/bus/index.ts` |
| Bus Events | `packages/opencode/src/bus/bus-event.ts` |
| Session Prompt | `packages/opencode/src/session/prompt.ts` |
| Session Processor | `packages/opencode/src/session/processor.ts` |
| Session Compaction | `packages/opencode/src/session/compaction.ts` |
| Session Revert | `packages/opencode/src/session/revert.ts` |
| Session Summary | `packages/opencode/src/session/summary.ts` |
# Test Best Practices for opencode-replay

This document outlines testing best practices compiled from research on Bun's test runner, TypeScript testing patterns, web server testing, and HTML rendering testing. The goal is to establish a comprehensive test suite that calcifies current behavior and detects regressions.

---

## Table of Contents

1. [Testing Framework: Bun](#1-testing-framework-bun)
2. [Test Organization](#2-test-organization)
3. [Testing Patterns](#3-testing-patterns)
4. [Coverage Goals](#4-coverage-goals)
5. [Testing HTTP Servers](#5-testing-http-servers)
6. [Testing HTML Rendering](#6-testing-html-rendering)
7. [What to Test vs What NOT to Test](#7-what-to-test-vs-what-not-to-test)
8. [Recommended Test Structure for This Project](#8-recommended-test-structure-for-this-project)

---

## 1. Testing Framework: Bun

Bun includes a fast, built-in test runner with Jest-compatible APIs. Zero configuration needed for TypeScript.

### Basic Setup

```bash
# Run all tests
bun test

# Run specific test file
bun test ./src/render/html.test.ts

# Run tests matching a pattern
bun test html render

# Run with coverage
bun test --coverage

# Update snapshots
bun test --update-snapshots
```

### Test File Discovery

Bun automatically finds test files matching:
- `*.test.{js|jsx|ts|tsx}`
- `*.spec.{js|jsx|ts|tsx}`
- `*_test.{js|jsx|ts|tsx}`

### Configuration (bunfig.toml)

```toml
[test]
root = "src"
preload = ["./test-setup.ts"]
timeout = 10000
coverage = true
coverageThreshold = { line = 0.80, function = 0.80, statement = 0.80 }
coverageSkipTestFiles = true
```

### Basic Test Structure

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from "bun:test";

describe("ModuleName", () => {
  beforeAll(() => {
    // Run once before all tests in this describe block
  });

  afterAll(() => {
    // Run once after all tests
  });

  beforeEach(() => {
    // Run before each test
  });

  afterEach(() => {
    // Run after each test
  });

  test("should do something", () => {
    expect(result).toBe(expected);
  });
});
```

### Available Matchers

```typescript
// Equality
expect(value).toBe(4);                    // Strict equality
expect(obj).toEqual({ a: 1 });            // Deep equality
expect(obj).toStrictEqual({ a: 1 });      // Strict deep equality

// Truthiness
expect(true).toBeTruthy();
expect(false).toBeFalsy();
expect(null).toBeNull();
expect(undefined).toBeUndefined();
expect("defined").toBeDefined();

// Numbers
expect(10).toBeGreaterThan(5);
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);

// Strings
expect("hello world").toContain("world");
expect("hello world").toMatch(/world$/);
expect("hello").toHaveLength(5);

// Arrays/Objects
expect([1, 2, 3]).toContain(2);
expect({ name: "John" }).toHaveProperty("name");

// Errors
expect(() => { throw new Error("oops"); }).toThrow("oops");
await expect(async () => { throw new Error("async"); }).rejects.toThrow();

// Snapshots
expect(html).toMatchSnapshot();
expect(html).toMatchInlineSnapshot(`<div>content</div>`);
```

### Mocking

```typescript
import { mock, spyOn } from "bun:test";

// Mock function
const mockFn = mock((x: number) => x * 2);
mockFn(5);
expect(mockFn).toHaveBeenCalledWith(5);
expect(mockFn).toHaveBeenCalledTimes(1);

// Spy on object method
const spy = spyOn(object, "methodName");
spy.mockReturnValue("mocked");

// Mock module
mock.module("./some-module", () => ({
  someFunction: mock(() => "mocked result"),
}));

// Clean up
afterEach(() => {
  mock.restore();
  mock.clearAllMocks();
});
```

### Test Modifiers

```typescript
test.skip("skipped test", () => {});           // Skip test
test.only("focused test", () => {});           // Run only this (with --only flag)
test.todo("implement later", () => {});        // Placeholder

// Parameterized tests
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [-1, 1, 0],
])("%d + %d = %d", (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

---

## 2. Test Organization

### Directory Structure (Recommended: Co-located)

```
src/
├── render/
│   ├── html.ts
│   ├── html.test.ts          # Co-located unit tests
│   ├── components/
│   │   ├── message.ts
│   │   └── message.test.ts
├── storage/
│   ├── reader.ts
│   └── reader.test.ts
├── server.ts
├── server.test.ts
tests/
├── integration/              # Integration tests
│   └── server.integration.test.ts
└── fixtures/                 # Shared test data
    └── sessions/
```

### File Naming Conventions

| Pattern | Usage |
|---------|-------|
| `*.test.ts` | Standard test files (recommended) |
| `*.integration.test.ts` | Integration tests |
| `fixtures/*.ts` | Test data fixtures |
| `test-setup.ts` | Global test setup |

### Test Description Best Practices

```typescript
// GOOD - Describes behavior/expectation
test("returns null when session is not found");
test("escapes HTML entities in user content");
test("renders message with correct role class");

// BAD - Describes implementation
test("calls map function");
test("uses if statement");
test("loops through array");
```

---

## 3. Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
test("renders session with messages", () => {
  // ARRANGE - Set up test data
  const session = {
    id: "test-session",
    messages: [{ role: "user", content: "Hello" }],
  };

  // ACT - Execute the function
  const html = renderSession(session);

  // ASSERT - Verify results
  expect(html).toContain("test-session");
  expect(html).toContain("Hello");
});
```

### Testing Pure Functions vs Side Effects

**Pure functions (easy to test):**
```typescript
function formatTimestamp(date: Date): string {
  return date.toISOString();
}

test("formats timestamp as ISO string", () => {
  const date = new Date("2024-01-15T12:00:00Z");
  expect(formatTimestamp(date)).toBe("2024-01-15T12:00:00.000Z");
});
```

**Functions with side effects (require mocking):**
```typescript
import { mock, beforeEach, afterEach } from "bun:test";

// Mock external dependencies
mock.module("./storage", () => ({
  readSession: mock(async () => ({ id: "1", messages: [] })),
}));

beforeEach(() => mock.clearAllMocks());
afterEach(() => mock.restore());
```

### Testing Async Code

```typescript
// Async/await (recommended)
test("loads session asynchronously", async () => {
  const session = await loadSession("123");
  expect(session.id).toBe("123");
});

// Resolves/rejects matchers
test("resolves with session data", async () => {
  await expect(loadSession("123")).resolves.toEqual({ id: "123" });
});

test("rejects when session not found", async () => {
  await expect(loadSession("invalid")).rejects.toThrow("Session not found");
});
```

### Test Isolation

```typescript
describe("SessionStore", () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();  // Fresh instance each test
  });

  afterEach(() => {
    mock.clearAllMocks();        // Clear mock call history
  });

  test("test A", () => {
    // Uses fresh store, not affected by other tests
  });

  test("test B", () => {
    // Also uses fresh store
  });
});
```

---

## 4. Coverage Goals

### Recommended Thresholds

Based on industry standards from major projects:

```toml
# bunfig.toml
[test]
coverage = true
coverageThreshold = { line = 0.80, function = 0.80, statement = 0.80 }
```

| Metric | Target | Description |
|--------|--------|-------------|
| Lines | 80% | Percentage of executable lines run |
| Functions | 80% | Percentage of functions called |
| Statements | 80% | Percentage of statements executed |
| Branches | 70% | Percentage of if/else/switch paths taken |

### Critical Note

**100% coverage != bug-free code.** Coverage measures execution, not correctness. Focus on meaningful tests over hitting numbers.

### What to Prioritize for Coverage

1. **Core rendering logic** - High coverage (90%+)
2. **Storage/reader functions** - High coverage (90%+)
3. **Utility functions** - High coverage (90%+)
4. **HTTP server routes** - Medium coverage (80%+)
5. **Error handling paths** - Ensure coverage

---

## 5. Testing HTTP Servers

### Key Principle: Use `port: 0`

Always use `port: 0` for automatic port assignment to avoid conflicts in parallel tests.

### Basic Server Testing

```typescript
import { test, expect, describe, beforeAll, afterAll } from "bun:test";

describe("Server Routes", () => {
  let server: ReturnType<typeof Bun.serve>;

  beforeAll(() => {
    server = Bun.serve({
      port: 0,  // Auto-assign available port
      fetch(req) {
        // Your handler
      }
    });
  });

  afterAll(() => {
    server.stop();
  });

  test("GET / returns session list", async () => {
    const response = await fetch(`${server.url}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });
});
```

### Using `using` Keyword (Recommended)

Automatic cleanup with TC39 Explicit Resource Management:

```typescript
test("session page returns HTML", async () => {
  using server = Bun.serve({
    port: 0,
    fetch: (req) => new Response("<html></html>", {
      headers: { "Content-Type": "text/html" }
    })
  });

  const response = await fetch(server.url);
  expect(response.status).toBe(200);
  // Server automatically stops when test exits
});
```

### Testing Handler Functions Directly (No Server)

For unit tests, test handlers without starting a server:

```typescript
// Define handler separately
const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname === "/") {
    return new Response("Home");
  }
  return new Response("Not Found", { status: 404 });
};

// Test directly
test("handler returns home page", async () => {
  const req = new Request("http://localhost/");
  const response = await handleRequest(req);
  expect(response.status).toBe(200);
});
```

### Testing Static File Serving

```typescript
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

describe("Static Files", () => {
  const testDir = join(import.meta.dir, "test-static");

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, "style.css"), "body { color: red; }");
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("serves CSS with correct content-type", async () => {
    // ... test implementation
  });
});
```

---

## 6. Testing HTML Rendering

### String Matching (Simple Cases)

```typescript
test("renders message content", () => {
  const html = renderMessage({ role: "user", content: "Hello" });
  
  expect(html).toContain("Hello");
  expect(html).toContain('class="message"');
  expect(html).toContain('data-role="user"');
});
```

### Snapshot Testing (Regression Detection)

```typescript
test("message component snapshot", () => {
  const html = renderMessage({ role: "assistant", content: "Hi there!" });
  expect(html).toMatchSnapshot();
});

// Update snapshots with: bun test --update-snapshots
```

### DOM-Based Testing (Complex Structures)

```typescript
import { JSDOM } from "jsdom";  // bun add jsdom

test("renders correct number of messages", () => {
  const html = renderSession({
    id: "1",
    messages: [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]
  });

  const dom = new JSDOM(html);
  const messages = dom.window.document.querySelectorAll(".message");
  expect(messages.length).toBe(2);
});
```

### Whitespace-Agnostic Comparison

```typescript
function normalizeHtml(html: string): string {
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

test("structure matches regardless of formatting", () => {
  const result = renderTemplate();
  const expected = `<div class="card"><h2>Title</h2></div>`;
  expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
});
```

### Testing CSS Classes

```typescript
// Regex approach (recommended for string output)
test("applies variant class", () => {
  const html = renderButton({ variant: "primary" });
  expect(html).toMatch(/class="[^"]*btn-primary[^"]*"/);
});

// DOM approach
test("button has expected classes", () => {
  const dom = new JSDOM(renderButton({ variant: "primary" }));
  const button = dom.window.document.querySelector("button");
  expect(button?.classList.contains("btn-primary")).toBe(true);
});
```

### Testing HTML Escaping

```typescript
test("escapes HTML in user content", () => {
  const html = renderMessage({
    role: "user",
    content: '<script>alert("xss")</script>'
  });

  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
});
```

### Comparison: When to Use Each Approach

| Approach | Use When | Example |
|----------|----------|---------|
| String `toContain` | Quick presence checks | `expect(html).toContain('class="active"')` |
| Regex `toMatch` | Pattern matching | `expect(html).toMatch(/data-id="\d+"/)` |
| Snapshot | Regression detection | `expect(html).toMatchSnapshot()` |
| JSDOM | Complex DOM queries | Counting elements, parent/child relationships |

---

## 7. What to Test vs What NOT to Test

### WHAT TO TEST

1. **Public interfaces** - Test through the public API
2. **Edge cases** - Empty inputs, special characters, boundary conditions
3. **Error handling** - Invalid inputs, error states
4. **Business logic** - Core functionality
5. **Rendering output** - Correct HTML structure and content
6. **Integration points** - Route handlers, data flow

### WHAT NOT TO TEST

1. **Implementation details**
   ```typescript
   // BAD - Tests internal state
   expect(component._isLoading).toBe(true);
   
   // GOOD - Tests observable behavior
   expect(html).toContain('class="loading"');
   ```

2. **Framework/library code**
   ```typescript
   // BAD - Testing Array.map works
   expect([1, 2].map(x => x * 2)).toEqual([2, 4]);
   
   // GOOD - Test YOUR logic
   expect(doubleAll([1, 2])).toEqual([2, 4]);
   ```

3. **TypeScript types at runtime**
   ```typescript
   // BAD
   expect(typeof result).toBe("string");
   
   // GOOD - Test the actual value
   expect(result).toBe("expected string");
   ```

4. **Trivial getters/setters**
   ```typescript
   // BAD
   expect(user.name).toBe("Alice");  // Just testing property access
   
   // GOOD - Test non-trivial logic
   expect(user.fullName).toBe("Alice Smith");  // Has logic
   ```

5. **Private functions directly**
   ```typescript
   // BAD - Access private method
   expect((obj as any).privateMethod()).toBe(result);
   
   // GOOD - Test through public interface
   expect(obj.publicMethod()).toBe(result);  // Implicitly tests private
   ```

---

## 8. Recommended Test Structure for This Project

Based on the project structure, here's the recommended test organization:

### Test Files Structure

```
src/
├── render/
│   ├── html.test.ts              # Test HTML generation helpers
│   ├── components/
│   │   ├── message.test.ts       # Test message rendering
│   │   ├── part.test.ts          # Test part rendering
│   │   └── tools/
│   │       └── tools.test.ts     # Test tool renderers
│   └── templates/
│       ├── base.test.ts          # Test base template
│       ├── session.test.ts       # Test session template
│       └── index-page.test.ts    # Test index page
├── storage/
│   ├── reader.test.ts            # Test storage reader
│   └── types.test.ts             # Test type guards
├── utils/
│   ├── format.test.ts            # Test formatters
│   ├── html.test.ts              # Test HTML utilities
│   └── id.test.ts                # Test ID utilities
├── server.test.ts                # Test server routes
tests/
├── integration/
│   └── full-render.test.ts       # Integration: full page renders
└── fixtures/
    └── index.ts                  # Test fixture factories
```

### Implementation Status

#### High Priority (Core Functionality) - COMPLETED

| File | Tests | Assertions | Status |
|------|-------|------------|--------|
| `tests/fixtures/index.ts` | - | - | ✅ Factory functions for test data |
| `src/utils/format.test.ts` | 31 | 73 | ✅ Date/time and number formatting |
| `src/utils/html.test.ts` | 58 | 84 | ✅ HTML escaping, markdown, URL validation |
| `src/utils/id.test.ts` | 30 | 37 | ✅ OpenCode ID parsing and validation |
| `src/storage/types.test.ts` | 27 | 53 | ✅ Type guards for messages and parts |
| `src/storage/reader.test.ts` | 34 | 70 | ✅ Storage reader with temp dir fixtures |
| `src/render/components/message.test.ts` | 32 | 63 | ✅ Message rendering |
| `src/render/html.test.ts` | 28 | 40 | ✅ HTML generation helpers |

**Total: 240 tests, 420 assertions, all passing in ~500ms**

#### Medium Priority (Templates & Components) - PENDING

- `src/render/templates/*.test.ts` - Page templates
- `src/render/components/tools/*.test.ts` - Tool renderers
- `src/server.test.ts` - HTTP routes

#### Lower Priority (Integration) - PENDING

- `tests/integration/full-render.test.ts` - End-to-end rendering

### Example Test: Storage Reader

```typescript
// src/storage/reader.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { StorageReader } from "./reader";

describe("StorageReader", () => {
  const testDir = join(import.meta.dir, "__test-data__");
  let reader: StorageReader;

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    // Create test session files
    await writeFile(
      join(testDir, "session-1.json"),
      JSON.stringify({ id: "session-1", messages: [] })
    );
    reader = new StorageReader(testDir);
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("lists available sessions", async () => {
    const sessions = await reader.listSessions();
    expect(sessions).toContain("session-1");
  });

  test("reads session by ID", async () => {
    const session = await reader.getSession("session-1");
    expect(session.id).toBe("session-1");
  });

  test("returns null for non-existent session", async () => {
    const session = await reader.getSession("non-existent");
    expect(session).toBeNull();
  });
});
```

### Example Test: Message Renderer

```typescript
// src/render/components/message.test.ts
import { describe, test, expect } from "bun:test";
import { JSDOM } from "jsdom";
import { renderMessage } from "./message";

describe("renderMessage", () => {
  describe("basic rendering", () => {
    test("renders user message", () => {
      const html = renderMessage({ role: "user", content: "Hello" });
      
      expect(html).toContain("Hello");
      expect(html).toMatch(/class="[^"]*message[^"]*"/);
      expect(html).toMatch(/data-role="user"/);
    });

    test("renders assistant message", () => {
      const html = renderMessage({ role: "assistant", content: "Hi there!" });
      
      expect(html).toContain("Hi there!");
      expect(html).toMatch(/data-role="assistant"/);
    });
  });

  describe("content handling", () => {
    test("escapes HTML in content", () => {
      const html = renderMessage({
        role: "user",
        content: '<script>alert("xss")</script>'
      });
      
      expect(html).not.toContain("<script>");
    });

    test("handles empty content", () => {
      const html = renderMessage({ role: "user", content: "" });
      expect(html).toMatch(/class="[^"]*message[^"]*"/);
    });
  });

  describe("snapshots", () => {
    test("user message snapshot", () => {
      const html = renderMessage({ role: "user", content: "Test message" });
      expect(html).toMatchSnapshot();
    });

    test("assistant message snapshot", () => {
      const html = renderMessage({ role: "assistant", content: "Response" });
      expect(html).toMatchSnapshot();
    });
  });
});
```

### Example Test: Server Routes

```typescript
// src/server.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";

describe("Server", () => {
  let server: ReturnType<typeof Bun.serve>;

  beforeAll(() => {
    // Import and start your server on random port
    server = Bun.serve({
      port: 0,
      fetch: (req) => {
        // Import your actual handler
        return handleRequest(req);
      }
    });
  });

  afterAll(() => {
    server.stop();
  });

  describe("GET /", () => {
    test("returns session list page", async () => {
      const response = await fetch(server.url);
      
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      
      const html = await response.text();
      expect(html).toContain("<!DOCTYPE html>");
    });
  });

  describe("GET /session/:id", () => {
    test("returns session page for valid ID", async () => {
      const response = await fetch(`${server.url}/session/test-session`);
      expect(response.status).toBe(200);
    });

    test("returns 404 for invalid session", async () => {
      const response = await fetch(`${server.url}/session/non-existent`);
      expect(response.status).toBe(404);
    });
  });

  describe("static assets", () => {
    test("serves CSS files", async () => {
      const response = await fetch(`${server.url}/assets/styles.css`);
      expect(response.headers.get("content-type")).toContain("text/css");
    });
  });
});
```

---

## CLI Quick Reference

```bash
# Run all tests
bun test

# Run tests in specific directory
bun test src/render

# Run tests matching pattern
bun test message

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch

# Update snapshots
bun test --update-snapshots

# Run only .only() tests
bun test --only

# Stop on first failure
bun test --bail

# Set timeout (ms)
bun test --timeout 10000
```

---

## Dependencies to Add

```bash
# For DOM parsing in tests
bun add -d jsdom
bun add -d @types/jsdom
```

---

## Summary Checklist

Before writing tests, ensure:

- [ ] Test file follows naming convention (`*.test.ts`)
- [ ] Tests are co-located with source files
- [ ] Using AAA pattern (Arrange-Act-Assert)
- [ ] Tests are isolated (use beforeEach for fresh state)
- [ ] Mocks are cleaned up in afterEach
- [ ] Testing behavior, not implementation
- [ ] Edge cases covered
- [ ] Snapshots used for regression detection
- [ ] Coverage targets met (80%+ for core logic)

/**
 * Tests for grep tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderGrepTool } from "./grep"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderGrepTool", () => {
  describe("basic rendering", () => {
    test("renders grep tool with pattern", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "function" },
          output: "src/index.ts:10:function test() {",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="tool-call tool-grep"')
      expect(html).toContain("function")
      expect(html).toContain("src/index.ts")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows pattern in header", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "import.*React" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-pattern"')
      expect(html).toContain("import.*React")
    })

    test("escapes HTML in pattern", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "<script>" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("search filters", () => {
    test("shows include filter when provided", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: {
            pattern: "test",
            include: "*.ts",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-include"')
      expect(html).toContain("*.ts")
      expect(html).toContain('title="File filter"')
    })

    test("omits include filter when not provided", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain('class="grep-include"')
    })

    test("shows search path when provided", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: {
            pattern: "test",
            path: "/home/user/project",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-path"')
      expect(html).toContain("/home/user/project")
    })

    test("uses default path when not provided", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-path"')
      expect(html).toContain(".")
    })

    test("escapes HTML in filters", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: {
            pattern: "test",
            include: "<script>*.ts",
            path: "/path/<script>",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("match count", () => {
    test("shows match count", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "function" },
          output: "file1.ts:10:function a()\nfile2.ts:20:function b()\nfile3.ts:30:function c()",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-count"')
      expect(html).toContain("3 matches")
    })

    test("shows zero matches", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "nonexistent" },
          output: "",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain("0 matches")
    })

    test("shows singular match", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          output: "file.ts:1:test",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain("1 matches")
    })
  })

  describe("match list", () => {
    test("renders match list with file, line, and content", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "import" },
          output: "src/index.ts:1:import React from 'react'\nsrc/utils.ts:5:import { helper } from './helper'",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-matches"')
      expect(html).toContain('class="grep-match"')
      expect(html).toContain('class="grep-match-file">src/index.ts</span>')
      expect(html).toContain('class="grep-match-line">:1</span>')
      expect(html).toContain("import React from")
      expect(html).toContain("src/utils.ts")
    })

    test("escapes HTML in match content", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "script" },
          output: "file.html:10:<script>alert('xss')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("shows message when no matches", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "nonexistent" },
          output: "",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-no-matches"')
      expect(html).toContain("No matches found")
    })

    test("marks long list as collapsed", () => {
      const longList = Array(25).fill(0).map((_, i) => `file${i}.ts:${i}:match`).join("\n")
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "match" },
          output: longList,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">+</span>')
    })

    test("does not collapse short list", () => {
      const shortList = Array(10).fill(0).map((_, i) => `file${i}.ts:${i}:match`).join("\n")
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "match" },
          output: shortList,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">-</span>')
    })
  })

  describe("output parsing", () => {
    test("parses standard grep output format", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          output: "file.ts:42:const test = 1;",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain("file.ts")
      expect(html).toContain(":42")
      expect(html).toContain("const test = 1;")
    })

    test("handles output without content", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          output: "file.ts:42",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain("file.ts")
      expect(html).toContain(":42")
    })

    test("handles multiline output", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "function" },
          output: "src/a.ts:10:function foo() {}\nsrc/b.ts:20:function bar() {}",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain("2 matches")
      expect(html).toContain("src/a.ts")
      expect(html).toContain("src/b.ts")
    })

    test("ignores invalid lines", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          output: "valid.ts:10:match\ninvalid line\nanother.ts:20:match",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      // Should only count valid matches
      expect(html).toContain("2 matches")
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "error",
          input: { pattern: "[invalid regex" },
          error: "Invalid regular expression",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-error"')
      expect(html).toContain("Invalid regular expression")
      expect(html).toContain("&#9888;")
    })

    test("escapes HTML in error", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "error",
          input: { pattern: "test" },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          output: "file.ts:1:test",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).not.toContain('class="grep-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })

    test("includes search icon", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="tool-icon">&#128270;</span>')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="tool-call tool-grep"')
    })

    test("handles empty pattern", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      expect(html).toContain('class="grep-pattern"></span>')
    })

    test("handles file paths with colons", () => {
      const part = createToolPart({
        tool: "grep",
        state: {
          status: "completed",
          input: { pattern: "test" },
          output: "C:\\Users\\file.ts:10:match content",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGrepTool(part)

      // Parser should handle this gracefully
      expect(html).toContain("C:")
    })
  })
})

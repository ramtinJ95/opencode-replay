/**
 * OpenCode Replay - Lightweight Syntax Highlighter
 * A minimal syntax highlighter for common programming languages
 * No external dependencies, works offline
 */

(function() {
  'use strict';

  // Language definitions with token patterns
  const languages = {
    // JavaScript/TypeScript
    javascript: {
      patterns: [
        { type: 'comment', pattern: /\/\/.*$/gm },
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//g },
        { type: 'string', pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'keyword', pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|async|await|yield|typeof|instanceof|in|of|void|delete|this|super|static|get|set)\b/g },
        { type: 'boolean', pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g },
        { type: 'number', pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/g },
        { type: 'function', pattern: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g },
        { type: 'class-name', pattern: /\b([A-Z][\w]*)\b/g },
        { type: 'operator', pattern: /[+\-*/%=<>!&|^~?:]+/g },
        { type: 'punctuation', pattern: /[{}[\]();,]/g }
      ]
    },
    typescript: { extends: 'javascript' },
    jsx: { extends: 'javascript' },
    tsx: { extends: 'javascript' },
    
    // Python
    python: {
      patterns: [
        { type: 'comment', pattern: /#.*$/gm },
        { type: 'string', pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g },
        { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'keyword', pattern: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|True|False|None)\b/g },
        { type: 'builtin', pattern: /\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|map|filter|reduce|zip|enumerate|sorted|reversed|sum|min|max|abs|round)\b/g },
        { type: 'number', pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/g },
        { type: 'function', pattern: /\b([a-zA-Z_][\w]*)\s*(?=\()/g },
        { type: 'class-name', pattern: /\bclass\s+([A-Z][\w]*)/g },
        { type: 'decorator', pattern: /@[\w.]+/g },
        { type: 'operator', pattern: /[+\-*/%=<>!&|^~@]+/g },
        { type: 'punctuation', pattern: /[{}[\]();:,]/g }
      ]
    },
    
    // JSON
    json: {
      patterns: [
        { type: 'property', pattern: /"[^"\\]*(?:\\.[^"\\]*)*"(?=\s*:)/g },
        { type: 'string', pattern: /"[^"\\]*(?:\\.[^"\\]*)*"/g },
        { type: 'number', pattern: /-?\b\d+\.?\d*([eE][+-]?\d+)?\b/g },
        { type: 'boolean', pattern: /\b(true|false|null)\b/g },
        { type: 'punctuation', pattern: /[{}[\]:,]/g }
      ]
    },
    
    // HTML/XML
    html: {
      patterns: [
        { type: 'comment', pattern: /<!--[\s\S]*?-->/g },
        { type: 'tag', pattern: /<\/?[\w-]+/g },
        { type: 'attr-name', pattern: /\s[\w-]+(?==)/g },
        { type: 'attr-value', pattern: /=\s*(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'punctuation', pattern: /[<>\/=]/g }
      ]
    },
    xml: { extends: 'html' },
    svg: { extends: 'html' },
    
    // CSS
    css: {
      patterns: [
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//g },
        { type: 'selector', pattern: /[^{}]+(?=\s*\{)/g },
        { type: 'property', pattern: /[\w-]+(?=\s*:)/g },
        { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'number', pattern: /-?\b\d+\.?\d*(px|em|rem|%|vh|vw|deg|s|ms)?\b/g },
        { type: 'function', pattern: /[\w-]+(?=\()/g },
        { type: 'punctuation', pattern: /[{}();:,]/g }
      ]
    },
    scss: { extends: 'css' },
    less: { extends: 'css' },
    
    // Bash/Shell
    bash: {
      patterns: [
        { type: 'comment', pattern: /#.*$/gm },
        { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'keyword', pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|break|continue|export|source|alias|unalias|cd|pwd|echo|printf|read|test)\b/g },
        { type: 'builtin', pattern: /\b(ls|cat|grep|sed|awk|find|xargs|sort|uniq|head|tail|wc|cut|tr|mkdir|rm|cp|mv|chmod|chown|curl|wget|tar|gzip|gunzip|ssh|scp|git|npm|yarn|bun|node|python|pip)\b/g },
        { type: 'variable', pattern: /\$[\w]+|\$\{[^}]+\}/g },
        { type: 'operator', pattern: /[|&;><]+/g },
        { type: 'punctuation', pattern: /[()[\]{}]/g }
      ]
    },
    sh: { extends: 'bash' },
    shell: { extends: 'bash' },
    zsh: { extends: 'bash' },
    
    // SQL
    sql: {
      patterns: [
        { type: 'comment', pattern: /--.*$/gm },
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//g },
        { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'keyword', pattern: /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CHECK|CONSTRAINT|CASCADE|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END)\b/gi },
        { type: 'number', pattern: /\b\d+\.?\d*\b/g },
        { type: 'operator', pattern: /[=<>!+\-*/%]+/g },
        { type: 'punctuation', pattern: /[(),;.]/g }
      ]
    },
    
    // Go
    go: {
      patterns: [
        { type: 'comment', pattern: /\/\/.*$/gm },
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//g },
        { type: 'string', pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'keyword', pattern: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g },
        { type: 'builtin', pattern: /\b(append|cap|close|complex|copy|delete|imag|len|make|new|panic|print|println|real|recover)\b/g },
        { type: 'boolean', pattern: /\b(true|false|nil|iota)\b/g },
        { type: 'number', pattern: /\b\d+\.?\d*([eE][+-]?\d+)?\b/g },
        { type: 'function', pattern: /\b([a-zA-Z_][\w]*)\s*(?=\()/g },
        { type: 'class-name', pattern: /\b([A-Z][\w]*)\b/g },
        { type: 'operator', pattern: /[+\-*/%=<>!&|^:]+/g },
        { type: 'punctuation', pattern: /[{}[\]();,]/g }
      ]
    },
    
    // Rust
    rust: {
      patterns: [
        { type: 'comment', pattern: /\/\/.*$/gm },
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//g },
        { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'keyword', pattern: /\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g },
        { type: 'builtin', pattern: /\b(Option|Result|Some|None|Ok|Err|Vec|String|Box|Rc|Arc|Cell|RefCell|HashMap|HashSet|println!|print!|format!|vec!|panic!|assert!|debug!)\b/g },
        { type: 'number', pattern: /\b\d+\.?\d*([eE][+-]?\d+)?[iu]?(8|16|32|64|128|size)?\b/g },
        { type: 'function', pattern: /\b([a-z_][\w]*)\s*(?=\()/g },
        { type: 'class-name', pattern: /\b([A-Z][\w]*)\b/g },
        { type: 'lifetime', pattern: /'[a-z_][\w]*/g },
        { type: 'operator', pattern: /[+\-*/%=<>!&|^:?]+/g },
        { type: 'punctuation', pattern: /[{}[\]();,]/g }
      ]
    },
    
    // YAML
    yaml: {
      patterns: [
        { type: 'comment', pattern: /#.*$/gm },
        { type: 'property', pattern: /^[\w-]+(?=\s*:)/gm },
        { type: 'string', pattern: /(["'])(?:(?!\1)[^\\]|\\.)*\1/g },
        { type: 'boolean', pattern: /\b(true|false|yes|no|on|off|null|~)\b/gi },
        { type: 'number', pattern: /\b\d+\.?\d*\b/g },
        { type: 'punctuation', pattern: /[:\-[\]{}|>]/g }
      ]
    },
    yml: { extends: 'yaml' },
    
    // Markdown
    markdown: {
      patterns: [
        { type: 'title', pattern: /^#{1,6}\s+.+$/gm },
        { type: 'bold', pattern: /\*\*[^*]+\*\*|__[^_]+__/g },
        { type: 'italic', pattern: /\*[^*]+\*|_[^_]+_/g },
        { type: 'code', pattern: /`[^`]+`/g },
        { type: 'url', pattern: /\[[^\]]+\]\([^)]+\)/g },
        { type: 'list', pattern: /^[\s]*[-*+]\s/gm },
        { type: 'blockquote', pattern: /^>\s.+$/gm }
      ]
    },
    md: { extends: 'markdown' },
    
    // Diff
    diff: {
      patterns: [
        { type: 'deleted', pattern: /^-.*$/gm },
        { type: 'inserted', pattern: /^\+.*$/gm },
        { type: 'coord', pattern: /^@@.*@@$/gm },
        { type: 'comment', pattern: /^(diff|index|---|\+\+\+).*$/gm }
      ]
    },
    
    // Plain text (no highlighting)
    text: { patterns: [] },
    plaintext: { patterns: [] }
  };

  // Resolve language extensions
  function getLanguagePatterns(lang) {
    const langDef = languages[lang] || languages.text;
    if (langDef.extends) {
      return languages[langDef.extends]?.patterns || [];
    }
    return langDef.patterns || [];
  }

  // Escape HTML special characters
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Highlight code with given language
  function highlight(code, lang) {
    const normalizedLang = (lang || 'text').toLowerCase().replace(/[^a-z0-9]/g, '');
    const patterns = getLanguagePatterns(normalizedLang);
    
    if (patterns.length === 0) {
      return escapeHtml(code);
    }

    // Track which parts of the code have been tokenized
    const tokens = [];
    
    // Apply each pattern
    for (const { type, pattern } of patterns) {
      // Reset pattern lastIndex
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(code)) !== null) {
        tokens.push({
          type,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0]
        });
      }
    }

    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    // Remove overlapping tokens (keep first match)
    const filtered = [];
    let lastEnd = 0;
    for (const token of tokens) {
      if (token.start >= lastEnd) {
        filtered.push(token);
        lastEnd = token.end;
      }
    }

    // Build highlighted HTML
    let result = '';
    let pos = 0;
    for (const token of filtered) {
      if (token.start > pos) {
        result += escapeHtml(code.slice(pos, token.start));
      }
      result += `<span class="token ${token.type}">${escapeHtml(token.text)}</span>`;
      pos = token.end;
    }
    if (pos < code.length) {
      result += escapeHtml(code.slice(pos));
    }

    return result;
  }

  // Find and highlight all code blocks on page load
  function highlightAll() {
    const codeBlocks = document.querySelectorAll('pre code[class*="language-"]');
    
    for (const block of codeBlocks) {
      // Extract language from class
      const classes = block.className.split(/\s+/);
      const langClass = classes.find(c => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : 'text';
      
      // Get original code text
      const code = block.textContent || '';
      
      // Apply highlighting
      block.innerHTML = highlight(code, lang);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightAll);
  } else {
    highlightAll();
  }

  // Expose API for dynamic use
  window.OpenCodeHighlight = {
    highlight,
    highlightAll,
    languages: Object.keys(languages)
  };
})();

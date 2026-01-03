/**
 * OpenCode Replay - Gist Preview Link Rewriter
 * Rewrites relative links for gisthost.github.io preview
 *
 * When HTML files are uploaded to GitHub Gist and viewed via gisthost.github.io,
 * relative links need to be rewritten to include the gist ID in the URL format:
 * ?GIST_ID/path/to/file.html
 *
 * This script runs only on gisthost.github.io and automatically rewrites all
 * relative links in the document.
 */
(function initGistPreview() {
  'use strict';

  // Only run on gisthost.github.io
  if (!window.location.host.includes('gisthost.github.io')) {
    return;
  }

  // Extract gist ID from URL
  // URL format: https://gisthost.github.io/?GIST_ID/filename.html
  var search = window.location.search;
  if (!search || search.length < 2) {
    return;
  }

  // Remove leading '?' and extract gist ID (everything before first '/')
  var path = search.slice(1);
  var slashIndex = path.indexOf('/');
  if (slashIndex === -1) {
    return;
  }

  var gistId = path.slice(0, slashIndex);
  if (!gistId) {
    return;
  }

  // Get current directory for resolving relative paths
  var currentPath = path.slice(slashIndex + 1);
  var currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

  /**
   * Resolve a relative path against the current directory
   * Handles './' and '../' prefixes
   */
  function resolvePath(href) {
    // Already absolute or anchor-only
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('?')) {
      return null;
    }

    var resolved = currentDir + href;

    // Normalize path (handle ../)
    var parts = resolved.split('/');
    var normalized = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === '..') {
        normalized.pop();
      } else if (part !== '.' && part !== '') {
        normalized.push(part);
      }
    }

    return normalized.join('/');
  }

  /**
   * Rewrite a single link element
   */
  function rewriteLink(link) {
    var href = link.getAttribute('href');
    if (!href) {
      return;
    }

    var resolved = resolvePath(href);
    if (resolved !== null) {
      link.setAttribute('href', '?' + gistId + '/' + resolved);
    }
  }

  /**
   * Rewrite all links in the document
   */
  function rewriteAllLinks() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      rewriteLink(links[i]);
    }
  }

  // Run on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rewriteAllLinks);
  } else {
    rewriteAllLinks();
  }

  // Also observe for dynamically added links (optional but useful)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'A' && node.hasAttribute('href')) {
              rewriteLink(node);
            }
            // Also check children
            var childLinks = node.querySelectorAll ? node.querySelectorAll('a[href]') : [];
            for (var i = 0; i < childLinks.length; i++) {
              rewriteLink(childLinks[i]);
            }
          }
        });
      });
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }
})();

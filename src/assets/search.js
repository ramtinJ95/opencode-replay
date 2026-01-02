/**
 * OpenCode Replay - Client-side Search
 * 
 * Features:
 * - Fetches paginated HTML pages on-demand
 * - Searches within .message elements using case-insensitive substring matching
 * - Displays results as they're found (streaming UX)
 * - Highlights matches with <mark> tags
 * - Supports URL fragment for shareable searches (#search=query)
 * - Progressive enhancement - hidden for file:// protocol (CORS)
 */

(function() {
  'use strict';

  // Configuration
  var BATCH_SIZE = 3; // Pages to fetch in parallel
  var MAX_RESULTS = 100; // Maximum results to display

  // State
  var modal = null;
  var searchInput = null;
  var searchStatus = null;
  var searchResults = null;
  var isSearching = false;

  // Detect page context
  var isSessionPage = window.location.pathname.includes('/sessions/');
  var isIndexPage = !isSessionPage;
  
  // Get total pages from data attribute (set by template)
  var totalPages = parseInt(document.body.dataset.totalPages || '0', 10);

  /**
   * Check if we can perform search (CORS limitation for file://)
   */
  function canSearch() {
    return window.location.protocol !== 'file:';
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Escape regex special characters
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create the search modal HTML
   */
  function createModal() {
    var modalHtml = '<dialog id="search-modal" class="search-modal">' +
      '<div class="search-modal-content">' +
        '<div class="search-modal-header">' +
          '<div class="search-input-wrapper">' +
            '<span class="search-input-icon">&#128269;</span>' +
            '<input type="text" id="search-modal-input" placeholder="Search messages..." autocomplete="off" />' +
          '</div>' +
          '<button type="button" class="search-modal-close" aria-label="Close search">&times;</button>' +
        '</div>' +
        '<div id="search-status" class="search-status"></div>' +
        '<div id="search-results" class="search-results"></div>' +
      '</div>' +
    '</dialog>';

    var container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstChild);

    modal = document.getElementById('search-modal');
    searchInput = document.getElementById('search-modal-input');
    searchStatus = document.getElementById('search-status');
    searchResults = document.getElementById('search-results');

    // Event listeners
    var closeBtn = modal.querySelector('.search-modal-close');
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    modal.addEventListener('cancel', function(e) {
      e.preventDefault();
      closeModal();
    });

    var debounceTimer = null;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        performSearch(searchInput.value.trim());
      }, 200);
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  /**
   * Open the search modal
   */
  function openModal(initialQuery) {
    if (!modal) {
      createModal();
    }

    modal.showModal();
    searchInput.value = initialQuery || '';
    searchInput.focus();

    if (initialQuery) {
      performSearch(initialQuery);
    }
  }

  /**
   * Close the search modal
   */
  function closeModal() {
    if (modal && modal.open) {
      modal.close();
      isSearching = false;
      // Clear URL hash
      if (window.location.hash.startsWith('#search=')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }

  /**
   * Update URL hash with search query
   */
  function updateUrlHash(query) {
    if (query) {
      history.replaceState(null, '', window.location.pathname + window.location.search + '#search=' + encodeURIComponent(query));
    }
  }

  /**
   * Get the URL for fetching a page
   */
  function getPageFetchUrl(pageFile) {
    // Pages are in the same directory as index.html for sessions
    return pageFile;
  }

  /**
   * Get the URL for linking to a result
   */
  function getPageLinkUrl(pageFile) {
    return pageFile;
  }

  /**
   * Highlight search term in text nodes using TreeWalker
   */
  function highlightTextNodes(element, searchTerm) {
    if (!searchTerm) return;

    var walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    var nodesToReplace = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.nodeValue.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {
        nodesToReplace.push(node);
      }
    }

    nodesToReplace.forEach(function(node) {
      var text = node.nodeValue;
      var regex = new RegExp('(' + escapeRegex(searchTerm) + ')', 'gi');
      var parts = text.split(regex);

      if (parts.length > 1) {
        var span = document.createElement('span');
        parts.forEach(function(part) {
          if (part.toLowerCase() === searchTerm.toLowerCase()) {
            var mark = document.createElement('mark');
            mark.textContent = part;
            span.appendChild(mark);
          } else {
            span.appendChild(document.createTextNode(part));
          }
        });
        node.parentNode.replaceChild(span, node);
      }
    });
  }

  /**
   * Fix internal links in cloned content
   */
  function fixInternalLinks(element, pageFile) {
    var links = element.querySelectorAll('a[href^="#"]');
    links.forEach(function(link) {
      var href = link.getAttribute('href');
      link.setAttribute('href', pageFile + href);
    });
  }

  /**
   * Process a single page and find matches
   */
  function processPage(pageFile, html, query) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var results = [];

    // Find all message blocks
    var messages = doc.querySelectorAll('.message');
    messages.forEach(function(msg) {
      var text = msg.textContent || '';
      if (text.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
        var msgId = msg.id || '';
        var link = getPageLinkUrl(pageFile) + (msgId ? '#' + msgId : '');

        // Get a preview of the content
        var contentEl = msg.querySelector('.message-content');
        var preview = contentEl ? contentEl.textContent.trim() : text.trim();
        preview = preview.slice(0, 300);

        // Determine message role
        var role = msg.classList.contains('message-user') ? 'user' : 'assistant';

        results.push({
          link: link,
          role: role,
          preview: preview,
          element: msg.cloneNode(true),
          pageFile: pageFile
        });
      }
    });

    return results;
  }

  /**
   * Search within session pages
   */
  async function searchSessionPages(query) {
    if (totalPages === 0) {
      searchStatus.textContent = 'No pages to search';
      return;
    }

    var resultsFound = 0;
    var pagesSearched = 0;

    // Build list of pages to fetch
    var pagesToFetch = [];
    for (var i = 1; i <= totalPages; i++) {
      pagesToFetch.push('page-' + String(i).padStart(3, '0') + '.html');
    }

    // Process pages in batches
    for (var i = 0; i < pagesToFetch.length && isSearching; i += BATCH_SIZE) {
      var batch = pagesToFetch.slice(i, i + BATCH_SIZE);

      var promises = batch.map(function(pageFile) {
        return fetch(getPageFetchUrl(pageFile))
          .then(function(response) {
            if (!response.ok) throw new Error('Failed to fetch ' + pageFile);
            return response.text();
          })
          .then(function(html) {
            var results = processPage(pageFile, html, query);
            pagesSearched++;

            // Update status
            searchStatus.textContent = 'Found ' + (resultsFound + results.length) + ' result(s) in ' + pagesSearched + '/' + totalPages + ' pages...';

            // Display results
            results.forEach(function(result) {
              if (resultsFound < MAX_RESULTS) {
                displayResult(result, query);
                resultsFound++;
              }
            });

            return results.length;
          })
          .catch(function(err) {
            console.error('Error fetching page:', err);
            pagesSearched++;
            return 0;
          });
      });

      await Promise.all(promises);
    }

    // Final status
    if (isSearching) {
      if (resultsFound === 0) {
        searchStatus.textContent = 'No results found';
        searchResults.innerHTML = '<div class="search-no-results">No matches found for "' + escapeHtml(query) + '"</div>';
      } else {
        searchStatus.textContent = 'Found ' + resultsFound + ' result(s) in ' + totalPages + ' pages';
        if (resultsFound >= MAX_RESULTS) {
          searchStatus.textContent += ' (showing first ' + MAX_RESULTS + ')';
        }
      }
    }
  }

  /**
   * Search the index page (session titles and previews)
   */
  function searchIndexPage(query) {
    var sessionCards = document.querySelectorAll('.session-card');
    var resultsFound = 0;

    sessionCards.forEach(function(card) {
      var title = card.querySelector('.session-title');
      var summary = card.querySelector('.session-summary');
      var text = (title ? title.textContent : '') + ' ' + (summary ? summary.textContent : '');

      if (text.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
        var link = card.getAttribute('href') || '#';
        var titleText = title ? title.textContent : 'Untitled Session';
        var summaryText = summary ? summary.textContent : '';

        displayResult({
          link: link,
          role: 'session',
          preview: summaryText.slice(0, 200),
          title: titleText,
          pageFile: null
        }, query);

        resultsFound++;
      }
    });

    if (resultsFound === 0) {
      searchStatus.textContent = 'No results found';
      searchResults.innerHTML = '<div class="search-no-results">No sessions match "' + escapeHtml(query) + '"</div>';
    } else {
      searchStatus.textContent = 'Found ' + resultsFound + ' session(s)';
    }
  }

  /**
   * Display a single search result
   */
  function displayResult(result, query) {
    var resultDiv = document.createElement('a');
    resultDiv.href = result.link;
    resultDiv.className = 'search-result';

    var roleLabel = result.role === 'user' ? 'USER' : 
                    result.role === 'assistant' ? 'ASSISTANT' : 
                    'SESSION';
    var roleClass = 'search-result-role search-result-role-' + result.role;

    var title = result.title || '';
    var preview = result.preview || '';

    // Highlight matches in preview
    var highlightedPreview = preview.replace(
      new RegExp('(' + escapeRegex(query) + ')', 'gi'),
      '<mark>$1</mark>'
    );

    var html = '<div class="search-result-header">' +
      '<span class="' + roleClass + '">' + roleLabel + '</span>';
    
    if (result.pageFile) {
      html += '<span class="search-result-page">' + escapeHtml(result.pageFile) + '</span>';
    }
    
    html += '</div>';

    if (title) {
      var highlightedTitle = title.replace(
        new RegExp('(' + escapeRegex(query) + ')', 'gi'),
        '<mark>$1</mark>'
      );
      html += '<div class="search-result-title">' + highlightedTitle + '</div>';
    }

    html += '<div class="search-result-preview">' + highlightedPreview + '</div>';

    resultDiv.innerHTML = html;
    searchResults.appendChild(resultDiv);
  }

  /**
   * Main search function
   */
  async function performSearch(query) {
    if (!query || query.length < 2) {
      searchStatus.textContent = 'Type at least 2 characters to search';
      searchResults.innerHTML = '';
      return;
    }

    // Cancel any ongoing search
    isSearching = false;
    await new Promise(function(resolve) { setTimeout(resolve, 50); });

    // Start new search
    isSearching = true;
    searchStatus.textContent = 'Searching...';
    searchResults.innerHTML = '';
    updateUrlHash(query);

    if (isSessionPage) {
      await searchSessionPages(query);
    } else {
      searchIndexPage(query);
    }
  }

  /**
   * Initialize search functionality
   */
  function init() {
    // Check if search can work (not file:// protocol)
    if (!canSearch()) {
      // Hide search triggers since they won't work
      var triggers = document.querySelectorAll('.search-trigger');
      triggers.forEach(function(trigger) {
        trigger.style.display = 'none';
      });
      return;
    }

    // Keyboard shortcut: Cmd/Ctrl + K
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal();
      }
    });

    // Search trigger button click
    var triggers = document.querySelectorAll('.search-trigger');
    triggers.forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
      });
    });

    // Check for search in URL hash on page load
    if (window.location.hash.startsWith('#search=')) {
      var query = decodeURIComponent(window.location.hash.substring(8));
      if (query) {
        // Delay to ensure page is ready
        setTimeout(function() {
          openModal(query);
        }, 100);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

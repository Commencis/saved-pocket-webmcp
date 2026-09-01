(function () {
  'use strict';

  // Don't inject on the SavedPocket dashboard itself
  if (location.hostname === 'localhost' && location.port === '3000') return;
  if (document.getElementById('sp-save-tab')) return;

  /* ─── SVGs ─── */
  const SP_ICON = (size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10a2 2 0 012 2v14l-7-3.5L5 19V5a2 2 0 012-2z"/></svg>`;
  const CHECK_SVG =
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
  const X_SVG =
    `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  /* ─── Module state ─── */
  let tabState = 'idle';
  let panelOpen = false;
  let pollTimer = null;
  let existingItemId = null;   // set by proactive URL check
  let proactiveExists = false; // keeps tab in 'exists' state persistently
  let mcpServerUrl = null;     // WebMCP endpoint if the site supports it

  const tab = createTab();

  // Proactive check: is the current page already saved?
  chrome.runtime.sendMessage(
    { type: 'SAVEDPOCKET_CHECK_URL', url: location.href },
    function (resp) {
      if (chrome.runtime.lastError) return;
      if (resp && resp.found && resp.id) {
        existingItemId = resp.id;
        proactiveExists = true;
        setTabState(tab, 'exists');
      }
    }
  );

  // WebMCP discovery: DOM link/meta tag first, then /.well-known/mcp.json via background
  (function detectWebMCP() {
    const linkEl = document.querySelector('link[rel="mcp-server"]');
    const metaEl = document.querySelector('meta[name="mcp-server"]');
    const domUrl = (linkEl && linkEl.href) || (metaEl && metaEl.content) || null;
    if (domUrl) { mcpServerUrl = domUrl; return; }
    chrome.runtime.sendMessage(
      { type: 'SAVEDPOCKET_MCP_DISCOVER', origin: location.origin },
      function (resp) {
        if (chrome.runtime.lastError) return;
        if (resp && resp.mcpUrl) mcpServerUrl = resp.mcpUrl;
      }
    );
  })();

  /* ─── Tab ─── */
  function createTab() {
    const el = document.createElement('div');
    el.id = 'sp-save-tab';
    setTabState(el, 'idle');
    el.addEventListener('click', () => {
      if (tabState === 'exists' && existingItemId) {
        openEditPanel(existingItemId, '');
        return;
      }
      if (tabState !== 'idle') return;
      doSave(location.href, document.title, null);
    });
    document.body.appendChild(el);
    return el;
  }

  function setTabState(el, state) {
    tabState = state;
    const base = 'position:fixed;right:0;top:50%;transform:translateY(-50%);' +
      'z-index:2147483647;color:#fff;border-radius:8px 0 0 8px;padding:10px 5px;' +
      'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;' +
      'box-shadow:-2px 0 10px rgba(0,0,0,0.25);' +
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
      'font-size:9px;font-weight:700;letter-spacing:0.5px;user-select:none;transition:background 0.2s';

    const LABEL = (txt) => `<span style="writing-mode:vertical-lr">${txt}</span>`;

    let bg, html;
    if (state === 'saved') {
      bg = '#15803d'; html = CHECK_SVG + LABEL('SAVED');
      // Don't auto-reset while the edit panel is open
      if (!panelOpen) setTimeout(() => setTabState(el, 'idle'), 2500);
    } else if (state === 'exists') {
      bg = '#1e40af'; html = CHECK_SVG + LABEL('IN LIB');
      // Proactive exists: stay permanently. Manual save result: brief flash then idle.
      if (!panelOpen && !proactiveExists) setTimeout(() => setTabState(el, 'idle'), 2500);
    } else if (state === 'loading') {
      bg = '#5b21b6'; html = SP_ICON(13) + LABEL('···');   // deep purple — in progress
    } else if (state === 'error') {
      bg = '#991b1b'; html = X_SVG + LABEL('ERR');         // red — failed
      setTimeout(() => setTabState(el, 'idle'), 3000);
    } else {
      bg = '#7c3aed'; html = SP_ICON(13) + LABEL('SAVE');  // brand purple — idle
    }

    el.setAttribute('style', base + ';background:' + bg);
    el.innerHTML = html;
  }

  /* ─── Selection bubble ─── */
  let bubble = null;
  let pendingNote = null;

  function getBubble() {
    if (bubble) return bubble;
    const el = document.createElement('div');
    el.id = 'sp-sel-bubble';
    el.setAttribute('style',
      'position:fixed;z-index:2147483647;background:#7c3aed;color:#fff;border-radius:50%;' +
      'width:30px;height:30px;cursor:pointer;display:flex;align-items:center;' +
      'justify-content:center;box-shadow:0 2px 8px rgba(124,58,237,0.45);' +
      'border:2px solid rgba(255,255,255,0.2);opacity:0;pointer-events:none;' +
      'transition:opacity 0.15s'
    );
    el.innerHTML = SP_ICON(13);
    el.title = 'Save selection to SavedPocket';
    el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const note = pendingNote;
      hideBubble();
      doSave(location.href, document.title, note);
    });
    document.body.appendChild(el);
    bubble = el;
    return el;
  }

  function showBubble(x, y, text) {
    const el = getBubble();
    pendingNote = text;
    el.style.left = Math.min(x + 4, window.innerWidth - 40) + 'px';
    el.style.top = Math.max(y - 40, 4) + 'px';
    el.style.opacity = '1';
    el.style.pointerEvents = 'all';
  }

  function hideBubble() {
    if (!bubble) return;
    bubble.style.opacity = '0';
    bubble.style.pointerEvents = 'none';
    pendingNote = null;
  }

  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (text.length > 2 && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showBubble(rect.right, rect.top, text);
      } else {
        hideBubble();
      }
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (bubble && !bubble.contains(e.target)) hideBubble();
  });

  /* ─── Save ─── */
  function doSave(url, title, note) {
    setTabState(tab, 'loading');

    function performSave(mcpContent) {
      try {
        chrome.runtime.sendMessage(
          { type: 'SAVEDPOCKET_SAVE_URL', url, title: title || null, note: note || null, mcpContent: mcpContent || null },
          function (resp) {
            if (chrome.runtime.lastError) { setTabState(tab, 'error'); return; }
            if (resp && resp.ok && resp.itemId) {
              openEditPanel(resp.itemId, resp.itemTitle || '');
            }
            setTabState(tab, resp && resp.ok ? (resp.created ? 'saved' : 'exists') : 'error');
          }
        );
      } catch (_) {
        setTabState(tab, 'error');
      }
    }

    if (!mcpServerUrl) {
      performSave(null);
      return;
    }

    // Fetch MCP content with a 4s timeout; fall back to normal save on any failure
    var mcpResolved = false;
    var mcpTimeout = setTimeout(function () {
      if (!mcpResolved) { mcpResolved = true; performSave(null); }
    }, 4000);

    try {
      chrome.runtime.sendMessage(
        { type: 'SAVEDPOCKET_MCP_FETCH', mcpUrl: mcpServerUrl, pageUrl: url },
        function (resp) {
          if (mcpResolved) return;
          mcpResolved = true;
          clearTimeout(mcpTimeout);
          performSave(resp && resp.content ? resp.content : null);
        }
      );
    } catch (_) {
      if (!mcpResolved) { mcpResolved = true; clearTimeout(mcpTimeout); performSave(null); }
    }
  }

  /* ─── Edit panel ─── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closePanel() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    const panel = document.getElementById('sp-edit-panel');
    if (panel) panel.remove();
    panelOpen = false;
    // Return to 'exists' if the proactive check had found this page saved.
    if (proactiveExists && existingItemId) {
      setTabState(tab, 'exists');
    } else {
      setTabState(tab, 'idle');
    }
  }

  function openEditPanel(itemId, initialTitle) {
    closePanel(); // dismiss any previous panel
    panelOpen = true;

    let userTags = [];

    const panel = document.createElement('div');
    panel.id = 'sp-edit-panel';
    panel.setAttribute('style', [
      'position:fixed', 'right:0', 'top:50%', 'transform:translateY(-50%)',
      'width:296px', 'max-height:82vh', 'overflow-y:auto',
      'z-index:2147483646',  // one below the SAVE tab
      'background:#12121f',
      'color:#e2e8f0',
      'border-radius:12px 0 0 12px',
      'box-shadow:-4px 0 32px rgba(0,0,0,0.6)',
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'font-size:13px', 'line-height:1.5',
    ].join(';'));

    panel.innerHTML = [
      '<style>',
      '@keyframes sp-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
      '#sp-edit-panel *{box-sizing:border-box}',
      '#sp-panel-title:focus,#sp-panel-notes:focus,#sp-panel-tag-input:focus{border-color:#7c3aed!important;outline:none}',
      '#sp-panel-title::placeholder,#sp-panel-notes::placeholder,#sp-panel-tag-input::placeholder{color:#94a3b8}',
      '#sp-panel-save:hover:not(:disabled){background:#6d28d9!important}',
      '#sp-panel-close:hover{color:#e2e8f0!important}',
      '#sp-panel-open:hover{color:#e2e8f0!important;border-color:#475569!important}',
      '</style>',
      '<div style="padding:14px">',
      // Header
      '  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">',
      '    <div style="display:flex;align-items:center;gap:6px">',
      '      <svg width="13" height="13" viewBox="0 0 24 24" fill="#7c3aed"><path d="M7 3h10a2 2 0 012 2v14l-7-3.5L5 19V5a2 2 0 012-2z"/></svg>',
      '      <span style="font-size:11px;font-weight:700;letter-spacing:.6px;color:#7c3aed;text-transform:uppercase">SavedPocket</span>',
      '    </div>',
      '    <button id="sp-panel-close" style="background:none;border:none;cursor:pointer;color:#475569;padding:0;font-size:18px;line-height:1;transition:color .15s">✕</button>',
      '  </div>',
      // Title
      '  <div style="margin-bottom:10px">',
      '    <label style="display:block;font-size:10px;color:#475569;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Title</label>',
      '    <input id="sp-panel-title" type="text" placeholder="Page title" style="width:100%;background:#1e1e35;border:1px solid #2d2d50;border-radius:6px;padding:6px 9px;color:#e2e8f0;font-size:12px;font-family:inherit;transition:border-color .15s" />',
      '  </div>',
      // Analysis status
      '  <div id="sp-panel-analysis" style="margin-bottom:10px;padding:8px 10px;background:#1e1e35;border-radius:6px;border:1px solid #2d2d50;font-size:12px;color:#94a3b8">',
      '    <span id="sp-analysis-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#7c3aed;margin-right:6px;vertical-align:middle;animation:sp-pulse 1.2s ease-in-out infinite"></span>',
      '    <span id="sp-analysis-text">Analyzing…</span>',
      '  </div>',
      // Notes
      '  <div style="margin-bottom:10px">',
      '    <label style="display:block;font-size:10px;color:#475569;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Notes</label>',
      '    <textarea id="sp-panel-notes" placeholder="Add a note…" rows="3" style="width:100%;background:#1e1e35;border:1px solid #2d2d50;border-radius:6px;padding:6px 9px;color:#e2e8f0;font-size:12px;font-family:inherit;resize:vertical;transition:border-color .15s"></textarea>',
      '  </div>',
      // Tags
      '  <div style="margin-bottom:14px">',
      '    <label style="display:block;font-size:10px;color:#475569;margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Tags</label>',
      '    <div id="sp-panel-tags" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:2px"></div>',
      '    <input id="sp-panel-tag-input" type="text" placeholder="Type tag + Enter…" style="width:100%;background:#1e1e35;border:1px solid #2d2d50;border-radius:6px;padding:6px 9px;color:#e2e8f0;font-size:12px;font-family:inherit;transition:border-color .15s" />',
      '  </div>',
      // Buttons
      '  <div style="display:flex;gap:8px">',
      '    <button id="sp-panel-save" style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:8px 0;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s">Save changes</button>',
      '    <a id="sp-panel-open" href="#" target="_blank" rel="noopener" style="flex:1;display:flex;align-items:center;justify-content:center;color:#475569;font-size:11px;text-decoration:none;border:1px solid #2d2d50;border-radius:6px;padding:8px 0;transition:color .15s,border-color .15s">Open in library →</a>',
      '  </div>',
      '  <div id="sp-panel-feedback" style="margin-top:8px;font-size:11px;text-align:center;height:14px"></div>',
      '</div>',
    ].join('');

    document.body.appendChild(panel);

    // Pre-fill title
    panel.querySelector('#sp-panel-title').value = initialTitle || '';

    // Close button
    panel.querySelector('#sp-panel-close').addEventListener('click', closePanel);

    // Tag input: Enter or comma commits the tag
    panel.querySelector('#sp-panel-tag-input').addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ',') && this.value.trim()) {
        e.preventDefault();
        addTag(this.value.replace(/,/g, '').trim().toLowerCase());
        this.value = '';
      }
    });

    // Save button
    panel.querySelector('#sp-panel-save').addEventListener('click', function () {
      const titleVal = panel.querySelector('#sp-panel-title').value.trim();
      const notesVal = panel.querySelector('#sp-panel-notes').value.trim();
      const patch = {
        userTags,
        notes: notesVal || null,
      };
      if (titleVal) patch.title = titleVal;

      const btn = this;
      btn.textContent = 'Saving…';
      btn.disabled = true;

      const afterSave = function (resp) {
        const fb = panel.querySelector('#sp-panel-feedback');
        if (resp && !resp.error) {
          if (fb) { fb.textContent = 'Saved ✓'; fb.style.color = '#22c55e'; }
        } else {
          if (fb) { fb.textContent = 'Save failed'; fb.style.color = '#ef4444'; }
        }
        btn.textContent = 'Save changes';
        btn.disabled = false;
        setTimeout(function () { if (fb) fb.textContent = ''; }, 2500);
      };

      try {
        chrome.runtime.sendMessage({ type: 'SAVEDPOCKET_PATCH_ITEM', id: itemId, patch }, afterSave);
      } catch (_) {
        afterSave({ error: true });
      }
    });

    // Open-in-library link: resolve server URL from extension storage
    chrome.storage.local.get(['serverUrl'], function (result) {
      const base = (result.serverUrl || 'http://localhost:3000').replace(/\/$/, '');
      const link = panel.querySelector('#sp-panel-open');
      if (link) link.href = base;
    });

    // Poll for analysis completion and backfill existing item data on first poll
    let polls = 0;
    pollTimer = setInterval(function () {
      if (polls >= 20) {
        clearInterval(pollTimer);
        pollTimer = null;
        const dot = panel.querySelector('#sp-analysis-dot');
        const txt = panel.querySelector('#sp-analysis-text');
        if (dot) { dot.style.animation = 'none'; dot.style.background = '#475569'; }
        if (txt) txt.textContent = 'Analysis taking longer than expected';
        return;
      }
      polls++;

      try {
        chrome.runtime.sendMessage({ type: 'SAVEDPOCKET_GET_ITEM', id: itemId }, function (resp) {
          // Panel may have been closed while the request was in-flight
          if (!document.getElementById('sp-edit-panel')) {
            clearInterval(pollTimer);
            pollTimer = null;
            return;
          }
          if (!resp || resp.error || chrome.runtime.lastError) return;

          // First poll: backfill existing data (re-save case)
          if (polls === 1) {
            if (Array.isArray(resp.userTags) && resp.userTags.length) {
              userTags = resp.userTags.slice();
              renderTags();
            }
            const notesEl = panel.querySelector('#sp-panel-notes');
            if (notesEl && !notesEl.value && resp.notes) notesEl.value = resp.notes;
            if (!panel.querySelector('#sp-panel-title').value && resp.title) {
              panel.querySelector('#sp-panel-title').value = resp.title;
            }
          }

          const done = resp.analysisStatus === 'done'
            || resp.analysisStatus === 'failed'
            || resp.analysisStatus === 'skipped';
          if (done) {
            clearInterval(pollTimer);
            pollTimer = null;
            showAnalysisResult(resp);
          }
        });
      } catch (_) {}
    }, 2500);

    /* ── Tag helpers (scoped to this panel instance) ── */

    function addTag(tag) {
      if (!tag || userTags.indexOf(tag) !== -1) return;
      userTags.push(tag);
      renderTags();
    }

    function removeTag(tag) {
      userTags = userTags.filter(function (t) { return t !== tag; });
      renderTags();
    }

    function renderTags() {
      const container = panel.querySelector('#sp-panel-tags');
      if (!container) return;
      container.innerHTML = '';
      userTags.forEach(function (tag) {
        const chip = document.createElement('span');
        chip.setAttribute('style',
          'display:inline-flex;align-items:center;gap:2px;' +
          'background:#1e1b4b;color:#a5b4fc;border-radius:4px;' +
          'padding:2px 6px;font-size:11px;font-weight:500');
        chip.textContent = tag + ' ';
        const rm = document.createElement('button');
        rm.textContent = '×';
        rm.setAttribute('style',
          'background:none;border:none;cursor:pointer;color:#818cf8;' +
          'font-size:14px;line-height:1;padding:0;vertical-align:middle');
        rm.addEventListener('click', function () { removeTag(tag); });
        chip.appendChild(rm);
        container.appendChild(chip);
      });
    }

    function showAnalysisResult(item) {
      const div = panel.querySelector('#sp-panel-analysis');
      if (!div) return;

      if (item.analysisStatus === 'done' && item.summary) {
        div.innerHTML =
          '<div style="font-size:10px;font-weight:700;color:#22c55e;margin-bottom:5px;' +
          'text-transform:uppercase;letter-spacing:.5px">AI Summary</div>' +
          '<p style="margin:0;color:#cbd5e1;font-size:11px;line-height:1.6">' +
          escHtml(item.summary) + '</p>';
      } else if (item.analysisStatus === 'done') {
        div.innerHTML = '<span style="color:#475569;font-size:11px">Analysis complete.</span>';
      } else if (item.analysisStatus === 'failed') {
        div.innerHTML =
          '<span style="color:#ef4444;font-size:11px;font-weight:600">Analysis failed</span>' +
          (item.analysisError
            ? '<br><span style="color:#64748b;font-size:10px">' + escHtml(item.analysisError) + '</span>'
            : '');
      } else {
        div.innerHTML = '<span style="color:#475569;font-size:11px">No summary available.</span>';
      }
    }
  }

})();

(() => {
  'use strict';

  const uploadText = document.getElementById('uploadText');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadResult = document.getElementById('uploadResult');

  const questionInput = document.getElementById('questionInput');
  const askBtn = document.getElementById('askBtn');
  const askResult = document.getElementById('askResult');
  const newConversationBtn = document.getElementById('newConversationBtn');
  const conversationEl = document.getElementById('conversation');

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const SESSION_STORAGE_KEY = 'vectorops_session_id';

  // All API responses (uploaded text, Claude's answer) are untrusted as far
  // as the DOM is concerned - always escape before inserting as HTML.
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  // Escapes first, then wraps **bold** markers - safe because the regex only
  // adds tags around already-escaped text, never around raw user/API input.
  function formatAnswer(value) {
    return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function setResult(el, message, kind) {
    el.textContent = message;
    el.className = message ? `result ${kind}` : 'result';
  }

  function setButtonBusy(button, busy, busyLabel, idleLabel) {
    button.disabled = busy;
    button.textContent = busy ? busyLabel : idleLabel;
  }

  // One id per browser tab, generated once and reused for every question so
  // follow-ups share conversation history server-side. Survives reloads
  // within the tab (sessionStorage), resets in a new tab - matching how the
  // in-memory conversation store itself resets on server restart.
  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  }

  function startNewConversation() {
    sessionStorage.setItem(SESSION_STORAGE_KEY, crypto.randomUUID());
    conversationEl.innerHTML = '';
    setResult(askResult, '', 'success');
  }

  async function checkHealth() {
    try {
      const res = await fetch('/health');
      if (!res.ok) throw new Error('unhealthy');
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Connected';
    } catch {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Server unreachable';
    }
  }

  async function handleUpload() {
    const text = uploadText.value.trim();
    if (!text) {
      setResult(uploadResult, 'Paste some text before uploading.', 'error');
      return;
    }

    setResult(uploadResult, '', 'success');
    setButtonBusy(uploadBtn, true, 'Uploading…', 'Upload');

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(
        uploadResult,
        `Uploaded and embedded ${data.chunkCount} chunk${data.chunkCount === 1 ? '' : 's'}.`,
        'success',
      );
    } catch (error) {
      setResult(uploadResult, error.message || 'Upload failed', 'error');
    } finally {
      setButtonBusy(uploadBtn, false, 'Uploading…', 'Upload');
    }
  }

  async function handleAsk() {
    const question = questionInput.value.trim();
    if (!question) {
      setResult(askResult, 'Type a question first.', 'error');
      return;
    }

    setResult(askResult, '', 'success');
    setButtonBusy(askBtn, true, 'Thinking…', 'Ask');

    try {
      const res = await fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: getSessionId() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Query failed');
      }

      appendTurn(question, data.answer, data.sources || []);
      questionInput.value = '';
    } catch (error) {
      setResult(askResult, error.message || 'Query failed', 'error');
    } finally {
      setButtonBusy(askBtn, false, 'Thinking…', 'Ask');
    }
  }

  function appendTurn(question, answer, sources) {
    const turn = document.createElement('div');
    turn.className = 'turn';

    let html =
      `<div class="turn-label">You</div>` +
      `<div class="turn-question">${escapeHtml(question)}</div>` +
      `<div class="turn-label">Answer</div>` +
      `<div class="turn-answer">${formatAnswer(answer)}</div>`;

    if (sources.length > 0) {
      const sourceItems = sources
        .map(
          (source) =>
            `<li class="source-item">` +
            `<div class="source-content">${escapeHtml(source.content)}</div>` +
            `<span class="source-score">similarity: ${source.score.toFixed(3)}</span>` +
            `</li>`,
        )
        .join('');

      html +=
        `<details class="turn-sources">` +
        `<summary>Sources (${sources.length})</summary>` +
        `<ul class="sources-list">${sourceItems}</ul>` +
        `</details>`;
    }

    turn.innerHTML = html;
    conversationEl.appendChild(turn);
    conversationEl.scrollTop = conversationEl.scrollHeight;
  }

  uploadBtn.addEventListener('click', handleUpload);
  askBtn.addEventListener('click', handleAsk);
  newConversationBtn.addEventListener('click', startNewConversation);
  questionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleAsk();
  });

  checkHealth();
})();

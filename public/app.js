(() => {
  'use strict';

  const uploadText = document.getElementById('uploadText');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadResult = document.getElementById('uploadResult');

  const questionInput = document.getElementById('questionInput');
  const askBtn = document.getElementById('askBtn');
  const askResult = document.getElementById('askResult');
  const answerSection = document.getElementById('answerSection');
  const answerText = document.getElementById('answerText');
  const sourcesSection = document.getElementById('sourcesSection');
  const sourcesList = document.getElementById('sourcesList');

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

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
    answerSection.classList.add('hidden');
    sourcesSection.classList.add('hidden');
    setButtonBusy(askBtn, true, 'Thinking…', 'Ask');

    try {
      const res = await fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Query failed');
      }

      answerText.innerHTML = formatAnswer(data.answer);
      answerSection.classList.remove('hidden');

      renderSources(data.sources || []);
    } catch (error) {
      setResult(askResult, error.message || 'Query failed', 'error');
    } finally {
      setButtonBusy(askBtn, false, 'Thinking…', 'Ask');
    }
  }

  function renderSources(sources) {
    sourcesList.innerHTML = '';

    if (sources.length === 0) {
      sourcesSection.classList.add('hidden');
      return;
    }

    for (const source of sources) {
      const li = document.createElement('li');
      li.className = 'source-item';
      li.innerHTML =
        `<div class="source-content">${escapeHtml(source.content)}</div>` +
        `<span class="source-score">similarity: ${source.score.toFixed(3)}</span>`;
      sourcesList.appendChild(li);
    }

    sourcesSection.classList.remove('hidden');
  }

  uploadBtn.addEventListener('click', handleUpload);
  askBtn.addEventListener('click', handleAsk);
  questionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleAsk();
  });

  checkHealth();
})();

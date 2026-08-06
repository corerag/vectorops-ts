const sessionId = `test-${Date.now()}`;

async function ask(question) {
  const res = await fetch('http://localhost:3000/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  });
  const data = await res.json();
  console.log(`\nQ: ${question}`);
  console.log(JSON.stringify(data, null, 2));
}

// A single question, then a pronoun-only follow-up sharing the same
// session_id - the follow-up should be understood using the first turn's
// context (upload a relevant document first via test-upload.js).
async function main() {
  await ask('What is this document about?');
  await ask('Can you say more about that?');
}

main().catch((err) => console.error('Error:', err));

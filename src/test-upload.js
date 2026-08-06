const text = "This is a test document. It has multiple sentences. We want to see how it gets chunked into smaller pieces for retrieval. The chunker should split this text based on the configured chunk size and overlap settings.";

fetch('http://localhost:3000/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error('Error:', err));
  

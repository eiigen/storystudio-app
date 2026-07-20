import fetch from 'node-fetch';
const P = 'https://gen.pollinations.ai';
const key = 'sk_SxRPxEDUpyIp2FO5NJDitsjMs8ZltAP5';

console.log('Testing chat completions with gpt-5.4-mini...');
const r = await fetch(`${P}/v1/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
  body: JSON.stringify({
    model: 'gpt-5.4-mini',
    max_tokens: 512,
    messages: [{ role: 'user', content: 'Write a 2-paragraph story about a dragon. Return JSON array.' }]
  })
});
console.log('Status:', r.status);
const d = await r.json();
console.log('Response:', JSON.stringify(d, null, 2).slice(0, 1500));

console.log('\n--- Testing image URL construction ---');
const imgUrl = `${P}/image/a%20dragon?model=flux&width=512&height=512`;
console.log('Image URL:', imgUrl);
const ir = await fetch(imgUrl);
console.log('Image status:', ir.status, 'Type:', ir.headers.get('content-type'));

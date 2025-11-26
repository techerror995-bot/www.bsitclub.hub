// Simple proxy server to forward agent queries to OpenAI
// Usage:
// 1. Set OPENAI_API_KEY in your environment
// 2. npm install
// 3. node server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. Set it before running the server.');
}

app.use(cors());
app.use(express.json());

app.post('/api/agent', async (req, res) => {
  const { question, temperature, systemPrompt } = req.body || {};
  if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Missing question in body' });

  try {
    // Forward request to OpenAI Chat Completions API
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const temp = typeof temperature === 'number' ? temperature : 0.7;
    const systemMsg = systemPrompt || 'You are BaldKids, a friendly assistant for the Barkada website. Answer politely and concisely.';

    // Build messages: prefer `messages` from client (conversation history), otherwise send system+user
    let messagesToSend = [{ role: 'system', content: systemMsg }];
    if (Array.isArray(req.body.messages) && req.body.messages.length) {
      // client should send messages as {role: 'user'|'assistant', content: '...'}
      messagesToSend = messagesToSend.concat(req.body.messages);
      // append the current user question at the end to ensure it's included
      messagesToSend.push({ role: 'user', content: question });
    } else {
      messagesToSend.push({ role: 'user', content: question });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: messagesToSend,
        max_tokens: 600,
        temperature: temp
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const choices = response.data && response.data.choices;
    const text = Array.isArray(choices) && choices[0] && (choices[0].message ? choices[0].message.content : choices[0].text) || 'Sorry, no reply.';
    res.json({ reply: text });
  } catch (err) {
    console.error('OpenAI error', err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI', details: err.response ? err.response.data : err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Agent proxy running on http://localhost:${PORT}`);
});

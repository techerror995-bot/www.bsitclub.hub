BaldKids integration (local proxy)
=================================

This repository now includes a small Node Express proxy to let the site send user questions to OpenAI and receive ChatGPT-style answers.

Important: This server requires an OpenAI API key. Do NOT put your API key in client-side code or commit it to source control.

Quick start
-----------

1. Install dependencies

```bash
cd /home/belio/Documents/HTML
npm install
```

2. Create a `.env` file with your OpenAI API key (or set the `OPENAI_API_KEY` environment variable):

```
OPENAI_API_KEY=sk-...
```

3. Start the proxy server (BaldKids)

```bash
npm start
```

4. The server listens on port 3000 by default. The frontend will POST to `http://localhost:3000/api/agent` with JSON `{ question: '...' }`.

Security notes
--------------
- Keep the API key on the server only. Never embed it in client-side JS.
- In production, protect this endpoint (rate limit, authentication) to avoid abuse and unexpected costs.

Customization
-------------
- Change the `OPENAI_MODEL` env var if you want a different model. The server currently defaults to `gpt-4o-mini` but you can set `OPENAI_MODEL=gpt-4o` or any available Chat model.

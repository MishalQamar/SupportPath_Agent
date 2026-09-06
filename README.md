# SEO Agent

An AI-powered SEO auditor built with Cloudflare Agents, Browser Rendering, Puppeteer, React, and TypeScript.

Paste a URL into the chat and the agent opens the real page in a remote browser, inspects its DOM, calculates an SEO score, explains what needs improvement, and returns a screenshot.

## SEO checks

The audit scores eight checks at 12.5 points each:

1. The page title exists and is between 10 and 60 characters.
2. The meta description exists and is between 50 and 160 characters.
3. The page contains exactly one H1.
4. Every image has an `alt` attribute.
5. Open Graph title and image tags exist.
6. A canonical link exists.
7. A viewport meta tag exists.
8. The HTML element has a `lang` attribute.

## Features

- Real browser audits powered by Cloudflare Browser Rendering
- DOM inspection with Puppeteer
- Score calculated in application code
- Clear pass/fail checklist and repair suggestions
- Screenshot captured during every audit
- Streaming AI chat built on a Cloudflare Durable Object
- Docker-based development for compatibility with older macOS versions

## Tech stack

- React 19 and TypeScript
- Vite and Tailwind CSS
- Cloudflare Workers and Agents SDK
- Cloudflare Workers AI
- Cloudflare Browser Rendering
- Puppeteer
- Docker Compose

## Run locally

Requirements:

- Docker Desktop
- A Cloudflare account

Build the development image:

```bash
npm run docker:build
```

Sign in to Cloudflare:

```bash
npm run login
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:5173` and enter a public URL in the chat.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Docker development server |
| `npm run docker:build` | Build the Docker image |
| `npm run shell` | Open a shell inside the app container |
| `npm run lint` | Run ESLint inside Docker |
| `npm run test` | Run Vitest inside Docker |
| `npm run build` | Create a production build inside Docker |
| `npm run cf-typegen` | Regenerate Cloudflare binding types |
| `npm run login` | Authenticate Wrangler using device login |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

## Deploy

After authenticating, deploy with:

```bash
npm run deploy
```

The production build generates the final Wrangler deployment configuration and uploads both the Worker and the React frontend.

## Security

Environment files, Wrangler state, dependencies, logs, and generated builds are ignored by Git. Never commit API keys or credentials. Use Cloudflare secrets or a local `.dev.vars` file when adding private configuration.

The Cloudflare Browser Rendering free plan has a limited daily browser allowance, so the audit opens and closes a browser for each request.
# website_agent

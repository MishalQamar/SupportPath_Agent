# SupportPath

SupportPath is an independent browser guide for information published by Turn2us. A person describes what they need in ordinary language; the agent starts at the Turn2us homepage, visibly follows relevant links, records the exact route and saves screenshot evidence. SupportPath is not affiliated with Turn2us.

The switch to Turn2us starts a fresh signed session so earlier journeys from the previous source website do not appear in the new experience.

For the complete runtime design, request flow, Live View explanation, security model and production recommendations, see [Technical architecture](./TECHNICAL_ARCHITECTURE.md).

SupportPath finds information rather than deciding eligibility or giving legal, medical or financial advice. When a journey reaches an interactive tool or form, the agent pauses and invites the person to take control of the same browser so personal information stays private. Benefit rules can vary across UK nations; the agent reports which nation the source page covers when stated.

## Product behaviour

- Always starts each journey on the Turn2us homepage
- Restricts navigation to `turn2us.org.uk` and its subdomains
- Records a screenshot after every visited page
- Limits autonomous navigation to five links
- Focuses each journey on one support question; asks the person to choose a topic if they mention several
- Checks questions before browsing; combined topics get a choice question in chat, while personal identifiers, external URLs and unrelated instructions get a rewrite prompt
- Offers four focused example questions; the Carer’s Allowance example follows a three-link route and stops on that page
- Shows a read-only browser while the agent navigates, then offers explicit control at an interactive tool
- Closes the browser when an informational answer finishes, then shows the full final screenshot with a link to the live source page
- Returns relevant source pages, the route followed and a practical next step
- Never claims that someone is eligible for a benefit or grant
- Never enters or requests personal information

## Tech stack

- React 19, TypeScript, Vite and Tailwind CSS
- Cloudflare Agents and Workers AI
- Cloudflare Browser Rendering with Live View
- R2 evidence storage
- Docker Compose for local development

## Run locally

Requirements: Docker Desktop and a Cloudflare account with Browser Rendering, Workers AI and R2 configured. Copy `.dev.vars.example` to `.dev.vars`, then set the account ID, Browser Rendering API token and a random `SESSION_SIGNING_KEY` of at least 32 characters. Keep that key stable so existing sessions remain valid.

```bash
npm run docker:build
npm run login
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Docker development server |
| `npm run docker:build` | Build the development image |
| `npm run lint` | Run ESLint inside Docker |
| `npm run test` | Run Vitest inside Docker |
| `npm run build` | Create a production build |
| `npm run cf-typegen` | Regenerate Cloudflare binding types |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

## Demo smoke check

1. Run `npm run test`, `npm run lint` and `npm run build`.
2. Open the app and select **What is Carer’s Allowance?** The journey should start at the Turn2us homepage, follow **Information for your situation → Carer → What is Carer’s Allowance?**, and stop on [the Turn2us Carer’s Allowance page](https://www.turn2us.org.uk/get-support/information-for-your-situation/carer-s-allowance/what-is-carer-s-allowance) after three followed links. Confirm that the source URL, route and screenshot evidence match. After the browser closes, the saved screenshot should show the whole viewport and **Open live page** should open Turn2us.
3. Select **New chat**. The chat, route, screenshots and live browser should reset together.
4. In a separate journey that reaches an interactive tool, confirm that the browser is view only during navigation, **Take control** appears at the tool, and **Done, close browser** ends the handoff. Do not enter real personal data during a rehearsal.
5. Stop a running journey and retry its question. Confirm that navigation stops and the retry starts from the homepage.
6. Enter a question about both energy bills and childcare costs; confirm SupportPath asks for one topic and does not start a browser journey. Try an unrelated question and one containing an email address; both should receive a rewrite prompt.

Keep Cloudflare credentials in local Wrangler configuration or secrets. Never commit API keys or `.dev.vars` files.

## Before public deployment

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `SESSION_SIGNING_KEY` as Worker secrets. The signing key is required for private browser sessions and screenshot access. Configure an R2 lifecycle rule for the evidence bucket so screenshots expire. Verify the Live View handoff and agent route on the deployed hostname. Interactive-form detection uses URL and field-label rules; review it against the tools that will be shown in the demo and keep monitoring false positives and missed forms before a wider public release.

`npm audit --omit=dev` currently reports high-severity advisories in `extract-zip`, reached through Cloudflare Puppeteer's pinned `@puppeteer/browsers` dependency. Cloudflare Puppeteer 1.4.0 is the latest published version at the time of this check. Review the vendor fix before a public release; forcing npm's proposed downgrade would change the browser API.

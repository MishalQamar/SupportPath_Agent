import { AIChatAgent } from '@cloudflare/ai-chat';
import { routeAgentRequest } from 'agents';
import {
  convertToModelMessages,
  isLoopFinished,
  streamText,
  tool,
} from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import puppeteer, {
  type Page,
  type Browser,
} from '@cloudflare/puppeteer';
import z from 'zod';

export class BrowserAgent extends AIChatAgent<Env> {
  browser?: Browser;
  page?: Page;
  async getPage() {
    if (this.page && this.browser?.connected) return this.page;
    this.browser = await puppeteer.launch(this.env.BROWSER);
    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width: 1280,
      height: 720,
    });
    return this.page;
  }

  async closeBrowser() {
    await this.browser?.close();
    this.browser = undefined;
    this.page = undefined;
  }

  async onChatMessage() {
    const workersAi = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersAi('@cf/zai-org/glm-4.7-flash'),
      system: `
You are an SEO audit assistant.

When the user provides a website URL or asks for an SEO audit:

1. Always call the auditSeo tool.
2. Use only the results returned by the tool.
3. Report the final SEO score out of 100.
4. Display the result of all eight SEO checks.
5. Clearly identify every failed check.
6. Explain specifically how to fix every failed check.
7. Do not calculate or modify the score yourself.
8. Mention that a screenshot was captured.
9. If the user provides a domain without http:// or https://,
   the audit tool will automatically add https://.
`,
      messages: await convertToModelMessages(this.messages),
      tools: {
        auditSeo: tool({
          description:
            'Visit a real webpage and audit its SEO using eight checks.',

          inputSchema: z.object({
            url: z.string().min(1).meta({
              description:
                'The URL to audit, for example https://nomadcoders.co',
            }),
          }),

          execute: async ({ url }) => {
            const normalizedUrl = /^https?:\/\//i.test(url)
              ? url
              : `https://${url}`;

            const parsedUrl = new URL(normalizedUrl);

            if (
              parsedUrl.protocol !== 'http:' &&
              parsedUrl.protocol !== 'https:'
            ) {
              throw new Error(
                'Only HTTP and HTTPS URLs can be audited.',
              );
            }

            const browser = await puppeteer.launch(this.env.BROWSER);

            try {
              const page = await browser.newPage();

              await page.setViewport({
                width: 1280,
                height: 720,
              });

              await page.goto(parsedUrl.toString(), {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
              });

              const checks = await page.evaluate(() => {
                // This callback runs inside the browser.
                // The Worker TypeScript config does not include DOM types.
                type BrowserDocument = {
                  querySelector(selector: string): unknown;
                  querySelectorAll(
                    selector: string,
                  ): ArrayLike<{
                    hasAttribute(name: string): boolean;
                  }>;
                  documentElement: {
                    getAttribute(name: string): string | null;
                    hasAttribute(name: string): boolean;
                  };
                };

                const document = (
                  globalThis as unknown as {
                    document: BrowserDocument;
                  }
                ).document;

                const titleElement = document.querySelector(
                  'title',
                ) as { textContent: string | null } | null;

                const title =
                  titleElement?.textContent?.trim() || null;

                const descriptionElement = document.querySelector(
                  'meta[name="description"]',
                ) as { content: string } | null;

                const description =
                  descriptionElement?.content.trim() || null;

                const h1Count =
                  document.querySelectorAll('h1').length;

                const images = Array.from(
                  document.querySelectorAll('img'),
                ) as Array<{
                  hasAttribute(name: string): boolean;
                }>;

                const imagesMissingAlt = images.filter(
                  (image) => !image.hasAttribute('alt'),
                ).length;

                const ogTitleElement = document.querySelector(
                  'meta[property="og:title"]',
                ) as { content: string } | null;

                const ogImageElement = document.querySelector(
                  'meta[property="og:image"]',
                ) as { content: string } | null;

                const ogTitle =
                  ogTitleElement?.content.trim() || null;

                const ogImage =
                  ogImageElement?.content.trim() || null;

                const canonicalElement = document.querySelector(
                  'link[rel="canonical"]',
                ) as { href: string } | null;

                const canonical = canonicalElement?.href || null;

                const viewportElement = document.querySelector(
                  'meta[name="viewport"]',
                ) as { content: string } | null;

                const viewport =
                  viewportElement?.content.trim() || null;

                const htmlElement = document.documentElement as {
                  getAttribute(name: string): string | null;
                  hasAttribute(name: string): boolean;
                };

                const htmlLang = htmlElement.getAttribute('lang');

                return [
                  {
                    id: 'title',
                    label: 'Title exists and is 10–60 characters',
                    passed:
                      title !== null &&
                      title.length >= 10 &&
                      title.length <= 60,
                    value: title,
                  },
                  {
                    id: 'description',
                    label:
                      'Meta description exists and is 50–160 characters',
                    passed:
                      description !== null &&
                      description.length >= 50 &&
                      description.length <= 160,
                    value: description,
                  },
                  {
                    id: 'h1',
                    label: 'Page contains exactly one H1',
                    passed: h1Count === 1,
                    value: h1Count,
                  },
                  {
                    id: 'image-alt',
                    label: 'Every image has an alt attribute',
                    passed: imagesMissingAlt === 0,
                    value: {
                      totalImages: images.length,
                      imagesMissingAlt,
                    },
                  },
                  {
                    id: 'open-graph',
                    label: 'Open Graph title and image exist',
                    passed:
                      ogTitleElement !== null &&
                      ogImageElement !== null,
                    value: {
                      ogTitle,
                      ogImage,
                    },
                  },
                  {
                    id: 'canonical',
                    label: 'Canonical link exists',
                    passed: canonicalElement !== null,
                    value: canonical,
                  },
                  {
                    id: 'viewport',
                    label: 'Viewport meta tag exists',
                    passed: viewportElement !== null,
                    value: viewport,
                  },
                  {
                    id: 'html-lang',
                    label: 'HTML element has a lang attribute',
                    passed: htmlElement.hasAttribute('lang'),
                    value: htmlLang,
                  },
                ];
              });

              const passedChecks = checks.filter(
                (check) => check.passed,
              ).length;

              // The score is calculated in code, as required.
              const score = passedChecks * 12.5;

              const screenshot = await page.screenshot({
                type: 'jpeg',
                quality: 70,
                encoding: 'base64',
              });

              return {
                url: page.url(),
                score,
                checks,
                screenshot: `data:image/jpeg;base64,${screenshot}`,
              };
            } finally {
              // Preserve free-plan browser minutes.
              await browser.close();
            }
          },
        }),
        closeBrowser: tool({
          description: 'Close the browser session',
          inputSchema: z.object({}),
          execute: async () => {
            await this.closeBrowser();
            return { ok: true };
          },
        }),
      },
      stopWhen: isLoopFinished(),
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request, env) {
    const response = await routeAgentRequest(request, env);
    return response ?? new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

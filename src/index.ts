import puppeteer from "@cloudflare/puppeteer";

export interface Env {
  MYBROWSER: puppeteer.BrowserWorker;
}

interface RenderOptions {
  html: string;
  width?: number;
  height?: number;
  fullPage?: boolean;
  deviceScaleFactor?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const DEFAULT_DEVICE_SCALE = 1;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Serve interactive test UI on GET /
    if (request.method === "GET") {
      return handlePlayground(request);
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST or GET." }), {
        status: 405,
        headers: { "Content-Type": "application/json", Allow: "GET, POST" },
      });
    }

    try {
      let options: RenderOptions;
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Partial<RenderOptions>;
        if (!body.html || typeof body.html !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing required 'html' string field in JSON payload." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        options = {
          html: body.html,
          width: typeof body.width === "number" ? body.width : DEFAULT_WIDTH,
          height: typeof body.height === "number" ? body.height : DEFAULT_HEIGHT,
          fullPage: Boolean(body.fullPage),
          deviceScaleFactor: typeof body.deviceScaleFactor === "number" ? body.deviceScaleFactor : DEFAULT_DEVICE_SCALE,
          waitUntil: body.waitUntil || "networkidle0",
        };
      } else {
        // Assume text/html or raw text
        const html = await request.text();
        if (!html.trim()) {
          return new Response(
            JSON.stringify({ error: "Empty request body. Please provide HTML content." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const widthParam = url.searchParams.get("width");
        const heightParam = url.searchParams.get("height");
        const fullPageParam = url.searchParams.get("fullPage");
        const scaleParam = url.searchParams.get("scale") || url.searchParams.get("deviceScaleFactor");
        const waitUntilParam = url.searchParams.get("waitUntil") as RenderOptions["waitUntil"];

        options = {
          html,
          width: widthParam ? parseInt(widthParam, 10) || DEFAULT_WIDTH : DEFAULT_WIDTH,
          height: heightParam ? parseInt(heightParam, 10) || DEFAULT_HEIGHT : DEFAULT_HEIGHT,
          fullPage: fullPageParam === "true" || fullPageParam === "1",
          deviceScaleFactor: scaleParam ? parseFloat(scaleParam) || DEFAULT_DEVICE_SCALE : DEFAULT_DEVICE_SCALE,
          waitUntil: waitUntilParam || "networkidle0",
        };
      }

      // Check if browser binding exists
      if (!env.MYBROWSER) {
        return new Response(
          JSON.stringify({
            error: "Browser binding 'MYBROWSER' not configured.",
            hint: "Ensure Cloudflare Browser Rendering is enabled on your Cloudflare account and configured in wrangler.jsonc",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const imgBuffer = await renderHtmlToPng(env.MYBROWSER, options);

      return new Response(imgBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({
          error: "Failed to render image from HTML",
          details: message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

async function renderHtmlToPng(
  browserWorker: puppeteer.BrowserWorker,
  options: RenderOptions
): Promise<Uint8Array> {
  const browser = await puppeteer.launch(browserWorker);

  try {
    const page = await browser.newPage();

    await page.setViewport({
      width: options.width ?? DEFAULT_WIDTH,
      height: options.height ?? DEFAULT_HEIGHT,
      deviceScaleFactor: options.deviceScaleFactor ?? DEFAULT_DEVICE_SCALE,
    });

    await page.setContent(options.html, {
      waitUntil: options.waitUntil ?? "networkidle0",
    });

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: options.fullPage ?? false,
    });

    return screenshot as Uint8Array;
  } finally {
    await browser.close();
  }
}

function handlePlayground(_request: Request): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML to PNG Cloudflare Worker</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --accent: #f97316;
      --text: #f8fafc;
      --muted: #94a3b8;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    h1 { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    .badge {
      font-size: 0.75rem;
      background: rgba(249, 115, 22, 0.2);
      color: var(--accent);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid rgba(249, 115, 22, 0.4);
    }
    main {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      padding: 2rem;
      flex: 1;
    }
    @media (max-width: 900px) { main { grid-template-columns: 1fr; } }
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h2 { font-size: 1rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    textarea {
      flex: 1;
      min-height: 250px;
      background: #0b1120;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: #38bdf8;
      font-family: monospace;
      font-size: 0.875rem;
      padding: 1rem;
      resize: vertical;
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.75rem;
    }
    .field { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; color: var(--muted); }
    input, select {
      background: #0b1120;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      padding: 0.5rem;
      font-size: 0.875rem;
    }
    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      margin-top: 1.25rem;
    }
    button {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .preview-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0b1120;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: auto;
      padding: 1rem;
      min-height: 300px;
    }
    .preview-img { max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .placeholder { color: var(--muted); font-size: 0.875rem; }
  </style>
</head>
<body>
  <header>
    <h1>⚡ Cloudflare HTML to PNG Worker</h1>
    <span class="badge">Browser Rendering API</span>
  </header>
  <main>
    <div class="panel">
      <h2>Input HTML</h2>
      <textarea id="htmlInput" placeholder="Paste your HTML code here...">&lt;div style="background: linear-gradient(135deg, #6366f1, #a855f7); width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-family: sans-serif; padding: 40px; box-sizing: border-box;"&gt;
  &lt;h1 style="font-size: 48px; margin: 0 0 16px 0;"&gt;Hello from Cloudflare Workers! 🚀&lt;/h1&gt;
  &lt;p style="font-size: 24px; opacity: 0.9;"&gt;HTML rendered dynamically to crisp PNG with Puppeteer&lt;/p&gt;
&lt;/div&gt;</textarea>
      <div class="controls">
        <div class="field">
          <label for="width">Width (px)</label>
          <input type="number" id="width" value="800" min="100" max="3840">
        </div>
        <div class="field">
          <label for="height">Height (px)</label>
          <input type="number" id="height" value="450" min="100" max="2160">
        </div>
        <div class="field">
          <label for="scale">Scale</label>
          <select id="scale">
            <option value="1">1x</option>
            <option value="2" selected>2x (Retina)</option>
          </select>
        </div>
        <div class="field">
          <label class="checkbox-field">
            <input type="checkbox" id="fullPage">
            Full Page
          </label>
        </div>
      </div>
      <button id="renderBtn" onclick="renderImage()">
        <span>Convert to PNG</span>
      </button>
    </div>
    <div class="panel">
      <h2>Rendered Output</h2>
      <div class="preview-container" id="previewContainer">
        <div class="placeholder" id="placeholder">Rendered image will appear here</div>
        <img id="resultImage" class="preview-img" style="display:none;" alt="Rendered PNG">
      </div>
    </div>
  </main>
  <script>
    async function renderImage() {
      const btn = document.getElementById('renderBtn');
      const placeholder = document.getElementById('placeholder');
      const resultImg = document.getElementById('resultImage');
      const html = document.getElementById('htmlInput').value;
      const width = parseInt(document.getElementById('width').value, 10);
      const height = parseInt(document.getElementById('height').value, 10);
      const scale = parseFloat(document.getElementById('scale').value);
      const fullPage = document.getElementById('fullPage').checked;

      btn.disabled = true;
      btn.innerText = 'Rendering...';
      placeholder.style.display = 'block';
      placeholder.innerText = 'Launching headless browser and taking screenshot...';
      resultImg.style.display = 'none';

      try {
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, width, height, deviceScaleFactor: scale, fullPage })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(err.details || err.error || 'Failed to render image');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        resultImg.src = url;
        resultImg.style.display = 'block';
        placeholder.style.display = 'none';
      } catch (err) {
        placeholder.style.display = 'block';
        placeholder.innerText = 'Error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.innerText = 'Convert to PNG';
      }
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

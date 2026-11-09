export interface Env {
  MYBROWSER: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return handlePlayground();
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      let html = "";
      let width = 1200;
      let height = 630;
      let fullPage = false;
      let deviceScaleFactor = 1;

      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const body = (await request.json()) as any;
        html = body.html || "";
        if (typeof body.width === "number") width = body.width;
        if (typeof body.height === "number") height = body.height;
        if (typeof body.fullPage === "boolean") fullPage = body.fullPage;
        if (typeof body.deviceScaleFactor === "number") deviceScaleFactor = body.deviceScaleFactor;
      } else {
        html = await request.text();
        const w = url.searchParams.get("width");
        const h = url.searchParams.get("height");
        const fp = url.searchParams.get("fullPage");
        const scale = url.searchParams.get("scale") || url.searchParams.get("deviceScaleFactor");
        if (w) width = parseInt(w, 10) || width;
        if (h) height = parseInt(h, 10) || height;
        if (fp) fullPage = fp === "true" || fp === "1";
        if (scale) deviceScaleFactor = parseFloat(scale) || deviceScaleFactor;
      }

      if (!html || !html.trim()) {
        return new Response(JSON.stringify({ error: "Missing required HTML code." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!env.MYBROWSER) {
        return new Response(JSON.stringify({ error: "Browser binding 'MYBROWSER' not configured." }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Cloudflare Browser Rendering Quick Action
      const screenshotResponse = await env.MYBROWSER.quickAction("screenshot", {
        html,
        viewport: {
          width,
          height,
          deviceScaleFactor
        },
        screenshotOptions: {
          fullPage,
          type: "png"
        }
      });

      return screenshotResponse;
    } catch (err: any) {
      return new Response(JSON.stringify({
        error: "Failed to render image",
        details: err.message || String(err)
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

function handlePlayground(): Response {
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
      --accent: #0284c7;
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
      background: rgba(2, 132, 199, 0.2);
      color: #38bdf8;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid rgba(2, 132, 199, 0.4);
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
      <textarea id="htmlInput" placeholder="Paste your HTML code here...">&lt;div style="background: linear-gradient(135deg, #0284c7, #6366f1); width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-family: sans-serif; padding: 40px; box-sizing: border-box;"&gt;
  &lt;h1 style="font-size: 44px; margin: 0 0 16px 0;"&gt;Hello from Cloudflare Workers! 🚀&lt;/h1&gt;
  &lt;p style="font-size: 22px; opacity: 0.9;"&gt;HTML rendered dynamically to crisp PNG with Browser Rendering&lt;/p&gt;
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
      placeholder.innerText = 'Rendering HTML to PNG image...';
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
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

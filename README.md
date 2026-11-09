# HTML to PNG Cloudflare Worker ⚡

A high-performance [Cloudflare Worker](https://workers.cloudflare.com/) that accepts raw HTML code or JSON payloads and returns rendered, high-resolution PNG images using [Cloudflare Browser Rendering](https://developers.cloudflare.com/browser-rendering/) (powered by Puppeteer).

## Features

- 🚀 **Serverless & Global**: Runs on Cloudflare's global edge network.
- 🎨 **Full Modern Web Standards**: Uses real Chromium via `@cloudflare/puppeteer` to render modern CSS (Flexbox, Grid), web fonts, Tailwind, animations, inline SVGs, and images.
- 🖼️ **Flexible I/O**:
  - Send JSON (`application/json`) with custom viewport, scale factor, and wait conditions.
  - Send raw HTML (`text/html`) directly in the POST body with query parameters.
- 📱 **Customizable Viewport & Scaling**: Supports custom `width`, `height`, `fullPage`, and Retina scaling (`deviceScaleFactor: 2`).
- 🖥️ **Interactive Playground**: Visit `GET /` in your browser for a built-in testing interface.
- 🤖 **CI/CD Ready**: Includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy.yml`).

---

## Prerequisites

1. **Cloudflare Account**: [Sign up here](https://dash.cloudflare.com/sign-up).
2. **Browser Rendering Enabled**: Cloudflare Browser Rendering must be enabled in your Cloudflare dashboard under **Workers & Pages** > **Browser Rendering**.
3. **Node.js**: v18 or later.

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/chintu4/html-to-png-worker.git
cd html-to-png-worker
npm install
```

### 2. Local Development

Run the worker locally using Wrangler:

```bash
npm run dev
```

Navigate to `http://localhost:8787` in your browser to access the interactive web playground.

### 3. Deploy to Cloudflare

Authenticate with Wrangler and deploy:

```bash
npx wrangler login
npm run deploy
```

---

## API Usage

### 1. JSON Request (`POST /`)

Send a `POST` request with `Content-Type: application/json`:

```bash
curl -X POST https://<your-worker-subdomain>.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<div style=\"background: #1e1b4b; color: #38bdf8; padding: 40px; font-family: sans-serif; font-size: 32px;\">Hello World!</div>",
    "width": 1200,
    "height": 630,
    "deviceScaleFactor": 2,
    "fullPage": false
  }' \
  --output result.png
```

#### JSON Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `html` | `string` | *(Required)* | The HTML code to render. |
| `width` | `number` | `1200` | Viewport width in pixels. |
| `height` | `number` | `630` | Viewport height in pixels. |
| `deviceScaleFactor` | `number` | `1` | Device pixel ratio (use `2` for Retina/high-res). |
| `fullPage` | `boolean` | `false` | Whether to take a screenshot of the entire scrollable page. |
| `waitUntil` | `string` | `"networkidle0"` | Navigation wait event (`load`, `domcontentloaded`, `networkidle0`, `networkidle2`). |

---

### 2. Raw HTML Request (`POST /`)

Send raw HTML with `Content-Type: text/html` and configure options via query parameters:

```bash
curl -X POST "https://<your-worker-subdomain>.workers.dev/?width=800&height=400&scale=2" \
  -H "Content-Type: text/html" \
  --data-binary "<h1>Simple HTML Header</h1>" \
  --output header.png
```

#### Query Parameters

- `width`: Viewport width (e.g., `800`)
- `height`: Viewport height (e.g., `450`)
- `scale` or `deviceScaleFactor`: Scale multiplier (`1` or `2`)
- `fullPage`: `true` or `false`
- `waitUntil`: `networkidle0`, `load`, etc.

---

### 3. Client Integration (JavaScript / TypeScript)

```typescript
async function htmlToPng(html: string): Promise<Blob> {
  const response = await fetch("https://<your-worker-subdomain>.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      width: 1200,
      height: 630,
      deviceScaleFactor: 2
    }),
  });

  if (!response.ok) {
    throw new Error(`Rendering failed: ${response.statusText}`);
  }

  return await response.blob();
}
```

---

## Continuous Deployment (GitHub Actions)

To automatically deploy upon pushing to the `main` branch:

1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Add the following repository secrets:
   - `CLOUDFLARE_API_TOKEN`: A Cloudflare API token with **Cloudflare Workers: Edit** permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID (found on your dashboard URL or Workers overview).
3. Any push to `main` will automatically build and deploy your Worker via `.github/workflows/deploy.yml`.

---

## License

MIT

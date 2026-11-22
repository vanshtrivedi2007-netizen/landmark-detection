# Deploying to Render

This repository is optimized for deployment on [Render](https://render.com). The backend Fastify server automatically serves the compiled Vite SPA frontend from `apps/web/dist` on the same domain and port, eliminating CORS issues and hosting costs for multiple services.

---

## Deployment Strategies

### Strategy 1: Free Render Tier + Free Local Ollama Tunnel (Recommended for Zero Cost)

Render's free tier has 512 MB RAM, which is plenty for the Node server and frontend SPA, but too small to hold a 3.4 GB LLM in memory. You can host the web app on Render for **free** while pointing inference to your own computer via a free Cloudflare tunnel:

1. **On your computer (with Ollama running):**
   ```bash
   # Expose Ollama (port 11434) to a free public HTTPS endpoint:
   cloudflared tunnel --url http://localhost:11434
   ```
   *Copy the generated URL (e.g., `https://random-words.trycloudflare.com`).*

2. **On Render:**
   - Create a **New Web Service** and connect your GitHub repo.
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `OLLAMA_BASE_URL` = `https://random-words.trycloudflare.com`
     - `OLLAMA_VISION_MODEL` = `gemma3:4b`
     - `HOST` = `0.0.0.0`
   - **Plan**: Free

---

### Strategy 2: Self-Contained Docker on Render (Runs Ollama inside Render)

If you prefer everything self-contained in the cloud without keeping your PC on:

1. Push this repository to GitHub.
2. In Render, select **New > Web Service** and connect your repo.
3. Select **Docker** environment (Render will automatically detect the root [Dockerfile](Dockerfile)).
4. **Instance Type**: Select an instance with at least **6 GB – 8 GB RAM** (e.g. Render *Standard* or *Pro*) so `gemma3:4b` can load into memory.
5. Click **Create Web Service**. The container will boot Ollama and the Node server automatically.

---

### Strategy 3: Render Blueprint (Infrastructure-as-Code)

1. Push your repository to GitHub.
2. In the Render Dashboard, click **Blueprints > New Blueprint Instance**.
3. Select your repository. Render will automatically read [render.yaml](render.yaml) and configure the build command, start command, and health checks.
4. Click **Apply**.

---

## Health Check Endpoint

Render will probe `/api/health` automatically:
- **Health Check Path**: `/api/health`
- Returns HTTP 200 with model status, Knowledge Base statistics, and Ollama connection details.

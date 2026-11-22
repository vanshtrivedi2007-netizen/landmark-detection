#!/bin/bash
set -e

# Start Ollama daemon in background if Ollama is installed in container
if command -v ollama >/dev/null 2>&1; then
  echo "[Render] Starting internal Ollama service in background..."
  ollama serve &

  # Wait for Ollama service to become responsive
  echo "[Render] Waiting for Ollama socket at http://localhost:11434..."
  for i in {1..30}; do
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
      echo "[Render] Ollama is online!"
      break
    fi
    sleep 1
  done

  # Pre-pull configured vision model in background
  MODEL="${OLLAMA_VISION_MODEL:-gemma3:4b}"
  echo "[Render] Verifying model '$MODEL'..."
  ollama pull "$MODEL" &
else
  echo "[Render] Ollama binary not found in container; relying on external OLLAMA_BASE_URL: $OLLAMA_BASE_URL"
fi

# Launch Fastify Node server in foreground
echo "[Render] Launching Landmark Server on $HOST:$PORT..."
exec node apps/server/dist/index.js

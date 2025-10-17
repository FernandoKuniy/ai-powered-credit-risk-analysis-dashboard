#!/usr/bin/env bash
set -euo pipefail

# ---------- config ----------
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
PY_ENV=".venv"
BACKEND_PORT=8000
FRONTEND_PORT=3000
# ----------------------------

kill_port() {
  local PORT=$1
  if lsof -i :"$PORT" >/dev/null 2>&1; then
    echo "→ Port $PORT in use; killing existing process..."
    lsof -ti :"$PORT" | xargs -r kill -9 || true
  fi
}

# 1) ensure ports are free
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

# 2) start backend (FastAPI) in background
echo "→ Starting backend on :$BACKEND_PORT"
cd "$BACKEND_DIR"

# activate venv if present
if [ -d "../$PY_ENV" ]; then
  # shellcheck disable=SC1090
  source "../$PY_ENV/bin/activate"
fi

uvicorn app:app --reload --port "$BACKEND_PORT" &
BACKEND_PID=$!
cd - >/dev/null

# ensure backend is up
echo -n "→ Waiting for backend to respond"
for i in {1..40}; do
  if curl -fsS "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 0.25
done

# 3) start frontend (Next.js) in foreground
echo "→ Starting frontend on :$FRONTEND_PORT"
cd "$FRONTEND_DIR"
export NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT"
npm install >/dev/null
# When you hit Ctrl+C, this fg process will stop; trap will clean backend
trap 'echo; echo "→ Stopping backend ($BACKEND_PID)"; kill $BACKEND_PID 2>/dev/null || true; exit 0' INT TERM EXIT
npm run dev -- -p "$FRONTEND_PORT"
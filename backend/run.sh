#!/bin/bash
# Run the FastAPI backend from the repo root
# Usage: cd /path/to/mizan-reputation-radar && bash backend/run.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Load env if present
if [ -f backend/.env ]; then
  export $(grep -v '^#' backend/.env | xargs)
fi

echo "Starting Mizan Reputation Radar API..."
echo "Root: $ROOT_DIR"
echo "API docs: http://localhost:8000/docs"

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

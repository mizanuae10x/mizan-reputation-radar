SHELL := /bin/bash
.PHONY: install dev-backend dev-frontend dev install-python install-node help

help:
	@echo "Mizan Reputation Radar — development commands"
	@echo ""
	@echo "  make install        Install all dependencies (Python + Node)"
	@echo "  make dev            Start both backend and frontend (requires tmux or two terminals)"
	@echo "  make dev-backend    Start FastAPI backend on :8000"
	@echo "  make dev-frontend   Start Next.js frontend on :3000"

install: install-python install-node

install-python:
	pip install -r backend/requirements.txt

install-node:
	npm install

dev-backend:
	python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	npm run dev

dev:
	@echo "Starting backend on :8000 and frontend on :3000 ..."
	@trap 'kill 0' INT; \
	python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload & \
	npm run dev & \
	wait

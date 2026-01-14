# 🎓 Siksha Intelligence — Frontend

Siksha Intelligence is a multi-tenant School ERP frontend built with React + TypeScript + Vite + Tailwind. It is designed to communicate with a Spring Boot backend (Swagger available locally).

## Table of Contents

- Overview
- Tech Stack
- Local Setup (Frontend + Backend)
- Environment Variables (`.env`)
- API Base URL (important)
- Auth Flow (Login + Refresh)
- Multi-Tenancy (X-Tenant-ID)
- Project Structure
- Scripts
- Troubleshooting

## Overview

- Frontend: React 19 + Vite + Tailwind
- Backend: Spring Boot (local default `http://localhost:8080`)
- API calls: Axios client with interceptors
- Auth: Access token in `Authorization` header; refresh token stored in `localStorage`

## Tech Stack

- **Core:** React 19 + TypeScript
- **Build Tool:** Vite (rolldown-vite)
- **Styling:** Tailwind CSS (PostCSS)
- **UI Components:** shadcn/ui
- **State:** Redux Toolkit (and Zustand is available as a dependency)
- **Networking:** Axios

## Local Setup

### 1) Prerequisites

- Node.js v20+
- npm
- Spring Boot backend running locally

### 2) Backend (Spring Boot)

- Start your backend on `http://localhost:8080`
- Swagger UI should load at:
	- `http://localhost:8080/swagger-ui/index.html`

### 3) Frontend Install

```bash
npm install
```

### 4) Configure Environment

Copy `.env.example` to `.env` and set the base URL:

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_API_PREFIX=/api
VITE_API_VERSION=v1
```

Important:

- Vite reads `.env` at dev-server start. After changing `.env`, you must restart `npm run dev`.

### 5) Run the Frontend

```bash
npm run dev
```

## Environment Variables

### `VITE_API_BASE_URL`

- Purpose: backend origin (scheme + host + port).
- Example: `http://localhost:8080`

### `VITE_API_PREFIX` and `VITE_API_VERSION`

- Purpose: API path prefix + versioning.
- Example: `/api` and `v1` compose requests under `/api/v1`.

## API Base URL (important)

This project uses an Axios instance in `src/lib/axios.ts`.

- When `VITE_API_BASE_URL` is set, requests go to that host.
- If it is missing in development, the app falls back to `http://localhost:8080` (and logs a warning).

If you ever see API calls going to `http://localhost:5173/...`, it means Axios did not receive a base URL (or you didn’t restart Vite after editing `.env`).

## Auth Flow

### Endpoints

The frontend calls these endpoints relative to the composed API base URL:

- `POST /auth/login`
- `POST /refresh`

If your backend uses different paths (e.g. `/auth/login`), update the frontend calls or set `VITE_API_BASE_URL` to include the prefix.

### Tokens

- **Access token**: stored in Redux state and attached as `Authorization: Bearer <token>`
- **Refresh token**: stored in `localStorage`

### Auto Refresh

Axios intercepts `401` responses and attempts a single refresh flow, queues concurrent requests during refresh, then retries them with the new token.

## Multi-Tenancy (X-Tenant-ID)

The tenant is derived from the hostname and injected as a request header:

- `X-Tenant-ID: <tenant>`

Examples:

- `school-a.siksha.ai` → `X-Tenant-ID: school-a`
- `school-a.localhost` → `X-Tenant-ID: school-a`

## Project Structure

Feature-based structure under `src/`:

```text
src/
├── assets/             # Global static files
├── components/         # Shared UI
│   ├── ui/             # shadcn atoms
│   ├── common/         # Shared molecules
│   └── layout/         # App shells
├── features/           # Domain modules
│   ├── auth/           # Login / auth screens
│   ├── uis/            # User information
│   ├── academics/
│   └── finance/
├── lib/                # Axios and utilities
├── pages/              # Route-level pages
├── routes/             # Routing
├── services/           # API/service layer
├── store/              # Redux store + slices
├── types/              # Shared TS types
└── utils/              # Helpers
```

## Scripts

```bash
npm run dev      # start dev server
npm run build    # typecheck + production build
npm run preview  # preview production build
npm run lint     # eslint
```

## Troubleshooting

### API calls go to `localhost:5173` instead of `localhost:8080`

- Ensure `.env` exists and contains `VITE_API_BASE_URL=http://localhost:8080`
- Restart the dev server: stop `npm run dev` and run it again
- Hard refresh the browser (Ctrl+Shift+R)

### CORS / Cookie issues (Spring Boot)

This frontend uses `withCredentials: true` on Axios.

- Backend must allow credentials
- Backend must allow the frontend origin (commonly `http://localhost:5173`)

### 404 on `/login` or `/refresh`

- Confirm exact endpoint paths in Swagger (`/swagger-ui/index.html`)
- If backend uses a prefix like `/api` or `/auth`, set `VITE_API_BASE_URL` accordingly (e.g. `http://localhost:8080/auth`).

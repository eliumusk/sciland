# SciX Web (Next.js Frontend)

Production-ready Next.js App Router frontend for the SciX API.

## Prerequisites
- Node.js 18+
- The SciX backend running from `../api`

## Run the backend
From the repo root:

```bash
cd api
npm install
npm run dev
```

The backend serves at `http://localhost:3002/api/v1` by default.

## Run the frontend
From `web`:

```bash
npm install
npm run dev
```

Visit `http://localhost:3001` (or the port shown in the terminal).

## Environment variables
Copy `.env.example` to `.env.local` and edit as needed:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## Notes
- The UI requires an API key. Set it on `/settings`.
- The home page lists skills from `/api/v1/skills` and supports creating skills when the API key is set.
- All API calls include `Authorization: Bearer <API_KEY>` when present.
- Date parsing is guarded with safe utilities and Zod schemas to avoid UI crashes.

## Scripts
- `npm run dev` — start the dev server
- `npm run lint` — run Next.js lint
- `npm run build` — build production bundle

# MemberConnect — Frontend

Web interface for MemberConnect, a membership administration system for a teachers' welfare fund
organised across Sri Lankan educational districts and zones.

It is the operator-facing side of the system: registration and board approvals, membership
documentation printing and dispatch, profile changes, transfers, termination, retirement, death
records, death donations, dormancy, and two scholarship programmes.

**Stack:** Next.js 16.1 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4 · Radix / shadcn

> Requires the [backend API](../backend) to be running.

---

## Requirements

| | |
|---|---|
| Node.js | 20.9 or newer (the Docker image uses 22) |
| npm | 10+ |
| Backend API | running and reachable — see `../backend/README.md` |

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

With no configuration the app talks to `http://localhost:8080`, which is the backend's default
port. Sign in with the account seeded by the backend on first startup:

| Username | Password |
|---|---|
| `superadmin` | `Admin@1234` |

### With Docker

From the parent directory, `docker-compose.yml` runs this app, the API and PostgreSQL together:

```bash
docker compose up --build
```

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server with hot reload on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

---

## Configuration

Two environment variables, and the difference between them matters.

| Variable | Read by | Value |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | the **browser** | `http://localhost:8080` |
| `BACKEND_API_BASE_URL` | the **Next.js server** | `http://localhost:8080` locally, `http://backend:8080` under Docker |

Route handlers under `src/app/api/` (document streaming, uploads, avatars) run on the Next.js
server, where `localhost` is this container rather than the API. Those use
`BACKEND_API_BASE_URL`; everything the browser calls uses `NEXT_PUBLIC_API_BASE_URL`.

Getting the two confused produces broken images and downloads while the rest of the app keeps
working — an easy fault to miss.

> `NEXT_PUBLIC_*` values are inlined at **build** time, so changing one needs a rebuild, not just
> a restart. In Docker it is passed through the `NEXT_PUBLIC_API_BASE_URL` build arg.

---

## Project layout

```
src/
├── app/
│   ├── (auth)/              Login — unauthenticated route group
│   ├── (protected)/         Everything behind sign-in
│   │   ├── membership/      Registration, directory, board approvals, printing,
│   │   │                    dispatch, profile changes, termination, dormancy
│   │   ├── scholarships/    Grade 5, university, fund requests
│   │   ├── death-donation/
│   │   ├── admin/           User management and master data
│   │   ├── reports/
│   │   └── profile/
│   └── api/                 Server route handlers that proxy to the backend
│
├── components/
│   ├── ui/                  shadcn / Radix primitives
│   ├── membership/          Domain components, incl. print templates
│   ├── NavigationItem/      Sidebar and top header
│   └── Dashboard/           Role-aware work queues
│
lib/
├── auth-context.tsx         Session state, login/logout, profile refresh
├── permissions.ts           Who can see and do what (mirrors the backend matrix)
├── api/                     One typed module per backend area
│   ├── client.ts            Axios instance, token injection, 401/403 handling
│   └── authFetch.ts         fetch() wrapper for the older scholarship screens
└── validators/              Zod schemas for the larger forms
```

---

## How the app is put together

### Authentication

Login posts to `/api/auth/login` and stores the JWT plus the user in `localStorage`
(`auth_token`, `auth_user`). The token is attached to every request by an axios interceptor in
`lib/api/client.ts`, and to raw `fetch()` calls by a patch installed in the protected layout.

The stored user is refreshed from `GET /api/profile` on every page load, so a role, district or
authority change reaches the UI without signing out and in again.

| Status | Behaviour |
|---|---|
| `401` | Session cleared, redirect to `/login` |
| `403` | **Not** a logout — the session is valid, the action simply is not permitted |

### Permissions

`lib/permissions.ts` decides what the interface offers: which sidebar entries appear, which
buttons render, which filters are editable.

> This is **UX only.** The backend enforces the same matrix independently in
> `config/RolePermissions.java`, and that copy is the one that counts. The two are kept in step by
> hand — if they drift, the symptom is a button that returns 403, or an action the UI hides that
> the API still allows.

Three shapes are used, matching how each module was built:

- **Role lists** — `MEMBER_REGISTRATION_ROLES`, `BOARD_GOVERNANCE_ROLES`, `INACTIVE_RIGHTS_ROLES`, …
- **Named permissions** — `hasPermission()`, `hasRetPermission()` for Grade 5, university,
  retirement and transfers
- **Level-aware helpers** — `canDecideMemberDeathAt(role, status)` and friends, because on the
  three-level approval ladders a decision belongs to whichever role owns the level the record is
  currently sitting at

### Navigation

`components/NavigationItem/NavigationSideBar.tsx` builds a different menu per role rather than
rendering one menu and hiding items. It also maps detail routes back to their owning sidebar
entry, so the correct item stays highlighted on nested pages.

### Printing

Membership cards, signature cards and passbooks are rendered in the browser from React templates
in `components/membership/print-templates/`. The backend only records *that* a document was
printed — the layout lives here.

---

## Conventions

- Path aliases: `@/lib/...`, `@/src/components/...` (see `tsconfig.json`)
- Server components by default; `"use client"` only where interactivity needs it
- Forms use React Hook Form with Zod resolvers for the larger screens
- Uploads must not set `Content-Type` by hand — `client.ts` clears it so the browser can generate
  the multipart boundary
- Status colours come from `lib/statusBadge.ts`, so a status looks the same everywhere

---

## Known constraints

- The axios client has a **15-second timeout**, while the backend accepts uploads of unlimited
  size. Large files can fail in the browser while the server is still processing them.
- There are **no automated tests** in this package — no test runner is configured.
- `uploads/` in this directory is legacy local storage. Document storage now lives in the
  backend, and the UI filters out any document whose path begins with `uploads/` as orphaned.

# Hena Wadeena — Frontend Application

React-based web application for the Hena Wadeena platform, serving tourists, residents, merchants, guides, investors, and administrators across New Valley Governorate, Egypt.

## Overview

This is the unified frontend for all Hena Wadeena services, providing a responsive Arabic-first experience with role-based dashboards, interactive maps, real-time chat, and comprehensive search across tourism, marketplace, guide booking, and investment opportunities.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 18 with TypeScript (strict mode) |
| **Build Tool** | Vite 5 with SWC |
| **Routing** | React Router v7 |
| **State Management** | TanStack Query v5 (React Query) |
| **Forms** | React Hook Form + Zod validation |
| **UI Components** | Radix UI primitives + shadcn/ui patterns |
| **Styling** | Tailwind CSS 3 with custom design system |
| **Maps** | Leaflet + React Leaflet |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Date Handling** | date-fns |
| **Testing** | Vitest + Testing Library |

## Prerequisites

- **Node.js** 22 LTS (use `nvm use` in project root)
- **pnpm** 9+
- Running backend services (see root README.md for setup)

## Getting Started

### Installation

```bash
# From repository root
pnpm install

# Build shared packages first (required)
pnpm --filter @hena-wadeena/types build
```

### Environment Variables

Create a `.env` file (or copy from `.env.example`):

```bash
# API Gateway URL
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

**Note:** In development mode, Vite proxies API requests directly to individual services (see `vite.config.ts`). In production, all requests go through the Nginx gateway.

### Development Server

```bash
# From repository root
pnpm --filter @hena-wadeena/web dev

# Or from apps/web directory
pnpm dev
```

The app runs at **http://localhost:8080** with hot module replacement (HMR).

### Build

```bash
# Production build
pnpm build

# Development build (with source maps)
pnpm build:dev

# Preview production build locally
pnpm preview
```

Output goes to `dist/` directory.

## Project Structure

```
apps/web/src/
├── assets/          # Static images, fonts, icons
├── components/      # React components
│   ├── admin/       # Admin panel components
│   ├── ai/          # Chat widget and AI-related UI
│   ├── auth/        # Auth guards, login/register forms
│   ├── dashboard/   # Role-specific dashboard components
│   ├── home/        # Landing page sections
│   ├── icons/       # Custom icon components
│   ├── layout/      # Navbar, footer, page layouts
│   ├── maps/        # Leaflet map components
│   ├── market/      # Marketplace listing cards/filters
│   ├── motion/      # Framer Motion animations
│   ├── roles/       # Role-specific widgets
│   └── ui/          # shadcn/ui primitives (50+ components)
├── contexts/        # React contexts (AuthContext)
├── hooks/           # Custom React hooks (useAuth, useMap, etc.)
├── lib/             # Utilities (formatters, query keys, constants)
├── pages/           # Route page components
│   ├── admin/       # Admin dashboard pages
│   ├── auth/        # Login, register
│   ├── guides/      # Guide profiles and listing
│   ├── investment/  # Investment opportunities
│   ├── logistics/   # Carpool ride management
│   ├── marketplace/ # Product listings and prices
│   ├── profile/     # User profile, wallet, bookings
│   ├── reviewer/    # KYC/moderation reviewer dashboard
│   ├── roles/       # Role-specific dashboards (7 roles)
│   ├── search/      # Unified search results
│   └── tourism/     # Attractions, accommodations, packages
├── services/        # API client and auth token management
└── test/            # Test setup and utilities
```

## Key Features

### 🔐 Authentication & Authorization
- JWT-based auth with access + refresh tokens
- Role-based access control (Tourist, Resident, Merchant, Guide, Investor, Driver, Student)
- Protected routes with `RequireAuth` and `RequireRole` guards
- Persistent login state via `AuthContext`

### 🗺️ Interactive Maps
- Leaflet integration with OpenStreetMap
- GeoJSON overlay for New Valley boundaries
- Attraction markers with clustering
- Carpool ride creation and visualization
- District-based filters (Kharga, Dakhla, Farafra, Baris, Balat)

### 🏪 Marketplace
- Product listings with Arabic full-text search
- Price index dashboard with historical charts
- Commodity price tracking (vegetables, fruits, grains)
- Business directory and supplier profiles

### 🧭 Tourism
- Attraction discovery with filters (type, area, season, difficulty)
- Guide booking system with package selection
- Accommodation listings with inquiry forms
- Photo galleries and detailed descriptions

### 💼 Investment Opportunities
- Investment listing with category filters
- Application submission workflow
- Opportunity details with contact forms

### 🤖 AI Concierge
- Floating chat widget (ChatWidget)
- RAG-powered responses in Egyptian Arabic
- Context-aware assistance across all pages

### 📊 Admin Dashboard
- User management with KYC approval
- Content moderation queue
- Guide verification and statistics
- Map data management (attractions, POIs)
- Commodity/crop price administration

### 🔔 Real-Time Notifications
- Bell icon with unread count
- Notification list with pagination
- Mark as read/unread functionality

### 🔍 Unified Search
- Federated search across all services
- Arabic text normalization and fuzzy matching
- Result type filters (businesses, attractions, opportunities, etc.)

## Development Workflow

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting (ESLint with type-checked rules)
pnpm lint

# Tests
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

### Component Development

This project uses **shadcn/ui** patterns:
- UI primitives are in `src/components/ui/`
- Composed components are in feature-specific directories
- Use `@/` import alias for all internal imports

### State Management

- **Server state:** TanStack Query with centralized query keys (`src/lib/query-keys.ts`)
- **Auth state:** React Context (`AuthContext`)
- **Form state:** React Hook Form + Zod schemas
- **URL state:** React Router search params

### API Integration

All API calls go through `src/services/api.ts`:
- Centralized error handling
- Automatic token refresh on 401
- TypeScript interfaces from `@hena-wadeena/types`

## Testing

- **Unit tests:** `*.spec.ts` files next to source files
- **Integration tests:** `__tests__/` directories
- **Test coverage:** Key utilities, hooks, and contexts

Run tests:
```bash
pnpm test
```

Example test locations:
- `src/hooks/__tests__/use-paginated-query.spec.tsx`
- `src/contexts/__tests__/auth-context.spec.tsx`
- `src/lib/__tests__/query-keys.spec.ts`

## Build & Deployment

### Production Build

```bash
pnpm build
```

Output:
- Static assets in `dist/`
- Optimized bundle with tree-shaking
- No source maps (set `build.sourcemap: true` for debugging)

### Deployment Target

**AWS Amplify** — automatic deployments from `main` branch.

- Build command: `pnpm build`
- Output directory: `dist`
- Node version: 22 LTS

### Environment Variables (Production)

Set in Amplify console:
- `VITE_API_BASE_URL` → Production API gateway URL (e.g., `https://api.henawadeena.com/api/v1`)

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/<feature>/`
2. Add route in `src/App.tsx`
3. Add to navigation in `src/components/layout/Navbar.tsx` (if needed)

### Adding a New API Endpoint

1. Add interface to `packages/types/src/`
2. Add API function to `src/services/api.ts`
3. Create custom hook in `src/hooks/` using TanStack Query
4. Add query key to `src/lib/query-keys.ts`

### Adding a New UI Component

Use shadcn/ui CLI patterns or manually add Radix primitives to `src/components/ui/`.

### Updating Shared Types

After editing `@hena-wadeena/types`:
```bash
pnpm --filter @hena-wadeena/types build
```

The frontend will auto-reload due to workspace linking.

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 8080) |
| `pnpm build` | Production build |
| `pnpm build:dev` | Development build with source maps |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint (max 0 warnings) |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |

## Troubleshooting

### API Connection Issues

**Problem:** 404/502 errors from API calls

**Solutions:**
1. Ensure backend services are running (see root README.md)
2. Check `VITE_API_BASE_URL` environment variable
3. Verify Vite proxy config in `vite.config.ts` for dev mode

### Build Errors

**Problem:** `Cannot find module '@hena-wadeena/types'`

**Solution:**
```bash
pnpm --filter @hena-wadeena/types build
```

### HMR Not Working

**Problem:** Changes not reflecting in browser

**Solutions:**
1. Check browser console for WebSocket errors
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart dev server

## Related Documentation

- [Root README](../../README.md) — Full platform overview
- [CLAUDE.md](../../CLAUDE.md) — Development standards and architecture
- [@hena-wadeena/types](../../packages/types/) — Shared TypeScript interfaces

## License

Proprietary — Hena Wadeena Project

# Scodash Server — CLAUDE.md

## What is this?
Scodash API server — a talent scoring engine that ranks professionals with a composite score (0–10,000) from 8 career signals. Pure REST API built with Fastify + TypeScript.

## Tech Stack
- **Runtime**: Node.js 20+, TypeScript (strict mode), ESM
- **Framework**: Fastify 5 with plugins (@fastify/cors, @fastify/rate-limit, @fastify/multipart)
- **Database**: PostgreSQL (Neon) + Prisma ORM + pgvector extension
- **Cache**: Upstash Redis (REST-based)
- **AI**: Anthropic SDK (Haiku for matching, Sonnet for resume parsing), OpenAI (text-embedding-3-small for embeddings)
- **Validation**: Zod schemas for all inputs
- **Testing**: Vitest

## Project Structure
```
src/
├── index.ts              # Entry point — starts Fastify server
├── app.ts                # Fastify app factory + plugin registration
├── config/
│   └── env.ts            # Zod-validated environment variables
├── plugins/
│   ├── prisma.ts         # Fastify plugin: Prisma client lifecycle
│   ├── redis.ts          # Fastify plugin: Upstash Redis client
│   └── rateLimit.ts      # Fastify plugin: IP-based rate limiting
├── routes/
│   ├── score/            # POST /score/linkedin, POST /score/resume
│   ├── profile/          # GET /profile/:id
│   ├── compare/          # GET /compare?ids=a,b
│   └── explore/          # GET /explore?role=...&yoe=...
├── services/
│   ├── ai/               # AI normalization layer (3-tier: exact→vector→LLM)
│   ├── scoring/          # 8-signal scoring engine + ranking
│   ├── profile/          # Profile creation/ingestion pipeline
│   └── enrichment/       # LinkedIn MCP, resume parsing, data pipeline
├── lib/
│   ├── errors.ts         # AppError class + error codes
│   └── utils.ts          # Shared helpers
└── types/
    ├── index.ts           # Barrel exports
    ├── scoring.ts         # Signal types, score result types
    ├── profile.ts         # Profile, work experience, education types
    └── api.ts             # API request/response schemas
```

## Key Patterns

### Service Layer
Routes are thin — they validate input, call a service, return the result. Business logic lives in `src/services/`.

### Error Handling
All errors extend `AppError` from `src/lib/errors.ts`. Routes catch errors and return structured JSON:
```json
{ "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "..." } }
```

### AI Normalization (3-Tier)
Entity resolution for companies/institutions/skills:
1. **Exact match**: PostgreSQL normalized_name lookup (free, 0ms)
2. **Vector similarity**: pgvector cosine search, threshold >0.92 (near-free, 5ms)
3. **LLM fallback**: Claude Haiku classifies from top-5 candidates ($0.001/call, 200ms)

### Scoring Formula
```
Si = signal score (0–100 each)
Raw Score = Σ(wi × Si) where Σwi = 1.0
Final Score = Raw Score × Confidence × 100  →  range 0–10,000
```

### Confidence Multipliers
- ESTIMATED (anonymous submission): 1.0 (Phase 1 — all profiles)
- VERIFIED (claimed via OAuth): 1.0 (Phase 2)

## Conventions

### Code Style
- Strict TypeScript — no `any`, no `as` casts unless unavoidable
- Zod for ALL external input validation (API params, env vars, MCP responses)
- Named exports only (no default exports except route handlers)
- Async/await everywhere — no raw Promises or callbacks
- Prisma for all DB access except pgvector queries (use $queryRaw)

### Naming
- Files: kebab-case (`company-matcher.ts`)
- Types/interfaces: PascalCase (`SignalResult`)
- Functions: camelCase (`calcCompanyTier`)
- DB columns: snake_case via Prisma `@map()`
- Constants: SCREAMING_SNAKE_CASE (`SIGNAL_WEIGHTS`)

### API Responses
All successful responses: `{ data: T }`
All errors: `{ error: { code: string, message: string } }`

## Common Commands
```bash
npm run dev              # Start dev server with hot reload
npm run db:push          # Push schema changes to DB (no migration)
npm run db:migrate       # Create and run migration
npm run db:seed          # Run base seed (companies, institutions, skills)
npm run seed:all         # Run all seed scripts including embeddings
npm run test             # Run tests in watch mode
npm run typecheck        # TypeScript type checking
```

## Environment Variables
Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis
- `ANTHROPIC_API_KEY` — Claude API key
- `OPENAI_API_KEY` — OpenAI API key (embeddings only)

## Phase 1 Scope (Current)
- LinkedIn URL → MCP scrape → AI normalize → score
- Resume upload → Claude Sonnet parse → AI normalize → score
- Profile retrieval with full signal breakdown
- Compare two profiles side-by-side
- Explore ranked profiles with filters
- Pre-seeded reference data (companies, institutions, skills, salaries)

## NOT in Phase 1
- Auth/signup/login
- Recruiter portal, payments
- Elasticsearch (using PostgreSQL FTS)
- BullMQ workers (synchronous scoring)
- Deployment config

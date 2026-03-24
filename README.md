# Scodash Server

> **PageRank for careers** — a zero-friction talent scoring engine that ranks professionals with a composite score (0–10,000) derived from 8 career signals.

## Architecture

```mermaid
graph TB
    Client[Client App] -->|REST API| Server[Fastify Server]

    Server --> ScoreLinkedIn[POST /score/linkedin]
    Server --> ScoreResume[POST /score/resume]
    Server --> Profile[GET /profile/:id]
    Server --> Compare[GET /compare]
    Server --> Explore[GET /explore]

    ScoreLinkedIn --> Pipeline[Enrichment Pipeline]
    ScoreResume --> Pipeline

    Pipeline --> LinkedInMCP[LinkedIn MCP]
    Pipeline --> ResumeParse[Claude Sonnet Parser]
    Pipeline --> AILayer[AI Normalization Layer]

    AILayer --> ExactMatch[Tier 1: Exact Match<br/>PostgreSQL]
    AILayer --> VectorSearch[Tier 2: Vector Similarity<br/>pgvector]
    AILayer --> LLMFallback[Tier 3: LLM Resolution<br/>Claude Haiku]

    Pipeline --> ScoringEngine[Scoring Engine]

    ScoringEngine --> S1[Company Tier 15%]
    ScoringEngine --> S2[Role Progression 18%]
    ScoringEngine --> S3[Education 10%]
    ScoringEngine --> S4[Skills Demand 17%]
    ScoringEngine --> S5[Trajectory Momentum 20%]
    ScoringEngine --> S6[CTC Market Ratio 10%]
    ScoringEngine --> S7[Stability 5%]
    ScoringEngine --> S8[Industry Demand 5%]

    ExactMatch --> DB[(PostgreSQL + pgvector)]
    VectorSearch --> DB
    ScoringEngine --> DB
    Pipeline --> Redis[(Upstash Redis)]

    style Server fill:#6366f1,stroke:#4f46e5,color:#fff
    style ScoringEngine fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style AILayer fill:#22d3ee,stroke:#06b6d4,color:#000
    style DB fill:#10b981,stroke:#059669,color:#fff
    style Redis fill:#f59e0b,stroke:#d97706,color:#000
```

## Scoring Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant MCP as LinkedIn MCP
    participant AI as AI Normalizer
    participant SE as Scoring Engine
    participant DB as PostgreSQL
    participant R as Redis Cache

    C->>S: POST /score/linkedin {url}
    S->>R: Check cache (24h TTL)

    alt Cache Hit
        R-->>S: Cached score result
        S-->>C: 200 {data: scoreResult}
    else Cache Miss
        S->>DB: Check existing profile

        alt New Profile
            S->>MCP: get_person_profile(url)
            MCP-->>S: Raw profile data
            S->>AI: Normalize entities
            AI->>DB: Tier 1: Exact match lookup
            AI->>DB: Tier 2: pgvector cosine search
            AI->>AI: Tier 3: Claude Haiku (if needed)
            AI-->>S: Normalized profile
            S->>DB: Create profile + relations
        end

        S->>SE: Calculate 8 signals
        SE->>DB: Fetch reference data
        SE-->>S: SignalResult[]
        S->>DB: Store signals + score + history
        S->>R: Cache result (24h TTL)
        S-->>C: 200 {data: scoreResult}
    end
```

## Data Model

```mermaid
erDiagram
    Profile ||--o{ WorkExperience : has
    Profile ||--o{ Education : has
    Profile ||--o{ ProfileSkill : has
    Profile ||--o{ ScoreSignal : has
    Profile ||--o{ ScoreHistory : has
    Profile ||--o{ CtcEstimate : has
    Profile ||--o{ Resume : has
    Profile }o--|| Segment : belongs_to

    WorkExperience }o--|| Company : references
    Education }o--|| Institution : references
    ProfileSkill }o--|| Skill : references

    Company ||--o{ SalaryBenchmark : has

    Profile {
        uuid id PK
        string linkedinUrl UK
        string fullName
        int finalScore
        float percentile
        int rankInSegment
    }

    Company {
        uuid id PK
        string name
        enum tier "S/A/B/C/D"
        vector embedding "1536d"
    }

    Skill {
        uuid id PK
        string name
        float demandScore
        vector embedding "1536d"
    }

    Segment {
        uuid id PK
        string roleCategory
        string yoeBand
        string geography
    }
```

## 8 Scoring Signals

```mermaid
pie title Signal Weights
    "Trajectory Momentum" : 20
    "Role Progression" : 18
    "Skills Demand" : 17
    "Company Tier" : 15
    "Education" : 10
    "CTC Market Ratio" : 10
    "Stability" : 5
    "Industry Demand" : 5
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in: DATABASE_URL, UPSTASH_REDIS_*, ANTHROPIC_API_KEY, OPENAI_API_KEY

# 3. Push schema to database
npm run db:push

# 4. Seed reference data
npm run seed:all

# 5. Start dev server
npm run dev
# → Server running at http://localhost:3001
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/score/linkedin` | Score a LinkedIn profile by URL |
| `POST` | `/score/resume` | Score from resume upload (PDF/DOCX) |
| `GET` | `/profile/:id` | Get full scored profile with signal breakdown |
| `GET` | `/compare?ids=a,b` | Compare two profiles side-by-side |
| `GET` | `/explore` | Browse ranked profiles with filters |
| `GET` | `/health` | Health check |

## Tech Stack

- **Fastify 5** — high-performance Node.js server
- **TypeScript** — strict mode, ESM
- **Prisma + pgvector** — PostgreSQL ORM with vector similarity search
- **Upstash Redis** — caching and rate limiting
- **Claude API** — Haiku (entity matching), Sonnet (resume parsing)
- **OpenAI** — text-embedding-3-small (1536d vectors)
- **Zod** — runtime validation for all inputs

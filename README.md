# Midnight Archive — Ontology-Based Library Management System

A full-stack Artificial Intelligence PBL website. The experience is designed as a cinematic “Midnight Archive” with a procedural 3D moon, responsive glass panels, a real catalogue sourced from Open Library, a SQLite circulation model, an explainable subject-hierarchy reasoner, and a live Socket.IO activity stream.

> **Data integrity:** the project intentionally contains no invented catalogue records. A fresh installation shows an empty collection until the seed command successfully fetches Open Library records. Internet access is needed for initial seeding and live imports; the local SQLite database remains available after seeding.

## Short build plan

1. Build the normalized SQLite model and explainable ontology reasoner.
2. Seed from Open Library's real Search API and associate subjects/authors.
3. Expose versioned REST endpoints, JWT authentication, circulation transactions and Socket.IO activity.
4. Build the React design system, interactive Three.js hero, catalogue, ontology workbench, analytics, member dashboard and project overview.
5. Run tests and production builds; check API health and catalogue endpoints.

## File tree

```text
ontology-library/
├── client/
│   ├── index.html, vite.config.ts, tsconfig.json
│   └── src/
│       ├── api/client.ts
│       ├── components/{BookCard,Moon,OntologyGraph3D}.tsx
│       ├── pages/{Home,Catalog,Ontology,Analytics,Account,Dashboard,About,Admin}.tsx
│       ├── main.tsx
│       └── styles.css
├── server/
│   ├── src/
│   │   ├── db/{database,seed}.ts
│   │   ├── ontology/{reasoner,reasoner.test}.ts
│   │   └── index.ts
│   ├── ontology/library.ttl
│   └── data/cache/ (reserved for local upstream response cache)
├── shared/
├── .env.example
├── package.json
└── README.md
```

## Requirements

- Node.js 20+ and npm 10+
- Internet access for first seed / imports
- Windows, macOS or Linux

## Run locally

```bash
npm install
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
npm run seed
npm run dev
```

Open **http://localhost:5173**. API base is **http://localhost:4000/api/v1** and health check is **http://localhost:4000/api/v1/health**. On Windows, create `.env` by copying `.env.example`; adjust `JWT_SECRET` before using outside local development.

If the seed is interrupted or Open Library is temporarily unavailable, rerun `npm run seed`. Each subject fetch is idempotent and unique Open Library work keys prevent duplicate book rows. The seed fetches 30 results across 17 subject queries; overlapping records are deduplicated. Search API limits and subject coverage mean the final unique total can be below the raw number of results. This is deliberately not padded with fake records.

## Useful commands

```bash
npm run dev       # client + API
npm run seed      # import real Open Library records
npm test          # reasoner unit tests
npm run build     # TypeScript + Vite production build
```

## Data model (ER diagram)

```mermaid
erDiagram
  USERS ||--o{ LOANS : checks_out
  USERS ||--o{ RESERVATIONS : places
  USERS ||--o{ FINES : owes
  BOOKS ||--o{ LOANS : appears_in
  BOOKS ||--o{ RESERVATIONS : reserved_for
  LOANS ||--o{ FINES : may_generate
  BOOKS ||--o{ BOOK_AUTHORS : has
  AUTHORS ||--o{ BOOK_AUTHORS : writes
  BOOKS ||--o{ BOOK_SUBJECTS : classified_by
  SUBJECTS ||--o{ BOOK_SUBJECTS : classifies
  SUBJECTS ||--o{ SUBJECTS : broader_than
  PUBLISHERS ||--o{ BOOKS : publishes
  USERS { int id PK; string name; string email UK; string password_hash; string role }
  BOOKS { int id PK; string open_library_key UK; string title; string isbn; int year; int available_copies }
  LOANS { int id PK; int user_id FK; int book_id FK; string due_date; string returned_at; float fine_amount }
```

## API overview

- `GET /api/v1/health`, `/stats`, `/books`, `/books/:id`, `/subjects`, `/activity`, `/analytics`
- `POST /api/v1/auth/register`, `/auth/login`
- Authenticated member endpoints: `POST /loans`, `GET /loans/mine`, `POST /loans/:id/return`, `POST /reservations`, `GET /dashboard`, `GET /fines/mine`
- Librarian-protected endpoints: `POST /import/openlibrary`, `POST /admin/books`, `GET /admin/members`, `POST /ontology/infer`
- Ontology endpoints: `GET /ontology/classes`, `/ontology/inferred`, `/ontology/export`, `POST /sparql`, `GET /search/semantic`, `/analytics`

Errors use `{ "error": { "code": "...", "message": "..." } }`. Registration creates a member account. Librarian role is not self-selectable; provision it deliberately in SQLite for a local viva environment, e.g. after registering a trusted account:

```sql
UPDATE users SET role = 'librarian' WHERE email = 'your-trusted-account@example.com';
```

Never expose librarian credentials publicly. JWT secret should be changed for any non-local deployment.

## Ontology and inference

The base vocabulary is in `server/ontology/library.ttl`: Resource, Book, Journal, Thesis, EBook, AudioBook, Magazine, Agent, Person, Author, Member, Student, Faculty, Librarian, Organization, Publisher, Department, Subject, Loan, Reservation, Fine, Branch, Shelf, Language and Genre. It defines object/data properties, domains/ranges, inverse author relation, transitive subject broader relation, and symmetric relatedness.

The TypeScript reasoner performs explainable forward-chaining over the subject hierarchy: if a book is assigned to a narrow subject, it infers membership in each broader subject. Each inference is persisted in `inferred_facts` with the rule identifier and a human-readable explanation. The SPARQL-style endpoint is an intentionally bounded pattern matcher backed by the normalized local data; it supports book type, subject and author patterns rather than claiming full standards-compliant SPARQL execution.

## Screenshots for your report

Run the app and use your browser screenshot tool to capture: (1) the cinematic overview, (2) catalogue with seeded Open Library covers, (3) the interactive 3D ontology graph, (4) a SPARQL-style query result, (5) the inference explanation cards, (6) analytics after circulation data exists, and (7) the member dashboard after a real checkout. Capture screenshots from your running instance so they reflect actual data rather than prefilled illustrations.

## Real-time events

Socket.IO broadcasts activity messages when a book is imported/created and when loans, returns, reservations, or reasoning occur. Connected sessions are reported in the header. This event stream reflects actual API operations; no fake activity is seeded.

## Assets and attribution

The hero moon, lights, and star field are procedural Three.js geometry. No paid or downloaded 3D assets are bundled. Book covers are served from the Open Library Covers API, and metadata is sourced from Open Library Search API. Google Fonts are used for Cinzel, Inter, and JetBrains Mono. Third-party service terms apply.

## 10-step viva demo

1. Start the application and open the overview; explain the visual catalogue and live database counters.
2. Show that a fresh database is not filled with fabricated books.
3. Run `npm run seed` and show Open Library records and covers in the catalogue.
4. Search by title/author and filter by subject.
5. Enable semantic search and show interpreted terms plus the matching local catalogue results.
6. Open Ontology Explorer and explain Resource/Book and Agent/Person/Member class relationships.
7. Run the subject query in the SPARQL-style workbench and inspect returned records.
8. Register a member, borrow a book, then show the loan and due date in the dashboard.
9. Return the book and explain the SQLite transaction, availability update and Socket.IO activity event.
10. Provision a trusted local librarian account, run the reasoner, inspect each explanation, and export Turtle.

## 15 likely viva questions with answers

1. **What is an ontology?** A formal representation of concepts, entities, properties, and their relationships in a domain.
2. **Why use an ontology in a library?** It captures subject hierarchies and relationships so discovery can extend beyond exact text matching.
3. **What is RDF?** The Resource Description Framework represents information as subject–predicate–object triples.
4. **What is a triple?** A statement such as `Book42 — hasSubject → Machine Learning`.
5. **What is Turtle?** A compact, human-readable RDF serialization format.
6. **What is OWL?** The Web Ontology Language adds formal constructs such as class restrictions, property characteristics, and richer semantics.
7. **What is RDFS?** RDF Schema provides basic schema terms, including classes, subclass relations, domains and ranges.
8. **What is a subclass?** A class whose instances are also instances of a broader parent class.
9. **What is inference?** Deriving a new fact from existing data and declared rules.
10. **How does this reasoner work?** It follows the parent chain of each book's subjects and records broader subject membership with a rule and explanation.
11. **Why record explanations?** To make AI behaviour auditable and let a user understand why a result was inferred.
12. **What is SPARQL?** A query language for RDF graphs. This project provides a clearly scoped SPARQL-style pattern matcher, not a full SPARQL engine.
13. **Why SQLite?** It is lightweight, transactional, relational, and easy to run locally without a separate database server.
14. **How do relational and ontology data work together?** Relational rows are the operational source of truth; the ontology expresses semantic relationships and derived facts.
15. **What is a limitation?** Semantic search currently uses controlled keyword expansion over the local catalogue, and reasoning covers subject inheritance rather than all OWL/SWRL semantics.

## Quality notes / honest scope

This is a locally runnable PBL implementation with the central end-to-end flows. Some ambitious items in the original brief—full standards-compliant SPARQL, a fully force-directed 3D ontology graph, full OWL/SWRL reasoning, background overdue cron processing, automatic upstream response caching, every possible librarian workflow, and complete image gallery/lightbox—are not represented as complete features. The current ontology view is an interactive UI for a readable hierarchy; the 3D hero is real Three.js. These limits are stated explicitly instead of being hidden behind fake results or a misleading claim of complete OWL compliance.

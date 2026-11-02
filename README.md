# Product Intelligence Hub (MVP v0.1)

Internal engineering operations dashboard with a fictional public demo and a protected GitHub-powered private workspace. Built as a portfolio project targeting product-development lifecycle automation roles.

## What works

- **Public demo:** Six connected fictional HarborDesk features; original evidence documents; knowledge revisions and approval states; persona role previews.
- **Evidence-backed Q&A:** Searches approved, role-accessible knowledge; returns recorded claims with source references, or a refusal when no authorized evidence is available. Answers are **deterministic extraction, not LLM-generated** in v0.1.
- **Private workspace:** PostgreSQL/Prisma-backed repository knowledge, protected by a workspace password and HTTP Basic authentication.
- **GitHub sync:** Imports the 30 most recently updated pull requests from one configured repo, tracks source content hashes, avoids unchanged re-imports, and creates new draft revisions when sources change.
- **Optional LLM classification:** Set `OPENAI_API_KEY` to classify GitHub PR descriptions with structured JSON outputs. Results remain **drafts** until approved. Without an API key, deterministic classification rules are used and labeled accordingly.
- **Review:** Admin can approve or reject a draft; a new immutable revision is created to preserve the prior version.
- **Tests:** Node built-in test runner covers approved-only retrieval, authorization checks, missing evidence, and release-status caution.

## Quickstart

Prerequisites: Node.js 20.9+ and npm. For private data, a PostgreSQL database.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — public fictional demo works **without any secrets or database**.

### Enable your actual workspace

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`: Postgres connection string (Neon, Supabase, local Postgres, etc.)
- `WORKSPACE_PASSWORD`: A long random password, 16+ characters. Login username is `admin`.
- `GITHUB_OWNER`: Repository owner, such as `morrison-developers`
- `GITHUB_REPO`: Repository name
- `GITHUB_TOKEN`: GitHub fine-grained token with read access to pull requests if private (optional for public repos)

Create tables:

```bash
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000/workspace` and log in with `admin` and the password you configured. Use **Sync GitHub**. A blank knowledge base before first sync is expected.

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` only if you want LLM-generated classifications. PR titles/descriptions are sent to that model provider when enabled. Do not ingest confidential client data without authorization.

## Testing

```bash
npm test
npm run lint
npm run build
```

## The five-minute demo

1. Open `/` and explore fictional HarborDesk records.
2. Select a role (`Support` vs. `Engineering`) and ask whether the internal AI scheduling assistant is available; notice that restricted facts are not returned to Support.
3. Ask whether recurring appointments are available; note the flag and PR evidence.
4. Inspect the knowledge record, source evidence, status, and version.
5. Show the private workspace syncing real GitHub PRs and approving a new version (requires configured database and credentials).

## Current limitations (intentional)

- No webhook endpoint or scheduled sync yet; sync is manual via authenticated server endpoint.
- No Jira, Notion, Slack bot, embeddings, or RAG generation; the Q&A system retrieves curated or approved claims and quotes them rather than synthesizing a new LLM response.
- No self-service users or production RBAC. The public role switch previews policy filtering on **fictional data only**; it is not user authentication. The private workspace has one admin credential.
- Source references on the demo are fictional **internal records**, not real GitHub links.
- The 30-PR API cap is an MVP simplification; pagination and background processing are needed for large repositories.
- The review process records the latest approval decision as a new revision, but it does not yet allow claim-level editing or redaction. **Review the underlying PR carefully** before approving.
- Secrets stored in environment variables, not the demo. Deploy private workspace over HTTPS.
- Concurrent GitHub sync requests should be serialized with a job queue before multi-user deployment; MVP lacks distributed job locks.

## Next development tasks

1. GitHub webhook signature verification + reliable asynchronous ingestion.
2. Document-level source revision history and explicit claim-level provenance.
3. Approval editor with independently verified audience claims and release status.
4. Real LLM answer synthesis with permission-filtered retrieval and automated citation verification.
5. Read-only public isolated simulation of the release lifecycle, plus Slack notifications.

### Architectural judgment

A merged PR is evidence of a code change, not proof that a feature is deployed, feature-flag enabled, approved, or generally available. These are separate states. New PR imports are always drafts scoped to Engineering, and no generated draft is used for answers until approved.

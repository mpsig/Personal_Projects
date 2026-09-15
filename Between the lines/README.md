# Between the Lines

A local app that helps parents discuss books with their children. Enter a title to research a guide, or reopen one from your saved library.

## Setup

Install Node.js 22.13 or newer and pnpm 11 or newer. Open a terminal in this folder:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://127.0.0.1:3000.

Choose a research connection in the app:

- **ChatGPT subscription (via Codex):** Install Codex and sign in with your own ChatGPT account. The app can reuse that sign-in or start it from the connection panel. If the executable is not detected, set `CODEX_BIN` in `.env.local` to its absolute path. This uses your Codex allowance. Model availability depends on your account.
- **OpenAI API key:** Set `OPENAI_API_KEY` in `.env.local`, then select API mode. API usage is billed separately. Saved guides work without either research connection.

No credentials or saved reports are included in this folder. Each user supplies their own connection. Never upload `.env.local`, API keys, or Codex authentication files.

## What a guide includes

Book snapshot, spoiler-filled summary, full key-character coverage, 3–5 themes grounded in story events, five discussion questions with why/listen-for/follow-up, 2–4 real-world parallels, three author facts, one big question, source links and limitations. Character motivations, relationships and development remain important parts of the brief.

Research targets 3–4 credible sources and stops once coverage is adequate, with a six-web-call budget. API mode enforces `max_tool_calls=6`. The Codex guard interrupts after more than six observed calls; the extra call may already have started. Missing essential evidence stops generation. Other gaps are disclosed rather than invented. New guides omit quotations and claim graphs, and do not automatically rewrite the whole report after a failure.

## Models

| Connection | Research default | Writing default |
|---|---|---|
| ChatGPT/Codex | gpt-5.6-luna | gpt-5.6-luna |
| OpenAI API | gpt-5-mini | gpt-5-nano |

Set `CODEX_RESEARCH_MODEL` / `CODEX_WRITING_MODEL` or `OPENAI_RESEARCH_MODEL` / `OPENAI_WRITING_MODEL` separately. These take precedence over shared `CODEX_MODEL` / `OPENAI_MODEL` overrides. Codex checks its available model list before starting; no automatic upgrade to a larger model occurs.

## Saved library

The app checks normalized title and author before research. A unique exact title can match without an author; ambiguous matches ask you to choose. Cached guides retain their original grade/depth settings.

Reports are saved as `reports/<id>/report.json` and `report.md`, with an `index.json` manifest. `REPORTS_DIR` can point to another persistent directory. Saved reports are excluded from Git. Back up that directory separately. Existing legacy reports remain readable.

If an interrupted process leaves `reports/.write-lock`, stop all app instances using the directory before removing that stale lock. Never remove it while research is running.

## Build and run

```sh
pnpm build
pnpm start
```

After the build, `pnpm typecheck` checks TypeScript. `pnpm schema` regenerates exported schemas, and `pnpm repair-index` rebuilds the report index. This sharing copy intentionally omits the development test suite.

This V1 runs on your own computer. Publishing its source to GitHub lets others install their own copy; it does not host a public app. Public hosting needs application authentication, request limits, background jobs and persistent shared storage. The current sign-in panel connects research; it does not protect access to a publicly hosted app.

## Reusable skill and files

Copy `skills/book-discussion-guide` into `~/.codex/skills/` to use the guide instructions separately. Give the skill the report repository path when using it outside this app.

- `app/`: interface and server routes.
- `lib/`: research, model connection, validation, storage and Markdown rendering.
- `scripts/`: connection check, schema export and library maintenance.
- `skills/book-discussion-guide/`: reusable instructions and JSON schemas.
- `lib/schema.ts`: source of truth for schema validation. `brief.schema.json` is the new writing format; the stored format includes compatibility fields for older guides.

The repository interface in `lib/repository.ts` can later be replaced with database/object storage. Cross-book theme analytics are outside V1.

## Live progress
The app streams library lookup, research, research validation, writing, final validation and saving updates as those stages start. Cache hits skip research. Streamed errors are displayed without saving a partial guide. The JSON API remains available to clients that do not request application/x-ndjson.

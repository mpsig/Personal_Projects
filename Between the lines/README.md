# Between the Lines

A parent-facing Book Discussion microapp and reusable research skill. Enter a book, open an existing guide first, or research and save a new one. V1 includes per-book themes; cross-book theme analytics and kid mode are deliberately out of scope.

## Run locally

Requirements: Node.js 22.13+ and pnpm 11+. Use a persistent local disk.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local using your editor.
pnpm dev
```

Open http://127.0.0.1:3000. The library and existing reports work without an API key. A new guide needs a funded OpenAI API account with access to the configured model and web search. Never put the key in a `NEXT_PUBLIC_` variable or in the browser. `.env.local` and saved reports are ignored by version control.

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

`OPENAI_MODEL` defaults to `gpt-5.4-mini`; select another Responses model supporting web search and Structured Outputs if desired. `REPORTS_DIR` optionally points to an absolute persistent directory; otherwise the app uses `reports/` in its working directory. Start commands bind to loopback. This V1 is a personal local app without authentication; add authentication, request limits, job queues and durable shared storage before exposing it to other users. Ephemeral/serverless filesystems will not retain reports.

## Reusable skill

The exact specification is in `skills/book-discussion-guide/SKILL.md`. It is also loaded by the server for both research and synthesis, so the app and standalone workflow use the same editorial standards.

To install the packaged skill in Codex, copy the `skills/book-discussion-guide` folder into `~/.codex/skills/`, then start a new task and invoke `$book-discussion-guide`. For example:

> Use $book-discussion-guide for Stargirl by Jerry Spinelli, grade 7, standard depth. Check my book-discussion reports directory first and save the result there.

A standalone skill needs web tools and access to the repository to perform these steps. The skill itself is instructions, not a background service or automatic connection to the app. Give it the project/report directory when invoking it outside this workspace. Prefer the app API to save records consistently. A standalone import must validate the stored envelope and use the repository adapter under its lock.

## Report contract

`lib/schema.ts` is the source of truth. Run `pnpm schema` after changing it; exported, portable JSON schemas are bundled with the skill:

- `references/report.schema.json`: strict guide body with snapshot, 3–8 spoiler-summary paragraphs, 2–10 characters, 3–5 themes, exactly five discussion questions with why/listen-for/follow-up, 2–4 parallels, exactly three author facts, one big question, quotes, claims and sources.
- `references/research.schema.json`: research packet, book-identity candidates, evidence notes and short source excerpts.
- `references/stored-report.schema.json`: persisted envelope, input settings, timestamps, model, response IDs, provenance URLs and guide.

Every object forbids extra fields. Nullable metadata represents unknown values. Source metadata includes ID, title, HTTP(S) URL, publisher, author, publication/access dates, source category and credibility rationale. Content blocks map to claim IDs; claims identify facts versus interpretations and map to source IDs. Quotes map to both. The Markdown renderer places clickable citations alongside content and includes a complete evidence ledger.

JSON Schema cannot express relational integrity or aggregate word counts. Runtime validation additionally rejects unresolved or duplicate IDs, mismatched quote/source links, nonfactual author-fact references, quotes missing from research excerpts, changed source metadata, source URLs absent from web-tool provenance, and more than 25 quoted words per canonical source URL. These checks establish traceability; they do not independently prove every factual claim or compare quotations against a separately downloaded page. The research model is instructed to open source pages and verify wording; parents can inspect linked evidence. No long copyrighted book excerpts are requested.

## Research and cache flow

1. Validate input, then check the repository **before checking for an API key or calling OpenAI**.
2. Normalize the entire title and author: Unicode decomposition, accent removal, case, apostrophes, punctuation, whitespace and `&` → `and`. Match normalized names or research-verified aliases. No edit-distance guessing, subtitle/article stripping, or surname-only matches. A wrong author is a miss.
3. With no author, a unique local title match opens immediately and displays its saved author. Multiple local matches return candidates. This is confidence within the saved library, not proof that no other book has that title worldwide.
4. On a miss, acquire a filesystem lock and recheck. The V1 lock serializes new generations across processes sharing that disk; another miss returns a retryable busy message. Cached reads still work. Grade/depth are generation preferences, not cache keys: a hit retains and displays the original settings.
5. Call `client.responses.create` with `tools: [{type: 'web_search'}]`, `tool_choice: 'required'`, `include: ['web_search_call.action.sources']`, `store: false`, and strict `text.format`. Research returns a packet first. Ambiguous or insufficient evidence stops the request without a report.
6. Synthesize a strict guide in a separate Responses call from that evidence only. Validate the guide and source provenance, and verify book identity. Refused, incomplete, invalid, or failed generations are not saved. The SDK performs no automatic retries, avoiding repeated billed attempts on failures.
7. Save JSON and Markdown, update the manifest, and render. Library entries reopen by immutable report ID, without research.

New research uses two paid API calls and may take several minutes. V1 does not stream research progress or support regeneration/version history; the UI shows a waiting message. Changing grade/depth alone does not regenerate a saved book.

## Storage and migration

```text
reports/
  index.json
  <32-character-hash>/
    report.json
    report.md
```

`ReportRepository` in `lib/repository.ts` defines `list`, `get`, `find`, `save`, and `withLock`. A database/object-store implementation can replace `FileReportRepository` in the routes without changing the UI or generation service. Implement equivalent atomic publication and locking, and maintain normalized/alias indexes in the new store.

User input never becomes a path. Reports are immutable bundles written into hidden temporary directories, then atomically renamed. The manifest is also replaced atomically. Listings derive from validated complete bundles instead of trusting a stale manifest, so a crash between bundle publication and index replacement does not hide a completed report. A later save refreshes the manifest; `pnpm repair-index` explicitly repairs it. Corrupt report bundles fail visibly rather than trigger a silent re-research. Back up the entire reports directory; JSON is canonical and Markdown can be regenerated with `renderMarkdown`.

If the process is killed while generating, the `.write-lock` directory can remain. Stop the old app process, confirm no other app instance uses this directory, then remove **only** `reports/.write-lock` and restart. The app never expires locks automatically, which avoids duplicate billed research when a slow request is still running. Hidden `.pending-*` directories from a crash are ignored and may be removed while the app is stopped.

## API

- `GET /api/reports`: saved library metadata.
- `POST /api/reports`: `{ "title": "Stargirl", "author": "Jerry Spinelli", "grade": "7", "depth": "standard" }`. Only title is required. Returns `{report, markdown, cached}`. Ambiguity returns `candidates`; busy returns 409; missing API key returns 503; invalid/incomplete output returns an error without a partial report.
- `GET /api/reports/:id`: open saved report.
- `GET /api/reports/:id?format=md` or `?format=json`: download.

## Validation performed

Tests use synthetic fixtures in temporary directories, never fake reports in the real library. They cover normalization, exact/alias matching, ambiguity, incorrect authors, cache-before-generation, persistence across adapter instances, manifest repair, locks/failure cleanup, strict schema/cardinality/evidence validation, and a mocked two-stage Responses exchange. A real paid generation requires your API key and is a separate smoke test: generate a book, inspect the source links and ending, restart, then submit the same normalized title/author and confirm `cached: true`.

## Official implementation references

Verified September 13, 2026:

- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search): required web search, tool provenance and citations.
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): Responses `text.format`, strict JSON schemas and incomplete/refused outputs.
- [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini): configured default model and supported capabilities.

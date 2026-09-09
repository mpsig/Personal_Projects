# Set up automation

Automation requires a host scheduler that can invoke this skill, use connected Gmail/Calendar tools and read/write the selected private profile during later runs. No scheduler or connector is included. Keep manual mode if any required capability is unavailable.

## Create a job

1. Complete household setup and a successful preview. Resolve source matching, timezone, calendar access and private-file persistence.
2. Obtain the user's desired cadence/timezone and whether they want a digest or urgent alerts. Scheduling does not enable calendar auto-actions.
3. Use the host's actual scheduling tool. When scheduling a current local task, prefer its supported task-attached mechanism. Do not invent a cron workaround or claim a config flag creates a job.
4. Put explicit private config/state paths, installed SKILL.md path, selected sources and channel in the saved prompt. Resolve paths for the scheduler's execution environment; never embed credentials or household content in a public template.
5. Record the returned job ID, channel, sources, schedule, timezone, status and verified profile paths in state.automation_jobs. Set config.automation.<channel>.enabled only after successful creation; preserve desired schedule separately if creation fails.
6. Confirm the real job and next run if the scheduler exposes it. A preview/test job must not perform calendar writes. Unattended writes additionally require scoped user authorization and reliable locking/idempotency capabilities.

## Two channels

| Channel | Coverage and cursor | Delivery |
|---|---|---|
| digest | Enabled or explicitly selected sources; checkpoints | Requested periodic brief; otherwise meaningful new content |
| alerts | Same full source retrieval; alert_checkpoints | Configured cancellations, closures and schedule changes |

Use independent cursors so alerts never consume messages needed by the digest. Share occurrence identities, proposals, the action journal and a single profile lock. Serialize concurrent/manual runs. Filter alerts after reading the full source messages; a subject-only cancellation search misses newsletter content.

## Saved prompt template

Replace every bracketed value privately before creating a job:

> Use Family Brief at [installed SKILL.md path]. Load config [private config path] and state [private state path]. Run channel [digest or alerts] for sources [source IDs] using the configured timezone. Follow SKILL.md, including exclusive execution, complete retrieval, evidence-based extraction, calendar reconciliation, authorization, durable state and recovery. Keep approval-required changes pending and execute only actions covered by current explicit authorization. Use this channel's source checkpoints; do not consume the other channel's cursor. Stay quiet when nothing meaningful changes unless the user explicitly requested an every-run digest. Notify on meaningful new information, completion, failure or a required decision. Do not advance affected checkpoints on incomplete processing or uncertain writes.

## Delivery and recovery

Persist notification records in state.notifications: delivery_id, channel, occurrence/revision or brief ID, status (pending/sent/uncertain/failed), provider_receipt and updated_at. Use an idempotent delivery key. An updated cancellation/change gets a new revision and must not be suppressed by an older alert.

Prepare notification content durably before checkpoint commit. Deliver through the host's authorized notification mechanism, then record its outcome. Delivery failure retries the prepared notification rather than rerunning calendar actions. Uncertain delivery requires receipt/status lookup where supported; if unavailable, report uncertainty at the next user interaction instead of blindly sending duplicates. Do not send email or third-party messages without explicit user authorization.

On expired account access, stop affected actions and report the needed reconnection. On a busy profile lock, defer with bounded retries. A missed run resumes from its cursor. Pending approval never becomes automatic permission.

`Pause Family Brief` pauses the actual selected scheduler jobs and records their status; keep checkpoints. Resume the actual jobs and catch up. To remove automation, delete/disable the real jobs before removing local files. Removing the skill folder alone does not stop scheduled work.

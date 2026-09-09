# Family Brief

Turn school, club and activity emails into a household brief, upcoming dates and reviewed calendar proposals. Configure your own sources, people, calendars, colors and sharing preferences.

## What you need

A local agent host with skill support, connected Gmail and Google Calendar tools, and persistent access to your private files. Scheduled runs also require a host scheduler. This package supplies the workflow and templates; account connections and scheduling are provided by your host. No Python installation or package dependencies are required by this skill.

Local files do not mean local-only AI processing: message interpretation uses your chosen host and connected services.

## 1. Install

Extract the ZIP and copy the entire `family-brief` folder to your personal Codex skill directory:

```text
~/.agents/skills/family-brief/
```

It should contain exactly:

```text
SKILL.md
README.md
config.example.json
state.example.json
automation.md
```

A repository-local alternative is `.agents/skills/family-brief/` inside that repository. Choose one installation location. Codex detects skill changes; restart if it does not appear. In the CLI or IDE extension, select it through `/skills` or `$family-brief`. See [official local skill guidance](https://learn.chatgpt.com/docs/build-skills).

## 2. Create a private workspace

Create a folder you will keep private, such as `~/Documents/FamilyBrief/private`. Copy:

- config.example.json → config.private.json
- state.example.json → state.private.json

Keep these outside the installed public skill folder and out of public repositories. Do not overwrite an existing private profile or state file. Open the containing FamilyBrief folder as your local task workspace so the agent can maintain its files under your host's file permissions.

## 3. Connect accounts and configure

Connect Gmail and Google Calendar through your host's available connection settings. The first preview needs full-message reading and calendar-event reading. Writing is needed only for approved calendar changes. Keep credentials in the host's credential store, never in these files. If appropriate tools are unavailable, live review is not ready.

Select the skill and send this prompt, replacing the bracketed paths:

> Configure Family Brief using config [full path to config.private.json] and state [full path to state.private.json]. Replace the synthetic examples with my household configuration. Ask which organizations to include, who participates, the relevant school divisions or activity groups, my timezone and destination calendar. Verify Gmail and Calendar access. Keep calendar changes subject to my approval and leave colors and schedules unset. Keep personal information in my private workspace.

The agent should check that both files contain valid JSON, share a profile ID, and use consistent source/member/category IDs. No schema software is required. Source rules should come from actual messages, especially when an organization uses shared sender platforms. Uncertain participation remains unresolved.

Default first review: the last 30 days, with a 15-minute overlap on later runs. Change the lookback during setup if needed. For an existing workflow, provide its actual last successful checkpoint. New organizations start with independent checkpoints.

## 4. Preview, then run

Send:

> Preview Family Brief using my private profile. Show source coverage, action items, upcoming dates and calendar proposals. Do not change my calendar or save checkpoints.

Check member assignments, missing times, existing calendar matches, destination and recipients. The agent should identify gaps rather than invent event details.

Then send:

> Run Family Brief using the same private profile.

Choose proposals by their displayed numbers, for example “Add items 1 and 3.” The agent retains pending decisions and updates checkpoints after complete processing. Identify the private profile again in a new task unless that selection is already retained.

## 5. Optional automation

After a successful preview, request a schedule and timezone:

> Schedule Family Brief every Sunday at 6 PM in my configured timezone. Keep calendar changes subject to approval.

The agent follows [automation.md](automation.md) and must confirm a real scheduler job was created. Changing an enabled flag in JSON alone does not create automation. Urgent alerts can be configured separately from the digest.

## Customize in conversation

| Say | Result |
|---|---|
| Add another activity provider | Configure a source and its members |
| Make swimming events blue | Set color without enabling automatic creation |
| Include my partner on school invites | Configure source-scoped sharing |
| Ignore routine assignment updates | Adjust communication filtering |
| Family Brief status | Show coverage, pending decisions and errors |
| Retry Family Brief | Resume safely after a failure |
| Pause Family Brief | Pause actual scheduled jobs and retain state |

## Defaults and troubleshooting

Calendar changes require approval. Color maps and automatic-action rules start empty. Missing times or durations remain unresolved. Existing events are checked before new ones are proposed. A failed or incomplete review must not silently advance its affected checkpoint.

If the skill is missing, check the direct SKILL.md path and restart the host. If no messages appear, review sender rules and the lookback. If live tools are missing, connect them in the same host used for the task. If writes are blocked, check calendar access, incomplete event details or stale approvals. Preserve state when retrying failures.

## Updating and sharing

Back up your private profile, replace only the installed public files, then ask the agent to check profile compatibility. Do not replace existing state with the blank example. Before enabling unattended actions, verify your host supports safe single execution, durable state and recovery from uncertain provider writes.

Share only the five public files or this public ZIP. Examples are entirely synthetic. Keep private profiles, state, logs and real-message examples out of the package. To stop automation, pause/delete the actual jobs before removing the skill folder.

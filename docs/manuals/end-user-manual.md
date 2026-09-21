# contrejour — desk manual

Local-first desk for UNSEEN. You play as Elena Marin on a text-only phone,
and you inspect, rehearse, and propose canon changes on the Console. There
is no account and no hosted login. Simulation comes before presentation:
no art, audio, video, or 3D lives in this tool.

## Welcome

**Who it is for.** Authors and testers who need to prove the story’s
shape — gates, evenings, secrets, conditions — before a frame exists.

**What it is not.** A branching-tree editor. UNSEEN is systemic: the same
evening can fire a gate by date or by progress. Storyboards on the Console
are authoring references, not Player pictures.

## First 10 minutes

1. From the repository root, install and start the loopback surfaces:

   ```bash
   pnpm install
   pnpm dev
   ```

2. Open the Player at `http://127.0.0.1:5173/`. Click **Start a run**.
3. Play the first night. If Jonas talks through her, leave down the street.
   The rain is an incident, not a menu.
4. Copy the `run` id from the phone header.
5. Open the Console at `http://127.0.0.1:5174/`. Paste the run id. Click
   **Load run**. Hidden state, conditions, and events appear.
6. On the Console, search `first-night`, open the scene, change the beat
   in the form, click **Preview**. The YAML file on disk does not change.
7. Optional: select **romantic** and click **Run**. A rehearsal that
   reaches every gate of the slice reports `missed none`.

Expected outcome: you have a playable run, a Console inspector, and a
preview that is not a write.

Troubleshooting: if a surface fails to load, confirm `pnpm dev` printed
the API on `127.0.0.1:8787`. An already-running API on that port is fine
if it is healthy.

## Concepts

| Word | Meaning |
|------|---------|
| **UNSEEN** | The game. Always upper case. |
| **contrejour** | This desk. Always lower case. |
| **Player** | Text-only phone. Only what Elena could perceive. |
| **Console** | Canon desk, run inspector, findings, storyboards, rehearsal. |
| **phase / level / way** | How the city opens. Not “karma” or “stats”. |
| **gate** | A named night that must be reached. Dual trigger: progress or date. |
| **evening** | One night of play. **Go home** advances it. |
| **secret** | Taken or given. Held in the vault. Sent as tell, leverage, or trade. |
| **condition** | Felt, not a meter. Example: wetness after rain. |
| **incident** | A forced situation. Only one is open at a time. |
| **finding** | A note on an entity. Testers file from the Player; rehearsal files missed gates. |
| **proposal** | A pending YAML change. Approve writes. Reject stores a reason. |
| **rehearsal** | Scripted bots that call the same Player actions a human would. |
| **spice** | 1 / 2 / 3. Selects depiction only. |

The two meters stay hidden. The Player never shows `condition.`,
`incident.`, or proposal queues.

## Workflows

### Play the first night

- **Goal.** Reach the rain as a consequence, not a cheat.
- **Preconditions.** Player is running.
- **Steps.** Start a run. Read the lobby. Choose **Leave down the street.
  Face burning.** Invalid cover choices keep you in the rain and raise
  wetness. The gallery door is the valid exit.
- **Expected outcome.** Gate 2 can fire once you reach the gallery.
- **Troubleshooting.** If you stay dry, you did not leave after the
  truck. The rain starts from that choice.

### File a tester flag

- **Goal.** Put a finding on the scene you just played.
- **Preconditions.** A run is open.
- **Steps.** Open **Flag**. Pick a category. Write a title and what is
  wrong. Click **File flag**.
- **Expected outcome.** The Console Findings list shows the note on that
  entity.
- **Troubleshooting.** If the list is empty, confirm you filed against
  the current scene and refreshed the Console.

### Inspect a run

- **Goal.** See hidden state a player must not see.
- **Preconditions.** You have a run id from the phone header.
- **Steps.** Console → paste id → **Load run**. Read Conditions, Timing /
  knowledge, and Events.
- **Expected outcome.** Wetness and the open incident appear here, not
  on the Player.
- **Troubleshooting.** `run-not-found` means the API that served the
  Player is not the API the Console is proxying.

### Rehearse a bot

- **Goal.** Batch-play the slice and file missed-gate findings.
- **Preconditions.** Console is running.
- **Steps.** Pick a bot. Click **Run**. Read the gate list and `missed`.
- **Bots.** drifter (first eligible), completionist (unvisited first),
  romantic (`romance` / `flirt` tags), detective (banks and tell),
  dark-optimiser (last eligible), saint (no lie, no leverage).
- **Expected outcome.** A full drifter or romantic run lists gates 1–7
  and `missed none`. A short run files timing findings.
- **Troubleshooting.** Rehearsal never writes YAML. `queue_proposals`
  is opt-in on the API and off on the desk button.

### Edit a scene and queue a proposal

- **Goal.** Change a beat or a choice without touching the file until
  someone approves.
- **Preconditions.** Console Canon card.
- **Steps.**
  1. Search an id (`tilde`, `first-night`).
  2. Open the scene. Fields appear for beat, tags, and choices.
  3. Edit. Click **Preview**. Read the diff and validation.
  4. Write a rationale. Click **Queue proposal**.
  5. On the proposal card, **Approve** writes the YAML. **Reject**
     keeps the file and stores a reason.
- **Expected outcome.** Preview and queue leave the file unchanged.
  Approve reloads live canon.
- **Troubleshooting.** Non-scene entities still use the YAML box. A
  finding’s **Propose** button queues a snapshot of the current file
  with the finding as rationale — still not a write.

### Send a secret you actually hold

- **Goal.** Test tell versus a no-op send.
- **Preconditions.** The vault lists the secret (taken or given).
- **Steps.** Recorder or a scene that banks a secret. Open **Messages**.
  Recipients named on the secret appear first. Send.
- **Expected outcome.** Send without vault membership does nothing.
  Tilde’s tape can reach the conduct demand after a provoked watch.
- **Troubleshooting.** If Tilde is missing, you do not hold the secret
  yet. The list is not a social graph.

## Reference

### Player (`http://127.0.0.1:5173/`)

A phone frame titled **Elena's phone**.

| Screen | Shows | Actions |
|--------|-------|---------|
| Start | Title only | **Start a run** |
| Scene | Title, prose, choices | Choice buttons; theory answers when asked |
| Home | Locations and eligible scenes | Enter a scene; **Go home** when allowed |
| Recorder | Captures | **Audio drop in lobby**; **Mark clip** |
| Vault | Held secrets as summaries | None |
| Messages | Vault plus recipients | Send to a named person |
| Notes | Open question; spice 1 / 2 / 3 | Set depiction level |
| Calendar | Honest rewind (one evening) | **Rewind to evening N**; **Go home** |
| Flag | Category, optional axis, title, body | **File flag** |

States: no run; in a scene; free evening; incident lock (rain) until a
valid exit; theory question after some gates.

### Console (`http://127.0.0.1:5174/`)

| Region | Shows | Actions |
|--------|-------|---------|
| Gates 1–7 | Inspector tabs, not play | Select an entity to filter findings |
| Conditions / Incidents | Canon ids | None |
| Run inspector | Hidden state for a pasted run id | **Load run** |
| Canon | Search, scene form, YAML, diff | **Preview**, **Queue proposal** |
| Rehearsal | Last batch id, gates, missed | Bot select, **Run** |
| Findings | Tester and rehearsal notes | **Propose** |
| Storyboard | Prompt history, optional image URL | **Save still**, **Update prompt** |
| Proposals | Status, rationale, diff, validation | **Approve**, **Reject**, or paste YAML |

The numbered gates are not clickable play. Play stays on the Player.

### API (loopback)

Player, Console, and bots share `/v1/` on `127.0.0.1:8787`. Bots call
only Player actions. The Console may call Console routes. There is no
public host in this build.

## Administration

None. No accounts, billing, or team roles. The desk is local-first.
`commit: ask` in the repo contract: a human still owns git push unless
they grant it.

Coming later (not shipped): a live LLM persona driver, structured forms
for every entity type, a generated 2D plan from the space graph, hosted
playtest.

`POST /v1/console/rehearsals` accepts `personas: ["curious"]`. Without
`CONTREJOUR_LLM_URL` and `CONTREJOUR_LLM_KEY` the response lists
`skipped_personas` and `persona_skip_reason: no-credentials`. The desk
Run button does not send personas.

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Player or Console blank | `pnpm dev`; API on 8787; reload the tab |
| Console gates do nothing | They are inspector tabs. Play on 5173 |
| Propose / rehearsal 404 | The API process is older than the desk. Restart `pnpm --filter @contrejour/api start` |
| Approve changed a file you did not mean | Reject on the desk; restore from git. Tests never approve against the live tree |
| Send does nothing | Vault does not hold that secret |
| Wetness not on the phone | Correct. It is a felt line and a Console condition |
| Rehearsal “missed” a gate you saw in events | The bot must record the scene after every action, including **Go home** |

## Glossary

See **Concepts**. Additional ids you will see: `scene.*`, `gate.p1.g*`,
`secret.*`, `condition.wetness`, `incident.rain-street`, `char.*`,
`loc.*`, `node.*`. Display names are not ids. Two characters are due to
be renamed; the ids stay.

## Change log

- **2026-09-21** — Scene form (beat, tags, choices) on the Console.
  End-user manual first published. Six rehearsal bots. Findings can
  become pending proposals. Rehearsal `personas` skip without
  credentials; the live driver is not shipped.
- **2026-09-20** — Walking skeleton, rain incident, proposals, VIP
  demand, entity search, rehearsal desk.

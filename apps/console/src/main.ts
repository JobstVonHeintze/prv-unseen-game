type Gate = { id: string; name: string; order: number; scene?: string };
type KitRow = { id: string };
type Finding = { id: string; entity_id: string; category: string; title: string; body: string; detail_axis?: string };
type Board = { id: string; entity_id: string; prompt: string; prompt_history: Array<{ prompt: string }>; image_url?: string };
type Proposal = {
  id: string;
  entity_id: string;
  path: string;
  diff: string;
  status: string;
  rationale: string;
  reject_reason?: string;
  validation: Array<{ severity: string; code: string; message: string }>;
};

const app = document.querySelector("#app")!;
let gates: Gate[] = [];
let conditions: KitRow[] = [];
let incidents: KitRow[] = [];
let findings: Finding[] = [];
let boards: Board[] = [];
let selected: string | null = null;
let runId = "";
let state: unknown = null;
let events: unknown[] = [];
let proposals: Proposal[] = [];

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function refresh(): Promise<void> {
  gates = await api("/v1/console/canon/gates");
  conditions = await api("/v1/console/canon/conditions");
  incidents = await api("/v1/console/canon/incidents");
  findings = await api("/v1/console/findings");
  boards = await api("/v1/console/storyboards");
  proposals = await api("/v1/console/proposals");
  render();
}

function schematic(): string {
  return `lobby --door--> cellar-stairs --walk--> archive
desk  ))earshot((  lobby
7M  [phone drawer]`;
}

function render(): void {
  const sel = selected ?? gates[0]?.id ?? "";
  const gate = gates.find((g) => g.id === sel);
  const relatedIds = new Set([sel, gate?.scene].filter(Boolean) as string[]);
  const related = findings.filter((f) => relatedIds.has(f.entity_id));
  const board = boards.filter((b) => relatedIds.has(b.entity_id));
  app.innerHTML = `<div class="desk">
    <nav>
      <h1>contrejour</h1>
      <p>Gates</p>
      ${gates.map((g) => `<button data-id="${g.id}">${g.order}. ${g.name}</button>`).join("")}
      <p>Conditions</p>
      ${conditions.map((c) => `<p>${c.id}</p>`).join("")}
      <p>Incidents</p>
      ${incidents.map((i) => `<p>${i.id}</p>`).join("")}
      <p>Run inspector</p>
      <input id="run" placeholder="run id" value="${runId}" />
      <button id="load-run">Load run</button>
    </nav>
    <main>
      <h2>${sel}</h2>
      <div class="card schematic">${schematic()}</div>
      <div class="card">
        <h2>Conditions</h2>
        ${
          state && typeof state === "object" && "conditions" in state
            ? `<pre>${JSON.stringify((state as { conditions: unknown; incident: unknown }).conditions, null, 2)}</pre>
               <p>incident ${JSON.stringify((state as { incident: unknown }).incident)}</p>`
            : "<p>Load a run.</p>"
        }
      </div>
      <div class="card">
        <h2>Timing / knowledge</h2>
        <pre>${state ? JSON.stringify(state, null, 2) : "Load a run to see hidden state."}</pre>
      </div>
      <div class="card">
        <h2>Events</h2>
        <pre>${events.length ? JSON.stringify(events.slice(-8), null, 2) : "—"}</pre>
      </div>
    </main>
    <aside>
      <h2>Findings</h2>
      ${related.map((f) => `<div class="card"><strong>${f.category}</strong> ${f.detail_axis ?? ""}<p>${f.title}</p><p>${f.body}</p></div>`).join("") || "<p>None on this entity.</p>"}
      ${findings.filter((f) => !relatedIds.has(f.entity_id)).map((f) => `<p>${f.entity_id}: ${f.title}</p>`).join("")}
      <h2>Storyboard</h2>
      ${board.map((b) => `<div class="card"><p>${b.prompt}</p><p>history ${b.prompt_history.length}</p>${b.image_url ? `<p>${b.image_url}</p>` : ""}</div>`).join("")}
      <input id="prompt" placeholder="Prompt" />
      <input id="img" placeholder="Image URL" />
      <button class="primary" id="save-board">Save still</button>
      <input id="edit-prompt" placeholder="Edit last prompt" />
      <button id="edit-board">Update prompt</button>
      <h2>Proposals</h2>
      ${proposals
        .map(
          (p) => `<div class="card">
        <p>${p.status} ${p.entity_id}</p>
        <p>${p.rationale}${p.reject_reason ? ` · ${p.reject_reason}` : ""}</p>
        <pre>${p.diff}</pre>
        <p>${p.validation.map((v) => `${v.severity} ${v.code}: ${v.message}`).join(" · ") || "valid"}</p>
        ${p.status === "pending" ? `<button data-approve="${p.id}">Approve</button><button data-reject="${p.id}">Reject</button>` : ""}
      </div>`,
        )
        .join("") || "<p>None queued.</p>"}
      <input id="p-path" placeholder="scenes/scene.gallery.yaml" />
      <textarea id="p-after" placeholder="Proposed YAML"></textarea>
      <input id="p-rationale" placeholder="Rationale" />
      <button class="primary" id="p-submit">Submit proposal</button>
    </aside>
  </div>`;
  app.querySelectorAll("[data-id]").forEach((el) => el.addEventListener("click", () => {
    selected = (el as HTMLElement).dataset.id ?? null;
    render();
  }));
  document.querySelector("#load-run")?.addEventListener("click", async () => {
    runId = (document.querySelector("#run") as HTMLInputElement).value.trim();
    state = await api(`/v1/console/runs/${runId}/state`);
    events = (await api(`/v1/console/runs/${runId}/events`)).events;
    render();
  });
  document.querySelector("#save-board")?.addEventListener("click", async () => {
    await api("/v1/console/storyboards", {
      method: "POST",
      body: JSON.stringify({
        entity_id: sel,
        kind: "still",
        prompt: (document.querySelector("#prompt") as HTMLInputElement).value,
        image_url: (document.querySelector("#img") as HTMLInputElement).value || undefined,
      }),
    });
    await refresh();
  });
  document.querySelector("#p-submit")?.addEventListener("click", async () => {
    await api("/v1/console/proposals", {
      method: "POST",
      body: JSON.stringify({
        path: (document.querySelector("#p-path") as HTMLInputElement).value.trim(),
        after: (document.querySelector("#p-after") as HTMLTextAreaElement).value,
        rationale: (document.querySelector("#p-rationale") as HTMLInputElement).value,
        author: "human",
      }),
    });
    await refresh();
  });
  app.querySelectorAll("[data-approve]").forEach((el) =>
    el.addEventListener("click", async () => {
      await api(`/v1/console/proposals/${(el as HTMLElement).dataset.approve}/approve`, { method: "POST" });
      await refresh();
    }),
  );
  app.querySelectorAll("[data-reject]").forEach((el) =>
    el.addEventListener("click", async () => {
      await api(`/v1/console/proposals/${(el as HTMLElement).dataset.reject}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "rejected from desk" }),
      });
      await refresh();
    }),
  );
  document.querySelector("#edit-board")?.addEventListener("click", async () => {
    const last = boards.filter((b) => b.entity_id === sel).at(-1);
    if (!last) return;
    await api(`/v1/console/storyboards/${last.id}`, {
      method: "PATCH",
      body: JSON.stringify({ prompt: (document.querySelector("#edit-prompt") as HTMLInputElement).value }),
    });
    await refresh();
  });
}

void refresh();

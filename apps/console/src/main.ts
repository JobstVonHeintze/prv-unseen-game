type Gate = { id: string; name: string; order: number; scene?: string };
type KitRow = { id: string };
type Finding = { id: string; entity_id: string; category: string; title: string; body: string; detail_axis?: string; author?: string };
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
type EntityRef = { id: string; type: string; path: string; label: string };
type Issue = { severity: string; code: string; message: string };
type SceneForm = {
  id: string;
  beat: string;
  tags: string[];
  choices: Array<{ id: string; label: string; effects: Array<{ kind: string; value: string }> }>;
};
type Rehearsal = {
  id: string;
  missed_gate_scenes: Array<{ gateId: string; sceneId: string }>;
  traces: Array<{ bot: string; gates: string[] }>;
  findings?: Array<{ id: string; title: string }>;
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
let entities: EntityRef[] = [];
let editorQuery = "";
let editorId = "";
let editorPath = "";
let editorYaml = "";
let editorForm: SceneForm | null = null;
let editorDiff = "";
let editorIssues: Issue[] = [];
let lastRehearsal: Rehearsal | null = null;
let lastBot = "drifter";

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
  entities = await api("/v1/console/canon/search");
  render();
}

function esc(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function readFormFromDom(): SceneForm | null {
  if (!editorForm) return null;
  const beat = (document.querySelector("#f-beat") as HTMLTextAreaElement | null)?.value ?? editorForm.beat;
  const tags = ((document.querySelector("#f-tags") as HTMLInputElement | null)?.value ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const choices = [...document.querySelectorAll("[data-choice]")].map((row) => {
    const i = (row as HTMLElement).dataset.choice ?? "0";
    const effects = [...row.querySelectorAll("[data-effect]")].map((ef) => ({
      kind: ((ef as HTMLElement).querySelector("[data-ekind]") as HTMLSelectElement | null)?.value || "bank",
      value: ((ef as HTMLElement).querySelector("[data-evalue]") as HTMLInputElement | null)?.value || "",
    }));
    return {
      id: ((document.querySelector(`#f-cid-${i}`) as HTMLInputElement | null)?.value ?? "").trim(),
      label: ((document.querySelector(`#f-clabel-${i}`) as HTMLInputElement | null)?.value ?? "").trim(),
      effects,
    };
  });
  return { id: editorForm.id, beat, tags, choices };
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
        <h2>Canon</h2>
        <input id="e-search" placeholder="Search id, name, beat" value="${editorQuery.replaceAll('"', "&quot;")}" />
        <div class="row">${entities
          .filter((e) => {
            const q = editorQuery.trim().toLowerCase();
            if (!q) return ["scenes", "secrets", "conditions", "incidents"].includes(e.type);
            return `${e.id} ${e.label} ${e.path}`.toLowerCase().includes(q);
          })
          .slice(0, 12)
          .map((e) => `<button data-entity="${e.id}">${e.id}</button>`)
          .join("")}</div>
        <p>${editorPath || "Open an entity."}</p>
        ${
          editorForm
            ? `<div class="form">
          <label for="f-beat">Beat</label>
          <textarea id="f-beat" rows="5">${esc(editorForm.beat)}</textarea>
          <label for="f-tags">Tags</label>
          <input id="f-tags" value="${esc(editorForm.tags.join(", "))}" />
          ${editorForm.choices
            .map(
              (c, i) => `<div class="card" data-choice="${i}">
            <input id="f-cid-${i}" value="${esc(c.id)}" placeholder="choice id" />
            <input id="f-clabel-${i}" value="${esc(c.label)}" placeholder="choice label" />
            ${c.effects
              .map(
                (e, j) => `<div class="row" data-effect="${j}">
              <select data-ekind aria-label="effect kind">
                ${["set", "bank", "enter", "start_incident", "spine", "step"]
                  .map((k) => `<option value="${k}"${k === e.kind ? " selected" : ""}>${k}</option>`)
                  .join("")}
              </select>
              <input data-evalue value="${esc(e.value)}" placeholder="value" />
            </div>`,
              )
              .join("")}
            <button data-add-effect="${i}">Add effect</button>
          </div>`,
            )
            .join("")}
          <button id="f-add-choice">Add choice</button>
        </div>`
            : ""
        }
        <textarea id="e-yaml" rows="14" placeholder="YAML">${esc(editorYaml)}</textarea>
        <button id="e-preview">Preview</button>
        <pre>${editorDiff || "No preview."}</pre>
        <p>${editorIssues.map((v) => `${v.severity} ${v.code}: ${v.message}`).join(" · ") || (editorDiff ? "valid" : "")}</p>
        <input id="e-rationale" placeholder="Rationale" />
        <button class="primary" id="e-queue">Queue proposal</button>
      </div>
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
      <h2>Rehearsal</h2>
      <select id="r-bot" aria-label="bot">
        ${["drifter", "completionist", "romantic", "detective", "dark-optimiser", "saint"]
          .map((b) => `<option value="${b}"${b === lastBot ? " selected" : ""}>${b}</option>`)
          .join("")}
      </select>
      <button class="primary" id="r-run">Run</button>
      ${
        lastRehearsal
          ? `<div class="card"><p>${lastRehearsal.id}</p>
        <p>${lastRehearsal.traces[0]?.gates.join(" ") || "no gates"}</p>
        <p>missed ${lastRehearsal.missed_gate_scenes.map((m) => m.sceneId).join(" ") || "none"}</p></div>`
          : "<p>No batch this session.</p>"
      }
      <h2>Findings</h2>
      ${
        related
          .map(
            (f) => `<div class="card"><strong>${f.category}</strong> ${f.detail_axis ?? ""}<p>${f.title}</p><p>${f.body}</p>
        <button data-propose="${f.id}">Propose</button></div>`,
          )
          .join("") || "<p>None on this entity.</p>"
      }
      ${findings
        .filter((f) => !relatedIds.has(f.entity_id))
        .map((f) => `<p>${f.entity_id}: ${f.title} <button data-propose="${f.id}">Propose</button></p>`)
        .join("")}
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
  app.querySelectorAll("[data-propose]").forEach((el) =>
    el.addEventListener("click", async () => {
      await api(`/v1/console/findings/${(el as HTMLElement).dataset.propose}/propose`, { method: "POST" });
      await refresh();
    }),
  );
  document.querySelector("#r-run")?.addEventListener("click", async () => {
    lastBot = (document.querySelector("#r-bot") as HTMLSelectElement | null)?.value || "drifter";
    const bot = lastBot;
    lastRehearsal = (await api("/v1/console/rehearsals", {
      method: "POST",
      body: JSON.stringify({ bots: [bot], n: 1, seed_base: 11, max_evenings: 80 }),
    })) as Rehearsal;
    await refresh();
  });
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
  document.querySelector("#e-search")?.addEventListener("input", (ev) => {
    editorQuery = (ev.target as HTMLInputElement).value;
    render();
    const box = document.querySelector("#e-search") as HTMLInputElement | null;
    box?.focus();
    box?.setSelectionRange(editorQuery.length, editorQuery.length);
  });
  app.querySelectorAll("[data-entity]").forEach((el) =>
    el.addEventListener("click", async () => {
      const id = (el as HTMLElement).dataset.entity ?? "";
      const src = (await api(`/v1/console/canon/source?id=${encodeURIComponent(id)}`)) as {
        id: string;
        path: string;
        yaml: string;
      };
      editorId = src.id;
      editorPath = src.path;
      editorYaml = src.yaml;
      editorForm = null;
      if (src.id.startsWith("scene.")) {
        const packed = (await api(`/v1/console/canon/form?id=${encodeURIComponent(src.id)}`)) as {
          form: SceneForm;
        };
        editorForm = packed.form;
      }
      editorDiff = "";
      editorIssues = [];
      render();
    }),
  );
  document.querySelector("#f-add-choice")?.addEventListener("click", () => {
    const current = readFormFromDom();
    if (!current) return;
    editorForm = { ...current, choices: [...current.choices, { id: "", label: "", effects: [] }] };
    render();
  });
  app.querySelectorAll("[data-add-effect]").forEach((el) =>
    el.addEventListener("click", () => {
      const current = readFormFromDom();
      if (!current) return;
      const idx = Number((el as HTMLElement).dataset.addEffect);
      const choices = current.choices.map((c, i) =>
        i === idx ? { ...c, effects: [...c.effects, { kind: "bank", value: "" }] } : c,
      );
      editorForm = { ...current, choices };
      render();
    }),
  );
  document.querySelector("#e-preview")?.addEventListener("click", async () => {
    if (!editorPath) return;
    const form = readFormFromDom();
    if (form) {
      editorForm = form;
      const preview = (await api("/v1/console/canon/form/preview", {
        method: "POST",
        body: JSON.stringify({ id: form.id, form }),
      })) as { yaml: string; diff: string; validation: Issue[] };
      editorYaml = preview.yaml;
      editorDiff = preview.diff;
      editorIssues = preview.validation;
    } else {
      editorYaml = (document.querySelector("#e-yaml") as HTMLTextAreaElement).value;
      const preview = (await api("/v1/console/proposals/preview", {
        method: "POST",
        body: JSON.stringify({ path: editorPath, after: editorYaml }),
      })) as { diff: string; validation: Issue[] };
      editorDiff = preview.diff;
      editorIssues = preview.validation;
    }
    render();
  });
  document.querySelector("#e-queue")?.addEventListener("click", async () => {
    const form = readFormFromDom();
    if (form) {
      editorForm = form;
      const preview = (await api("/v1/console/canon/form/preview", {
        method: "POST",
        body: JSON.stringify({ id: form.id, form }),
      })) as { yaml: string };
      editorYaml = preview.yaml;
    } else {
      editorYaml = (document.querySelector("#e-yaml") as HTMLTextAreaElement).value;
    }
    if (!editorPath) return;
    await api("/v1/console/proposals", {
      method: "POST",
      body: JSON.stringify({
        path: editorPath,
        after: editorYaml,
        rationale: (document.querySelector("#e-rationale") as HTMLInputElement).value,
        author: "human",
        entity_id: editorId,
      }),
    });
    editorDiff = "";
    editorIssues = [];
    await refresh();
  });
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

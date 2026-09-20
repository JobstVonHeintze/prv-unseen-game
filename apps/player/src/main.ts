type PlayerView = {
  runId: string;
  mode: string;
  evening: number;
  day: number;
  openQuestion: string;
  askingTheory: boolean;
  theoryOptions: string[];
  currentScene: null | { id: string; title: string; text: string; provenance: string; choices: Array<{ id: string; label: string }> };
  locationOptions: Array<{ id: string; name: string }>;
  sceneOptions: Array<{ id: string; title: string }>;
  vault: Array<{ secretId: string; summary: string; origin: string; proof: string }>;
  captures: Array<{ id: string; mode: string; marked: boolean; blocked?: string }>;
  recipients: Array<{ id: string; name: string }>;
  canAdvance: boolean;
  canRewindTo: number[];
  felt: string[];
  spiceLevel: 1 | 2 | 3;
};

const app = document.querySelector("#app")!;
let view: PlayerView | null = null;
let lastSceneId = "scene.first-night";
let screen: "home" | "scene" | "vault" | "messages" | "notes" | "calendar" | "flag" | "capture" = "home";

function sceneText(text: string): string {
  return text.replace(/^#+\s+[^\n]+\n+/, "").trim();
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function render(): void {
  if (!view) {
    app.innerHTML = `<div class="phone"><p class="meta">UNSEEN</p><h1>Elena's phone</h1><button class="primary" id="start">Start a run</button></div>`;
    document.querySelector("#start")?.addEventListener("click", async () => {
      view = await api("/v1/runs", { method: "POST", body: JSON.stringify({ mode: "honest" }) });
      screen = view.currentScene ? "scene" : "home";
      render();
    });
    return;
  }
  const v = view;
  if (v.currentScene) lastSceneId = v.currentScene.id;
  const header = `<p class="meta">Evening ${v.evening + 1} · Day ${v.day} · ${v.mode}</p>
    <p class="runid">run ${v.runId}</p>
    <p class="question">${v.openQuestion}</p>
    ${v.felt.map((line) => `<p class="felt">${line}</p>`).join("")}`;
  let body = "";
  if (screen === "scene" && v.currentScene) {
    body = `<article class="scene"><h2>${v.currentScene.title}</h2><p>${sceneText(v.currentScene.text)}</p></article>
      <div class="row">${v.currentScene.choices.map((c) => `<button data-choose="${c.id}">${c.label}</button>`).join("")}</div>
      ${v.askingTheory ? `<div class="row">${v.theoryOptions.map((t) => `<button data-theory="${t}">${t}</button>`).join("")}</div>` : ""}`;
  } else if (screen === "vault") {
    body = `<h2>Vault</h2>${v.vault.map((s) => `<p>${s.summary} · ${s.origin} · ${s.proof}</p>`).join("") || "<p>Empty.</p>"}`;
  } else if (screen === "messages") {
    body = `<h2>Messages</h2>${v.vault.map((s) => `<div><p>${s.summary}</p><div class="row">${v.recipients.map((r) => `<button data-send="${s.secretId}:${r.id}">${r.name}</button>`).join("")}</div></div>`).join("") || "<p>Nothing to send.</p>"}`;
  } else if (screen === "notes") {
    body = `<h2>Notes</h2><p class="question">${v.openQuestion}</p>
      <p class="felt">How close the nights are written.</p>
      <div class="row">${[1, 2, 3].map((n) => `<button data-spice="${n}"${v.spiceLevel === n ? " class=\"primary\"" : ""}>${n}</button>`).join("")}</div>`;
  } else if (screen === "calendar") {
    body = `<h2>Calendar</h2><div class="row">${v.canRewindTo.map((e) => `<button data-rewind="${e}">Rewind to evening ${e + 1}</button>`).join("")}</div>
      ${v.canAdvance ? `<button class="primary" id="advance">Go home</button>` : ""}`;
  } else if (screen === "capture") {
    body = `<h2>Recorder</h2>
      <button id="drop">Audio drop in lobby</button>
      ${v.captures.map((c) => `<p>${c.id} ${c.blocked ?? ""} ${c.marked ? "marked" : `<button data-mark="${c.id}">Mark clip</button>`}</p>`).join("")}`;
  } else if (screen === "flag") {
    body = `<div class="flag"><h2>Flag this section</h2>
      <select id="f-cat">
        <option>rewrite</option><option>location-missing</option><option>location-broken</option>
        <option>needs-detailing</option><option>romance-gap</option><option>backstory-mismatch</option>
        <option>timing</option><option>player-knowledge</option>
      </select>
      <select id="f-axis"><option value="">axis</option><option>l1</option><option>l2</option><option>l3</option></select>
      <input id="f-title" placeholder="Title" />
      <textarea id="f-body" placeholder="What is wrong, and what is missing."></textarea>
      <button class="primary" id="f-send">File flag</button></div>`;
  } else {
    body = `<h2>Where now</h2><div class="row">${v.locationOptions.map((l) => `<button data-loc="${l.id}">${l.name}</button>`).join("")}</div>
      <div class="row">${v.sceneOptions.map((s) => `<button data-scene="${s.id}">${s.title}</button>`).join("")}</div>
      ${v.canAdvance ? `<button id="advance">Go home</button>` : ""}`;
  }
  app.innerHTML = `<div class="phone">${header}${body}
    <nav class="apps">
      <button data-screen="home">Home</button>
      <button data-screen="capture">Recorder</button>
      <button data-screen="vault">Vault</button>
      <button data-screen="messages">Messages</button>
      <button data-screen="notes">Notes</button>
      <button data-screen="calendar">Calendar</button>
      <button data-screen="flag">Flag</button>
    </nav></div>`;

  const act = async (action: unknown) => {
    view = await api(`/v1/runs/${v.runId}/actions`, { method: "POST", body: JSON.stringify(action) });
    screen = view.currentScene ? "scene" : screen === "scene" ? "home" : screen;
    render();
  };
  app.querySelectorAll("[data-screen]").forEach((el) => el.addEventListener("click", () => {
    screen = (el as HTMLElement).dataset.screen as typeof screen;
    render();
  }));
  app.querySelectorAll("[data-choose]").forEach((el) => el.addEventListener("click", () => act({ type: "choose", choiceId: (el as HTMLElement).dataset.choose })));
  app.querySelectorAll("[data-theory]").forEach((el) => el.addEventListener("click", () => act({ type: "answer_theory", answer: (el as HTMLElement).dataset.theory })));
  app.querySelectorAll("[data-spice]").forEach((el) => el.addEventListener("click", () => act({ type: "set_spice", level: Number((el as HTMLElement).dataset.spice) })));
  app.querySelectorAll("[data-scene]").forEach((el) => el.addEventListener("click", () => act({ type: "enter_scene", sceneId: (el as HTMLElement).dataset.scene })));
  app.querySelectorAll("[data-loc]").forEach((el) => el.addEventListener("click", () => act({ type: "pick_location", locationId: (el as HTMLElement).dataset.loc })));
  app.querySelectorAll("[data-rewind]").forEach((el) => el.addEventListener("click", async () => {
    view = await api(`/v1/runs/${v.runId}/rewind`, { method: "POST", body: JSON.stringify({ to_evening: Number((el as HTMLElement).dataset.rewind) }) });
    render();
  }));
  app.querySelectorAll("[data-send]").forEach((el) => el.addEventListener("click", () => {
    const [secretId, recipientId] = String((el as HTMLElement).dataset.send).split(":");
    void act({ type: "send_secret", secretId, recipientId });
  }));
  app.querySelectorAll("[data-mark]").forEach((el) => el.addEventListener("click", () => act({ type: "mark_clip", captureId: (el as HTMLElement).dataset.mark })));
  document.querySelector("#advance")?.addEventListener("click", () => act({ type: "advance_evening" }));
  document.querySelector("#drop")?.addEventListener("click", async () => {
    const started = await api(`/v1/runs/${v.runId}/actions`, { method: "POST", body: JSON.stringify({ type: "start_capture", mode: "audio-drop", nodeId: "node.ascend.lobby", placement: "tote-on-lap" }) });
    const cap = started.captures.at(-1);
    if (cap) view = await api(`/v1/runs/${v.runId}/actions`, { method: "POST", body: JSON.stringify({ type: "stop_capture", captureId: cap.id }) });
    else view = started;
    render();
  });
  document.querySelector("#f-send")?.addEventListener("click", async () => {
    await api(`/v1/runs/${v.runId}/findings`, {
      method: "POST",
      body: JSON.stringify({
        entity_id: v.currentScene?.id ?? lastSceneId,
        category: (document.querySelector("#f-cat") as HTMLSelectElement).value,
        detail_axis: (document.querySelector("#f-axis") as HTMLSelectElement).value || undefined,
        title: (document.querySelector("#f-title") as HTMLInputElement).value,
        body: (document.querySelector("#f-body") as HTMLTextAreaElement).value,
      }),
    });
    screen = "home";
    render();
  });
}

render();

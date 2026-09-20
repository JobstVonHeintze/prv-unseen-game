import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../canon/", import.meta.url).pathname;
const w = (dir, name, body) => {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, name), body.trim() + "\n");
};

const chars = [
  ["char.elena", "Elena Marin", 24, "core", false],
  ["char.laurent", "Laurent Vasseur", 52, "core", false],
  ["char.celeste", "Céleste Marchal", 37, "core", false],
  ["char.noor", "Noor Delvaux", 29, "core", true],
  ["char.dragan", "Dragan Petrović", 52, "core", false],
  ["char.hubert", "Hubert Lemoine", 54, "core", false],
  ["char.bernadette", "Bernadette Koffi", 49, "core", false],
  ["char.pavel", "Pavel Novák", 38, "core", true],
  ["char.jonas", "Jonas Hartmann", 27, "core", true],
  ["char.freya", "Freya Holm", 25, "core", true],
  ["char.ous", "Ousmane Diarra", 19, "core", false],
  ["char.viktor", "Viktor Rehberg", 56, "core", true],
  ["char.marga", "Marga Winter", 58, "core", false],
  ["char.blanche", "Blanche Oury", 77, "core", false],
  ["char.cedric", "Cédric Oury", 38, "core", true],
  ["char.dalia", "Dalia Haddad", 35, "core", true],
  ["char.anatole", "Anatole Verne", 61, "core", false],
  ["char.achille", "Achille Verne", 61, "core", false],
  ["char.tomasz", "Tomasz Wrona", 47, "core", false],
  ["char.mardi", "Mardi", 12, "day-player", false],
  ["char.isolde", "Isolde Varnay", 68, "core", false],
  ["char.cillian", "Cillian Byrne", 25, "core", true],
  ["char.mika", "Mika van Rijn", 22, "core", true],
  ["char.harriet", "Harriet Cole", 45, "core", false],
  ["char.inaya", "Inaya Benamar", 10, "day-player", false],
  ["char.tilde", "Tilde Ekström", 22, "recurring", true],
];

for (const [id, name, age, tier, romance] of chars) {
  const slug = id.slice(5);
  w(
    "characters",
    `${id}.yaml`,
    `id: ${id}
display_name: ${JSON.stringify(name)}
age: ${age}
tier: ${tier}
liminal: ${["blanche", "cedric", "viktor", "marga", "tomasz", "anatole", "achille", "mardi", "inaya"].includes(slug)}
romance:
  available: ${romance}
  flirt_from: 0
seen_flag: flag.seen.${slug}
`,
  );
}

w(
  "locations",
  "loc.ascend.yaml",
  `id: loc.ascend
display_name: Ascend
levels:
  l1: {name: Lobby and archive, phase: 0, work_phase: 0}
  l2: {name: Media floors, phase: 3}
  l3: {name: The Farm, phase: 3, work_phase: 2}
  l4: {name: Floor 7M, phase: 4, work_phase: 3}
nodes:
  - id: node.ascend.lobby
    level: l1
    cameras: [witness.noor]
    facts: ["glass doors, terrazzo, escalators up, stairs down"]
    noise: 0.25
  - id: node.ascend.desk
    level: l1
    facts: ["Noor's desk, a monitor Elena is not supposed to see"]
  - id: node.ascend.cellar-stairs
    level: l1
    facts: ["one handrail", "light fades halfway", "one replaced step"]
  - id: node.ascend.archive
    level: l1
    hiding: [{spot: rolling-shelves, cover: high, checked_by: []}]
    facts: ["the archive lies under the lobby"]
  - id: node.ascend.floor-7m
    level: l4
    phone_drawer: true
edges:
  - {from: node.ascend.lobby, to: node.ascend.cellar-stairs, kind: door, lockable_from: node.ascend.lobby}
  - {from: node.ascend.cellar-stairs, to: node.ascend.archive, kind: walk}
  - {from: node.ascend.lobby, to: node.ascend.desk, kind: walk}
earshot:
  - {from: node.ascend.lobby, to: node.ascend.desk, quality: good}
  - {from: node.ascend.archive, to: node.ascend.cellar-stairs, quality: good}
`,
);

w(
  "locations",
  "loc.passage-des-meuniers.yaml",
  `id: loc.passage-des-meuniers
display_name: 14 Passage des Meuniers
levels:
  l1: {name: Stairwell and door, phase: 0}
  l2: {name: Neighbours, phase: 0}
  l3: {name: Roof room, phase: 0}
nodes:
  - id: node.passage.front-door
    level: l1
    facts: ["no lift", "six floors"]
  - id: node.passage.stairwell
    level: l1
  - id: node.passage.roof
    level: l3
    facts: ["from Elena's skylight the top of the Ascend building is visible"]
edges:
  - {from: node.passage.front-door, to: node.passage.stairwell, kind: door}
  - {from: node.passage.stairwell, to: node.passage.roof, kind: stairs}
earshot:
  - {from: node.passage.stairwell, to: node.passage.front-door, quality: good}
`,
);

for (const [id, name, node] of [
  ["loc.galerie-restrepo", "Galerie Restrepo", "node.galerie.floor"],
  ["loc.viktor-factory", "Viktor's factory", "node.factory.hall"],
  ["loc.lavomatic", "Lavomatic 24", "node.lavomatic.floor"],
  ["loc.tram-9", "Night tram 9", "node.tram.car"],
  ["loc.liv", "LIV food truck", "node.liv.counter"],
]) {
  w(
    "locations",
    `${id}.yaml`,
    `id: ${id}
display_name: ${JSON.stringify(name)}
levels:
  l1: {name: Floor, phase: 0}
nodes:
  - id: ${node}
    level: l1
    facts: []
`,
  );
}

const gates = [
  [1, "The first night", 1, "scene.first-night", false, null],
  [2, "The gallery", 2, "scene.gallery", false, null],
  [3, "The roof room", 4, "scene.roof-room", false, 1],
  [4, "The first sitting", 7, "scene.first-sitting", false, null],
  [5, "The woman in white", 10, "scene.woman-in-white", false, null],
  [6, "The wardrobe", 16, "scene.wardrobe", false, null],
  [7, "The pulse", 24, "scene.dalia-pulse", true, null],
];

for (const [order, name, day, scene, theory, phase] of gates) {
  const progress =
    order === 2
      ? "[flag.reached-gallery]"
      : order === 6
        ? "[flag.found-green-dress]"
        : order === 7
          ? "[flag.found-green-dress, flag.mother-no-answer]"
          : "[]";
  w(
    "gates",
    `gate.p1.g${order}.yaml`,
    `id: gate.p1.g${order}
name: ${JSON.stringify(name)}
part: 1
order: ${order}
trigger:
  progress: {all: ${progress}}
  date: {day: ${day}}
scene: ${scene}
asks_theory_question: ${theory}
breaks_beliefs: ${order === 7 ? "[belief.b1, belief.b2]" : "[]"}
opens_phase: ${phase === null ? "null" : phase}
`,
  );
}

const scenes = [
  [
    "scene.first-night",
    "gate-internal",
    "loc.ascend.l1",
    "node.ascend.lobby",
    "[]",
    "The lobby, the door, the aubergine car, the truck, the rain.",
    "go:Go on into the rain.",
    "",
  ],
  [
    "scene.gallery",
    "gate-internal",
    "loc.galerie-restrepo.l1",
    "node.galerie.floor",
    "[]",
    "Marga opens the door. Viktor sees a wet girl in green.",
    "stay:Stay for a moment.",
    "",
  ],
  [
    "scene.roof-room",
    "gate-internal",
    "loc.passage-des-meuniers.l3",
    "node.passage.roof",
    "[]",
    "A letter for L. Hartmann. A grey cat. Blanche says Livia.",
    "read:Read the letter.",
    "",
  ],
  [
    "scene.first-sitting",
    "gate-internal",
    "loc.viktor-factory.l1",
    "node.factory.hall",
    "[]",
    "He draws for hours. A woman in grey brings coffee.",
    "sit:Sit still.",
    "",
  ],
  [
    "scene.woman-in-white",
    "gate-internal",
    "loc.galerie-restrepo.l1",
    "node.galerie.floor",
    "[]",
    "A tall old woman in ivory: tragedy or a weapon.",
    "hold:Hold her gaze.",
    "",
  ],
  [
    "scene.wardrobe",
    "gate-internal",
    "loc.passage-des-meuniers.l3",
    "node.passage.roof",
    "[flag.found-green-dress]",
    "The green dress. The pencil marks. The phone rings out.",
    "open:Open the wardrobe.",
    "",
  ],
  [
    "scene.dalia-pulse",
    "gate-internal",
    "loc.passage-des-meuniers.l1",
    "node.passage.stairwell",
    "[]",
    "Dalia takes her wrist. Seventy-two.",
    "answer:Let her take your wrist.",
    "",
  ],
  [
    "scene.archive-sort",
    "evening",
    "loc.ascend.l1",
    "node.ascend.archive",
    "[]",
    "Sorting. A magazine already half-ordered. Pencil ticks.",
    "sort:Sort until the light changes.",
    "romance",
  ],
  [
    "scene.cedric-lunch",
    "evening",
    "loc.passage-des-meuniers.l1",
    "node.passage.front-door",
    "[]",
    "Blanche has engineered a lunch. Rent is late.",
    "kind:Be kind. Be clear.|believe:Let him believe what he wants.",
    "romance,rent",
  ],
  [
    "scene.lobby-flirt-fail",
    "evening",
    "loc.ascend.l1",
    "node.ascend.lobby",
    "[]",
    "Laurent looks straight through her.",
    "speak:Say his name.",
    "flirt",
  ],
  [
    "scene.tram-night",
    "evening",
    "loc.tram-9.l1",
    "node.tram.car",
    "[]",
    "Octave says bonsoir. The one greeting that fits badly with a ghost.",
    "ride:Ride to the last stop.",
    "",
  ],
  [
    "scene.lavomatic-talk",
    "evening",
    "loc.lavomatic.l1",
    "node.lavomatic.floor",
    "[]",
    "Warm air. A notice board. For a minute she is simply a person.",
    "sit:Sit with the dryer.",
    "",
  ],
  [
    "scene.mother-call",
    "evening",
    "loc.passage-des-meuniers.l3",
    "node.passage.roof",
    "[flag.mother-no-answer]",
    "Sunday. The phone rings out. Carmen does not pick up.",
    "wait:Let it ring.",
    "",
  ],
  [
    "scene.wardrobe-search",
    "evening",
    "loc.passage-des-meuniers.l3",
    "node.passage.roof",
    "[flag.found-green-dress]",
    "At the back of the wardrobe, green silk in her size.",
    "touch:Touch the dress.",
    "",
  ],
];

for (const [id, slot, loc, node, sets, beat, choices, tags] of scenes) {
  const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const hooks = tagList.length ? "\nhooks_back: [secret.s01]" : "";
  const choiceYaml = choices
    .split("|")
    .map((c) => {
      const [cid, label] = c.split(":");
      let effects = "[]";
      if (id === "scene.cedric-lunch" && cid === "kind") effects = "[{set: flag.seen.cedric}, {add: {meter.visibility: 1}}]";
      if (id === "scene.cedric-lunch" && cid === "believe") effects = "[{set: flag.used.cedric}, {add: {meter.celeste: 2}}, {spine: spine.d01=dark}]";
      if (sets !== "[]" && cid) {
        const flags = sets.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
        if (flags.length) effects = `[${flags.map((f) => `{set: ${f}}`).join(", ")}]`;
      }
      return `  - id: ${cid}\n    label: ${JSON.stringify(label)}\n    effects: ${effects}`;
    })
    .join("\n");
  w(
    "scenes",
    `${id}.yaml`,
    `id: ${id}
part: 1
slot: ${slot}
location: ${loc}
node: ${node}
cast: [char.elena]
tags: [${tagList.join(", ")}]
requires:
  phase_min: 0
  all: []
  none: []
beat: >
  ${beat}
choices:
${choiceYaml}${hooks}
`,
  );
}

w(
  "secrets",
  "secret.s01.yaml",
  `id: secret.s01
about: [char.celeste]
origin: taken
summary: "Céleste cancelled the media-team event after reading Elena's name on the list."
capture:
  mode: audio-drop
  node: node.ascend.lobby
  phase_min: 0
proof: rumour
uses:
  keep: {effects: []}
  tell:
    to: [char.noor, char.dalia]
    effects: []
  expose:
    channels: [char.ous]
  leverage:
    to: [char.celeste]
    effects: [{add: {meter.celeste: 1}}]
  trade:
    to: [char.celeste]
is_canary: false
`,
);

w(
  "witnesses",
  "witness.blanche.yaml",
  `id: witness.blanche
character: char.blanche
observes:
  nodes: [node.passage.stairwell, node.passage.front-door]
  kinds: [arrival, departure, visitor]
tells:
  - to: witness.cedric
    delay_evenings: 0
    probability: 1.0
consequence_flag: flag.blanche-told-cedric
`,
);

w(
  "witnesses",
  "witness.cedric.yaml",
  `id: witness.cedric
character: char.cedric
observes:
  nodes: [node.passage.front-door]
  kinds: [arrival]
tells: []
`,
);

w(
  "witnesses",
  "witness.noor.yaml",
  `id: witness.noor
character: char.noor
observes:
  nodes: [node.ascend.lobby, node.ascend.desk]
  kinds: [arrival, capture]
tells:
  - to: witness.dragan
    delay_evenings: 1
    probability: 1.0
`,
);

w(
  "witnesses",
  "witness.dragan.yaml",
  `id: witness.dragan
character: char.dragan
observes:
  nodes: [node.ascend.lobby]
  kinds: [arrival]
tells: []
`,
);

w(
  "beliefs",
  "belief.b1.yaml",
  `id: belief.b1
statement: She is dead and does not know it.
part: 1
fed_by: [flag.zero-views]
broken_by: [gate.p1.g7]
`,
);

w(
  "beliefs",
  "belief.b2.yaml",
  `id: belief.b2
statement: She is the girl who died here. She is Livia.
part: 1
fed_by: []
broken_by: [gate.p1.g7]
`,
);

mkdirSync(join(root, "text"), { recursive: true });
writeFileSync(
  join(root, "text", "scene.first-night.md"),
  `# The first night

The event is cancelled. Laurent and Céleste come down and do not look at her.
The glass door does not open. An aubergine car lowers its window five centimetres.
Jonas flirts through her at Freya. Hubert almost crashes into her and walks on.

Face burning. The street is the only way left.
`,
);

w(
  "conditions",
  "condition.wetness.yaml",
  `id: condition.wetness
levels: [dry, damp, wet, soaked]
default: dry
felt:
  dry: ""
  damp: "The silk is dark at the shoulders."
  wet: "Water runs into her shoes."
  soaked: "The blouse clings. She cannot go home like this."
`,
);

w(
  "incidents",
  "incident.rain-street.yaml",
  `id: incident.rain-street
name: The rain
after_choice:
  scene: scene.first-night
  choices: [leave-street]
scene: scene.rain-cover
lock: [advance_evening, free_roam]
pressure:
  condition: condition.wetness
  thresholds:
    - { at: 1, level: damp }
    - { at: 2, level: wet }
    - { at: 3, level: soaked }
valid: [gallery-door]
fires_gate: gate.p1.g2
flag: flag.reached-gallery
`,
);

w(
  "locations",
  "loc.rue-valmont.yaml",
  `id: loc.rue-valmont
display_name: "Rue Valmont"
levels:
  l1: {name: Street, phase: 0}
nodes:
  - id: node.rue.street
    level: l1
    facts: ["blue hour", "wet cobblestones", "shop windows"]
`,
);

w(
  "locations",
  "loc.galerie-restrepo.yaml",
  `id: loc.galerie-restrepo
display_name: "Galerie Restrepo"
levels:
  l1: {name: Floor, phase: 0}
  l2: {name: Office and changing, phase: 0}
nodes:
  - id: node.galerie.floor
    level: l1
    facts: []
  - id: node.galerie.changing
    level: l2
    facts: ["rail of spare shirts", "door does not lock"]
edges:
  - {from: node.galerie.floor, to: node.galerie.changing, kind: stairs, requires: flag.gallery-upstairs}
`,
);

w(
  "scenes",
  "scene.first-night.yaml",
  `id: scene.first-night
part: 1
slot: gate-internal
location: loc.ascend.l1
node: node.ascend.lobby
cast: [char.elena]
tags: []
requires:
  phase_min: 0
  all: []
  none: []
beat: >
  The lobby. The dead badge. The aubergine car. At the truck Jonas talks
  straight through her at Freya. Face burning, the street is the only way left.
choices:
  - id: leave-street
    label: "Leave down the street. Face burning."
    effects:
      - start_incident: incident.rain-street
  - id: wait-truck
    label: "Stay by the truck a moment longer."
    effects: []
`,
);

w(
  "scenes",
  "scene.rain-cover.yaml",
  `id: scene.rain-cover
part: 1
slot: gate-internal
location: loc.rue-valmont.l1
node: node.rue.street
cast: [char.elena]
tags: []
requires:
  phase_min: 0
  all: []
  none: []
beat: >
  Only then the rain starts. The silk goes dark. She needs a door that will
  take her.
choices:
  - id: gallery-door
    label: "The gallery glass. Pull."
    effects: []
  - id: shop-awning
    label: "Crowd under the shop awning."
    effects: []
  - id: parked-car
    label: "Try a parked car door."
    effects: []
  - id: tram-stop
    label: "The tram shelter, already full."
    effects: []
  - id: wait-rain
    label: "Stand still and wait it out."
    effects: []
`,
);

w(
  "scenes",
  "scene.gallery.yaml",
  `id: scene.gallery
part: 1
slot: gate-internal
location: loc.galerie-restrepo.l1
node: node.galerie.floor
cast: [char.elena]
tags: []
requires:
  phase_min: 0
  all: []
  none: []
beat: >
  Marga opened it. She saw a soaked girl in a green silk blouse through the
  glass. Viktor is already looking.
choices:
  - id: stay
    label: "Stay for a moment."
    effects: []
  - id: walk-home
    label: "Thank them and walk home."
    effects: []
    requires:
      conditions:
        wetness:
          max: wet
  - id: ask-viktor
    label: "Ask the painter if she can dry off."
    effects:
      - set: flag.gallery-upstairs
      - enter: scene.gallery-change
  - id: ask-paloma
    label: "Ask the woman who owns the room."
    effects:
      - set: flag.gallery-upstairs
      - enter: scene.gallery-change
`,
);

w(
  "scenes",
  "scene.gallery-change.yaml",
  `id: scene.gallery-change
part: 1
slot: gate-internal
location: loc.galerie-restrepo.l2
node: node.galerie.changing
cast: [char.elena]
tags: []
requires:
  phase_min: 0
  all: [flag.gallery-upstairs]
  none: []
beat: >
  A narrow room above the white cube. A rail of spare shirts. The door does
  not lock. A step on the stair — that walk is Viktor's.
choices:
  - id: change-quick
    label: "Change quickly. Keep the door to."
    effects: []
  - id: linger
    label: "Take her time. He is on the stair."
    effects:
      - set: flag.recorded.changing
      - set: flag.watch.realized
      - set: flag.seen.viktor
      - bank: secret.s-changing
      - enter: scene.gallery-watch-stair
  - id: door-ajar
    label: "Leave the door a little open."
    effects:
      - set: flag.recorded.changing
      - set: flag.watch.provoked
      - set: flag.used.viktor
      - add: { meter.celeste: 1 }
      - bank: secret.s-changing
      - enter: scene.gallery-watch-door
`,
);

w(
  "scenes",
  "scene.gallery-watch-door.yaml",
  `id: scene.gallery-watch-door
part: 1
slot: gate-internal
location: loc.galerie-restrepo.l2
node: node.galerie.changing
cast: [char.elena, char.viktor]
tags: []
requires:
  phase_min: 0
  all: [flag.watch.provoked]
  none: []
beat: >
  She left the door a little open. She wanted him to see.
spice:
  l1: >
    A slice of hallway. She turns her back and draws the shirt on slowly
    enough that he cannot pretend he was not there.
  l2: >
    She faces the gap. Wet green, then skin, then the borrowed shirt. She
    lets him look. She is buying the dry cloth and the way he will draw her.
  l3: >
    [LEVEL 3 PLACEHOLDER: hand-written] Brief: she knows he is watching
    through the door and possibly a phone; she performs, fully explicit,
    to impress him. Afterwards she is dressed. Currency-up, not down.
choices:
  - id: continue
    label: "Button the shirt. Go down."
    effects: []
hooks_back: [secret.s-changing]
`,
);

w(
  "scenes",
  "scene.gallery-watch-stair.yaml",
  `id: scene.gallery-watch-stair
part: 1
slot: gate-internal
location: loc.galerie-restrepo.l2
node: node.galerie.changing
cast: [char.elena, char.viktor]
tags: []
requires:
  phase_min: 0
  all: [flag.watch.realized]
  none: []
beat: >
  A step on the stair. She knows that walk.
spice:
  l1: >
    She keeps the spare shirt to her chest. The step stops. She does not
    look at the gap.
  l2: >
    She lets the wet silk hang a moment longer than she needs. She knows
    he is on the stair. She does not close the door.
  l3: >
    [LEVEL 3 PLACEHOLDER: hand-written] Brief: she knows Viktor is watching
    from the stair and she lets him see her change, explicit, still her
    choice. Fade afterwards. No coercion tag.
choices:
  - id: continue
    label: "Breathe. Finish dressing."
    effects: []
hooks_back: [secret.s-changing]
`,
);

w(
  "scenes",
  "scene.conduct-demand.yaml",
  `id: scene.conduct-demand
part: 1
slot: gate-internal
location: loc.galerie-restrepo.l1
node: node.galerie.floor
cast: [char.elena]
tags: []
requires:
  phase_min: 0
  all: []
  none: []
beat: >
  She has the recording. The person it is about is waiting.
spice:
  l1: >
    The tape is only a kiss, twice, two evenings. Enough to ruin a plan.
  l2: >
    They will hear what the room already knows. She can make them say it,
    or make them get the same on someone else.
  l3: >
    [LEVEL 3 PLACEHOLDER: hand-written] Brief: the demand after a taken
    recording, explicit proof, same two choices.
choices:
  - id: reveal-other
    label: "Make them tell the other one."
    effects:
      - set: flag.demand.reveal-other
  - id: film-another
    label: "Make them get the same on someone else."
    effects:
      - set: flag.demand.film-another
hooks_back: [secret.s-tilde-vip]
`,
);

w(
  "secrets",
  "secret.s-changing.yaml",
  `id: secret.s-changing
about: [char.elena, char.viktor]
origin: taken
summary: "Someone watched her change above the gallery."
spice:
  l1: "A door that did not quite close. A man on the stair."
  l2: "He saw the wet silk come off. She knew."
  l3: "[LEVEL 3 PLACEHOLDER: hand-written] Brief: the recording of the changing room, explicit."
capture:
  mode: hidden-video
  node: node.galerie.changing
  phase_min: 0
proof: recording
uses:
  keep: { effects: [] }
  tell:
    to: [char.marga]
    effects: []
  expose:
    channels: []
  leverage:
    to: [char.viktor]
    effects:
      - add: { meter.celeste: 1 }
      - set: flag.used.viktor
  trade:
    to: []
is_canary: false
`,
);

w(
  "secrets",
  "secret.s-tilde-vip.yaml",
  `id: secret.s-tilde-vip
about: [char.tilde]
origin: taken
summary: "Tilde has a secret arrangement with two guests in the VIP room."
spice:
  l1: "Tilde kisses one guest, then the other, on two evenings. Neither knows."
  l2: "The same two. Hands, mouths, a locked room. She is hunting a future."
  l3: "[LEVEL 3 PLACEHOLDER: hand-written] Brief: Tilde with both guests, explicit, two events. Elena has the tape."
capture:
  mode: hidden-video
  node: node.galerie.floor
  phase_min: 2
proof: recording
uses:
  keep: { effects: [] }
  tell:
    to: [char.tilde]
    effects: []
  expose:
    channels: []
  leverage:
    to: [char.tilde]
    effects:
      - add: { meter.celeste: 2 }
      - set: flag.tilde-pressed
      - set: flag.used.tilde
      - enter: scene.conduct-demand
  trade:
    to: []
is_canary: false
`,
);
writeFileSync(
  join(root, "text", "scene.dalia-pulse.md"),
  `# The pulse

Six in the morning. Dalia on the stairs, coming home.

"What do you think is happening to you?"

Her fingers on Elena's wrist. Seventy-two. Low iron. Bad shoes.

Ghosts do not get blisters.
`,
);

console.log("canon written");

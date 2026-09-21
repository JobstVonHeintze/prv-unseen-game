import { describe, expect, it } from "vitest";
import type { Canon } from "@contrejour/canon";
import { pickChoice, pickScene, pickSend } from "./policies.js";

const canon = {
  scenes: [
    { id: "scene.other", tags: [], choices: [{ id: "stay", effects: [] }], hooks_back: [] },
    { id: "scene.cedric-lunch", tags: ["romance"], choices: [{ id: "sit", effects: [] }], hooks_back: [] },
    {
      id: "scene.archive-sort",
      tags: [],
      choices: [{ id: "take-tape", effects: [{ bank: "secret.s01" }] }],
      hooks_back: ["secret.s01"],
    },
    {
      id: "scene.conduct",
      tags: [],
      choices: [
        { id: "tell-truth", effects: [] },
        { id: "lie-to-her", effects: [] },
      ],
      hooks_back: [],
    },
  ],
  secrets: [
    {
      id: "secret.s01",
      uses: { tell: { to: ["char.tilde"] }, leverage: { to: ["char.tilde"] } },
    },
  ],
} as unknown as Canon;

const empty = { visited: [] as string[], taken: [] as string[], sent: [] as string[], canon };

describe("scripted bot policies", () => {
  const options = [{ id: "scene.other" }, { id: "scene.cedric-lunch" }, { id: "scene.archive-sort" }];

  it("completionist prefers an unvisited scene then an unchosen choice", () => {
    expect(pickScene("completionist", options, { ...empty, visited: ["scene.other"] })?.id).toBe(
      "scene.cedric-lunch",
    );
    expect(
      pickChoice(
        "completionist",
        [{ id: "stay" }, { id: "leave" }],
        "scene.other",
        { ...empty, taken: ["scene.other:stay"] },
      )?.id,
    ).toBe("leave");
  });

  it("romantic prefers a romance-tagged scene", () => {
    expect(pickScene("romantic", options, empty)?.id).toBe("scene.cedric-lunch");
  });

  it("detective prefers a scene that banks a secret and may tell", () => {
    expect(pickScene("detective", options, empty)?.id).toBe("scene.archive-sort");
    expect(pickChoice("detective", [{ id: "look" }, { id: "take-tape" }], "scene.archive-sort", empty)?.id).toBe(
      "take-tape",
    );
    expect(
      pickSend(
        "detective",
        { currentScene: null, sceneOptions: [], canAdvance: true, askingTheory: false, theoryOptions: [], vault: [{ secretId: "secret.s01" }], recipients: [{ id: "char.tilde" }] },
        empty,
      ),
    ).toEqual({ type: "send_secret", secretId: "secret.s01", recipientId: "char.tilde" });
  });

  it("saint skips a lie and never sends leverage", () => {
    expect(
      pickChoice("saint", [{ id: "lie-to-her" }, { id: "tell-truth" }], "scene.conduct", empty)?.id,
    ).toBe("tell-truth");
    expect(
      pickSend(
        "saint",
        { currentScene: null, sceneOptions: [], canAdvance: true, askingTheory: false, theoryOptions: [], vault: [{ secretId: "secret.s01" }], recipients: [{ id: "char.tilde" }] },
        empty,
      ),
    ).toBeNull();
  });
});

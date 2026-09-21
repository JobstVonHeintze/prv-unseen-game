import { describe, expect, it } from "vitest";
import { isPersona, llmCredentialsPresent, loadRehearsalConfig, personaSkipReason } from "./personas.js";

describe("rehearsal personas", () => {
  it("loads the curious brief from config and skips without credentials", () => {
    const config = loadRehearsalConfig();
    expect(isPersona("curious", config)).toBe(true);
    expect(isPersona("karma-farmer", config)).toBe(false);
    expect(config.personas.curious?.brief).toContain("leverage");
    expect(llmCredentialsPresent({} as NodeJS.ProcessEnv, config)).toBe(false);
    expect(personaSkipReason({} as NodeJS.ProcessEnv, config)).toBe("no-credentials");
    expect(
      personaSkipReason(
        { CONTREJOUR_LLM_URL: "https://example.invalid", CONTREJOUR_LLM_KEY: "x" } as NodeJS.ProcessEnv,
        config,
      ),
    ).toBe("driver-unshipped");
  });
});

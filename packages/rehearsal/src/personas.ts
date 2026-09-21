import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type RehearsalConfig = {
  model: {
    id_env: string;
    url_env: string;
    key_env: string;
    max_calls_per_run: number;
  };
  personas: Record<string, { brief: string }>;
};

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), "../rehearsal.config.json");

export function loadRehearsalConfig(path = CONFIG_PATH): RehearsalConfig {
  return JSON.parse(readFileSync(path, "utf8")) as RehearsalConfig;
}

export function isPersona(name: string, config = loadRehearsalConfig()): boolean {
  return Object.hasOwn(config.personas, name);
}

export function llmCredentialsPresent(env: NodeJS.ProcessEnv = process.env, config = loadRehearsalConfig()): boolean {
  const url = env[config.model.url_env];
  const key = env[config.model.key_env];
  return Boolean(url && key);
}

export function personaSkipReason(
  env: NodeJS.ProcessEnv = process.env,
  config = loadRehearsalConfig(),
): "no-credentials" | "driver-unshipped" {
  return llmCredentialsPresent(env, config) ? "driver-unshipped" : "no-credentials";
}

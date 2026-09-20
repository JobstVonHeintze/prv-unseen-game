import { resolve } from "node:path";
import { loadCanon, assertValid, writeIndex } from "@contrejour/canon";
import { createApi, listen } from "./server.js";
import { createStore } from "./store.js";

const repo = resolve(import.meta.dirname, "../../..");
const canon = loadCanon(resolve(repo, "canon"));
assertValid(canon);
writeIndex(canon, resolve(repo, "out/canon-index.json"));
const store = createStore(resolve(repo, "data"));
const server = createApi(canon, store, { canonRoot: resolve(repo, "canon") });
const port = Number(process.env.CONTREJOUR_PORT ?? 8787);
await listen(server, port);
process.stdout.write(`contrejour api 127.0.0.1:${port}\n`);

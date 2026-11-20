import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const specDirectory = dirname(fileURLToPath(import.meta.url));
const apiZodIndex = resolve(specDirectory, "../api-zod/src/index.ts");

await writeFile(apiZodIndex, 'export * from "./generated/api";\n', "utf8");

/**
 * dsh-appearance build script.
 *
 * Compiles the TypeScript sources into the runtime artifacts the profile
 * consumes:
 *  - src/index.ts        → lib/index.js   (ESM, imports preserved — Host half)
 *  - src/client/index.ts → lib/client.js  (CommonJS body wrapped in the
 *    client-modules loader format: window.__ModuleLoader__.load({ id, factory }))
 *
 * The client wrapper is the same artifact shape the official
 * @deepseek-ai/dsh-client-* packages ship: the factory receives the loader's
 * `require`, which resolves `react` and the @deepseek-ai/dsh-* services from
 * the browser module table.
 *
 * Usage:
 *   node build.mjs          # one-shot build
 *   node build.mjs --watch  # rebuild on src changes
 */
import { readFileSync, writeFileSync, watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(fileURLToPath(import.meta.url));
const srcDir = join(root, "src");
const libDir = join(root, "lib");

/** Transpile one TS file to JS text with the given module kind. */
function transpile(file, moduleKind) {
	const source = readFileSync(join(srcDir, file), "utf8");
	const result = ts.transpileModule(source, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: moduleKind,
			esModuleInterop: false,
			importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
			sourceMap: false
		},
		fileName: file
	});
	return result.outputText;
}

/** The module-loader preamble/footer around the compiled client body. */
const CLIENT_ID = "dsh-appearance";
const clientBanner = [
	`window.__ModuleLoader__.load({`,
	`\tid: ${JSON.stringify(CLIENT_ID)},`,
	`\tfactory: (require) => {`,
	`\t\tvar module = { exports: {} };`,
	`\t\tvar exports = module.exports;`,
	`\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });`
].join("\n");
const clientFooter = `\n\t\treturn module.exports;\n\t}\n});\n`;

function build() {
	// Host half: ESM with imports preserved (schemastery resolves from node_modules).
	const host = transpile("index.ts", ts.ModuleKind.ESNext);
	writeFileSync(join(libDir, "index.js"), host);

	// Browser half: CommonJS body wrapped in the loader factory.
	const client = transpile(join("client", "index.ts"), ts.ModuleKind.CommonJS);
	writeFileSync(join(libDir, "client.js"), `${clientBanner}\n${client}\n${clientFooter}`);

	console.log("dsh-appearance: built lib/index.js + lib/client.js");
}

build();

if (process.argv.includes("--watch")) {
	console.log("dsh-appearance: watching src/ for changes…");
	watch(srcDir, { recursive: true }, () => {
		try {
			build();
		} catch (error) {
			console.error("build failed:", error);
		}
	});
}

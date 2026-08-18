#!/usr/bin/env node
/**
 * dsh-appearance — one-command installer.
 *
 * Runs the full installation flow for a DSH web profile:
 *   1. `dsh plugin --profile <name> add <plugin-dir>` — registers the bundle
 *      (forwarded to pnpm with -w for the workspace root);
 *   2. prints the final "restart dsh web" reminder.
 *
 * No settings-namespace whitelist patch is needed: mounting the bundle makes
 * the Host half run, which registers the `ui-appearance` namespace; DSH's
 * gateway exposes every registered namespace to the browser automatically
 * (registration IS the exposure).
 *
 * Usage:
 *   node scripts/install.mjs                      # install into profile `web`
 *   node scripts/install.mjs --profile demo       # another profile name
 *   node scripts/install.mjs --dir /path/to/dsh-appearance
 *   node scripts/install.mjs --skip-add           # skip the dsh plugin add
 *   node scripts/install.mjs --dry-run            # print commands, don't run
 *
 * The dsh CLI is located via, in order: $DSH / $DSH_CLI, `dsh`/`dsh.cmd` on
 * PATH, or the npm global bin dir (Windows %APPDATA%\npm, POSIX npm prefix).
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

/* ------------------------------------------------------------------ */
/* Argument parsing                                                    */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
function valueOf(flag) {
	const i = args.indexOf(flag);
	return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
const profile = valueOf("--profile") || "web";
const pluginDir = valueOf("--dir") || root;
const skipAdd = args.includes("--skip-add");
const dryRun = args.includes("--dry-run");

/* ------------------------------------------------------------------ */
/* Locate the dsh CLI                                                  */
/* ------------------------------------------------------------------ */

function npmGlobalBin() {
	if (isWin) {
		const appData = process.env.APPDATA;
		if (appData) {
			const p = join(appData, "npm", "dsh.cmd");
			if (existsSync(p)) return p;
		}
	} else {
		const res = spawnSync("npm", ["prefix", "-g"], { encoding: "utf8" });
		if (res.status === 0) {
			const p = join(res.stdout.trim(), "bin", "dsh");
			if (existsSync(p)) return p;
		}
	}
	return null;
}

function findDsh() {
	const explicit = process.env.DSH || process.env.DSH_CLI;
	if (explicit && existsSync(explicit)) return explicit;
	if (isWin) {
		// `dsh` may resolve to a shim without extension; try both spellings.
		for (const name of ["dsh.cmd", "dsh"]) {
			const which = spawnSync("where", [name], { shell: true, encoding: "utf8" });
			if (which.status === 0 && which.stdout.trim()) {
				return which.stdout.trim().split(/\r?\n/)[0];
			}
		}
	} else {
		const which = spawnSync("which", ["dsh"], { encoding: "utf8" });
		if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
	}
	return npmGlobalBin();
}

let dsh = findDsh();
if (!dsh) {
	if (dryRun) {
		dsh = "dsh";
		console.warn("[dsh-appearance] 警告：未找到 dsh CLI（--dry-run 仅预览，命令用占位符 dsh 展示）。");
	} else {
		console.error("[dsh-appearance] 未找到 dsh CLI。请安装 DeepSeek Harness 或将 dsh 加入 PATH，或设置 DSH 环境变量指向 dsh 可执行文件。");
		process.exit(1);
	}
}

/* ------------------------------------------------------------------ */
/* Step runners                                                        */
/* ------------------------------------------------------------------ */

function run(label, cmd, cmdArgs, opts = {}) {
	console.log(`\n[dsh-appearance] ▶ ${label}`);
	console.log(`[dsh-appearance]   $ ${[cmd, ...cmdArgs].join(" ")}`);
	if (dryRun) return true;
	const res = spawnSync(cmd, cmdArgs, { stdio: "inherit", ...opts });
	if (res.status !== 0) {
		console.error(`[dsh-appearance] ✗ ${label} 失败（exit ${res.status}）。`);
		process.exit(res.status ?? 1);
	}
	console.log(`[dsh-appearance] ✓ ${label}`);
	return true;
}

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */

console.log(`[dsh-appearance] 一键安装：profile=${profile} dir=${pluginDir}`);
console.log(`[dsh-appearance] dsh CLI: ${dsh}`);

if (!skipAdd) {
	const addArgs = ["plugin", "--profile", profile, "add", "-w", pluginDir];
	if (!isWin) run("注册 bundle 到 profile", dsh, addArgs);
	else run("注册 bundle 到 profile", dsh, addArgs, { shell: true });
}

console.log("\n[dsh-appearance] ✔ 安装完成。");
console.log("[dsh-appearance] 下一步：重启 dsh web 使配置生效（dsh web 或 dsh --profile " + profile + "）。");
if (skipAdd) console.log("[dsh-appearance] 提示：本次跳过了 bundle 注册（--skip-add），如尚未安装请重新运行不带该参数。");

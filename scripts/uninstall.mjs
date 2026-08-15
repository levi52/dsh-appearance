#!/usr/bin/env node
/**
 * dsh-appearance — one-command uninstaller.
 *
 * Reverses the installer flow for a DSH web profile:
 *   1. `dsh plugin --profile <name> remove dsh-appearance` — removes the
 *      bundle from node_modules and the profile's bundles list;
 *   2. the whitelist fixer in --remove mode — drops "ui-appearance" from the
 *      gateway's WEB_SETTINGS_NAMESPACES;
 *   3. prints the restart reminder and notes that user data is kept.
 *
 * User data (the `ui-appearance:` section of $DSH_HOME/settings.yaml and the
 * $DSH_HOME/wallpapers/ files) is intentionally NOT deleted — uninstalling the
 * plugin should not silently destroy settings or wallpapers. Delete those
 * manually if you want them gone.
 *
 * Usage:
 *   node scripts/uninstall.mjs                   # remove from profile `web`
 *   node scripts/uninstall.mjs --profile demo    # another profile name
 *   node scripts/uninstall.mjs --skip-bundle     # whitelist removal only
 *   node scripts/uninstall.mjs --skip-whitelist  # bundle removal only
 *   node scripts/uninstall.mjs --dry-run         # print commands, don't run
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
const skipBundle = args.includes("--skip-bundle");
const skipWhitelist = args.includes("--skip-whitelist");
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

console.log(`[dsh-appearance] 一键卸载：profile=${profile}`);
console.log(`[dsh-appearance] dsh CLI: ${dsh}`);

if (!skipBundle) {
	const rmArgs = ["plugin", "--profile", profile, "remove", "dsh-appearance"];
	if (!isWin) run("从 profile 移除 bundle", dsh, rmArgs);
	else run("从 profile 移除 bundle", dsh, rmArgs, { shell: true });
}

if (!skipWhitelist) {
	const fixer = join(root, "scripts", "fix-whitelist.mjs");
	run("移除设置命名空间白名单", process.execPath, [fixer, "--remove"]);
}

console.log("\n[dsh-appearance] ✔ 卸载完成。");
console.log("[dsh-appearance] 下一步：重启 dsh web 使变更生效。");
console.log("[dsh-appearance] 提示：你的用户数据已保留（settings.yaml 的 ui-appearance 段与 wallpapers/ 目录）。如需彻底清除，请手动删除它们。");
if (skipBundle) console.log("[dsh-appearance] 提示：本次跳过了 bundle 移除（--skip-bundle），如尚未移除请重新运行不带该参数。");
if (skipWhitelist) console.log("[dsh-appearance] 提示：本次跳过了白名单移除（--skip-whitelist），若白名单仍需移除请重新运行不带该参数。");

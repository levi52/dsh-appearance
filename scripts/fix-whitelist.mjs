#!/usr/bin/env node
/**
 * dsh-appearance — settings-namespace whitelist fixer.
 *
 * DSH's API gateway (dsh-host-apiproxy) only lets the browser read/write
 * settings namespaces listed in its hardcoded `WEB_SETTINGS_NAMESPACES`
 * array; a namespace absent there answers `settings-not-exposed` even though
 * its owning plugin registered it. This script idempotently adds
 * `"ui-appearance"` to that array so the plugin's settings work out of the
 * box (or removes it again with --remove).
 *
 * Run manually after installing the plugin (local `link:` installs do not
 * trigger lifecycle scripts):
 *   npm run fix-whitelist            # add (idempotent)
 *   npm run fix-whitelist -- --remove # remove (idempotent)
 *
 * Also wired as `postinstall` for registry/npm-install contexts.
 *
 * Note: upgrading/reinstalling @deepseek-ai/dsh-host-apiproxy restores the
 * shipped file, so run this again afterwards. Requires a dsh web restart to
 * take effect.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const NS = '"ui-appearance"';
const MARKER = "const WEB_SETTINGS_NAMESPACES = [";
const REMOVE = process.argv.includes("--remove");
const NS_LINE = /^\s*"ui-appearance",?\s*$/;

/** Resolve $DSH_HOME (or the user's home fallback). */
function dshHome() {
	return process.env.DSH_HOME || join(homedir(), ".dsh");
}

/** Candidate locations of the gateway file (env override for testing). */
function candidates() {
	const override = process.env.DSH_WHITELIST_FILE;
	if (override) return [override];
	const base = dshHome();
	return [
		join(base, "profiles", "node_modules", "@deepseek-ai", "dsh-host-apiproxy", "lib", "index.js"),
		join(base, "profiles", "web", "node_modules", "@deepseek-ai", "dsh-host-apiproxy", "lib", "index.js")
	];
}

function fail(message) {
	console.error(`[dsh-appearance] ${message}`);
	process.exit(1);
}

/** Running as a lifecycle hook (postinstall): degrade to a warning when the
 *  gateway file is absent, so installs on machines without a booted profile
 *  do not fail. Manual runs still exit non-zero with the full message. */
const asLifecycleHook = process.env.npm_lifecycle_event === "postinstall";

let target = null;
for (const candidate of candidates()) {
	if (existsSync(candidate)) {
		target = candidate;
		break;
	}
}
if (!target) {
	const message = `未找到 dsh-host-apiproxy/lib/index.js（$DSH_HOME=${dshHome()}）。请确认 DSH 已安装并初始化过 web profile，或设置 DSH_WHITELIST_FILE 指向该文件。`;
	if (asLifecycleHook) {
		console.warn(`[dsh-appearance] ${message}`);
		console.warn("[dsh-appearance] 跳过（postinstall 环境无网关文件）。安装到已初始化的 DSH 后请手动运行 npm run fix-whitelist。");
		process.exit(0);
	}
	fail(message);
}

const source = readFileSync(target, "utf8");
const markerIndex = source.indexOf(MARKER);
if (markerIndex === -1) {
	const verb = REMOVE ? "移除" : "添加";
	fail(`未找到 ${MARKER}（网关文件结构可能已变化），请手动${verb} ${NS} ${REMOVE ? "出" : "到"} WEB_SETTINGS_NAMESPACES 数组。`);
}
// MARKER ends with the array's opening `[`, so the first `[` from the marker
// start IS the array we want (not some later bracket elsewhere in the file).
const arrayOpen = source.indexOf("[", markerIndex);
const arrayClose = source.indexOf("];", arrayOpen);
if (arrayOpen === -1 || arrayClose === -1) {
	const verb = REMOVE ? "移除" : "添加";
	fail(`未找到 WEB_SETTINGS_NAMESPACES 数组边界，文件结构异常，请手动${verb} ${NS} ${REMOVE ? "出" : "到"} 数组。`);
}
const arrayBody = source.slice(arrayOpen, arrayClose + 1);
const present = arrayBody.includes(NS);

if (!REMOVE) {
	if (present) {
		console.log(`[dsh-appearance] 白名单已包含 ${NS}，无需修改。`);
		process.exit(0);
	}

	// Insert before the array's closing `];`, reusing the last entry's indent.
	// The previous last entry is the array's final item, so it has no trailing
	// comma — append one before adding our new row, or the file becomes invalid JS.
	// Note: `before` may end with the line break before `];`, so strip trailing
	// whitespace first, or `lastIndexOf("\n")` would pick up that final newline.
	const before = source.slice(0, arrayClose);
	const after = source.slice(arrayClose);
	const trimmedBefore = before.replace(/\s+$/, "");
	const lineStart = trimmedBefore.lastIndexOf("\n") + 1;
	const lastLine = trimmedBefore.slice(lineStart);
	const indentMatch = /^(\s*)/.exec(lastLine);
	const indent = (indentMatch && indentMatch[1]) || "\t";
	const lastLineWithComma = lastLine.endsWith(",") ? lastLine : `${lastLine},`;
	const rewritten = `${trimmedBefore.slice(0, lineStart)}${lastLineWithComma}\n${indent}${NS},\n${after}`;
	writeFileSync(target, rewritten);
	console.log(`[dsh-appearance] 已在 WEB_SETTINGS_NAMESPACES 中添加 ${NS} → ${target}`);
	console.log("[dsh-appearance] 请重启 dsh web 使白名单生效。");
	process.exit(0);
}

/* ---- remove mode ---- */
if (!present) {
	console.log(`[dsh-appearance] 白名单不含 ${NS}，无需修改。`);
	process.exit(0);
}

// Drop the ui-appearance line, then clean up: if it was the last entry the
// previous line may now carry a dangling trailing comma — JS allows trailing
// commas, but keep the file tidy by stripping it when present. Only do this
// when the removed line was the array's final element.
const lines = arrayBody.split("\n");
// Find the last content line (skipping the closing `]` and blank lines).
let lastContentIdx = lines.length - 1;
while (lastContentIdx >= 0 && /^\s*\]?\s*$/.test(lines[lastContentIdx])) lastContentIdx--;
const removedLast = lastContentIdx >= 0 && NS_LINE.test(lines[lastContentIdx]);
const kept = lines.filter((line) => !NS_LINE.test(line));
if (removedLast) {
	// Strip the trailing comma from the new final entry (the line just before
	// the closing `]`), skipping blanks.
	let lastKeptIdx = kept.length - 1;
	while (lastKeptIdx >= 0 && /^\s*\]?\s*$/.test(kept[lastKeptIdx])) lastKeptIdx--;
	if (kept[lastKeptIdx]) kept[lastKeptIdx] = kept[lastKeptIdx].replace(/,\s*$/, "");
}
const rewritten = `${source.slice(0, arrayOpen)}${kept.join("\n")}${source.slice(arrayClose + 1)}`;
writeFileSync(target, rewritten);
console.log(`[dsh-appearance] 已从 WEB_SETTINGS_NAMESPACES 中移除 ${NS} → ${target}`);
console.log("[dsh-appearance] 请重启 dsh web 使变更生效。");

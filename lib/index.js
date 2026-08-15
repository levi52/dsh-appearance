/// <reference types="node" />
/**
 * dsh-appearance — Host half (TypeScript source).
 *
 * Registers the durable `ui-appearance` settings namespace in the host
 * user-settings document (`$DSH_HOME/settings.yaml`). The browser half binds
 * this same namespace through `ctx.settingsScope` and persists the selected
 * theme / font / font-size there.
 *
 * Note: `settingsNamespace` from `@deepseek-ai/dsh-settings` is a trivial
 * kebab-case validation (see that package's lib/types/index.js); it is inlined
 * here so this plugin's Host half depends only on schemastery, which the
 * profile already provides.
 *
 * Built to `lib/index.js` by `node build.mjs`.
 */
import z from "@deepseek-ai/schemastery";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
/** Settings namespace owned by the appearance plugin. */
export const APPEARANCE_SETTINGS_NAMESPACE = "ui-appearance";
/** Plugin name (docs convention: bundle plugins export `name`). */
export const name = "dsh-appearance";
/** Namespace validation mirroring @deepseek-ai/dsh-settings' pattern. */
const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
/** Brand a settings namespace (inline equivalent of `settingsNamespace`). */
function settingsNamespace(value) {
    if (!NAMESPACE_PATTERN.test(value)) {
        throw new TypeError(`settings namespace "${value}" must match ${String(NAMESPACE_PATTERN)}`);
    }
    return value;
}
/** Durable appearance schema; also the wire envelope the browser scope validates against. */
export const AppearanceSettingsSchema = z.object({
    theme: z.string().default("system"),
    fontFamily: z.string().default("system"),
    fontFamilyCustom: z.string().default(""),
    codeFont: z.string().default("default"),
    codeFontCustom: z.string().default(""),
    fontSize: z.string().default("normal"),
    accent: z.string().default("none"),
    accentCustom: z.string().default(""),
    backgroundImage: z.string().default(""),
    bgOpacity: z.number().default(100),
    bgBlur: z.number().default(0),
    customTheme: z.string().default(""),
    customThemeName: z.string().default(""),
});
// ── wallpaper file storage ───────────────────────────────────────────────────
// Uploaded wallpaper bytes live as files under `$DSH_HOME/wallpapers/` (the
// folder this plugin creates) and the browser side stores only the returned
// URL in settings — never the multi-MB payload.
/** HTTP prefix this plugin owns on the host webserver. */
const WALLPAPER_PREFIX = "/dsh-appearance";
/** Wallpaper folder name inside $DSH_HOME. */
const WALLPAPER_DIR_NAME = "wallpapers";
/** Allowed image extensions (derived from the data URI mime). */
const WALLPAPER_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg"
};
/** Resolve the wallpaper folder (created on demand). */
function wallpaperDir() {
    const base = process.env.DSH_HOME || join(homedir(), ".dsh");
    const dir = join(base, WALLPAPER_DIR_NAME);
    mkdirSync(dir, { recursive: true });
    return dir;
}
/**
 * Register the durable appearance section when the optional Host settings
 * service is composed, and the wallpaper upload/serve routes when the host
 * webserver is composed.
 * @param ctx - Host context that may acquire settings and HTTP services.
 */
export function apply(ctx) {
    ctx.inject(["settings"], (settingsCtx) => {
        settingsCtx.settings.register(settingsNamespace(APPEARANCE_SETTINGS_NAMESPACE), AppearanceSettingsSchema);
    });
    ctx.inject(["webServer"], (httpCtx) => {
        const server = httpCtx.webServer;
        httpCtx.effect(() => {
            server.register({
                path: WALLPAPER_PREFIX,
                handler: async (req, res) => {
                    const request = req;
                    const response = res;
                    const url = new URL(request.url ?? "/", "http://local");
                    try {
                        // POST /dsh-appearance/wallpaper { image: "data:image/png;base64,..." }
                        if (request.method === "POST" && url.pathname === `${WALLPAPER_PREFIX}/wallpaper`) {
                            let body = "";
                            for await (const chunk of request)
                                body += chunk.toString("utf8");
                            const payload = JSON.parse(body);
                            const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/s.exec(payload.image ?? "");
                            if (!match) {
                                response.writeHead(400, { "content-type": "application/json", "cache-control": "no-cache" });
                                response.end(JSON.stringify({ error: "expected data:image/*;base64 payload" }));
                                return;
                            }
                            const extension = WALLPAPER_EXTENSIONS[match[1].toLowerCase()];
                            if (!extension) {
                                response.writeHead(415, { "content-type": "application/json", "cache-control": "no-cache" });
                                response.end(JSON.stringify({ error: `unsupported image type ${match[1]}` }));
                                return;
                            }
                            const filename = `${randomUUID()}.${extension}`;
                            writeFileSync(join(wallpaperDir(), filename), Buffer.from(match[2], "base64"));
                            response.writeHead(200, { "content-type": "application/json", "cache-control": "no-cache" });
                            response.end(JSON.stringify({ url: `${WALLPAPER_PREFIX}/wallpapers/${filename}` }));
                            return;
                        }
                        // GET /dsh-appearance/wallpapers — list stored wallpapers (newest first).
                        if (request.method === "GET" && url.pathname === `${WALLPAPER_PREFIX}/wallpapers`) {
                            let files = [];
                            try {
                                files = readdirSync(wallpaperDir()).filter((name) => /^[0-9a-f-]+\.(png|jpg|gif|webp|svg)$/i.test(name));
                            }
                            catch {
                                /* folder missing — empty list */
                            }
                            const list = files
                                .map((filename) => {
                                const file = join(wallpaperDir(), filename);
                                let updatedAt = 0;
                                let size = 0;
                                try {
                                    const stat = statSync(file);
                                    updatedAt = stat.mtimeMs;
                                    size = stat.size;
                                }
                                catch {
                                    /* skip unreadable entries below */
                                }
                                return { filename, url: `${WALLPAPER_PREFIX}/wallpapers/${filename}`, size, updatedAt };
                            })
                                .filter((entry) => entry.updatedAt > 0)
                                .sort((a, b) => b.updatedAt - a.updatedAt);
                            response.writeHead(200, { "content-type": "application/json", "cache-control": "no-cache" });
                            response.end(JSON.stringify({ wallpapers: list }));
                            return;
                        }
                        // DELETE /dsh-appearance/wallpapers/<file> — remove a stored wallpaper.
                        if (request.method === "DELETE" && url.pathname.startsWith(`${WALLPAPER_PREFIX}/wallpapers/`)) {
                            const filename = url.pathname.slice((`${WALLPAPER_PREFIX}/wallpapers/`).length);
                            if (!/^[0-9a-f-]+\.(png|jpg|gif|webp|svg)$/i.test(filename)) {
                                response.writeHead(404, { "content-type": "text/plain" });
                                response.end("not found");
                                return;
                            }
                            const file = join(wallpaperDir(), filename);
                            if (!existsSync(file)) {
                                response.writeHead(404, { "content-type": "text/plain" });
                                response.end("not found");
                                return;
                            }
                            unlinkSync(file);
                            response.writeHead(200, { "content-type": "application/json", "cache-control": "no-cache" });
                            response.end(JSON.stringify({ ok: true }));
                            return;
                        }
                        // GET /dsh-appearance/wallpapers/<id>.<ext> — serve the stored file.
                        if (request.method === "GET" && url.pathname.startsWith(`${WALLPAPER_PREFIX}/wallpapers/`)) {
                            const filename = url.pathname.slice((`${WALLPAPER_PREFIX}/wallpapers/`).length);
                            if (!/^[0-9a-f-]+\.(png|jpg|gif|webp|svg)$/i.test(filename)) {
                                response.writeHead(404, { "content-type": "text/plain" });
                                response.end("not found");
                                return;
                            }
                            const file = join(wallpaperDir(), filename);
                            if (!existsSync(file)) {
                                response.writeHead(404, { "content-type": "text/plain" });
                                response.end("not found");
                                return;
                            }
                            const contentType = filename.endsWith(".svg") ? "image/svg+xml" : `image/${filename.split(".").pop()}`;
                            response.writeHead(200, { "content-type": contentType, "cache-control": "no-cache" });
                            response.end(readFileSync(file));
                            return;
                        }
                        response.writeHead(404, { "content-type": "text/plain" });
                        response.end("not found");
                    }
                    catch {
                        response.writeHead(500, { "content-type": "text/plain" });
                        response.end("wallpaper route error");
                    }
                }
            });
        }, "dsh-appearance: wallpaper routes");
    });
}

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

/** Settings namespace owned by the appearance plugin. */
export const APPEARANCE_SETTINGS_NAMESPACE = "ui-appearance";

/** Namespace validation mirroring @deepseek-ai/dsh-settings' pattern. */
const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Brand a settings namespace (inline equivalent of `settingsNamespace`). */
function settingsNamespace(value: string): string {
	if (!NAMESPACE_PATTERN.test(value)) {
		throw new TypeError(`settings namespace "${value}" must match ${String(NAMESPACE_PATTERN)}`);
	}
	return value;
}

/**
 * Durable appearance section. `theme` holds either a built-in preference id
 * (`light`/`dark`/`system`) or one of the third-party theme ids registered by
 * the browser half (`claude`, `github`, `brutalism`, `terminal`).
 */
export interface AppearanceSettings {
	theme: string;
	fontFamily: string;
	fontFamilyCustom: string;
	codeFont: string;
	codeFontCustom: string;
	fontSize: string;
}

/** Durable appearance schema; also the wire envelope the browser scope validates against. */
export const AppearanceSettingsSchema = z.object({
	theme: z.string().default("system"),
	fontFamily: z.string().default("system"),
	fontFamilyCustom: z.string().default(""),
	codeFont: z.string().default("default"),
	codeFontCustom: z.string().default(""),
	fontSize: z.string().default("normal"),
});

/** Minimal host Cordis context surface used by this plugin. */
export interface HostContext {
	inject(services: readonly string[], fn: (ctx: HostContext) => void): unknown;
}

/**
 * Register the durable appearance section when the optional Host settings
 * service is composed.
 * @param ctx - Host context that may acquire settings.
 */
export function apply(ctx: HostContext): void {
	ctx.inject(["settings"], (settingsCtx) => {
		(settingsCtx as unknown as { settings: { register(namespace: string, schema: unknown): unknown } }).settings.register(
			settingsNamespace(APPEARANCE_SETTINGS_NAMESPACE),
			AppearanceSettingsSchema
		);
	});
}

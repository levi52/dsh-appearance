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
});
/**
 * Register the durable appearance section when the optional Host settings
 * service is composed.
 * @param ctx - Host context that may acquire settings.
 */
export function apply(ctx) {
    ctx.inject(["settings"], (settingsCtx) => {
        settingsCtx.settings.register(settingsNamespace(APPEARANCE_SETTINGS_NAMESPACE), AppearanceSettingsSchema);
    });
}

window.__ModuleLoader__.load({
	id: "dsh-appearance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inject = void 0;
exports.apply = apply;
/**
 * dsh-appearance — Browser half (TypeScript source).
 *
 * Registered into the web profile's client module table. Provides:
 *  - third-party theme presets (Claude / GitHub / Neo-brutalism / Terminal)
 *    registered into the ThemeRuntime registry (ctx.theme),
 *  - the Appearance settings section (settings.section slot) with a theme
 *    card grid plus UI font / code font / font-size controls,
 *  - persistence through the `ui-appearance` settings namespace.
 *
 * Built to `lib/client.js` by `node build.mjs`: the compiled CommonJS body is
 * wrapped in the client-modules loader format
 * (`window.__ModuleLoader__.load({ id, factory })`), the same artifact shape
 * the official `@deepseek-ai/dsh-client-*` packages ship.
 *
 * The local service types below mirror the subset of the `@deepseek-ai/dsh-*`
 * client surfaces this plugin consumes (ThemeRuntime, SettingsScope, slots,
 * locale); keeping them local keeps the build hermetic.
 */
const React = require("react");
// ── static styles: base font hooks + the Appearance section surface ─────────
const baseCss = ":root{--dsh-appearance-font:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif;--dsh-appearance-code-font:'SF Mono','JetBrains Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace}";
const sectionCss = [
    ".dshApp-shell{display:flex;flex-direction:column;gap:4px;padding:4px 0 20px}",
    ".dshApp-section{border-bottom:1px solid var(--dsw-alias-border-l2);padding:18px 0;display:flex;flex-direction:column;gap:12px}",
    ".dshApp-section:last-child{border-bottom:none;padding-bottom:4px}",
    ".dshApp-sectionTitle{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}",
    ".dshApp-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
    ".dshApp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}",
    ".dshApp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:12px;cursor:pointer;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:9px;text-align:left;font:inherit;color:inherit;transition:border-color .15s ease,background .15s ease}",
    ".dshApp-card:hover{border-color:var(--dsw-alias-border-l3)}",
    ".dshApp-card[data-selected='true']{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-module-platform)}",
    ".dshApp-swatches{display:flex;gap:5px}",
    ".dshApp-swatch{width:26px;height:26px;border-radius:8px;border:1px solid rgba(128,128,128,.28)}",
    ".dshApp-cardName{font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}",
    ".dshApp-seg{display:flex;flex-wrap:wrap;gap:8px}",
    ".dshApp-segBtn{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:5px 14px;font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary);background:transparent;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease}",
    ".dshApp-segBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
    ".dshApp-segBtn[data-selected='true']{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-button-primary-dimmed,transparent)}",
    ".dshApp-input{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:8px 12px;font-size:13px;line-height:20px;font-family:var(--dsw-font-family)}",
    ".dshApp-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}",
    ".dshApp-reset{align-self:flex-start;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px 16px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:18px;cursor:pointer;transition:background .15s ease,color .15s ease}",
    ".dshApp-reset:hover{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}",
    ".dshApp-reset:disabled{opacity:.45;cursor:not-allowed}",
    ".dshApp-actions{border-bottom:none}",
    ".dshApp-actionRow{display:flex;gap:8px;flex-wrap:wrap}",
    ".dshApp-save{border:1px solid var(--dsw-alias-brand-primary);border-radius:10px;padding:8px 18px;background:var(--dsw-alias-button-primary-fill,transparent);color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-label-primary));font-size:13px;line-height:18px;cursor:pointer;transition:opacity .15s ease}",
    ".dshApp-save:disabled{opacity:.45;cursor:not-allowed}",
    ".dshApp-customRow{display:flex;gap:8px;align-items:stretch}",
    ".dshApp-customInput{flex:1;min-width:0}",
    ".dshApp-pickBtn{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:0 14px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;cursor:pointer;white-space:nowrap;transition:background .15s ease,color .15s ease,border-color .15s ease}",
    ".dshApp-pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
    ".dshApp-pickBtn:disabled{opacity:.45;cursor:not-allowed}",
    ".dshApp-overlay{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-2,rgba(0,0,0,.45));display:flex;align-items:center;justify-content:center;z-index:1000}",
    ".dshApp-fontDialog{width:min(440px,92vw);max-height:72vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;padding:16px;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,.28)}",
    ".dshApp-fontDialogHead{display:flex;justify-content:space-between;align-items:center;gap:12px}",
    ".dshApp-fontDialogTitle{font-size:15px;line-height:22px;color:var(--dsw-alias-label-primary)}",
    ".dshApp-fontDialogClose{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:1;cursor:pointer;padding:4px 6px;border-radius:6px}",
    ".dshApp-fontDialogClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
    ".dshApp-fontList{overflow-y:auto;display:flex;flex-direction:column;gap:2px;min-height:220px;max-height:46vh}",
    ".dshApp-fontRow{border:0;background:transparent;text-align:left;padding:8px 10px;border-radius:8px;font-size:16px;color:var(--dsw-alias-label-primary);cursor:pointer}",
    ".dshApp-fontRow:hover{background:var(--dsw-alias-interactive-bg-hover)}",
    ".dshApp-fontCount{font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary)}"
].join("");
/** Inject one style tag once (mirrors the module-loader CSS convention). */
function injectCss(tagId, css) {
    if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) === null) {
        const tag = document.createElement("style");
        tag.dataset.plugin = "dsh-appearance";
        tag.setAttribute("data-plugin-css", tagId);
        tag.textContent = css;
        document.head.appendChild(tag);
    }
}
injectCss("dsh-appearance/base", baseCss);
injectCss("dsh-appearance/section", sectionCss);
// ── theme presets (alias-token overrides over the base palette) ─────────────
const THEMES = [
    {
        id: "claude",
        colorScheme: "light",
        tokens: {
            "--dsw-alias-bg-base": "#FAF9F5",
            "--dsw-alias-bg-layer-1": "#F5F4EE",
            "--dsw-alias-bg-layer-2": "#EFEEE6",
            "--dsw-alias-bg-layer-3": "#E9E7DE",
            "--dsw-alias-bg-overlay": "#F0EFE7",
            "--dsw-alias-bg-module-platform": "#F2F1EA",
            "--dsw-alias-bg-multi-select": "#F0EFE6",
            "--dsw-alias-bg-mask-1": "rgba(250,249,245,0.9)",
            "--dsw-alias-label-primary": "#3D3929",
            "--dsw-alias-label-secondary": "#6B675C",
            "--dsw-alias-label-tertiary": "#9C978A",
            "--dsw-alias-label-caption": "#8B877B",
            "--dsw-alias-label-dimmed": "#B3AFA3",
            "--dsw-alias-brand-primary": "#D97757",
            "--dsw-alias-brand-primary-invert": "#FAF9F5",
            "--dsw-alias-brand-text": "#3D3929",
            "--dsw-alias-button-primary-fill": "#D97757",
            "--dsw-alias-button-primary-hover": "#C96442",
            "--dsw-alias-button-primary-dimmed": "rgba(217,119,87,0.18)",
            "--dsw-alias-border-l1": "rgba(61,57,41,0.06)",
            "--dsw-alias-border-l2": "rgba(61,57,41,0.14)",
            "--dsw-alias-border-l3": "rgba(61,57,41,0.22)",
            "--dsw-alias-interactive-bg-hover": "rgba(217,119,87,0.08)",
            "--dsw-alias-interactive-bg-active": "rgba(217,119,87,0.16)",
            "--dsw-alias-markdown-code-block": "#EFEEE6",
            "--dsw-alias-markdown-code-block-banner": "#EAE8DD",
            "--dsw-alias-markdown-inline-code": "#E9E7DC",
            "--dsw-alias-markdown-tag": "rgba(217,119,87,0.14)",
            "--dsw-alias-scrollbar-bg-l1": "#DDD9CC",
            "--dsw-alias-scrollbar-bg-l2": "#CFCAB9",
            "--dsw-alias-tooltip-bg": "#3D3929",
            "--dsw-alias-toast-bg": "#3D3929",
            "--dsw-alias-state-success-primary": "#3E7C4F",
            "--dsw-alias-state-error-primary": "#B54535",
            "--dsw-alias-state-warn-primary": "#B07B2E"
        }
    },
    {
        id: "github",
        colorScheme: "light",
        tokens: {
            "--dsw-alias-bg-base": "#FFFFFF",
            "--dsw-alias-bg-layer-1": "#F6F8FA",
            "--dsw-alias-bg-layer-2": "#EFF2F5",
            "--dsw-alias-bg-layer-3": "#E9EDF1",
            "--dsw-alias-bg-overlay": "#FFFFFF",
            "--dsw-alias-bg-module-platform": "#F6F8FA",
            "--dsw-alias-bg-multi-select": "#EAF3EC",
            "--dsw-alias-label-primary": "#1F2328",
            "--dsw-alias-label-secondary": "#59636E",
            "--dsw-alias-label-tertiary": "#6E7781",
            "--dsw-alias-label-caption": "#66707B",
            "--dsw-alias-label-dimmed": "#8C959F",
            "--dsw-alias-brand-primary": "#1F883D",
            "--dsw-alias-brand-primary-invert": "#FFFFFF",
            "--dsw-alias-brand-text": "#1F2328",
            "--dsw-alias-button-primary-fill": "#1F883D",
            "--dsw-alias-button-primary-hover": "#1A7F37",
            "--dsw-alias-button-primary-dimmed": "rgba(31,136,61,0.14)",
            "--dsw-alias-border-l1": "rgba(31,35,40,0.06)",
            "--dsw-alias-border-l2": "rgba(31,35,40,0.12)",
            "--dsw-alias-border-l3": "rgba(31,35,40,0.2)",
            "--dsw-alias-interactive-bg-hover": "rgba(31,136,61,0.08)",
            "--dsw-alias-interactive-bg-active": "rgba(31,136,61,0.16)",
            "--dsw-alias-markdown-code-block": "#F6F8FA",
            "--dsw-alias-markdown-code-block-banner": "#EFF2F5",
            "--dsw-alias-markdown-inline-code": "#EFF1F3",
            "--dsw-alias-markdown-tag": "rgba(9,105,218,0.12)",
            "--dsw-alias-scrollbar-bg-l1": "#D0D7DE",
            "--dsw-alias-scrollbar-bg-l2": "#AFB8C1",
            "--dsw-alias-tooltip-bg": "#1F2328",
            "--dsw-alias-toast-bg": "#1F2328",
            "--dsw-alias-state-success-primary": "#1F883D",
            "--dsw-alias-state-error-primary": "#CF222E",
            "--dsw-alias-state-warn-primary": "#9A6700"
        }
    },
    {
        id: "brutalism",
        colorScheme: "light",
        tokens: {
            "--dsw-alias-bg-base": "#FDF6E3",
            "--dsw-alias-bg-layer-1": "#F8EFD4",
            "--dsw-alias-bg-layer-2": "#F1E5C0",
            "--dsw-alias-bg-layer-3": "#EADCAE",
            "--dsw-alias-bg-overlay": "#FBF2D9",
            "--dsw-alias-bg-module-platform": "#F8EFD4",
            "--dsw-alias-bg-multi-select": "#F4E7C4",
            "--dsw-alias-label-primary": "#111111",
            "--dsw-alias-label-secondary": "#3D3D3D",
            "--dsw-alias-label-tertiary": "#5C5C5C",
            "--dsw-alias-label-caption": "#4A4A4A",
            "--dsw-alias-label-dimmed": "#777777",
            "--dsw-alias-brand-primary": "#111111",
            "--dsw-alias-brand-primary-invert": "#FDF6E3",
            "--dsw-alias-brand-text": "#111111",
            "--dsw-alias-button-primary-fill": "#111111",
            "--dsw-alias-button-primary-hover": "#333333",
            "--dsw-alias-button-primary-dimmed": "rgba(17,17,17,0.14)",
            "--dsw-alias-border-l1": "#111111",
            "--dsw-alias-border-l2": "#111111",
            "--dsw-alias-border-l3": "#111111",
            "--dsw-alias-interactive-bg-hover": "rgba(255,77,0,0.09)",
            "--dsw-alias-interactive-bg-active": "rgba(255,77,0,0.18)",
            "--dsw-alias-interactive-bg-hover-accent": "rgba(255,77,0,0.16)",
            "--dsw-alias-markdown-code-block": "#F1E5C0",
            "--dsw-alias-markdown-code-block-banner": "#EADCAE",
            "--dsw-alias-markdown-inline-code": "#ECDFB4",
            "--dsw-alias-markdown-tag": "rgba(255,77,0,0.16)",
            "--dsw-alias-scrollbar-bg-l1": "#E3D5A8",
            "--dsw-alias-scrollbar-bg-l2": "#CBB985",
            "--dsw-alias-tooltip-bg": "#111111",
            "--dsw-alias-toast-bg": "#111111",
            "--dsw-alias-state-success-primary": "#008F4C",
            "--dsw-alias-state-error-primary": "#E4002B",
            "--dsw-alias-state-warn-primary": "#FFB800"
        }
    },
    {
        id: "terminal",
        colorScheme: "dark",
        tokens: {
            "--dsw-alias-bg-base": "#0A0E0A",
            "--dsw-alias-bg-layer-1": "#10160F",
            "--dsw-alias-bg-layer-2": "#161E14",
            "--dsw-alias-bg-layer-3": "#1C2718",
            "--dsw-alias-bg-overlay": "#121A10",
            "--dsw-alias-bg-module-platform": "#10160F",
            "--dsw-alias-bg-multi-select": "#1B2A1A",
            "--dsw-alias-bg-mask-1": "rgba(10,14,10,0.9)",
            "--dsw-alias-label-primary": "#B8FFC9",
            "--dsw-alias-label-secondary": "#7FD695",
            "--dsw-alias-label-tertiary": "#55996B",
            "--dsw-alias-label-caption": "#6FB883",
            "--dsw-alias-label-dimmed": "#3E6B4C",
            "--dsw-alias-brand-primary": "#00E676",
            "--dsw-alias-brand-primary-invert": "#0A0E0A",
            "--dsw-alias-brand-text": "#B8FFC9",
            "--dsw-alias-button-primary-fill": "#00E676",
            "--dsw-alias-button-primary-hover": "#00C853",
            "--dsw-alias-button-primary-dimmed": "rgba(0,230,118,0.16)",
            "--dsw-alias-border-l1": "rgba(0,230,118,0.16)",
            "--dsw-alias-border-l2": "rgba(0,230,118,0.3)",
            "--dsw-alias-border-l3": "rgba(0,230,118,0.45)",
            "--dsw-alias-interactive-bg-hover": "rgba(0,230,118,0.1)",
            "--dsw-alias-interactive-bg-active": "rgba(0,230,118,0.2)",
            "--dsw-alias-markdown-code-block": "#0E150D",
            "--dsw-alias-markdown-code-block-banner": "#141D11",
            "--dsw-alias-markdown-inline-code": "#141D11",
            "--dsw-alias-markdown-tag": "rgba(0,230,118,0.14)",
            "--dsw-alias-scrollbar-bg-l1": "#1D2A1B",
            "--dsw-alias-scrollbar-bg-l2": "#2C4228",
            "--dsw-alias-tooltip-bg": "#0E150D",
            "--dsw-alias-toast-bg": "#0E150D",
            "--dsw-alias-state-success-primary": "#00E676",
            "--dsw-alias-state-error-primary": "#FF5252",
            "--dsw-alias-state-warn-primary": "#FFB300"
        }
    }
];
/** Built-in theme ids accepted by the theme service. */
const BUILTIN = ["light", "dark", "system"];
/** Settings namespace owned by this plugin (registered by the Host half). */
const SETTINGS_NAMESPACE = "ui-appearance";
/** Locale namespace for the section copy. */
const NS = "settings.appearance";
// ── font presets ────────────────────────────────────────────────────────────
const FONT_FAMILIES = {
    system: "",
    sans: "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif",
    serif: "Georgia,'Times New Roman','Songti SC','SimSun',serif",
    mono: "'SF Mono','JetBrains Mono',Consolas,'Courier New',monospace"
};
const CODE_FONTS = {
    default: "",
    jetbrains: "'JetBrains Mono','SF Mono',Consolas,'Liberation Mono',Menlo,monospace",
    fira: "'Fira Code','JetBrains Mono','SF Mono',Consolas,monospace",
    consolas: "Consolas,'SF Mono','Liberation Mono',Menlo,monospace"
};
const FONT_SIZES = { small: "13px", normal: "14px", large: "16px" };
// ── copy dictionaries ───────────────────────────────────────────────────────
const ZH = {
    nav: "外观",
    themeSection: "主题",
    themeHint: "选择界面配色方案",
    themeLight: "浅色",
    themeDark: "深色",
    themeSystem: "跟随系统",
    themeClaude: "Claude",
    themeGithub: "GitHub",
    themeBrutalism: "新粗野主义",
    themeTerminal: "终端",
    uiFont: "界面字体",
    uiFontHint: "全局界面文字字体",
    codeFont: "代码字体",
    codeFontHint: "代码块与内联代码字体",
    fontSize: "字号",
    fontSizeHint: "调整全局文字大小",
    fontSystem: "默认",
    fontSans: "无衬线",
    fontSerif: "衬线",
    fontMono: "等宽",
    fontCustom: "自定义",
    codeDefault: "默认",
    fontSmall: "小",
    fontNormal: "标准",
    fontLarge: "大",
    customPlaceholder: "输入字体族，例如 'LXGW WenKai', serif",
    pickFontButton: "从电脑选择…",
    fontDialogTitle: "选择电脑字体",
    fontDialogEmpty: "没有匹配的字体",
    fontSearchPlaceholder: "搜索字体…",
    saveButton: "保存并应用",
    discardButton: "放弃更改",
    dirtyHint: "有未保存的更改，点击「保存并应用」生效",
    savedHint: "所有更改已保存",
    reset: "恢复默认",
    resetHint: "将外观设置重置为默认值，保存后生效"
};
const EN = {
    nav: "Appearance",
    themeSection: "Theme",
    themeHint: "Choose the interface color scheme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    themeClaude: "Claude",
    themeGithub: "GitHub",
    themeBrutalism: "Neo-brutalism",
    themeTerminal: "Terminal",
    uiFont: "UI font",
    uiFontHint: "Font for the whole interface",
    codeFont: "Code font",
    codeFontHint: "Font for code blocks and inline code",
    fontSize: "Font size",
    fontSizeHint: "Adjust the global text size",
    fontSystem: "Default",
    fontSans: "Sans-serif",
    fontSerif: "Serif",
    fontMono: "Monospace",
    fontCustom: "Custom",
    codeDefault: "Default",
    fontSmall: "Small",
    fontNormal: "Normal",
    fontLarge: "Large",
    customPlaceholder: "Type a font stack, e.g. 'LXGW WenKai', serif",
    pickFontButton: "Pick from computer…",
    fontDialogTitle: "Choose a system font",
    fontDialogEmpty: "No matching fonts",
    fontSearchPlaceholder: "Search fonts…",
    saveButton: "Save & Apply",
    discardButton: "Discard",
    dirtyHint: "Unsaved changes — click “Save & Apply” to apply",
    savedHint: "All changes are saved",
    reset: "Reset",
    resetHint: "Reset appearance settings to defaults (applies on save)"
};
// ── preview swatches for the theme cards ────────────────────────────────────
const CARD_SWATCHES = {
    light: ["#FFFFFF", "#F0F1F3", "#1F1F1F"],
    dark: ["#1F1F1F", "#2B2B2B", "#EDEDED"],
    system: ["#FFFFFF", "#888888", "#1F1F1F"]
};
function swatchesOf(theme) {
    return [theme.tokens["--dsw-alias-bg-base"], theme.tokens["--dsw-alias-bg-layer-2"], theme.tokens["--dsw-alias-brand-primary"]];
}
/** Normalize a persisted section into the draft shape with schema defaults. */
function fromValue(value) {
    return {
        theme: (value && value.theme) || "system",
        fontFamily: (value && value.fontFamily) || "system",
        fontFamilyCustom: (value && value.fontFamilyCustom) || "",
        codeFont: (value && value.codeFont) || "default",
        codeFontCustom: (value && value.codeFontCustom) || "",
        fontSize: (value && value.fontSize) || "normal"
    };
}
/** Whether the draft differs from the persisted section (schema-default aware). */
function isDirty(value, draft) {
    const base = fromValue(value);
    return draft.theme !== base.theme
        || draft.fontFamily !== base.fontFamily
        || (draft.fontFamilyCustom || "") !== base.fontFamilyCustom
        || draft.codeFont !== base.codeFont
        || (draft.codeFontCustom || "") !== base.codeFontCustom
        || draft.fontSize !== base.fontSize;
}
// ── plugin body ─────────────────────────────────────────────────────────────
/** Client-side services this plugin waits for before activation. */
exports.inject = ["slots", "locale", "connection", "remote", "settingsScope", "theme"];
/**
 * Client plugin body: register theme presets, bind the durable settings
 * scope, restore the persisted selection, and register the Appearance
 * settings section.
 * @param ctx - client cordis context.
 */
function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), "dsh-appearance: copy dictionaries");
    const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
    /**
     * The Appearance settings section. Defined inside apply so it closes over
     * the bound settings scope; the framework supplies the locale `t` seat and
     * the injected business face through props.
     */
    function AppearanceSection(props) {
        const { t } = props;
        // NOTE: subscribe/getSnapshot must be wrapped so the controller methods
        // are invoked with their own `this` — React calls the subscribe function
        // as a plain function.
        const value = React.useSyncExternalStore((cb) => scope.subscribe(cb), () => scope.getSnapshot().value);
        // ── draft state ─────────────────────────────────────────────────────────
        // User edits accumulate in `draft`; nothing reaches the document until
        // "保存并应用" commits it (theme via ctx.theme, fonts via applyFonts,
        // persistence via the settings scope).
        const [draft, setDraft] = React.useState(() => fromValue(value));
        const loaded = React.useRef(false);
        React.useEffect(() => {
            if (value !== undefined && !loaded.current) {
                loaded.current = true;
                setDraft(fromValue(value));
            }
        }, [value]);
        const theme = draft.theme ?? "system";
        const fontFamily = draft.fontFamily ?? "system";
        const codeFont = draft.codeFont ?? "default";
        const fontSize = draft.fontSize ?? "normal";
        const dirty = isDirty(value, draft);
        // ── system-font picker (Local Font Access API, Chromium only) ──────────
        const [fontPicker, setFontPicker] = React.useState(null);
        const [systemFonts, setSystemFonts] = React.useState([]);
        const [fontSearch, setFontSearch] = React.useState("");
        const queryLocalFonts = window.queryLocalFonts;
        const canPickFont = typeof queryLocalFonts === "function";
        async function openFontPicker(kind) {
            if (typeof queryLocalFonts !== "function")
                return;
            try {
                const fonts = await queryLocalFonts.call(window);
                const seen = new Set();
                const families = [];
                for (const font of fonts) {
                    if (font.family && !seen.has(font.family)) {
                        seen.add(font.family);
                        families.push(font.family);
                    }
                }
                families.sort((a, b) => a.localeCompare(b));
                setSystemFonts(families.map((family) => ({ family })));
                setFontSearch("");
                setFontPicker(kind);
            }
            catch {
                /* permission denied or API error — keep the manual input */
            }
        }
        // ── draft writers ───────────────────────────────────────────────────────
        function chooseTheme(id) { setDraft((d) => ({ ...d, theme: id })); }
        function chooseFontFamily(id) { setDraft((d) => ({ ...d, fontFamily: id })); }
        function chooseCodeFont(id) { setDraft((d) => ({ ...d, codeFont: id })); }
        function chooseFontSize(id) { setDraft((d) => ({ ...d, fontSize: id })); }
        function setCustom(field, value2) { setDraft((d) => Object.assign({}, d, { [field]: value2 })); }
        function pickSystemFont(family) {
            if (fontPicker === null)
                return;
            // Keep CJK fallbacks so Chinese text stays legible when the picked
            // family only covers Latin glyphs.
            const stack = `"${family}", -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
            if (fontPicker === "code") {
                setDraft((d) => ({ ...d, codeFont: "custom", codeFontCustom: stack }));
            }
            else {
                setDraft((d) => ({ ...d, fontFamily: "custom", fontFamilyCustom: stack }));
            }
            setFontPicker(null);
        }
        // ── commit / discard ────────────────────────────────────────────────────
        function save() {
            applyingFromPanel = true;
            try {
                ctx.theme.setTheme(theme);
            }
            finally {
                applyingFromPanel = false;
            }
            scope.set("theme", theme);
            scope.set("fontFamily", fontFamily);
            scope.set("fontFamilyCustom", draft.fontFamilyCustom ?? "");
            scope.set("codeFont", codeFont);
            scope.set("codeFontCustom", draft.codeFontCustom ?? "");
            scope.set("fontSize", fontSize);
            applyFonts(draft);
        }
        function discard() {
            setDraft(fromValue(value));
        }
        function resetDraft() {
            setDraft({ theme: "system", fontFamily: "system", fontFamilyCustom: "", codeFont: "default", codeFontCustom: "", fontSize: "normal" });
        }
        const matchedFonts = systemFonts.filter((font) => font.family.toLowerCase().includes(fontSearch.trim().toLowerCase()));
        const themeCards = [
            { id: "light", label: t("themeLight"), swatches: CARD_SWATCHES.light },
            { id: "dark", label: t("themeDark"), swatches: CARD_SWATCHES.dark },
            { id: "system", label: t("themeSystem"), swatches: CARD_SWATCHES.system }
        ];
        for (const def of THEMES) {
            themeCards.push({ id: def.id, label: t("theme" + def.id[0].toUpperCase() + def.id.slice(1)), swatches: swatchesOf(def) });
        }
        const seg = (options, current, onPick) => React.createElement("div", { className: "dshApp-seg" }, ...options.map((opt) => React.createElement("button", {
            key: opt.id,
            className: "dshApp-segBtn",
            type: "button",
            "data-selected": String(current === opt.id),
            onClick: () => onPick(opt.id)
        }, opt.label)));
        return React.createElement("div", { className: "dshApp-shell" }, React.createElement("div", { className: "dshApp-section" }, React.createElement("div", { className: "dshApp-sectionTitle" }, t("themeSection")), React.createElement("div", { className: "dshApp-hint" }, t("themeHint")), React.createElement("div", { className: "dshApp-grid" }, ...themeCards.map((card) => React.createElement("button", {
            key: card.id,
            type: "button",
            className: "dshApp-card",
            "data-selected": String(theme === card.id),
            onClick: () => chooseTheme(card.id)
        }, React.createElement("div", { className: "dshApp-swatches" }, ...card.swatches.map((color, i) => React.createElement("span", { key: i, className: "dshApp-swatch", style: { background: color } }))), React.createElement("span", { className: "dshApp-cardName" }, card.label))))), React.createElement("div", { className: "dshApp-section" }, React.createElement("div", { className: "dshApp-sectionTitle" }, t("uiFont")), React.createElement("div", { className: "dshApp-hint" }, t("uiFontHint")), seg([
            { id: "system", label: t("fontSystem") },
            { id: "sans", label: t("fontSans") },
            { id: "serif", label: t("fontSerif") },
            { id: "mono", label: t("fontMono") },
            { id: "custom", label: t("fontCustom") }
        ], fontFamily, chooseFontFamily), fontFamily === "custom"
            ? React.createElement("div", { className: "dshApp-customRow" }, React.createElement("input", {
                className: "dshApp-input dshApp-customInput",
                type: "text",
                value: draft.fontFamilyCustom || "",
                placeholder: t("customPlaceholder"),
                onChange: (e) => setCustom("fontFamilyCustom", e.target.value)
            }), canPickFont
                ? React.createElement("button", { type: "button", className: "dshApp-pickBtn", onClick: () => void openFontPicker("ui") }, t("pickFontButton"))
                : null)
            : null), React.createElement("div", { className: "dshApp-section" }, React.createElement("div", { className: "dshApp-sectionTitle" }, t("codeFont")), React.createElement("div", { className: "dshApp-hint" }, t("codeFontHint")), seg([
            { id: "default", label: t("codeDefault") },
            { id: "jetbrains", label: "JetBrains Mono" },
            { id: "fira", label: "Fira Code" },
            { id: "consolas", label: "Consolas" },
            { id: "custom", label: t("fontCustom") }
        ], codeFont, chooseCodeFont), codeFont === "custom"
            ? React.createElement("div", { className: "dshApp-customRow" }, React.createElement("input", {
                className: "dshApp-input dshApp-customInput",
                type: "text",
                value: draft.codeFontCustom || "",
                placeholder: t("customPlaceholder"),
                onChange: (e) => setCustom("codeFontCustom", e.target.value)
            }), canPickFont
                ? React.createElement("button", { type: "button", className: "dshApp-pickBtn", onClick: () => void openFontPicker("code") }, t("pickFontButton"))
                : null)
            : null), React.createElement("div", { className: "dshApp-section" }, React.createElement("div", { className: "dshApp-sectionTitle" }, t("fontSize")), React.createElement("div", { className: "dshApp-hint" }, t("fontSizeHint")), seg([
            { id: "small", label: t("fontSmall") },
            { id: "normal", label: t("fontNormal") },
            { id: "large", label: t("fontLarge") }
        ], fontSize, chooseFontSize)), React.createElement("div", { className: "dshApp-section dshApp-actions" }, React.createElement("div", { className: "dshApp-hint" }, dirty ? t("dirtyHint") : t("savedHint")), React.createElement("div", { className: "dshApp-actionRow" }, React.createElement("button", { type: "button", className: "dshApp-save", disabled: !dirty, onClick: save }, t("saveButton")), React.createElement("button", { type: "button", className: "dshApp-reset", disabled: !dirty, onClick: discard }, t("discardButton")), React.createElement("button", { type: "button", className: "dshApp-reset", onClick: resetDraft }, t("reset")))), fontPicker !== null
            ? React.createElement("div", { className: "dshApp-overlay", onClick: () => setFontPicker(null) }, React.createElement("div", { className: "dshApp-fontDialog", onClick: (e) => e.stopPropagation() }, React.createElement("div", { className: "dshApp-fontDialogHead" }, React.createElement("div", { className: "dshApp-fontDialogTitle" }, t("fontDialogTitle")), React.createElement("button", { type: "button", className: "dshApp-fontDialogClose", onClick: () => setFontPicker(null) }, "×")), React.createElement("input", {
                className: "dshApp-input",
                type: "text",
                value: fontSearch,
                placeholder: t("fontSearchPlaceholder"),
                onChange: (e) => setFontSearch(e.target.value)
            }), matchedFonts.length === 0
                ? React.createElement("div", { className: "dshApp-fontCount" }, t("fontDialogEmpty"))
                : React.createElement("div", { className: "dshApp-fontList" }, ...matchedFonts.map((font) => React.createElement("button", {
                    key: font.family,
                    type: "button",
                    className: "dshApp-fontRow",
                    style: { fontFamily: `"${font.family}", sans-serif` },
                    onClick: () => pickSystemFont(font.family)
                }, font.family))), React.createElement("div", { className: "dshApp-fontCount" }, `${matchedFonts.length} / ${systemFonts.length}`)))
            : null);
    }
    // Third-party theme presets. Duplicate ids throw; guard so a profile that
    // already registers one of these ids keeps working.
    const disposers = [];
    for (const def of THEMES) {
        try {
            disposers.push(ctx.theme.register(def));
        }
        catch {
            /* duplicate theme id — keep the existing occupant */
        }
    }
    ctx.effect(() => () => { for (const dispose of disposers)
        dispose(); }, "dsh-appearance: theme registry");
    let applyingFromPanel = false;
    const currentTheme = () => {
        const value = scope.getSnapshot().value;
        return (value && value.theme) || "system";
    };
    /** Apply persisted fonts/font-size to the document. */
    function applyFonts(value) {
        const root = document.documentElement;
        const fam = value && value.fontFamily === "custom" ? (value.fontFamilyCustom || "") : FONT_FAMILIES[value ? value.fontFamily || "" : ""];
        if (fam)
            root.style.setProperty("--dsw-font-family", fam);
        else
            root.style.removeProperty("--dsw-font-family");
        const code = value && value.codeFont === "custom" ? (value.codeFontCustom || "") : CODE_FONTS[value ? value.codeFont || "" : ""];
        if (code)
            root.style.setProperty("--ds-font-family-code", code);
        else
            root.style.removeProperty("--ds-font-family-code");
        const size = FONT_SIZES[value ? value.fontSize || "" : ""];
        if (size)
            root.style.setProperty("font-size", size);
        else
            root.style.removeProperty("font-size");
    }
    /** Adopt the durable section: apply the persisted theme and fonts. */
    function adopt() {
        const value = scope.getSnapshot().value;
        if (!value)
            return;
        if (value.theme && value.theme !== "system") {
            try {
                applyingFromPanel = true;
                ctx.theme.setTheme(value.theme);
            }
            catch {
                /* theme no longer registered — ignore */
            }
            finally {
                applyingFromPanel = false;
            }
        }
        applyFonts(value);
    }
    // Mirror a built-in preference changed outside this panel (the General row,
    // the boot script, the OS scheme) into our field so the section always
    // reflects the live state and a later reload re-adopts it.
    ctx.on("theme/change", (snapshot) => {
        if (applyingFromPanel)
            return;
        const pref = snapshot.preference;
        if (BUILTIN.indexOf(pref) !== -1 && currentTheme() !== pref)
            scope.set("theme", pref);
    });
    ctx.effect(() => scope.subscribe(adopt), "dsh-appearance: settings adoption");
    adopt();
    const t = ctx.locale.bind(NS);
    // The section reads everything else through the apply closure (scope,
    // ctx.theme, applyFonts); the face only needs the locale seat.
    const injected = () => ({ t });
    ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "appearance",
        order: 20,
        label: () => t("nav"),
        inject: injected
    }, AppearanceSection));
}


		return module.exports;
	}
});

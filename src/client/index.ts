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
import * as React from "react";

// ── minimal client-service types (mirror dsh-client-* surfaces) ────────────

/** Browser-side sync state of one settings namespace (SettingsScope contract). */
export interface SettingsScopeSnapshot<T> {
	status: "loading" | "ready" | "unavailable";
	value: T | undefined;
}

/** Reactive owner handle over one namespace's durable section. */
export interface SettingsScope<T> {
	getSnapshot(): SettingsScopeSnapshot<T>;
	subscribe(listener: () => void): () => void;
	set(field: string, value: unknown): Promise<void>;
	unset(field: string): Promise<void>;
}

/** One selectable theme: id, dark/light semantics, alias-token overrides. */
export interface ThemeDefinition {
	id: string;
	colorScheme: "light" | "dark";
	tokens: Record<string, string>;
}

/** Theme state published by the ThemeRuntime on every change. */
export interface ThemeSnapshot {
	preference: string;
	active: ThemeDefinition;
	themes: readonly ThemeDefinition[];
	revision: number;
}

/** One installed system font reported by the Local Font Access API. */
export interface FontMetadata {
	family: string;
	fullName?: string;
	postscriptName?: string;
}

/** One stored wallpaper file served by the host. */
export interface WallpaperEntry {
	filename: string;
	url: string;
	size: number;
	updatedAt: number;
}

/** The theme service provided by @deepseek-ai/dsh-client-ui-theme. */
export interface ThemeRuntime {
	register(definition: ThemeDefinition): () => void;
	setTheme(id: string): void;
	getTheme(): ThemeSnapshot;
	overrideTokens(source: string, tokens: Record<string, { light: string; dark: string }>): () => void;
}

/** Client locale service face (register dictionaries / bind a namespace). */
export interface LocaleService {
	register(namespace: string, dict: Record<string, Record<string, string>>): void;
	bind(namespace: string): (key: string, params?: Record<string, unknown>) => string;
}

/** Client slot registry face. */
export interface SlotsService {
	inject(slot: string, fn: () => unknown): unknown;
	register(options: Record<string, unknown>, component: unknown): unknown;
}

/** The client cordis context this plugin's apply receives. */
export interface ClientContext {
	effect(fn: () => (() => void) | void, label?: string): unknown;
	on(event: string, fn: (...args: unknown[]) => void): unknown;
	locale: LocaleService;
	settingsScope: {
		bind<T>(spec: { namespace: string }): SettingsScope<T>;
	};
	theme: ThemeRuntime;
	slots: SlotsService;
	provide(name: string, service: unknown): unknown;
}

// ── static styles: base font hooks + the Appearance section surface ─────────

const baseCss =
	":root{--dsh-appearance-font:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif;--dsh-appearance-code-font:'SF Mono','JetBrains Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace}";

const sectionCss = [
	".dshApp-shell{display:flex;flex-direction:column;gap:4px;padding:4px 0 20px}",
	".dshApp-section{border-bottom:1px solid var(--dsw-alias-border-l2);padding:18px 0;display:flex;flex-direction:column;gap:12px}",
	".dshApp-section:last-child{border-bottom:none;padding-bottom:4px}",
	".dshApp-sectionTitle{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}",
	".dshApp-hint{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
	".dshApp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}",
	".dshApp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:12px;cursor:pointer;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:9px;text-align:left;font:inherit;color:inherit;position:relative;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}",
	".dshApp-card:hover{border-color:var(--dsw-alias-border-l3)}",
	".dshApp-card[data-selected='true']{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-button-primary-dimmed,transparent);box-shadow:0 0 0 2px var(--dsw-alias-brand-primary),0 6px 18px -6px var(--dsw-alias-brand-primary)}",
	".dshApp-check{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-brand-primary-invert));font-size:12px;line-height:20px;text-align:center;font-weight:700}",
	".dshApp-accentRow{display:flex;flex-wrap:wrap;gap:10px;align-items:center}",
	".dshApp-accentSwatch{width:28px;height:28px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0;transition:transform .12s ease,box-shadow .12s ease}",
	".dshApp-accentSwatch:hover{transform:scale(1.12)}",
	".dshApp-accentSwatch[data-selected='true']{border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 2px var(--dsw-alias-label-primary)}",
	".dshApp-accentNone{border:1px dashed var(--dsw-alias-border-l3);border-radius:999px;padding:4px 12px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;cursor:pointer}",
	".dshApp-accentNone[data-selected='true']{border-style:solid;border-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary)}",
	".dshApp-accentCustomInput{width:34px;height:30px;padding:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;cursor:pointer}",
	// Neo-brutalist structural treatment, active ONLY while the brutalism
	// theme is the resolved active theme (body[data-ds-appearance]). The theme
	// token system carries colors only; this layer adds the spec's hard
	// shadows and press-down effect. Covers real <button>s, role="button"
	// elements (the sidebar's add-workspace control is one), and
	// inputs/textareas (the sidebar search field) — the overrides below never
	// touch layout, only box-shadow and border-radius.
	"body[data-ds-appearance='brutalism'] button,body[data-ds-appearance='brutalism'] [role='button']{box-shadow:3px 3px 0 0 #000;border-radius:2px}",
	"body[data-ds-appearance='brutalism'] button:active,body[data-ds-appearance='brutalism'] [role='button']:active{box-shadow:0 0 0 0 #000;transform:translate(2px,2px)}",
	"body[data-ds-appearance='brutalism'] input,body[data-ds-appearance='brutalism'] textarea{box-shadow:3px 3px 0 0 #000;border-radius:0}",
	"body[data-ds-appearance='brutalism'] .dshApp-card,body[data-ds-appearance='brutalism'] .dshApp-fontDialog,body[data-ds-appearance='brutalism'] .dshApp-save,body[data-ds-appearance='brutalism'] .dshApp-input,body[data-ds-appearance='brutalism'] .dshApp-segBtn,body[data-ds-appearance='brutalism'] .dshApp-pickBtn{box-shadow:4px 4px 0 0 #000;border-radius:0}",
	"#dsh-appearance-wallpaper{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;background-repeat:no-repeat;background-attachment:fixed;pointer-events:none}",
	".dshApp-wallpaperRow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}",
	".dshApp-wallpaperPreview{width:120px;height:72px;border-radius:10px;background-size:cover;background-position:center;border:1px solid var(--dsw-alias-border-l2)}",
	".dshApp-wallpaperEmpty{border:1px dashed var(--dsw-alias-border-l3)}",
	".dshApp-sliderRow{display:flex;align-items:center;gap:10px}",
	".dshApp-slider{flex:1;min-width:0;accent-color:var(--dsw-alias-brand-primary)}",
	".dshApp-slider:disabled{opacity:.45}",
	".dshApp-sliderVal{font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary);width:48px;text-align:right;flex:none}",
	".dshApp-wallGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px}",
	".dshApp-wallItem{position:relative}",
	".dshApp-wallThumb{width:100%;height:48px;border-radius:8px;background-size:cover;background-position:center;border:1px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0}",
	".dshApp-wallThumb:hover{border-color:var(--dsw-alias-border-l3)}",
	".dshApp-wallSelected .dshApp-wallThumb{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}",
	".dshApp-wallDelete{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1;cursor:pointer;padding:0}",
	".dshApp-wallDelete:hover{background:var(--dsw-alias-state-error-primary);color:#fff}",
	".dshApp-customEditor{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--dsw-alias-bg-layer-1)}",
	".dshApp-customRow2{display:flex;align-items:center;gap:10px}",
	".dshApp-quick{position:relative}",
	".dshApp-quickBtn{display:flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer}",
	".dshApp-quickBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
	".dshApp-quickDot{width:12px;height:12px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);flex:none}",
	".dshApp-quickMenu{position:absolute;bottom:calc(100% + 8px);left:0;z-index:1200;width:220px;max-height:340px;overflow-y:auto;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:6px;box-shadow:0 8px 28px rgba(0,0,0,0.25)}",
	".dshApp-quickChip{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;text-align:left;cursor:pointer}",
	".dshApp-quickChip:hover{background:var(--dsw-alias-interactive-bg-hover)}",
	".dshApp-quickChip[data-selected='true']{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-button-primary-dimmed,transparent)}",
	".dshApp-quickAccentRow{display:flex;flex-wrap:wrap;gap:6px;padding-top:4px;border-top:1px solid var(--dsw-alias-border-l2)}",
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
	".dshApp-pickBtn{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:0 14px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;transition:background .15s ease,color .15s ease,border-color .15s ease}",
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
function injectCss(tagId: string, css: string): void {
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

const THEMES: ThemeDefinition[] = [
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
			"--dsw-alias-bg-mask-1": "rgba(61,57,41,0.28)",
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
			"--dsw-alias-state-warn-primary": "#B07B2E",
			"--dsw-alias-bg-mask-2": "rgba(61,57,41,0.14)",
			"--dsw-alias-bg-mask-3": "rgba(61,57,41,0.5)",
			"--dsw-alias-bg-mask-drop": "rgba(250,249,245,0.7)",
			"--dsw-alias-bg-mask-photo": "rgba(0,0,0,0.88)",
			"--dsw-alias-bg-skeleton": "rgba(61,57,41,0.05)",
			"--dsw-alias-border-inverted": "rgba(0,0,0,0)",
			"--dsw-alias-border-inverted2": "rgba(0,0,0,0)",
			"--dsw-alias-border-l2-darkmode-thin": "rgba(61,57,41,0.14)",
			"--dsw-alias-border-l4": "rgba(61,57,41,0.3)",
			"--dsw-alias-brand-primary-new-colorprimary-new-color": "#D97757",
			"--dsw-alias-button-contrast-fill": "#3D3929",
			"--dsw-alias-button-elevated-fill": "#FFFFFF",
			"--dsw-alias-button-floating-fill": "#FFFFFF",
			"--dsw-alias-button-floating-hover": "#F5F4EE",
			"--dsw-alias-button-ghost-active-border": "#C9C4B6",
			"--dsw-alias-button-ghost-active-fill": "#EFEEE6",
			"--dsw-alias-button-ghost-active-hover": "#E9E7DE",
			"--dsw-alias-button-info-fill": "#D97757",
			"--dsw-alias-button-info-hover": "#C96442",
			"--dsw-alias-button-tool-bar-fill": "rgba(84,85,87,0.5)",
			"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31,31,31,0.36)",
			"--dsw-alias-button-tool-bar-hover": "rgba(84,85,87,0.6)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(181,69,53,0.08)",
			"--dsw-alias-interactive-bg-hover-solid": "#E9E7DE",
			"--dsw-alias-label-primary-bluish": "#3D3929",
			"--dsw-alias-label-primary-dimmed": "#2E2B1F",
			"--dsw-alias-label-primary-foreground": "#FAF9F5",
			"--dsw-alias-label-primary-inverted": "#FAF9F5",
			"--dsw-alias-markdown-citation": "#EFEEE6",
			"--dsw-alias-markdown-code-segment-selected": "#F5F4EE",
			"--dsw-alias-markdown-code-segment-unselected": "#EFEEE6",
			"--dsw-alias-markdown-placeholder": "#EFEEE6",
			"--dsw-alias-scrollbar-hover-l1": "#C9C4B6",
			"--dsw-alias-scrollbar-hover-l2": "#BDB7A6",
			"--dsw-alias-state-business-primary": "#D97757",
			"--dsw-alias-state-business-tertiary": "#F5E9E2",
			"--dsw-alias-state-error-secondary": "#D76A58",
			"--dsw-alias-state-success-secondary": "#5FA06F",
			"--dsw-alias-state-success-tertiary": "#E3EFE4",
			"--dsw-alias-state-warn-label": "#8A6420",
			"--dsw-alias-state-warn-secondary": "#C9974A",
			"--dsw-alias-state-warn-tertiary": "#F5EBD7"
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
			"--dsw-alias-state-warn-primary": "#9A6700",
			"--dsw-alias-bg-mask-1": "rgba(31,35,40,0.24)",
			"--dsw-alias-bg-mask-2": "rgba(31,35,40,0.12)",
			"--dsw-alias-bg-mask-3": "rgba(31,35,40,0.5)",
			"--dsw-alias-bg-mask-drop": "rgba(255,255,255,0.7)",
			"--dsw-alias-bg-mask-photo": "rgba(0,0,0,0.88)",
			"--dsw-alias-bg-skeleton": "rgba(31,35,40,0.05)",
			"--dsw-alias-border-inverted": "rgba(0,0,0,0)",
			"--dsw-alias-border-inverted2": "rgba(0,0,0,0)",
			"--dsw-alias-border-l2-darkmode-thin": "rgba(31,35,40,0.12)",
			"--dsw-alias-border-l4": "rgba(31,35,40,0.28)",
			"--dsw-alias-brand-primary-new-colorprimary-new-color": "#1F883D",
			"--dsw-alias-button-contrast-fill": "#1F2328",
			"--dsw-alias-button-elevated-fill": "#FFFFFF",
			"--dsw-alias-button-floating-fill": "#FFFFFF",
			"--dsw-alias-button-floating-hover": "#F6F8FA",
			"--dsw-alias-button-ghost-active-border": "#AFB8C1",
			"--dsw-alias-button-ghost-active-fill": "#EFF2F5",
			"--dsw-alias-button-ghost-active-hover": "#E9EDF1",
			"--dsw-alias-button-info-fill": "#1F883D",
			"--dsw-alias-button-info-hover": "#1A7F37",
			"--dsw-alias-button-tool-bar-fill": "rgba(84,85,87,0.5)",
			"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31,31,31,0.36)",
			"--dsw-alias-button-tool-bar-hover": "rgba(84,85,87,0.6)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(207,34,46,0.08)",
			"--dsw-alias-interactive-bg-hover-solid": "#E9EDF1",
			"--dsw-alias-label-primary-bluish": "#1F2328",
			"--dsw-alias-label-primary-dimmed": "#16191D",
			"--dsw-alias-label-primary-foreground": "#FFFFFF",
			"--dsw-alias-label-primary-inverted": "#FFFFFF",
			"--dsw-alias-markdown-citation": "#EFF2F5",
			"--dsw-alias-markdown-code-segment-selected": "#FFFFFF",
			"--dsw-alias-markdown-code-segment-unselected": "#F6F8FA",
			"--dsw-alias-markdown-placeholder": "#F6F8FA",
			"--dsw-alias-scrollbar-hover-l1": "#C2CBD3",
			"--dsw-alias-scrollbar-hover-l2": "#AFB8C1",
			"--dsw-alias-state-business-primary": "#1F883D",
			"--dsw-alias-state-business-tertiary": "#DCFBE4",
			"--dsw-alias-state-error-secondary": "#FF8182",
			"--dsw-alias-state-success-secondary": "#2DA44E",
			"--dsw-alias-state-success-tertiary": "#DCFBE4",
			"--dsw-alias-state-warn-label": "#633C01",
			"--dsw-alias-state-warn-secondary": "#BF8700",
			"--dsw-alias-state-warn-tertiary": "#FFF1E5"
		}
	},
	{
		id: "brutalism",
		colorScheme: "light",
		tokens: {
			// Neo-brutalism, per the design spec: off-white base, white cards,
			// pure-black ink, pure-black borders, black primary actions and one
			// loud accent (default coral #FF3366 — the spec's example accent;
			// switch it with the accent picker). Thick borders / hard shadows /
			// radius 0 / uppercase text are structural CSS the color-token
			// system cannot carry — see README.
			"--dsw-alias-bg-base": "#F4F4F0",
			"--dsw-alias-bg-layer-1": "#FFFFFF",
			"--dsw-alias-bg-layer-2": "#FFFFFF",
			"--dsw-alias-bg-layer-3": "#FBFBF9",
			"--dsw-alias-bg-overlay": "#FFFFFF",
			"--dsw-alias-bg-module-platform": "#FFFFFF",
			"--dsw-alias-bg-multi-select": "#FBFBF9",
			"--dsw-alias-label-primary": "#000000",
			"--dsw-alias-label-secondary": "#1C293C",
			"--dsw-alias-label-tertiary": "#4B5563",
			"--dsw-alias-label-caption": "#1C293C",
			"--dsw-alias-label-dimmed": "#6B7280",
			"--dsw-alias-brand-primary": "#000000",
			"--dsw-alias-brand-primary-invert": "#FFFFFF",
			"--dsw-alias-brand-text": "#000000",
			"--dsw-alias-button-primary-fill": "#000000",
			"--dsw-alias-button-primary-hover": "#1C293C",
			"--dsw-alias-button-primary-dimmed": "rgba(0,0,0,0.1)",
			"--dsw-alias-border-l1": "#000000",
			"--dsw-alias-border-l2": "#000000",
			"--dsw-alias-border-l3": "#000000",
			"--dsw-alias-border-l4": "#000000",
			"--dsw-alias-border-l2-darkmode-thin": "#000000",
			"--dsw-alias-border-inverted": "rgba(0,0,0,0)",
			"--dsw-alias-border-inverted2": "rgba(0,0,0,0)",
			"--dsw-alias-interactive-bg-hover": "rgba(0,0,0,0.05)",
			"--dsw-alias-interactive-bg-active": "rgba(0,0,0,0.12)",
			"--dsw-alias-interactive-bg-hover-accent": "rgba(255,51,102,0.15)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(220,38,38,0.08)",
			"--dsw-alias-interactive-bg-hover-solid": "#E5E7EB",
			"--dsw-alias-markdown-code-block": "#FFFFFF",
			"--dsw-alias-markdown-code-block-banner": "#F4F4F0",
			"--dsw-alias-markdown-inline-code": "#F4F4F0",
			"--dsw-alias-markdown-citation": "#F4F4F0",
			"--dsw-alias-markdown-code-segment-selected": "#FFFFFF",
			"--dsw-alias-markdown-code-segment-unselected": "#F4F4F0",
			"--dsw-alias-markdown-placeholder": "#F4F4F0",
			"--dsw-alias-markdown-tag": "rgba(255,51,102,0.14)",
			"--dsw-alias-scrollbar-bg-l1": "#D1D5DB",
			"--dsw-alias-scrollbar-bg-l2": "#9CA3AF",
			"--dsw-alias-scrollbar-hover-l1": "#C3C9D2",
			"--dsw-alias-scrollbar-hover-l2": "#9CA3AF",
			"--dsw-alias-tooltip-bg": "#000000",
			"--dsw-alias-toast-bg": "#000000",
			"--dsw-alias-state-success-primary": "#16A34A",
			"--dsw-alias-state-success-secondary": "#22C55E",
			"--dsw-alias-state-success-tertiary": "#DCFCE7",
			"--dsw-alias-state-error-primary": "#DC2626",
			"--dsw-alias-state-error-secondary": "#EF4444",
			"--dsw-alias-state-warn-primary": "#D97706",
			"--dsw-alias-state-warn-secondary": "#F59E0B",
			"--dsw-alias-state-warn-tertiary": "#FEF3C7",
			"--dsw-alias-state-warn-label": "#92400E",
			"--dsw-alias-state-business-primary": "#FF3366",
			"--dsw-alias-state-business-tertiary": "#FFE4EA",
			"--dsw-alias-bg-mask-1": "rgba(0,0,0,0.3)",
			"--dsw-alias-bg-mask-2": "rgba(0,0,0,0.15)",
			"--dsw-alias-bg-mask-3": "rgba(0,0,0,0.55)",
			"--dsw-alias-bg-mask-drop": "rgba(255,255,255,0.7)",
			"--dsw-alias-bg-mask-photo": "rgba(0,0,0,0.88)",
			"--dsw-alias-bg-skeleton": "rgba(0,0,0,0.05)",
			"--dsw-alias-brand-primary-new-colorprimary-new-color": "#FF3366",
			"--dsw-alias-button-contrast-fill": "#000000",
			"--dsw-alias-button-elevated-fill": "#FFFFFF",
			"--dsw-alias-button-floating-fill": "#FFFFFF",
			"--dsw-alias-button-floating-hover": "#F4F4F0",
			"--dsw-alias-button-ghost-active-border": "#000000",
			"--dsw-alias-button-ghost-active-fill": "#F4F4F0",
			"--dsw-alias-button-ghost-active-hover": "#E5E7EB",
			"--dsw-alias-button-info-fill": "#FF3366",
			"--dsw-alias-button-info-hover": "#E62E5C",
			"--dsw-alias-button-tool-bar-fill": "rgba(84,85,87,0.5)",
			"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31,31,31,0.36)",
			"--dsw-alias-button-tool-bar-hover": "rgba(84,85,87,0.6)",
			"--dsw-alias-label-primary-bluish": "#000000",
			"--dsw-alias-label-primary-dimmed": "#000000",
			"--dsw-alias-label-primary-foreground": "#FFFFFF",
			"--dsw-alias-label-primary-inverted": "#FFFFFF"
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
			"--dsw-alias-bg-mask-1": "rgba(0,0,0,0.5)",
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
			"--dsw-alias-state-warn-primary": "#FFB300",
			"--dsw-alias-bg-mask-2": "rgba(0,0,0,0.2)",
			"--dsw-alias-bg-mask-3": "rgba(0,0,0,0.48)",
			"--dsw-alias-bg-mask-drop": "rgba(18,26,16,0.7)",
			"--dsw-alias-bg-mask-photo": "rgba(0,0,0,0.88)",
			"--dsw-alias-bg-skeleton": "rgba(255,255,255,0.08)",
			"--dsw-alias-border-inverted": "rgba(255,255,255,0.06)",
			"--dsw-alias-border-inverted2": "rgba(255,255,255,0.08)",
			"--dsw-alias-border-l2-darkmode-thin": "rgba(0,230,118,0.3)",
			"--dsw-alias-border-l4": "rgba(0,230,118,0.6)",
			"--dsw-alias-brand-primary-new-colorprimary-new-color": "#00E676",
			"--dsw-alias-button-contrast-fill": "#E6FFEC",
			"--dsw-alias-button-elevated-fill": "#1C2718",
			"--dsw-alias-button-floating-fill": "#161E14",
			"--dsw-alias-button-floating-hover": "#1C2718",
			"--dsw-alias-button-ghost-active-border": "#55996B",
			"--dsw-alias-button-ghost-active-fill": "#1C2718",
			"--dsw-alias-button-ghost-active-hover": "#22301F",
			"--dsw-alias-button-info-fill": "#00E676",
			"--dsw-alias-button-info-hover": "#00C853",
			"--dsw-alias-button-tool-bar-fill": "rgba(84,85,87,0.5)",
			"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31,31,31,0.36)",
			"--dsw-alias-button-tool-bar-hover": "rgba(84,85,87,0.6)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(255,82,82,0.15)",
			"--dsw-alias-interactive-bg-hover-solid": "#1C2718",
			"--dsw-alias-label-primary-bluish": "#B8FFC9",
			"--dsw-alias-label-primary-dimmed": "#D7FFE0",
			"--dsw-alias-label-primary-foreground": "#0A0E0A",
			"--dsw-alias-label-primary-inverted": "#1C2718",
			"--dsw-alias-markdown-citation": "#141D11",
			"--dsw-alias-markdown-code-segment-selected": "#10160F",
			"--dsw-alias-markdown-code-segment-unselected": "#0E150D",
			"--dsw-alias-markdown-placeholder": "#141D11",
			"--dsw-alias-scrollbar-hover-l1": "#2C4228",
			"--dsw-alias-scrollbar-hover-l2": "#3A5835",
			"--dsw-alias-state-business-primary": "#00E676",
			"--dsw-alias-state-business-tertiary": "#0E2E1A",
			"--dsw-alias-state-error-secondary": "#FF7A7A",
			"--dsw-alias-state-success-secondary": "#4CFF96",
			"--dsw-alias-state-success-tertiary": "#0E2E1A",
			"--dsw-alias-state-warn-label": "#FFCA4D",
			"--dsw-alias-state-warn-secondary": "#FFC400",
			"--dsw-alias-state-warn-tertiary": "#3A2E00"
		}
	}
];

/** Built-in theme ids accepted by the theme service. */
const BUILTIN = ["light", "dark", "system"] as const;

// ── compact theme palettes → full token maps ─────────────────────────────────
// New presets and the user's custom theme are authored as a compact palette;
// buildThemeTokens() expands it into the full alias-token set.

/** Compact palette a theme is derived from. */
export interface ThemePalette {
	bg: string;
	surface: string;
	surface2: string;
	surface3: string;
	overlay: string;
	module: string;
	ink: string;
	ink2: string;
	ink3: string;
	accent: string;
	accentHover: string;
	onAccent: string;
	border: string;
	borderSoft: string;
	codeBg: string;
	inlineCode: string;
	success: string;
	warn: string;
	danger: string;
}

/** Build the full alias-token map from a compact palette. */
function buildThemeTokens(palette: ThemePalette, scheme: "light" | "dark"): Record<string, string> {
	const dark = scheme === "dark";
	const ink = (a: number): string => hexToRgba(palette.ink, a);
	const accent = (a: number): string => hexToRgba(palette.accent, a);
	const stateSecondary = (color: string): string => shade(color, dark ? 0.2 : -0.12);
	return {
		"--dsw-alias-bg-base": palette.bg,
		"--dsw-alias-bg-layer-1": palette.surface,
		"--dsw-alias-bg-layer-2": palette.surface2,
		"--dsw-alias-bg-layer-3": palette.surface3,
		"--dsw-alias-bg-overlay": palette.overlay,
		"--dsw-alias-bg-module-platform": palette.module,
		"--dsw-alias-bg-multi-select": palette.surface3,
		"--dsw-alias-bg-mask-1": dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.28)",
		"--dsw-alias-bg-mask-2": dark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.14)",
		"--dsw-alias-bg-mask-3": "rgba(0,0,0,0.5)",
		"--dsw-alias-bg-mask-drop": dark ? "rgba(30,30,40,0.7)" : "rgba(255,255,255,0.7)",
		"--dsw-alias-bg-mask-photo": "rgba(0,0,0,0.88)",
		"--dsw-alias-bg-skeleton": dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
		"--dsw-alias-label-primary": palette.ink,
		"--dsw-alias-label-secondary": palette.ink2,
		"--dsw-alias-label-tertiary": palette.ink3,
		"--dsw-alias-label-caption": palette.ink2,
		"--dsw-alias-label-dimmed": shade(palette.ink2, dark ? -0.25 : 0.4),
		"--dsw-alias-label-primary-bluish": palette.ink,
		"--dsw-alias-label-primary-dimmed": shade(palette.ink, -0.25),
		"--dsw-alias-label-primary-foreground": palette.onAccent,
		"--dsw-alias-label-primary-inverted": palette.onAccent,
		"--dsw-alias-brand-primary": palette.accent,
		"--dsw-alias-brand-primary-invert": palette.onAccent,
		"--dsw-alias-brand-text": palette.ink,
		"--dsw-alias-brand-primary-new-colorprimary-new-color": palette.accent,
		"--dsw-alias-button-contrast-fill": palette.ink,
		"--dsw-alias-button-elevated-fill": palette.surface,
		"--dsw-alias-button-floating-fill": palette.surface,
		"--dsw-alias-button-floating-hover": palette.surface2,
		"--dsw-alias-button-ghost-active-border": palette.border,
		"--dsw-alias-button-ghost-active-fill": palette.surface2,
		"--dsw-alias-button-ghost-active-hover": palette.surface3,
		"--dsw-alias-button-info-fill": palette.accent,
		"--dsw-alias-button-info-hover": palette.accentHover,
		"--dsw-alias-button-primary-fill": palette.accent,
		"--dsw-alias-button-primary-hover": palette.accentHover,
		"--dsw-alias-button-primary-dimmed": accent(0.16),
		"--dsw-alias-button-tool-bar-fill": "rgba(84,85,87,0.5)",
		"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31,31,31,0.36)",
		"--dsw-alias-button-tool-bar-hover": "rgba(84,85,87,0.6)",
		"--dsw-alias-border-l1": palette.borderSoft,
		"--dsw-alias-border-l2": palette.border,
		"--dsw-alias-border-l3": palette.border,
		"--dsw-alias-border-l4": palette.border,
		"--dsw-alias-border-l2-darkmode-thin": palette.border,
		"--dsw-alias-border-inverted": "rgba(0,0,0,0)",
		"--dsw-alias-border-inverted2": "rgba(0,0,0,0)",
		"--dsw-alias-interactive-bg-hover": ink(0.07),
		"--dsw-alias-interactive-bg-active": ink(0.14),
		"--dsw-alias-interactive-bg-hover-accent": accent(0.16),
		"--dsw-alias-interactive-bg-hover-danger": hexToRgba(palette.danger, 0.08),
		"--dsw-alias-interactive-bg-hover-solid": palette.surface3,
		"--dsw-alias-markdown-code-block": palette.codeBg,
		"--dsw-alias-markdown-code-block-banner": palette.surface3,
		"--dsw-alias-markdown-inline-code": palette.inlineCode,
		"--dsw-alias-markdown-citation": palette.surface3,
		"--dsw-alias-markdown-code-segment-selected": palette.surface,
		"--dsw-alias-markdown-code-segment-unselected": palette.codeBg,
		"--dsw-alias-markdown-placeholder": palette.codeBg,
		"--dsw-alias-markdown-tag": accent(0.16),
		"--dsw-alias-scrollbar-bg-l1": palette.borderSoft,
		"--dsw-alias-scrollbar-bg-l2": palette.border,
		"--dsw-alias-scrollbar-hover-l1": palette.border,
		"--dsw-alias-scrollbar-hover-l2": shade(palette.border, dark ? 0.15 : -0.15),
		"--dsw-alias-tooltip-bg": palette.ink,
		"--dsw-alias-toast-bg": palette.ink,
		"--dsw-alias-state-success-primary": palette.success,
		"--dsw-alias-state-success-secondary": stateSecondary(palette.success),
		"--dsw-alias-state-success-tertiary": hexToRgba(palette.success, 0.15),
		"--dsw-alias-state-error-primary": palette.danger,
		"--dsw-alias-state-error-secondary": stateSecondary(palette.danger),
		"--dsw-alias-state-warn-primary": palette.warn,
		"--dsw-alias-state-warn-secondary": stateSecondary(palette.warn),
		"--dsw-alias-state-warn-tertiary": hexToRgba(palette.warn, 0.15),
		"--dsw-alias-state-warn-label": shade(palette.warn, -0.3),
		"--dsw-alias-state-business-primary": palette.accent,
		"--dsw-alias-state-business-tertiary": accent(0.15)
	};
}

/** A theme preset authored as a compact palette. */
interface PaletteThemePreset {
	id: string;
	colorScheme: "light" | "dark";
	palette: ThemePalette;
}

/** Additional built-in theme presets (beyond the hand-tuned four above). */
const PALETTE_THEMES: PaletteThemePreset[] = [
	{
		id: "dracula",
		colorScheme: "dark",
		palette: {
			bg: "#282A36", surface: "#2F3242", surface2: "#343746", surface3: "#3B3E52",
			overlay: "#2A2C39", module: "#2F3242",
			ink: "#F8F8F2", ink2: "#BFC3D6", ink3: "#6272A4",
			accent: "#BD93F9", accentHover: "#A97FF5", onAccent: "#282A36",
			border: "rgba(248,248,242,0.16)", borderSoft: "rgba(248,248,242,0.08)",
			codeBg: "#21222C", inlineCode: "#343746",
			success: "#50FA7B", warn: "#F1FA8C", danger: "#FF5555"
		}
	},
	{
		id: "tokyo-night",
		colorScheme: "dark",
		palette: {
			bg: "#1A1B26", surface: "#1F2335", surface2: "#24283B", surface3: "#2A2F45",
			overlay: "#16161E", module: "#1F2335",
			ink: "#C0CAF5", ink2: "#7982A9", ink3: "#565F89",
			accent: "#7AA2F7", accentHover: "#5F8FF2", onAccent: "#1A1B26",
			border: "rgba(192,202,245,0.16)", borderSoft: "rgba(192,202,245,0.08)",
			codeBg: "#16161E", inlineCode: "#24283B",
			success: "#9ECE6A", warn: "#E0AF68", danger: "#F7768E"
		}
	},
	{
		id: "gruvbox",
		colorScheme: "dark",
		palette: {
			bg: "#282828", surface: "#32302F", surface2: "#3C3836", surface3: "#45403D",
			overlay: "#1D2021", module: "#32302F",
			ink: "#EBDBB2", ink2: "#A89984", ink3: "#928374",
			accent: "#D79921", accentHover: "#B57614", onAccent: "#282828",
			border: "rgba(235,219,178,0.18)", borderSoft: "rgba(235,219,178,0.08)",
			codeBg: "#1D2021", inlineCode: "#3C3836",
			success: "#B8BB26", warn: "#D79921", danger: "#FB4934"
		}
	},
	{
		id: "solarized",
		colorScheme: "light",
		palette: {
			bg: "#FDF6E3", surface: "#EEE8D5", surface2: "#E8E3CE", surface3: "#E1DCC5",
			overlay: "#F6F0DC", module: "#EEE8D5",
			ink: "#657B83", ink2: "#586E75", ink3: "#93A1A1",
			accent: "#268BD2", accentHover: "#1D7BBF", onAccent: "#FDF6E3",
			border: "rgba(101,123,131,0.28)", borderSoft: "rgba(101,123,131,0.12)",
			codeBg: "#EEE8D5", inlineCode: "#E8E3CE",
			success: "#859900", warn: "#B58900", danger: "#DC322F"
		}
	},
	{
		id: "material",
		colorScheme: "dark",
		palette: {
			bg: "#1E1E1E", surface: "#252526", surface2: "#2D2D30", surface3: "#333337",
			overlay: "#1E1E1E", module: "#252526",
			ink: "#D4D4D4", ink2: "#9D9D9D", ink3: "#6E6E6E",
			accent: "#4EC9B0", accentHover: "#3DB89E", onAccent: "#1E1E1E",
			border: "rgba(212,212,212,0.16)", borderSoft: "rgba(212,212,212,0.08)",
			codeBg: "#1E1E1E", inlineCode: "#2D2D30",
			success: "#89D185", warn: "#CCA700", danger: "#F14C4C"
		}
	}
];

/** Starter palette shown when creating a new custom theme. */
const DEFAULT_CUSTOM_PALETTE: ThemePalette = {
	bg: "#FAFAFA", surface: "#FFFFFF", surface2: "#F3F4F6", surface3: "#EBEDF0",
	overlay: "#FFFFFF", module: "#FFFFFF",
	ink: "#1F2328", ink2: "#57606A", ink3: "#8C959F",
	accent: "#4C9AFF", accentHover: "#3B86E0", onAccent: "#FFFFFF",
	border: "rgba(31,35,40,0.16)", borderSoft: "rgba(31,35,40,0.07)",
	codeBg: "#F6F8FA", inlineCode: "#EFF1F3",
	success: "#1F883D", warn: "#9A6700", danger: "#CF222E"
};

// ── accent color system ─────────────────────────────────────────────────────
// The accent is a user-selectable loud color stacked OVER the active theme via
// ctx.theme.overrideTokens (the token-level analogue of slot shading). Each
// preset carries a light and a dark variant so the layer works in both
// color schemes.

/** One selectable accent: vivid hue plus its dark-mode twin. */
export interface AccentPreset {
	id: string;
	light: string;
	dark: string;
}

const ACCENT_PRESETS: AccentPreset[] = [
	{ id: "yellow", light: "#FDC800", dark: "#FACC15" },
	{ id: "coral", light: "#FF3366", dark: "#FF5A7A" },
	{ id: "pink", light: "#FF6B8B", dark: "#FF8FA6" },
	{ id: "blue", light: "#432DD7", dark: "#5A45E0" },
	{ id: "orange", light: "#FF4D00", dark: "#FF6B1A" },
	{ id: "green", light: "#00A85A", dark: "#34D399" },
	{ id: "purple", light: "#7C3AED", dark: "#A78BFA" },
	{ id: "cyan", light: "#0891B2", dark: "#22D3EE" }
];

/** Parse #rgb / #rrggbb into [r,g,b]. Returns null on malformed input. */
function parseHex(hex: string | undefined): [number, number, number] | null {
	if (typeof hex !== "string") return null;
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) return null;
	let h = m[1];
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Normalize a CSS color to "r,g,b" (hex or rgb()/rgba()); null when unusable. */
function cssColorToRgb(color: string | undefined): string | null {
	const hex = parseHex(color);
	if (hex) return hex.join(",");
	if (typeof color === "string") {
		const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color.trim());
		if (m) return `${m[1]},${m[2]},${m[3]}`;
	}
	return null;
}

/** rgba() string from a hex color. */
function hexToRgba(hex: string, alpha: number): string {
	const rgb = parseHex(hex);
	if (!rgb) return hex;
	return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex color; amount in -1..1. */
function shade(hex: string, amount: number): string {
	const rgb = parseHex(hex);
	if (!rgb) return hex;
	const mix = (channel: number): number => amount >= 0
		? Math.round(channel + (255 - channel) * amount)
		: Math.round(channel * (1 + amount));
	return `rgb(${mix(rgb[0])},${mix(rgb[1])},${mix(rgb[2])})`;
}

/** sRGB relative luminance (WCAG 2.x), 0..1. */
function relativeLuminance(hex: string): number {
	const rgb = parseHex(hex);
	if (!rgb) return 0;
	const lin = (c: number): number => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/**
 * Readable text color on top of the given accent. Chooses black above the
 * WCAG AA crossover (~0.18 relative luminance) and white below, so bright
 * neo-brutalist accents (yellow, coral, orange) get black text per the spec.
 */
function onAccent(hex: string): string {
	return relativeLuminance(hex) >= 0.18 ? "#111111" : "#FFFFFF";
}

/** The token layer an accent stacks over the active theme. */
function accentOverride(light: string, dark: string): Record<string, { light: string; dark: string }> {
	return {
		"--dsw-alias-brand-primary": { light, dark },
		"--dsw-alias-brand-primary-invert": { light: onAccent(light), dark: onAccent(dark) },
		"--dsw-alias-brand-primary-new-colorprimary-new-color": { light, dark },
		"--dsw-alias-button-primary-fill": { light, dark },
		"--dsw-alias-button-primary-hover": { light: shade(light, -0.12), dark: shade(dark, -0.12) },
		"--dsw-alias-button-primary-dimmed": { light: hexToRgba(light, 0.16), dark: hexToRgba(dark, 0.18) },
		"--dsw-alias-button-info-fill": { light, dark },
		"--dsw-alias-button-info-hover": { light: shade(light, -0.12), dark: shade(dark, -0.12) },
		"--dsw-alias-state-business-primary": { light, dark },
		"--dsw-alias-state-business-tertiary": { light: hexToRgba(light, 0.14), dark: hexToRgba(dark, 0.16) },
		"--dsw-alias-label-primary-bluish": { light, dark: shade(dark, 0.18) },
		"--dsw-alias-label-primary-foreground": { light: onAccent(light), dark: onAccent(dark) },
		"--dsw-alias-interactive-bg-hover": { light: hexToRgba(light, 0.08), dark: hexToRgba(dark, 0.1) },
		"--dsw-alias-interactive-bg-active": { light: hexToRgba(light, 0.16), dark: hexToRgba(dark, 0.2) },
		"--dsw-alias-interactive-bg-hover-accent": { light: hexToRgba(light, 0.16), dark: hexToRgba(dark, 0.2) },
		"--dsw-alias-markdown-tag": { light: hexToRgba(light, 0.14), dark: hexToRgba(dark, 0.18) }
	};
}

/** Resolve an accent choice (preset id / "custom" / "none") to light+dark hex. */
function resolveAccent(accent: string | undefined, custom: string | undefined): { light: string; dark: string } | null {
	if (accent === "custom" && custom) {
		const light = custom.trim();
		return parseHex(light) ? { light, dark: shade(light, 0.18) } : null;
	}
	const preset = ACCENT_PRESETS.find((p) => p.id === accent);
	return preset ? { light: preset.light, dark: preset.dark } : null;
}

/** Parse a stored custom-theme palette JSON. Returns null when absent/invalid. */
function parseCustomPalette(json: string | undefined): ThemePalette | null {
	if (!json) return null;
	try {
		const obj = JSON.parse(json) as ThemePalette;
		if (obj && typeof obj.bg === "string" && typeof obj.ink === "string" && typeof obj.accent === "string") return obj;
	} catch {
		/* invalid JSON — ignore */
	}
	return null;
}

/** Infer a custom theme's color scheme from its background luminance. */
function customColorScheme(palette: ThemePalette): "light" | "dark" {
	return relativeLuminance(palette.bg) < 0.35 ? "dark" : "light";
}
/** Settings namespace owned by this plugin (registered by the Host half). */
const SETTINGS_NAMESPACE = "ui-appearance";
/** Locale namespace for the section copy. */
const NS = "settings.appearance";

// ── wallpaper storage ────────────────────────────────────────────────────────
// Uploaded image BYTES live in localStorage, never in the settings document:
// a base64 data URI can be megabytes, and the settings doc is small-scalar
// preferences that cross the wire on every read/write. `backgroundImage` in
// settings holds either a plain URL (small, keep in settings) or the marker
// "local" (bytes live under WALLPAPER_LOCAL_KEY in localStorage).
const WALLPAPER_LOCAL_KEY = "dsh-appearance.wallpaper";

/** Resolve the actual image source from a persisted `backgroundImage` value. */
function resolveWallpaperImage(backgroundImage: string | undefined): string {
	if (!backgroundImage) return "";
	if (backgroundImage === "local") {
		try {
			return localStorage.getItem(WALLPAPER_LOCAL_KEY) ?? "";
		} catch {
			return "";
		}
	}
	return backgroundImage;
}

// ── font presets ────────────────────────────────────────────────────────────

const FONT_FAMILIES: Record<string, string> = {
	system: "",
	sans: "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif",
	serif: "Georgia,'Times New Roman','Songti SC','SimSun',serif",
	mono: "'SF Mono','JetBrains Mono',Consolas,'Courier New',monospace"
};
const CODE_FONTS: Record<string, string> = {
	default: "",
	jetbrains: "'JetBrains Mono','SF Mono',Consolas,'Liberation Mono',Menlo,monospace",
	fira: "'Fira Code','JetBrains Mono','SF Mono',Consolas,monospace",
	consolas: "Consolas,'SF Mono','Liberation Mono',Menlo,monospace"
};
/** UI scale (CSS `zoom`) applied for each font-size choice; "" = no override. */
const UI_SCALES: Record<string, string> = { small: "0.9", normal: "", large: "1.1" };

// ── copy dictionaries ───────────────────────────────────────────────────────

const ZH: Record<string, string> = {
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
	themeDracula: "Dracula",
	themeTokyoNight: "Tokyo Night",
	themeGruvbox: "Gruvbox",
	themeSolarized: "Solarized",
	themeMaterial: "Material",
	themeCustom: "自定义",
	customEdit: "编辑自定义主题",
	customUse: "使用此配色",
	customNameLabel: "主题名称",
	customColorBg: "背景",
	customColorSurface: "卡片",
	customColorInk: "文字",
	customColorAccent: "强调色",
	customColorBorder: "边框",
	exportButton: "导出",
	importButton: "导入",
	importHint: "导入外观配置 JSON",
	exportHint: "导出当前外观配置为 JSON",
	quickTitle: "外观",
	quickAccent: "强调色",
	uiFont: "界面字体",
	uiFontHint: "全局界面文字字体",
	codeFont: "代码字体",
	codeFontHint: "代码块与内联代码字体",
	fontSize: "字号",
	fontSizeHint: "调整全局文字大小（界面缩放）",
	accentTitle: "强调色",
	accentHint: "叠加在当前主题上的强调颜色（默认使用主题自带）",
	accentNone: "主题默认",
	accentCustom: "自定义",
	bgImageTitle: "背景图片",
	bgImageHint: "设置后界面表面会变为半透明以显示背景",
	bgImageUpload: "上传图片",
	bgImageClear: "清除",
	bgImageUrlPlaceholder: "或粘贴图片 URL…",
	bgImageGallery: "历史壁纸",
	bgImageGalleryError: "无法加载",
	bgImageDelete: "删除这张壁纸",
	bgOpacityLabel: "透明度",
	bgBlurLabel: "模糊度",
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
const EN: Record<string, string> = {
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
	themeDracula: "Dracula",
	themeTokyoNight: "Tokyo Night",
	themeGruvbox: "Gruvbox",
	themeSolarized: "Solarized",
	themeMaterial: "Material",
	themeCustom: "Custom",
	customEdit: "Edit custom theme",
	customUse: "Use this palette",
	customNameLabel: "Theme name",
	customColorBg: "Background",
	customColorSurface: "Surface",
	customColorInk: "Text",
	customColorAccent: "Accent",
	customColorBorder: "Border",
	exportButton: "Export",
	importButton: "Import",
	importHint: "Import appearance config JSON",
	exportHint: "Export the current appearance config as JSON",
	quickTitle: "Appearance",
	quickAccent: "Accent",
	uiFont: "UI font",
	uiFontHint: "Font for the whole interface",
	codeFont: "Code font",
	codeFontHint: "Font for code blocks and inline code",
	fontSize: "Font size",
	fontSizeHint: "Adjust the global text size (UI scale)",
	accentTitle: "Accent color",
	accentHint: "Accent stacked over the current theme (default uses the theme's own)",
	accentNone: "Theme default",
	accentCustom: "Custom",
	bgImageTitle: "Background image",
	bgImageHint: "Surfaces become translucent to show the background",
	bgImageUpload: "Upload image",
	bgImageClear: "Clear",
	bgImageUrlPlaceholder: "or paste an image URL…",
	bgImageGallery: "Wallpapers",
	bgImageGalleryError: "unavailable",
	bgImageDelete: "Delete this wallpaper",
	bgOpacityLabel: "Opacity",
	bgBlurLabel: "Blur",
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

const CARD_SWATCHES: Record<string, string[]> = {
	light: ["#FFFFFF", "#F0F1F3", "#1F1F1F"],
	dark: ["#1F1F1F", "#2B2B2B", "#EDEDED"],
	system: ["#FFFFFF", "#888888", "#1F1F1F"]
};

function swatchesOf(theme: ThemeDefinition): string[] {
	return [theme.tokens["--dsw-alias-bg-base"], theme.tokens["--dsw-alias-bg-layer-2"], theme.tokens["--dsw-alias-brand-primary"]];
}

/** Normalize a persisted section into the draft shape with schema defaults. */
function fromValue(value: AppearanceSettings | undefined): AppearanceSettings {
	return {
		theme: (value && value.theme) || "system",
		fontFamily: (value && value.fontFamily) || "system",
		fontFamilyCustom: (value && value.fontFamilyCustom) || "",
		codeFont: (value && value.codeFont) || "default",
		codeFontCustom: (value && value.codeFontCustom) || "",
		fontSize: (value && value.fontSize) || "normal",
		accent: (value && value.accent) || "none",
		accentCustom: (value && value.accentCustom) || "",
		backgroundImage: (value && value.backgroundImage) || "",
		bgOpacity: (value && typeof value.bgOpacity === "number" ? value.bgOpacity : 100),
		bgBlur: (value && typeof value.bgBlur === "number" ? value.bgBlur : 0),
		customTheme: (value && value.customTheme) || "",
		customThemeName: (value && value.customThemeName) || ""
	};
}

/** Whether the draft differs from the persisted section (schema-default aware). */
function isDirty(value: AppearanceSettings | undefined, draft: AppearanceSettings): boolean {
	const base = fromValue(value);
	return draft.theme !== base.theme
		|| draft.fontFamily !== base.fontFamily
		|| (draft.fontFamilyCustom || "") !== base.fontFamilyCustom
		|| draft.codeFont !== base.codeFont
		|| (draft.codeFontCustom || "") !== base.codeFontCustom
		|| draft.fontSize !== base.fontSize
		|| (draft.accent || "none") !== base.accent
		|| (draft.accentCustom || "") !== base.accentCustom
		|| (draft.backgroundImage || "") !== base.backgroundImage
		|| draft.bgOpacity !== base.bgOpacity
		|| draft.bgBlur !== base.bgBlur
		|| (draft.customTheme || "") !== base.customTheme
		|| (draft.customThemeName || "") !== base.customThemeName;
}

// ── plugin body ─────────────────────────────────────────────────────────────

/** Client-side services this plugin waits for before activation. */
export const inject: string[] = ["slots", "locale", "connection", "remote", "settingsScope", "theme"];

/** The durable appearance section value. */
export interface AppearanceSettings {
	theme?: string;
	fontFamily?: string;
	fontFamilyCustom?: string;
	codeFont?: string;
	codeFontCustom?: string;
	fontSize?: string;
	accent?: string;
	accentCustom?: string;
	backgroundImage?: string;
	bgOpacity?: number;
	bgBlur?: number;
	customTheme?: string;
	customThemeName?: string;
}

/**
 * Client plugin body: register theme presets, bind the durable settings
 * scope, restore the persisted selection, and register the Appearance
 * settings section.
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
	ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), "dsh-appearance: copy dictionaries");

	const scope = ctx.settingsScope.bind<AppearanceSettings>({ namespace: SETTINGS_NAMESPACE });

	/**
	 * The Appearance settings section. Defined inside apply so it closes over
	 * the bound settings scope; the framework supplies the locale `t` seat and
	 * the injected business face through props.
	 */
	function AppearanceSection(props: AppearanceSectionProps): React.ReactNode {
		const { t } = props;
		// NOTE: subscribe/getSnapshot must be wrapped so the controller methods
		// are invoked with their own `this` — React calls the subscribe function
		// as a plain function.
		const value = React.useSyncExternalStore(
			(cb: () => void) => scope.subscribe(cb),
			() => scope.getSnapshot().value
		);

		// ── draft state ─────────────────────────────────────────────────────────
		// User edits accumulate in `draft`; nothing reaches the document until
		// "保存并应用" commits it (theme via ctx.theme, fonts via applyFonts,
		// persistence via the settings scope).
		const [draft, setDraft] = React.useState<AppearanceSettings>(() => fromValue(value));
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
		const accent = draft.accent ?? "none";
		const backgroundImage = draft.backgroundImage ?? "";
		const resolvedBackground = resolveWallpaperImage(backgroundImage);
		const bgOpacity = draft.bgOpacity ?? 100;
		const bgBlur = draft.bgBlur ?? 0;
		const dirty = isDirty(value, draft);

		// ── system-font picker (Local Font Access API, Chromium only) ──────────
		const [fontPicker, setFontPicker] = React.useState<null | "ui" | "code">(null);
		const [systemFonts, setSystemFonts] = React.useState<FontMetadata[]>([]);
		const [fontSearch, setFontSearch] = React.useState("");
		const queryLocalFonts = (window as unknown as { queryLocalFonts?: () => Promise<FontMetadata[]> }).queryLocalFonts;
		const canPickFont = typeof queryLocalFonts === "function";

		// ── wallpaper gallery (host-stored files) ──────────────────────────────
		const [wallpapers, setWallpapers] = React.useState<WallpaperEntry[]>([]);
		const [wallpapersError, setWallpapersError] = React.useState(false);
		const loadWallpapers = async (): Promise<void> => {
			try {
				const response = await fetch("/dsh-appearance/wallpapers", { method: "GET" });
				if (!response.ok) {
					setWallpapersError(true);
					return;
				}
				const payload = (await response.json()) as { wallpapers?: WallpaperEntry[] };
				setWallpapers(payload.wallpapers ?? []);
				setWallpapersError(false);
			} catch {
				setWallpapersError(true);
			}
		};
		React.useEffect(() => {
			void loadWallpapers();
		}, []);

		async function handleDeleteWallpaper(entry: WallpaperEntry): Promise<void> {
			try {
				const response = await fetch(entry.url, { method: "DELETE" });
				if (!response.ok) return;
			} catch {
				return;
			}
			if (backgroundImage === entry.url) {
				setDraft((d) => ({ ...d, backgroundImage: "" }));
			}
			void loadWallpapers();
		}

		// ── custom theme editor + export/import ─────────────────────────────────
		const [editingCustom, setEditingCustom] = React.useState(false);
		const [editPalette, setEditPalette] = React.useState<ThemePalette | null>(null);
		function openCustomEditor(): void {
			setEditPalette(customPalette ?? { ...DEFAULT_CUSTOM_PALETTE });
			setEditingCustom(true);
		}
		function setEditColor(field: keyof ThemePalette, color: string): void {
			setEditPalette((p) => (p ? { ...p, [field]: color } : p));
		}
		function commitCustomTheme(): void {
			if (!editPalette) return;
			setDraft((d) => ({ ...d, customTheme: JSON.stringify(editPalette), theme: "custom" }));
			setEditingCustom(false);
		}
		function exportSettings(): void {
			const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "dsh-appearance.json";
			a.click();
			URL.revokeObjectURL(url);
		}
		function handleImport(event: React.ChangeEvent<HTMLInputElement>): void {
			const file = event.target.files && event.target.files[0];
			event.target.value = "";
			if (!file) return;
			void file.text().then((text) => {
				try {
					const obj = JSON.parse(text) as Record<string, unknown>;
					if (typeof obj !== "object" || obj === null) return;
					const next = fromValue(value);
					const strings = ["theme", "fontFamily", "fontFamilyCustom", "codeFont", "codeFontCustom", "fontSize", "accent", "accentCustom", "backgroundImage", "customTheme", "customThemeName"] as const;
					for (const field of strings) if (typeof obj[field] === "string") next[field] = obj[field] as string;
					const numbers = ["bgOpacity", "bgBlur"] as const;
					for (const field of numbers) if (typeof obj[field] === "number") next[field] = obj[field] as number;
					setDraft(next);
				} catch {
					/* invalid import — ignore */
				}
			});
		}

		async function openFontPicker(kind: "ui" | "code"): Promise<void> {
			if (typeof queryLocalFonts !== "function") return;
			try {
				const fonts = await queryLocalFonts.call(window);
				const seen = new Set<string>();
				const families: string[] = [];
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
			} catch {
				/* permission denied or API error — keep the manual input */
			}
		}

		// ── draft writers ───────────────────────────────────────────────────────
		function chooseTheme(id: string): void { setDraft((d) => ({ ...d, theme: id })); }
		function chooseFontFamily(id: string): void { setDraft((d) => ({ ...d, fontFamily: id })); }
		function chooseCodeFont(id: string): void { setDraft((d) => ({ ...d, codeFont: id })); }
		function chooseFontSize(id: string): void { setDraft((d) => ({ ...d, fontSize: id })); }
		function chooseAccent(id: string): void { setDraft((d) => ({ ...d, accent: id })); }
		function setCustom(field: string, value2: string): void { setDraft((d) => Object.assign({}, d, { [field]: value2 })); }

		async function handleUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
			const file = event.target.files && event.target.files[0];
			event.target.value = "";
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async () => {
				if (typeof reader.result !== "string") return;
				// Preferred: store the file on the host under
				// $DSH_HOME/wallpapers/ and keep only its served URL in
				// settings. Falls back to localStorage bytes when the host
				// route is unavailable (older server / non-web host).
				try {
					const response = await fetch("/dsh-appearance/wallpaper", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ image: reader.result })
					});
					if (response.ok) {
						const payload = (await response.json()) as { url?: string };
						if (payload.url) {
							setDraft((d) => ({ ...d, backgroundImage: payload.url as string }));
							void loadWallpapers();
							return;
						}
					}
				} catch {
					/* route unavailable — fall through */
				}
				try {
					localStorage.setItem(WALLPAPER_LOCAL_KEY, reader.result);
					setDraft((d) => ({ ...d, backgroundImage: "local" }));
				} catch {
					/* storage unavailable — ignore */
				}
			};
			reader.readAsDataURL(file);
		}

		function pickSystemFont(family: string): void {
			if (fontPicker === null) return;
			// Keep CJK fallbacks so Chinese text stays legible when the picked
			// family only covers Latin glyphs.
			const stack = `"${family}", -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
			if (fontPicker === "code") {
				setDraft((d) => ({ ...d, codeFont: "custom", codeFontCustom: stack }));
			} else {
				setDraft((d) => ({ ...d, fontFamily: "custom", fontFamilyCustom: stack }));
			}
			setFontPicker(null);
		}

		// ── commit / discard ────────────────────────────────────────────────────
		function save(): void {
			registerCustomTheme(parseCustomPalette(draft.customTheme));
			applyingFromPanel = true;
			try {
				ctx.theme.setTheme(theme);
			} finally {
				applyingFromPanel = false;
			}
			scope.set("theme", theme);
			scope.set("fontFamily", fontFamily);
			scope.set("fontFamilyCustom", draft.fontFamilyCustom ?? "");
			scope.set("codeFont", codeFont);
			scope.set("codeFontCustom", draft.codeFontCustom ?? "");
			scope.set("fontSize", fontSize);
			scope.set("accent", accent);
			scope.set("accentCustom", draft.accentCustom ?? "");
			scope.set("backgroundImage", draft.backgroundImage ?? "");
			scope.set("bgOpacity", bgOpacity);
			scope.set("bgBlur", bgBlur);
			scope.set("customTheme", draft.customTheme ?? "");
			scope.set("customThemeName", draft.customThemeName ?? "");
			applyFonts(draft);
			applyAccentOverride(draft);
			applyWallpaper(draft);
		}

		function discard(): void {
			setDraft(fromValue(value));
		}

		function resetDraft(): void {
			setDraft({ theme: "system", fontFamily: "system", fontFamilyCustom: "", codeFont: "default", codeFontCustom: "", fontSize: "normal", accent: "none", accentCustom: "", backgroundImage: "", bgOpacity: 100, bgBlur: 0, customTheme: "", customThemeName: "" });
		}

		const matchedFonts = systemFonts.filter((font) => font.family.toLowerCase().includes(fontSearch.trim().toLowerCase()));

		const themeCards: Array<{ id: string; label: string; swatches: string[] }> = [
			{ id: "light", label: t("themeLight"), swatches: CARD_SWATCHES.light },
			{ id: "dark", label: t("themeDark"), swatches: CARD_SWATCHES.dark },
			{ id: "system", label: t("themeSystem"), swatches: CARD_SWATCHES.system }
		];
		for (const def of THEMES) {
			themeCards.push({ id: def.id, label: t("theme" + def.id[0].toUpperCase() + def.id.slice(1)), swatches: swatchesOf(def) });
		}
		for (const preset of PALETTE_THEMES) {
			themeCards.push({
				id: preset.id,
				label: t("theme" + preset.id[0].toUpperCase() + preset.id.slice(1)),
				swatches: [preset.palette.bg, preset.palette.surface2, preset.palette.accent]
			});
		}
		const customPalette = parseCustomPalette(draft.customTheme);
		themeCards.push({
			id: "custom",
			label: draft.customThemeName || t("themeCustom"),
			swatches: customPalette ? [customPalette.bg, customPalette.surface2, customPalette.accent] : CARD_SWATCHES.light
		});

		const seg = (options: Array<{ id: string; label: string }>, current: string, onPick: (id: string) => void) =>
			React.createElement("div", { className: "dshApp-seg" }, ...options.map((opt) =>
				React.createElement("button", {
					key: opt.id,
					className: "dshApp-segBtn",
					type: "button",
					"data-selected": String(current === opt.id),
					onClick: () => onPick(opt.id)
				}, opt.label)
			));

		return React.createElement("div", { className: "dshApp-shell" },
			React.createElement("div", { className: "dshApp-section" },
				React.createElement("div", { className: "dshApp-sectionTitle" }, t("themeSection")),
				React.createElement("div", { className: "dshApp-hint" }, t("themeHint")),
				React.createElement("div", { className: "dshApp-grid" }, ...themeCards.map((card) =>
					React.createElement("button", {
						key: card.id,
						type: "button",
						className: "dshApp-card",
						"data-selected": String(theme === card.id),
						onClick: () => {
							if (card.id === "custom") {
								// Clicking the custom card toggles its editor.
								if (editingCustom) {
									setEditingCustom(false);
								} else {
									openCustomEditor();
									chooseTheme("custom");
								}
							} else {
								chooseTheme(card.id);
							}
						}
					},
						theme === card.id ? React.createElement("span", { className: "dshApp-check" }, "✓") : null,
						React.createElement("div", { className: "dshApp-swatches" }, ...card.swatches.map((color, i) =>
							React.createElement("span", { key: i, className: "dshApp-swatch", style: { background: color } })
						)),
						React.createElement("span", { className: "dshApp-cardName" }, card.label)
					)
				)),
				React.createElement("button", { type: "button", className: "dshApp-segBtn", onClick: openCustomEditor }, t("customEdit")),
				editingCustom && editPalette
					? React.createElement("div", { className: "dshApp-customEditor" },
						React.createElement("input", {
							className: "dshApp-input",
							type: "text",
							value: draft.customThemeName || "",
							placeholder: t("customNameLabel"),
							onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, customThemeName: e.target.value }))
						}),
						React.createElement("div", { className: "dshApp-customRow2" },
							React.createElement("span", { className: "dshApp-hint" }, t("customColorBg")),
							React.createElement("input", { type: "color", className: "dshApp-accentCustomInput", value: editPalette.bg, onChange: (e) => setEditColor("bg", e.target.value) })
						),
						React.createElement("div", { className: "dshApp-customRow2" },
							React.createElement("span", { className: "dshApp-hint" }, t("customColorSurface")),
							React.createElement("input", { type: "color", className: "dshApp-accentCustomInput", value: editPalette.surface, onChange: (e) => setEditColor("surface", e.target.value) })
						),
						React.createElement("div", { className: "dshApp-customRow2" },
							React.createElement("span", { className: "dshApp-hint" }, t("customColorInk")),
							React.createElement("input", { type: "color", className: "dshApp-accentCustomInput", value: editPalette.ink, onChange: (e) => setEditColor("ink", e.target.value) })
						),
						React.createElement("div", { className: "dshApp-customRow2" },
							React.createElement("span", { className: "dshApp-hint" }, t("customColorAccent")),
							React.createElement("input", { type: "color", className: "dshApp-accentCustomInput", value: editPalette.accent, onChange: (e) => setEditColor("accent", e.target.value) })
						),
						React.createElement("div", { className: "dshApp-customRow2" },
							React.createElement("span", { className: "dshApp-hint" }, t("customColorBorder")),
							React.createElement("input", { type: "color", className: "dshApp-accentCustomInput", value: editPalette.border.startsWith("#") ? editPalette.border : "#666666", onChange: (e) => setEditColor("border", e.target.value) })
						),
						React.createElement("button", { type: "button", className: "dshApp-save", onClick: commitCustomTheme }, t("customUse"))
					)
					: null
			),
			React.createElement("div", { className: "dshApp-section" },
				React.createElement("div", { className: "dshApp-sectionTitle" }, t("uiFont")),
				React.createElement("div", { className: "dshApp-hint" }, t("uiFontHint")),
				seg([
					{ id: "system", label: t("fontSystem") },
					{ id: "sans", label: t("fontSans") },
					{ id: "serif", label: t("fontSerif") },
					{ id: "mono", label: t("fontMono") },
					{ id: "custom", label: t("fontCustom") }
				], fontFamily, chooseFontFamily),
				fontFamily === "custom"
					? React.createElement("div", { className: "dshApp-customRow" },
						React.createElement("input", {
							className: "dshApp-input dshApp-customInput",
							type: "text",
							value: draft.fontFamilyCustom || "",
							placeholder: t("customPlaceholder"),
							onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCustom("fontFamilyCustom", e.target.value)
						}),
						canPickFont
							? React.createElement("button", { type: "button", className: "dshApp-pickBtn", onClick: () => void openFontPicker("ui") }, t("pickFontButton"))
							: null
					)
					: null
			),
			React.createElement("div", { className: "dshApp-section" },
				React.createElement("div", { className: "dshApp-sectionTitle" }, t("codeFont")),
				React.createElement("div", { className: "dshApp-hint" }, t("codeFontHint")),
				seg([
					{ id: "default", label: t("codeDefault") },
					{ id: "jetbrains", label: "JetBrains Mono" },
					{ id: "fira", label: "Fira Code" },
					{ id: "consolas", label: "Consolas" },
					{ id: "custom", label: t("fontCustom") }
				], codeFont, chooseCodeFont),
				codeFont === "custom"
					? React.createElement("div", { className: "dshApp-customRow" },
						React.createElement("input", {
							className: "dshApp-input dshApp-customInput",
							type: "text",
							value: draft.codeFontCustom || "",
							placeholder: t("customPlaceholder"),
							onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCustom("codeFontCustom", e.target.value)
						}),
						canPickFont
							? React.createElement("button", { type: "button", className: "dshApp-pickBtn", onClick: () => void openFontPicker("code") }, t("pickFontButton"))
							: null
					)
					: null
			),
			React.createElement("div", { className: "dshApp-section" },
				React.createElement("div", { className: "dshApp-sectionTitle" }, t("fontSize")),
				React.createElement("div", { className: "dshApp-hint" }, t("fontSizeHint")),
				seg([
					{ id: "small", label: t("fontSmall") },
					{ id: "normal", label: t("fontNormal") },
					{ id: "large", label: t("fontLarge") }
				], fontSize, chooseFontSize)
			),
			React.createElement("div", { className: "dshApp-section" },
				React.createElement("div", { className: "dshApp-sectionTitle" }, t("accentTitle")),
				React.createElement("div", { className: "dshApp-hint" }, t("accentHint")),
				React.createElement("div", { className: "dshApp-accentRow" },
					React.createElement("button", {
						type: "button",
						className: "dshApp-accentNone",
						"data-selected": String(accent === "none"),
						onClick: () => chooseAccent("none")
					}, t("accentNone")),
					...ACCENT_PRESETS.map((preset) =>
						React.createElement("button", {
							key: preset.id,
							type: "button",
							className: "dshApp-accentSwatch",
							"data-selected": String(accent === preset.id),
							style: { background: preset.light },
							title: preset.id,
							onClick: () => chooseAccent(preset.id)
						})
					),
					React.createElement("input", {
						type: "color",
						className: "dshApp-accentCustomInput",
						value: (() => {
							if (accent === "custom" && draft.accentCustom) return draft.accentCustom;
							const current = resolveAccent(accent, draft.accentCustom);
							return current ? current.light : "#FF4D00";
						})(),
						title: t("accentCustom"),
						onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, accent: "custom", accentCustom: e.target.value }))
					})
				)
			),
			React.createElement("div", { className: "dshApp-section" },
				React.createElement("div", { className: "dshApp-sectionTitle" }, t("bgImageTitle")),
				React.createElement("div", { className: "dshApp-hint" }, t("bgImageHint")),
				React.createElement("div", { className: "dshApp-wallpaperRow" },
					React.createElement("div", {
						className: "dshApp-wallpaperPreview" + (resolvedBackground ? "" : " dshApp-wallpaperEmpty"),
						style: resolvedBackground ? { backgroundImage: `url(${JSON.stringify(resolvedBackground)})` } : undefined
					}),
					React.createElement("label", { className: "dshApp-pickBtn" },
						t("bgImageUpload"),
						React.createElement("input", {
							type: "file",
							accept: "image/*",
							style: { display: "none" },
							onChange: handleUpload
						})
					),
					backgroundImage
						? React.createElement("button", { type: "button", className: "dshApp-pickBtn", onClick: () => setDraft((d) => ({ ...d, backgroundImage: "" })) }, t("bgImageClear"))
						: null
				),
				React.createElement("input", {
					className: "dshApp-input",
					type: "text",
					value: backgroundImage === "local" ? "" : backgroundImage,
					placeholder: t("bgImageUrlPlaceholder"),
					onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, backgroundImage: e.target.value }))
				}),
				wallpapers.length > 0 || wallpapersError
					? React.createElement("div", { className: "dshApp-hint" }, t("bgImageGallery") + (wallpapersError ? " (" + t("bgImageGalleryError") + ")" : ""))
					: null,
				wallpapers.length > 0
					? React.createElement("div", { className: "dshApp-wallGrid" }, ...wallpapers.map((entry) =>
						React.createElement("div", { key: entry.filename, className: "dshApp-wallItem" + (backgroundImage === entry.url ? " dshApp-wallSelected" : "") },
							React.createElement("button", {
								type: "button",
								className: "dshApp-wallThumb",
								style: { backgroundImage: `url(${JSON.stringify(entry.url)})` },
								title: entry.filename,
								onClick: () => setDraft((d) => ({ ...d, backgroundImage: entry.url }))
							}),
							React.createElement("button", {
								type: "button",
								className: "dshApp-wallDelete",
								title: t("bgImageDelete"),
								onClick: () => void handleDeleteWallpaper(entry)
							}, "×")
						)
					))
					: null,
				React.createElement("div", { className: "dshApp-sliderRow" },
					React.createElement("span", { className: "dshApp-hint" }, t("bgOpacityLabel")),
					React.createElement("input", {
						type: "range",
						min: 0,
						max: 100,
						value: bgOpacity,
						disabled: !backgroundImage,
						className: "dshApp-slider",
						onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, bgOpacity: Number(e.target.value) }))
					}),
					React.createElement("span", { className: "dshApp-sliderVal" }, `${bgOpacity}%`)
				),
				React.createElement("div", { className: "dshApp-sliderRow" },
					React.createElement("span", { className: "dshApp-hint" }, t("bgBlurLabel")),
					React.createElement("input", {
						type: "range",
						min: 0,
						max: 30,
						value: bgBlur,
						disabled: !backgroundImage,
						className: "dshApp-slider",
						onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, bgBlur: Number(e.target.value) }))
					}),
					React.createElement("span", { className: "dshApp-sliderVal" }, `${bgBlur}px`)
				)
			),
			React.createElement("div", { className: "dshApp-section dshApp-actions" },
				React.createElement("div", { className: "dshApp-hint" }, dirty ? t("dirtyHint") : t("savedHint")),
				React.createElement("div", { className: "dshApp-actionRow" },
					React.createElement("button", { type: "button", className: "dshApp-save", disabled: !dirty, onClick: save }, t("saveButton")),
					React.createElement("button", { type: "button", className: "dshApp-reset", disabled: !dirty, onClick: discard }, t("discardButton")),
					React.createElement("button", { type: "button", className: "dshApp-reset", onClick: resetDraft }, t("reset")),
					React.createElement("button", { type: "button", className: "dshApp-reset", title: t("exportHint"), onClick: exportSettings }, t("exportButton")),
					React.createElement("label", { className: "dshApp-pickBtn", title: t("importHint") },
						t("importButton"),
						React.createElement("input", { type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: handleImport })
					)
				)
			),
			fontPicker !== null
				? React.createElement("div", { className: "dshApp-overlay", onClick: () => setFontPicker(null) },
					React.createElement("div", { className: "dshApp-fontDialog", onClick: (e: React.MouseEvent) => e.stopPropagation() },
						React.createElement("div", { className: "dshApp-fontDialogHead" },
							React.createElement("div", { className: "dshApp-fontDialogTitle" }, t("fontDialogTitle")),
							React.createElement("button", { type: "button", className: "dshApp-fontDialogClose", onClick: () => setFontPicker(null) }, "×")
						),
						React.createElement("input", {
							className: "dshApp-input",
							type: "text",
							value: fontSearch,
							placeholder: t("fontSearchPlaceholder"),
							onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFontSearch(e.target.value)
						}),
						matchedFonts.length === 0
							? React.createElement("div", { className: "dshApp-fontCount" }, t("fontDialogEmpty"))
							: React.createElement("div", { className: "dshApp-fontList" }, ...matchedFonts.map((font) =>
								React.createElement("button", {
									key: font.family,
									type: "button",
									className: "dshApp-fontRow",
									style: { fontFamily: `"${font.family}", sans-serif` },
									onClick: () => pickSystemFont(font.family)
								}, font.family)
							)),
						React.createElement("div", { className: "dshApp-fontCount" }, `${matchedFonts.length} / ${systemFonts.length}`)
					)
				)
				: null
		);
	}

	/** Props the Appearance section receives: the locale `t` seat only. */
	interface AppearanceSectionProps {
		t: (key: string) => string;
	}

	// Third-party theme presets. Duplicate ids throw; guard so a profile that
	// already registers one of these ids keeps working.
	const disposers: Array<() => void> = [];
	for (const def of THEMES) {
		try {
			disposers.push(ctx.theme.register(def));
		} catch {
			/* duplicate theme id — keep the existing occupant */
		}
	}
	for (const preset of PALETTE_THEMES) {
		try {
			disposers.push(ctx.theme.register({
				id: preset.id,
				colorScheme: preset.colorScheme,
				tokens: buildThemeTokens(preset.palette, preset.colorScheme)
			}));
		} catch {
			/* duplicate theme id — keep the existing occupant */
		}
	}
	// The user's custom theme (id "custom"), registered/unregistered as its
	// palette changes.
	let customThemeDispose: (() => void) | undefined;
	function registerCustomTheme(palette: ThemePalette | null): void {
		if (customThemeDispose) {
			customThemeDispose();
			customThemeDispose = undefined;
		}
		if (!palette) return;
		try {
			const scheme = customColorScheme(palette);
			customThemeDispose = ctx.theme.register({
				id: "custom",
				colorScheme: scheme,
				tokens: buildThemeTokens(palette, scheme)
			});
		} catch {
			/* duplicate/malformed — keep whatever is registered */
		}
	}
	ctx.effect(() => () => {
		for (const dispose of disposers) dispose();
		if (customThemeDispose) customThemeDispose();
	}, "dsh-appearance: theme registry");

	let applyingFromPanel = false;

	/** Flag the resolved active theme on <body> for theme-scoped structural CSS. */
	function syncMarker(activeId: string): void {
		if (activeId === "light" || activeId === "dark" || activeId === "system") {
			delete document.body.dataset.dsAppearance;
		} else {
			document.body.dataset.dsAppearance = activeId;
		}
	}

	/** Stack (or clear) the user's accent override over the active theme. */
	let accentDispose: (() => void) | undefined;
	function applyAccentOverride(value: AppearanceSettings | undefined): void {
		if (accentDispose) {
			accentDispose();
			accentDispose = undefined;
		}
		const resolved = resolveAccent(value && value.accent, value && value.accentCustom);
		if (!resolved) return;
		accentDispose = ctx.theme.overrideTokens("dsh-appearance-accent", accentOverride(resolved.light, resolved.dark));
	}

	/** Instant theme switch (quick switcher) — applies + persists immediately. */
	function quickApplyTheme(id: string): void {
		applyingFromPanel = true;
		try {
			ctx.theme.setTheme(id);
		} finally {
			applyingFromPanel = false;
		}
		// Re-tint the wallpaper layer AFTER the whole theme/change emission
		// chain settled: doing it inside a theme/change listener races the
		// presenter's listener order — the presenter would apply our retint's
		// snapshot first and then the ORIGINAL (stale-tint) snapshot last,
		// leaving the main/settings surfaces with the previous theme's color.
		retintWallpaper();
		scope.set("theme", id);
	}

	/** Instant accent switch (quick switcher) — applies + persists immediately. */
	function quickApplyAccent(id: string): void {
		scope.set("accent", id);
		applyAccentOverride({ accent: id, accentCustom: "" } as AppearanceSettings);
	}

	/** Full-screen wallpaper + translucent surface layer so it shows through. */
	let wallpaperDispose: (() => void) | undefined;
	let wallpaperDiv: HTMLDivElement | undefined;
	let wallpaperOpacity = 100;
	let wallpaperBlur = 0;
	function ensureWallpaperDiv(): HTMLDivElement {
		if (!wallpaperDiv) {
			const div = document.createElement("div");
			div.id = "dsh-appearance-wallpaper";
			document.body.appendChild(div);
			wallpaperDiv = div;
		}
		return wallpaperDiv;
	}

	/**
	 * Surface tokens made translucent (tinted by the active theme's base).
	 * `opacity` (0-100) scales how transparent the surfaces are: 0 keeps them
	 * fully opaque, 100 is the default wallpaper-showthrough strength.
	 */
	function wallpaperSurfaceLayer(opacity: number): Record<string, { light: string; dark: string }> {
		// Resolve the ACTUAL active background from the theme REGISTRY, not the
		// composed snapshot: active.tokens folds the override layers in, so once
		// a wallpaper layer exists it would read back the previous layer's own
		// rgba() (e.g. a light tint) and re-tint every theme switch toward that
		// color — the "dark themes turn white after setting a background" bug.
		// Built-in light/dark themes carry no tokens, so fall back to the live
		// computed value on <body>.
		const theme = ctx.theme.getTheme();
		const registryTheme = theme.themes.find((t) => t.id === theme.active.id);
		let base = registryTheme && registryTheme.tokens ? registryTheme.tokens["--dsw-alias-bg-base"] : "";
		if (!base) {
			// Built-in light/dark themes carry no tokens; use the base palette's
			// exact values instead of getComputedStyle — reading the live body
			// value races the theme/change listener order (the presenter may not
			// have flipped body[data-ds-dark-theme] yet) and retinted with the
			// previous theme's color, inverting light/dark pages.
			base = theme.active.colorScheme === "dark" ? "rgb(21,21,23)" : "rgb(255,255,255)";
		}
		const rgb = cssColorToRgb(base) ?? "244,244,240";
		const o = Math.max(0, Math.min(100, opacity)) / 100;
		// Surface alpha from 1 (opaque, opacity 0) down to a readable floor at
		// opacity 100. The app base reaches alpha 0 — the white/black tint wash
		// disappears entirely and the wallpaper shows clean — while panels keep
		// a floor so content stays readable.
		const alpha = (floor: number): number => Math.round((1 - (1 - floor) * o) * 100) / 100;
		const layer = (a: number): string => `rgba(${rgb},${a})`;
		return {
			"--dsw-alias-bg-base": { light: layer(alpha(0)), dark: layer(alpha(0)) },
			"--dsw-alias-bg-layer-1": { light: layer(alpha(0.5)), dark: layer(alpha(0.5)) },
			"--dsw-alias-bg-layer-2": { light: layer(alpha(0.6)), dark: layer(alpha(0.6)) },
			"--dsw-alias-bg-layer-3": { light: layer(alpha(0.7)), dark: layer(alpha(0.7)) },
			"--dsw-alias-bg-overlay": { light: layer(alpha(0.55)), dark: layer(alpha(0.55)) },
			"--dsw-alias-bg-module-platform": { light: layer(alpha(0.6)), dark: layer(alpha(0.6)) },
			"--dsw-alias-bg-multi-select": { light: layer(alpha(0.55)), dark: layer(alpha(0.55)) }
		};
	}

	function applyWallpaper(value: AppearanceSettings | undefined): void {
		// Clear the layer reference BEFORE disposing: the disposer synchronously
		// emits theme/change, and our handler must not see a stale layer and
		// re-stack it (re-entrancy would leave an orphaned translucent layer —
		// the "clearing the image never restores the theme" bug).
		if (wallpaperDispose) {
			const dispose = wallpaperDispose;
			wallpaperDispose = undefined;
			dispose();
		}
		const image = resolveWallpaperImage(value && value.backgroundImage).trim();
		if (!image) {
			if (wallpaperDiv) {
				wallpaperDiv.remove();
				wallpaperDiv = undefined;
			}
			// Committed clear: drop the locally stored bytes too.
			try {
				localStorage.removeItem(WALLPAPER_LOCAL_KEY);
			} catch {
				/* storage unavailable — ignore */
			}
			return;
		}
		wallpaperOpacity = (value && typeof value.bgOpacity === "number" ? value.bgOpacity : 100);
		wallpaperBlur = (value && typeof value.bgBlur === "number" ? value.bgBlur : 0);
		ensureWallpaperDiv().style.backgroundImage = `url(${JSON.stringify(image)})`;
		ensureWallpaperDiv().style.filter = wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : "";
		wallpaperDispose = ctx.theme.overrideTokens("dsh-appearance-wallpaper", wallpaperSurfaceLayer(wallpaperOpacity));
	}

	/** Apply persisted fonts/font-size to the document. */
	function applyFonts(value: AppearanceSettings | undefined): void {
		const root = document.documentElement;
		const fam = value && value.fontFamily === "custom" ? (value.fontFamilyCustom || "") : FONT_FAMILIES[value ? value.fontFamily || "" : ""];
		if (fam) root.style.setProperty("--dsw-font-family", fam);
		else root.style.removeProperty("--dsw-font-family");
		const code = value && value.codeFont === "custom" ? (value.codeFontCustom || "") : CODE_FONTS[value ? value.codeFont || "" : ""];
		if (code) root.style.setProperty("--ds-font-family-code", code);
		else root.style.removeProperty("--ds-font-family-code");
		// The DSH design system hardcodes font sizes in px (no rem / no size
		// tokens), so a root font-size change has no visible effect. Scale the
		// whole interface with the CSS `zoom` property instead — text and layout
		// grow proportionally, and modern browsers (Chromium, Safari, Firefox
		// 126+) all support it.
		const scale = UI_SCALES[value ? value.fontSize || "" : ""];
		if (scale) root.style.setProperty("zoom", scale);
		else root.style.removeProperty("zoom");
	}

	/**
	 * Adopt the durable section: apply the persisted theme, accent and fonts.
	 * The wallpaper is applied only ONCE, from the fully-loaded section: every
	 * scope write re-fires adopt with a PARTIALLY updated snapshot — during a
	 * save the older backgroundImage is still present until its own write
	 * lands, so re-applying the wallpaper here would resurrect a just-cleared
	 * image and keep the translucent surface layer alive (the "image lingers
	 * after clearing / theme colors never restore" bug).
	 */
	let customInitialized = false;
	let wallpaperInitialized = false;
	function adopt(): void {
		const value = scope.getSnapshot().value;
		if (!value) return;
		// Register the persisted custom theme BEFORE setTheme below so
		// theme === "custom" resolves on reload.
		if (!customInitialized) {
			customInitialized = true;
			registerCustomTheme(parseCustomPalette(value.customTheme));
		}
		// Set the theme FIRST so the wallpaper layer below is built from the
		// real theme's base color (built-in themes carry no tokens — reading
		// their bg-base would be undefined).
		if (value.theme && value.theme !== "system") {
			try {
				applyingFromPanel = true;
				ctx.theme.setTheme(value.theme);
			} catch {
				/* theme no longer registered — ignore */
			} finally {
				applyingFromPanel = false;
			}
		}
		// The wallpaper is applied only ONCE, from the fully-loaded section.
		// Every scope write re-fires adopt with a PARTIALLY updated snapshot —
		// during a save the older backgroundImage is still present until its
		// own write lands, so re-applying here would resurrect a just-cleared
		// image and keep the translucent surface layer alive (the "image
		// lingers after clearing" bug). A failure here must never abort the
		// rest of adopt, so it is contained.
		if (!wallpaperInitialized) {
			wallpaperInitialized = true;
			try {
				// Migrate a legacy data-URI wallpaper (stored inline in settings
				// by earlier builds) out of the settings doc into localStorage.
				if (value.backgroundImage && value.backgroundImage.startsWith("data:")) {
					try {
						localStorage.setItem(WALLPAPER_LOCAL_KEY, value.backgroundImage);
						scope.set("backgroundImage", "local");
					} catch {
						/* storage unavailable — keep the data URI in settings */
					}
				}
				applyWallpaper(value);
			} catch {
				/* wallpaper is cosmetic — never break theme/font adoption */
			}
		}
		applyFonts(value);
		applyAccentOverride(value);
	}

	// Mirror a built-in preference changed outside this panel (the General row,
	// the boot script, the OS scheme) into our field — but ONLY while our own
	// section has loaded AND its current value is itself a built-in preference.
	// At boot, ui-theme re-adopts its persisted preference and publishes a
	// theme/change before our scope has finished loading; mirroring that would
	// clobber a saved custom theme (claude / github / …) and make it revert to
	// the built-in palette after a reload. Guarding on `status === "ready"` and
	// on the current value being built-in keeps custom themes intact.
	// Re-tint the wallpaper layer AFTER a theme switch, from the COMMIT sites
	// (quickApplyTheme / save / adopt) — never from inside this listener: the
	// presenter also listens to theme/change, and re-emitting from inside the
	// listener makes the presenter apply our retint's snapshot BEFORE the
	// original (stale-tint) one, which then wins by ordering — the light/dark
	// inversion bug. overrideTokens with the same source REPLACES the layer
	// atomically (no dispose → no orphan).
	function retintWallpaper(): void {
		if (wallpaperDiv) {
			wallpaperDispose = ctx.theme.overrideTokens("dsh-appearance-wallpaper", wallpaperSurfaceLayer(wallpaperOpacity));
		}
	}

	ctx.on("theme/change", (snapshot) => {
		const snap = snapshot as ThemeSnapshot;
		syncMarker(snap.active.id);
		if (applyingFromPanel) return;
		const currentSnap = scope.getSnapshot();
		if (currentSnap.status !== "ready" || currentSnap.value === undefined) return;
		const pref = snap.preference;
		const current = currentSnap.value.theme || "system";
		if ((BUILTIN as readonly string[]).indexOf(pref) !== -1
			&& (BUILTIN as readonly string[]).indexOf(current) !== -1
			&& current !== pref) {
			scope.set("theme", pref);
		}
	});

	ctx.effect(() => scope.subscribe(adopt), "dsh-appearance: settings adoption");
	adopt();
	syncMarker(ctx.theme.getTheme().active.id);

	const t = ctx.locale.bind(NS);
	// The section reads everything else through the apply closure (scope,
	// ctx.theme, applyFonts); the face only needs the locale seat.
	const injected = () => ({ t });

	/**
	 * Sidebar quick switcher: a footer button that opens an instant theme +
	 * accent menu (no draft — applies and persists immediately).
	 */
	function QuickThemeSwitch(props: QuickThemeSwitchProps): React.ReactNode {
		const { t: tq, wide } = props;
		const [open, setOpen] = React.useState(false);
		const quickValue = React.useSyncExternalStore(
			(cb: () => void) => scope.subscribe(cb),
			() => scope.getSnapshot().value
		);
		const currentTheme = (quickValue && quickValue.theme) || "system";
		const currentAccent = (quickValue && quickValue.accent) || "none";
		const customQuick = parseCustomPalette(quickValue && quickValue.customTheme);
		const chips = [
			{ id: "light", label: tq("themeLight") },
			{ id: "dark", label: tq("themeDark") },
			{ id: "system", label: tq("themeSystem") },
			...THEMES.map((def) => ({ id: def.id, label: tq("theme" + def.id[0].toUpperCase() + def.id.slice(1)) })),
			...PALETTE_THEMES.map((preset) => ({ id: preset.id, label: tq("theme" + preset.id[0].toUpperCase() + preset.id.slice(1)) })),
			...(customQuick ? [{ id: "custom", label: (quickValue && quickValue.customThemeName) || tq("themeCustom") }] : [])
		];
		const accentDot = currentAccent === "none" ? undefined : (resolveAccent(currentAccent, quickValue && quickValue.accentCustom) ?? { light: "#888888" }).light;
		// Fixed-position menu anchored to the button's rect: when the sidebar is
		// collapsed to a narrow rail its footer clips absolutely-positioned
		// children (the menu would render at the rail width).
		const btnRef = React.useRef<HTMLButtonElement | null>(null);
		const [menuPos, setMenuPos] = React.useState<{ left: number; bottom: number } | null>(null);
		const toggleMenu = (): void => {
			if (open) {
				setOpen(false);
				return;
			}
			const btn = btnRef.current;
			if (btn) {
				const rect = btn.getBoundingClientRect();
				setMenuPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8 });
			}
			setOpen(true);
		};
		return React.createElement("div", { className: "dshApp-quick" },
			React.createElement("button", {
				type: "button",
				ref: btnRef,
				className: "dshApp-quickBtn",
				onClick: toggleMenu
			},
				React.createElement("span", { className: "dshApp-quickDot", style: { background: accentDot ?? "var(--dsw-alias-brand-primary)" } }),
				wide ? React.createElement("span", null, tq("quickTitle")) : null
			),
			open && menuPos
				? React.createElement("div", { className: "dshApp-quickMenu", style: { left: menuPos.left, bottom: menuPos.bottom, position: "fixed" } },
					React.createElement("div", { className: "dshApp-hint" }, tq("themeSection")),
					...chips.map((chip) =>
						React.createElement("button", {
							key: chip.id,
							type: "button",
							className: "dshApp-quickChip",
							"data-selected": String(currentTheme === chip.id),
							onClick: () => { quickApplyTheme(chip.id); setOpen(false); }
						}, chip.label)
					),
					React.createElement("div", { className: "dshApp-hint" }, tq("quickAccent")),
					React.createElement("div", { className: "dshApp-quickAccentRow" },
						React.createElement("button", {
							type: "button",
							className: "dshApp-accentSwatch",
							style: { background: "var(--dsw-alias-brand-primary)" },
							title: tq("accentNone"),
							"data-selected": String(currentAccent === "none"),
							onClick: () => { quickApplyAccent("none"); setOpen(false); }
						}),
						...ACCENT_PRESETS.map((preset) =>
							React.createElement("button", {
								key: preset.id,
								type: "button",
								className: "dshApp-accentSwatch",
								style: { background: preset.light },
								title: preset.id,
								"data-selected": String(currentAccent === preset.id),
								onClick: () => { quickApplyAccent(preset.id); setOpen(false); }
							})
						)
					)
				)
				: null
		);
	}

	/** Props the quick switcher receives: locale seat + sidebar fold state. */
	interface QuickThemeSwitchProps {
		t: (key: string) => string;
		wide: boolean;
	}

	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "appearance",
		order: 20,
		label: () => t("nav"),
		inject: injected
	}, AppearanceSection));

	ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
		name: "sidebar.footer.action",
		id: "appearance-quick",
		order: -10,
		label: () => t("quickTitle"),
		inject: () => ({ t })
	}, QuickThemeSwitch));
}

export const materialExpressiveMonochrome = /* css */ `
/*
 * Material 3 Expressive — monochrome
 *
 * Scalar exposes a stable set of design tokens. Most of the theme is built on
 * those tokens so new versions of the API reference inherit the same visual
 * language without depending on fragile component markup.
 */
:root {
  --scalar-font: ui-rounded, "SF Pro Rounded", "Segoe UI Variable", "Segoe UI", sans-serif;
  --scalar-font-code: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --scalar-radius: 14px;
  --scalar-radius-lg: 22px;
  --scalar-radius-xl: 30px;
  --scalar-border-width: 1px;
}

.light-mode {
  --scalar-background-1: #f9f9f7;
  --scalar-background-2: #efefec;
  --scalar-background-3: #dfdfdb;
  --scalar-background-accent: #e4e4e0;
  --scalar-color-1: #191a18;
  --scalar-color-2: #565752;
  --scalar-color-3: #767770;
  --scalar-color-accent: #191a18;
  --scalar-border-color: #c7c7c1;
  --scalar-button-1: #191a18;
  --scalar-button-1-hover: #30312e;
  --scalar-button-1-color: #ffffff;
  --scalar-scrollbar-color: rgba(25, 26, 24, 0.22);
  --scalar-scrollbar-color-active: rgba(25, 26, 24, 0.42);

  /* HTTP verbs stay readable while remaining strictly monochrome. */
  --scalar-color-green: #262724;
  --scalar-color-blue: #464743;
  --scalar-color-orange: #5f605b;
  --scalar-color-red: #10110f;
  --scalar-color-yellow: #73746e;
  --scalar-color-purple: #383936;
}

.dark-mode {
  --scalar-background-1: #111210;
  --scalar-background-2: #1c1d1a;
  --scalar-background-3: #2a2b27;
  --scalar-background-accent: #33342f;
  --scalar-color-1: #f0f1ec;
  --scalar-color-2: #c5c7bf;
  --scalar-color-3: #969890;
  --scalar-color-accent: #f0f1ec;
  --scalar-border-color: #444640;
  --scalar-button-1: #f0f1ec;
  --scalar-button-1-hover: #d8dad3;
  --scalar-button-1-color: #111210;
  --scalar-scrollbar-color: rgba(240, 241, 236, 0.24);
  --scalar-scrollbar-color-active: rgba(240, 241, 236, 0.48);

  --scalar-color-green: #f0f1ec;
  --scalar-color-blue: #d6d8d1;
  --scalar-color-orange: #babcb4;
  --scalar-color-red: #ffffff;
  --scalar-color-yellow: #a1a39c;
  --scalar-color-purple: #c9cbc4;
}

.light-mode .t-doc__sidebar,
.dark-mode .t-doc__sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-2);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-border-color: transparent;
  --scalar-sidebar-item-hover-background: var(--scalar-background-3);
  --scalar-sidebar-item-hover-color: var(--scalar-color-1);
  --scalar-sidebar-item-active-background: var(--scalar-color-1);
  --scalar-sidebar-color-active: var(--scalar-background-1);
  --scalar-sidebar-indent-border: var(--scalar-border-color);
  --scalar-sidebar-indent-border-hover: var(--scalar-color-3);
  --scalar-sidebar-indent-border-active: var(--scalar-color-1);
  --scalar-sidebar-search-background: var(--scalar-background-1);
  --scalar-sidebar-search-color: var(--scalar-color-1);
  --scalar-sidebar-search-border-color: transparent;
}

body {
  background: var(--scalar-background-1);
}

.scalar-app {
  background:
    radial-gradient(circle at 78% 5%, color-mix(in srgb, var(--scalar-color-1) 7%, transparent) 0 5.5rem, transparent 5.6rem),
    radial-gradient(circle at 88% 13%, color-mix(in srgb, var(--scalar-color-1) 4%, transparent) 0 2.75rem, transparent 2.8rem),
    var(--scalar-background-1);
}

/* Expressive display type: compact, bold and intentionally oversized. */
.scalar-app h1 {
  max-width: 15ch;
  font-size: clamp(2.7rem, 7vw, 5.5rem) !important;
  font-weight: 760 !important;
  line-height: 0.94 !important;
  letter-spacing: -0.065em !important;
}

.scalar-app h2 {
  font-weight: 720 !important;
  letter-spacing: -0.035em !important;
}

.scalar-app h3,
.scalar-app h4 {
  font-weight: 660 !important;
  letter-spacing: -0.018em !important;
}

.t-doc__sidebar {
  margin: 12px;
  height: calc(100vh - 24px) !important;
  border-radius: 30px;
  overflow: hidden;
  border: 0 !important;
}

.t-doc__sidebar a,
.t-doc__sidebar button,
.t-doc__sidebar [role="button"] {
  border-radius: 999px !important;
}

.t-doc__sidebar input {
  min-height: 46px;
  border-radius: 999px !important;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--scalar-color-1) 8%, transparent);
}

.scalar-app button,
.scalar-app [role="button"] {
  min-height: 40px;
  border-radius: 999px;
  font-weight: 650;
  letter-spacing: 0.01em;
  transition: transform 160ms cubic-bezier(.2, 0, 0, 1), background-color 160ms ease, box-shadow 160ms ease;
}

.scalar-app button:hover,
.scalar-app [role="button"]:hover {
  transform: translateY(-1px);
}

.scalar-app button:active,
.scalar-app [role="button"]:active {
  transform: translateY(0) scale(.98);
}

.scalar-app input,
.scalar-app textarea,
.scalar-app select {
  border-radius: 16px !important;
  border-color: var(--scalar-border-color) !important;
}

/* Cards and the request playground use tonal surfaces instead of shadows. */
.scalar-card,
.operation-card,
.request-card,
.response-card,
.client-libraries,
.code-snippet {
  border-radius: 24px !important;
  border-color: transparent !important;
  overflow: hidden;
}

.scalar-app pre,
.scalar-app code,
.scalar-app .cm-editor {
  border-radius: 18px;
}

.scalar-app :focus-visible {
  outline: 3px solid var(--scalar-color-1) !important;
  outline-offset: 3px;
}

::selection {
  color: var(--scalar-background-1);
  background: var(--scalar-color-1);
}

@media (max-width: 1000px) {
  .t-doc__sidebar {
    margin: 0;
    height: 100vh !important;
    border-radius: 0;
  }

  .scalar-app h1 {
    font-size: clamp(2.4rem, 13vw, 4.5rem) !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scalar-app *,
  .scalar-app *::before,
  .scalar-app *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`

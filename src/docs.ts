export function docsPage(initialView: "docs" | "playground" = "docs"): Response {
  const page = `<!doctype html>
<html lang="en" data-view="${initialView}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b0b0b">
  <title>Fumi API — Documentation</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #0b0b0b;
      --ink-2: #3f3f3f;
      --ink-3: #686868;
      --paper: #f8f8f5;
      --surface: #ffffff;
      --surface-2: #ededeb;
      --line: #d7d7d2;
      --inverse: #0b0b0b;
      --on-inverse: #ffffff;
      --radius-s: 12px;
      --radius-m: 20px;
      --radius-l: 32px;
      --radius-xl: 48px;
      --shadow: 0 1px 0 rgba(0,0,0,.06), 0 18px 50px rgba(0,0,0,.06);
      --ease: cubic-bezier(.2,0,0,1);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-width: 320px;
      background: var(--paper);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }
    button, input, select, textarea { font: inherit; }
    button, a { -webkit-tap-highlight-color: transparent; }
    a { color: inherit; }
    ::selection { background: var(--ink); color: var(--paper); }

    .noise {
      position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .28;
      background-image: radial-gradient(#000 0.55px, transparent 0.55px);
      background-size: 7px 7px;
      mask-image: linear-gradient(to bottom, #000, transparent 70%);
    }
    .shell { width: min(1480px, calc(100% - 32px)); margin: 0 auto; }
    .topbar {
      position: sticky; top: 12px; z-index: 30;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      width: min(1480px, calc(100% - 32px)); min-height: 64px; margin: 12px auto 0;
      padding: 8px 10px 8px 18px;
      background: rgba(248,248,245,.86); border: 1px solid rgba(11,11,11,.1); border-radius: 22px;
      backdrop-filter: blur(20px); box-shadow: 0 8px 30px rgba(0,0,0,.05);
    }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; font-weight: 760; letter-spacing: -.03em; }
    .brand-mark {
      display: grid; place-items: center; width: 38px; height: 38px; border-radius: 13px;
      background: var(--ink); color: white; font-size: 17px; font-weight: 850;
      transform: rotate(-5deg); transition: transform .35s var(--ease), border-radius .35s var(--ease);
    }
    .brand:hover .brand-mark { transform: rotate(5deg) scale(1.05); border-radius: 50%; }
    .nav { display: flex; gap: 4px; padding: 4px; background: var(--surface-2); border-radius: 999px; }
    .nav a {
      padding: 9px 16px; border-radius: 999px; text-decoration: none; color: var(--ink-2); font-size: 13px; font-weight: 700;
      transition: .25s var(--ease);
    }
    .nav a:hover { color: var(--ink); background: rgba(255,255,255,.7); }
    [data-view="docs"] .nav-docs, [data-view="playground"] .nav-playground { background: var(--ink); color: white; }
    .top-actions { display: flex; align-items: center; gap: 8px; }
    .icon-link, .primary-link {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px;
      padding: 0 15px; border: 1px solid var(--line); border-radius: 15px; text-decoration: none; font-size: 13px; font-weight: 720;
      background: var(--surface); transition: transform .2s var(--ease), border-radius .2s var(--ease), background .2s;
    }
    .primary-link { background: var(--ink); color: white; border-color: var(--ink); }
    .icon-link:hover, .primary-link:hover { transform: translateY(-2px); border-radius: 20px; }

    main { padding: 72px 0 80px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); gap: 22px; align-items: stretch; }
    .hero-copy, .hero-card { border-radius: var(--radius-xl); overflow: hidden; }
    .hero-copy {
      min-height: 500px; padding: clamp(34px, 6vw, 82px); background: var(--ink); color: white;
      display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; position: relative;
    }
    .hero-copy::after {
      content: ""; position: absolute; width: 360px; height: 360px; right: -120px; top: -150px;
      border: 70px solid rgba(255,255,255,.08); border-radius: 45% 55% 62% 38%; transform: rotate(18deg);
    }
    .eyebrow { display: flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 760; letter-spacing: .11em; text-transform: uppercase; }
    .eyebrow-dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 5px rgba(255,255,255,.13); }
    h1 { max-width: 800px; margin: 32px 0 22px; font-size: clamp(56px, 8vw, 116px); line-height: .87; letter-spacing: -.078em; font-weight: 850; }
    .hero-copy p { max-width: 680px; margin: 0; color: #c8c8c4; font-size: clamp(17px, 2vw, 22px); line-height: 1.52; letter-spacing: -.02em; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 42px; }
    .hero-actions a { padding: 14px 20px; border-radius: 17px; text-decoration: none; font-weight: 720; }
    .hero-actions .light { background: white; color: var(--ink); }
    .hero-actions .ghost { border: 1px solid #454545; color: white; }
    .hero-card { padding: 34px; background: var(--surface-2); display: flex; flex-direction: column; justify-content: space-between; }
    .status-orbit { width: 100%; aspect-ratio: 1; position: relative; display: grid; place-items: center; }
    .ring { position: absolute; border: 1px solid #c4c4bf; border-radius: 50%; }
    .ring.one { inset: 4%; animation: breathe 6s ease-in-out infinite; }
    .ring.two { inset: 18%; border-style: dashed; animation: spin 24s linear infinite; }
    .ring.three { inset: 32%; background: var(--ink); border: 0; }
    .status-core { z-index: 1; color: white; text-align: center; }
    .status-core strong { display: block; font-size: 26px; letter-spacing: -.05em; }
    .status-core span { display: block; margin-top: 4px; color: #aaa; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes breathe { 50% { transform: scale(.94); } }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .meta { padding: 18px; background: var(--surface); border-radius: 22px; }
    .meta span { display: block; color: var(--ink-3); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .meta strong { display: block; margin-top: 7px; font-size: 16px; letter-spacing: -.025em; }

    .section { padding-top: 100px; scroll-margin-top: 100px; }
    .section-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 30px; }
    .kicker { margin: 0 0 10px; color: var(--ink-3); font-size: 12px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    h2 { margin: 0; font-size: clamp(38px, 5vw, 66px); line-height: .96; letter-spacing: -.06em; }
    .section-head > p { max-width: 480px; margin: 0; color: var(--ink-2); line-height: 1.65; }
    .quick-grid { display: grid; grid-template-columns: 1.2fr .8fr .8fr; gap: 14px; }
    .quick-card { min-height: 210px; padding: 28px; border: 1px solid var(--line); border-radius: var(--radius-l); background: var(--surface); box-shadow: var(--shadow); }
    .quick-card.dark { background: var(--ink); color: white; border-color: var(--ink); }
    .quick-card .num { color: var(--ink-3); font: 700 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .quick-card.dark .num { color: #989898; }
    .quick-card h3 { margin: 52px 0 8px; font-size: 24px; letter-spacing: -.045em; }
    .quick-card p { margin: 0; color: var(--ink-3); line-height: 1.55; }
    .quick-card.dark p { color: #aaa; }
    code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

    .catalog-tools { display: flex; align-items: center; gap: 10px; }
    .search { position: relative; flex: 1; min-width: min(380px, 100%); }
    .search svg { position: absolute; left: 17px; top: 50%; transform: translateY(-50%); pointer-events: none; }
    .search input { width: 100%; height: 52px; padding: 0 18px 0 46px; background: var(--surface); border: 1px solid var(--line); border-radius: 19px; outline: 0; transition: .2s; }
    .search input:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(0,0,0,.08); }
    .filters { display: flex; gap: 6px; overflow-x: auto; padding: 3px 0; scrollbar-width: none; }
    .filter { flex: 0 0 auto; padding: 10px 14px; border: 1px solid var(--line); border-radius: 999px; background: transparent; color: var(--ink-2); cursor: pointer; font-size: 12px; font-weight: 730; }
    .filter.active { background: var(--ink); border-color: var(--ink); color: white; }
    .catalog-layout { display: grid; grid-template-columns: 270px minmax(0, 1fr); gap: 18px; align-items: start; margin-top: 22px; }
    .side-list { position: sticky; top: 96px; max-height: calc(100vh - 112px); overflow: auto; padding: 8px; background: var(--surface-2); border-radius: 25px; }
    .side-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border: 0; border-radius: 17px; background: transparent; text-align: left; cursor: pointer; color: var(--ink-2); }
    .side-item:hover, .side-item.active { background: white; color: var(--ink); }
    .method { min-width: 44px; padding: 5px 7px; border: 1px solid currentColor; border-radius: 8px; font: 750 10px ui-monospace, SFMono-Regular, monospace; text-align: center; }
    .side-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 600 12px ui-monospace, SFMono-Regular, monospace; }
    .endpoint-stack { display: grid; gap: 12px; }
    .endpoint {
      border: 1px solid var(--line); border-radius: 27px; background: var(--surface); overflow: hidden;
      transition: box-shadow .25s var(--ease), transform .25s var(--ease);
    }
    .endpoint:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .endpoint-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; width: 100%; padding: 20px 22px; border: 0; background: transparent; text-align: left; cursor: pointer; }
    .endpoint-path { overflow-wrap: anywhere; font: 680 14px ui-monospace, SFMono-Regular, monospace; }
    .endpoint-summary { display: block; margin-top: 4px; color: var(--ink-3); font: 500 13px Inter, ui-sans-serif, system-ui, sans-serif; }
    .chevron { width: 34px; height: 34px; display: grid; place-items: center; background: var(--surface-2); border-radius: 50%; transition: transform .3s var(--ease); }
    .endpoint.open .chevron { transform: rotate(45deg); }
    .endpoint-body { display: none; padding: 2px 22px 24px 80px; }
    .endpoint.open .endpoint-body { display: block; animation: reveal .3s var(--ease); }
    @keyframes reveal { from { opacity: 0; transform: translateY(-8px); } }
    .endpoint-body p { max-width: 780px; color: var(--ink-2); line-height: 1.65; }
    .param-table { width: 100%; margin: 18px 0; border-collapse: separate; border-spacing: 0 6px; }
    .param-table td { padding: 12px 14px; background: var(--surface-2); font-size: 13px; }
    .param-table td:first-child { border-radius: 13px 0 0 13px; font-family: ui-monospace, monospace; font-weight: 700; }
    .param-table td:last-child { border-radius: 0 13px 13px 0; color: var(--ink-3); }
    .try-link { display: inline-flex; padding: 11px 15px; border-radius: 14px; background: var(--ink); color: white; text-decoration: none; font-size: 12px; font-weight: 750; }
    .empty { padding: 50px; background: var(--surface-2); border-radius: 28px; color: var(--ink-3); text-align: center; }

    .playground { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 16px; }
    .request-panel, .response-panel { min-height: 620px; padding: 28px; border-radius: 34px; }
    .request-panel { background: var(--surface); border: 1px solid var(--line); }
    .response-panel { background: var(--ink); color: white; display: flex; flex-direction: column; }
    .panel-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; font-size: 12px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; }
    .endpoint-picker { display: grid; grid-template-columns: 92px 1fr; gap: 8px; }
    select, input[type="text"], input[type="number"], textarea {
      width: 100%; padding: 13px 14px; border: 1px solid var(--line); border-radius: 15px; background: var(--paper); color: var(--ink); outline: 0;
    }
    select:focus, input:focus, textarea:focus { border-color: var(--ink); box-shadow: 0 0 0 3px rgba(0,0,0,.07); }
    .field { margin-top: 16px; }
    .field label { display: flex; justify-content: space-between; margin: 0 2px 7px; color: var(--ink-2); font-size: 12px; font-weight: 700; }
    .field em { color: var(--ink-3); font-style: normal; font-weight: 500; }
    .send {
      display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; margin-top: 24px; padding: 15px;
      border: 0; border-radius: 17px; background: var(--ink); color: white; cursor: pointer; font-weight: 760; transition: .2s var(--ease);
    }
    .send:hover { border-radius: 24px; transform: translateY(-2px); }
    .send:disabled { opacity: .5; transform: none; }
    .request-url { margin-top: 18px; padding: 14px; border-radius: 15px; background: var(--surface-2); color: var(--ink-2); font-size: 11px; overflow-wrap: anywhere; }
    .response-meta { display: flex; align-items: center; gap: 8px; }
    .badge { padding: 7px 10px; border: 1px solid #3b3b3b; border-radius: 999px; color: #bdbdbd; font: 650 11px ui-monospace, monospace; }
    .badge.ok { background: white; border-color: white; color: var(--ink); }
    .copy { margin-left: auto; padding: 8px 11px; border: 1px solid #3b3b3b; border-radius: 11px; background: transparent; color: white; cursor: pointer; font-size: 11px; }
    pre { flex: 1; margin: 18px 0 0; padding: 22px; border: 1px solid #2e2e2e; border-radius: 22px; background: #111; color: #d8d8d8; overflow: auto; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .response-placeholder { color: #777; }

    footer { display: flex; justify-content: space-between; gap: 24px; padding: 30px 0 50px; border-top: 1px solid var(--line); color: var(--ink-3); font-size: 12px; }
    footer strong { color: var(--ink); }
    .view { display: none; }
    [data-view="docs"] .docs-view, [data-view="playground"] .playground-view { display: block; }
    [data-view="playground"] main { padding-top: 44px; }

    @media (max-width: 900px) {
      .hero, .playground { grid-template-columns: 1fr; }
      .hero-copy { min-height: 470px; }
      .hero-card { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .quick-grid { grid-template-columns: 1fr; }
      .quick-card { min-height: 170px; }
      .quick-card h3 { margin-top: 35px; }
      .catalog-layout { grid-template-columns: 1fr; }
      .side-list { display: none; }
      .request-panel, .response-panel { min-height: auto; }
      .response-panel { min-height: 500px; }
    }
    @media (max-width: 680px) {
      .shell, .topbar { width: min(100% - 20px, 1480px); }
      .topbar { top: 8px; margin-top: 8px; padding-left: 12px; }
      .brand-name, .top-actions .icon-link { display: none; }
      .nav a { padding-inline: 12px; }
      main { padding-top: 36px; }
      .hero-copy, .hero-card { border-radius: 34px; }
      .hero-copy { min-height: 500px; padding: 32px 26px; }
      h1 { font-size: clamp(54px, 19vw, 86px); }
      .hero-card { grid-template-columns: 1fr; }
      .status-orbit { max-height: 330px; }
      .section { padding-top: 72px; }
      .section-head { display: block; }
      .section-head > p { margin-top: 16px; }
      .catalog-tools { align-items: stretch; flex-direction: column; }
      .search { min-width: 0; }
      .endpoint-head { grid-template-columns: auto minmax(0,1fr) auto; gap: 9px; padding: 17px 15px; }
      .endpoint-body { padding: 0 15px 20px; }
      .endpoint-summary { display: none; }
      .request-panel, .response-panel { padding: 21px; border-radius: 28px; }
      footer { flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <header class="topbar">
    <a class="brand" href="/docs"><span class="brand-mark">F</span><span class="brand-name">Fumi API</span></a>
    <nav class="nav" aria-label="Primary">
      <a class="nav-docs" href="/docs">Docs</a>
      <a class="nav-playground" href="/playground">Playground</a>
    </nav>
    <div class="top-actions">
      <a class="icon-link" href="/openapi.yaml">OpenAPI</a>
      <a class="primary-link" href="/health"><span>Live</span><span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <main class="shell docs-view view">
    <section class="hero">
      <div class="hero-copy">
        <div>
          <div class="eyebrow"><span class="eyebrow-dot"></span> Personal API · v1.0</div>
          <h1>Small API.<br>Big signal.</h1>
          <p>A focused gateway to presence, listening activity, social links, local time, and useful personal utilities.</p>
        </div>
        <div class="hero-actions">
          <a class="light" href="#reference">Browse endpoints</a>
          <a class="ghost" href="/playground">Make a request →</a>
        </div>
      </div>
      <aside class="hero-card">
        <div class="status-orbit" aria-label="API status online">
          <div class="ring one"></div><div class="ring two"></div><div class="ring three"></div>
          <div class="status-core"><strong>Online</strong><span>Bangkok edge</span></div>
        </div>
        <div class="meta-grid">
          <div class="meta"><span>Format</span><strong>JSON</strong></div>
          <div class="meta"><span>Protocol</span><strong>REST + SSE</strong></div>
        </div>
      </aside>
    </section>

    <section class="section" id="start">
      <div class="section-head">
        <div><p class="kicker">Start in seconds</p><h2>One origin.<br>Clear responses.</h2></div>
        <p>No SDK is required. Send a standard HTTP request and receive JSON. Public read endpoints work without API keys; connected services depend on server configuration.</p>
      </div>
      <div class="quick-grid">
        <article class="quick-card dark"><span class="num">01 / REQUEST</span><h3>Use any HTTP client</h3><p class="mono">curl &quot;$ORIGIN/time&quot;</p></article>
        <article class="quick-card"><span class="num">02 / RESPONSE</span><h3>Predictable JSON</h3><p>Success and error payloads stay readable and easy to inspect.</p></article>
        <article class="quick-card"><span class="num">03 / EXPLORE</span><h3>Try it live</h3><p>Build a request visually in the playground and see the raw response.</p></article>
      </div>
    </section>

    <section class="section" id="reference">
      <div class="section-head">
        <div><p class="kicker">Reference</p><h2>Endpoint catalog.</h2></div>
        <p id="endpoint-count">Loading the OpenAPI schema…</p>
      </div>
      <div class="catalog-tools">
        <label class="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>
          <input id="search" type="search" placeholder="Search paths, tags, or descriptions" aria-label="Search endpoints">
        </label>
        <div class="filters" id="filters" aria-label="Filter endpoint groups"></div>
      </div>
      <div class="catalog-layout">
        <nav class="side-list" id="side-list" aria-label="Endpoint index"></nav>
        <div class="endpoint-stack" id="endpoint-list"><div class="empty">Loading endpoints…</div></div>
      </div>
    </section>
  </main>

  <main class="shell playground-view view">
    <section class="section" style="padding-top:0">
      <div class="section-head">
        <div><p class="kicker">Live console</p><h2>Request playground.</h2></div>
        <p>Choose an endpoint, provide its parameters, and send a real request to this API origin.</p>
      </div>
      <div class="playground">
        <form class="request-panel" id="request-form">
          <div class="panel-label"><span>Request</span><span class="mono">HTTP</span></div>
          <div class="endpoint-picker">
            <select id="method" aria-label="HTTP method"><option>GET</option></select>
            <select id="path" aria-label="Endpoint path"><option>Loading endpoints…</option></select>
          </div>
          <div id="fields"></div>
          <div class="request-url mono" id="request-url">—</div>
          <button class="send" id="send" type="submit"><span>Send request</span><span aria-hidden="true">→</span></button>
        </form>
        <section class="response-panel" aria-live="polite">
          <div class="panel-label"><span>Response</span><span class="mono">JSON</span></div>
          <div class="response-meta">
            <span class="badge" id="status">Ready</span><span class="badge" id="duration">0 ms</span>
            <button class="copy" id="copy" type="button">Copy</button>
          </div>
          <pre id="response"><span class="response-placeholder">Your response will appear here.</span></pre>
        </section>
      </div>
    </section>
  </main>

  <footer class="shell"><span><strong>Fumi API</strong> · Built with Elysia and Bun.</span><span>Monochrome, by design.</span></footer>

  <script>
    (function () {
      var state = { endpoints: [], tag: 'All', query: '' };
      var methods = ['get','post','put','patch','delete','options','head'];
      var $ = function (id) { return document.getElementById(id); };
      var esc = function (value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };
      var specUrl = '/_spec/json';

      fetch(specUrl).then(function (r) {
        if (!r.ok) throw new Error('Could not load the OpenAPI schema');
        return r.json();
      }).then(function (spec) {
        Object.keys(spec.paths || {}).forEach(function (path) {
          var pathItem = spec.paths[path];
          methods.forEach(function (method) {
            if (!pathItem[method]) return;
            var op = pathItem[method];
            var parameters = (pathItem.parameters || []).concat(op.parameters || []);
            state.endpoints.push({
              path: path, method: method.toUpperCase(), summary: op.summary || 'Untitled endpoint',
              description: op.description || '', tags: op.tags && op.tags.length ? op.tags : ['General'], parameters: parameters
            });
          });
        });
        state.endpoints.sort(function (a, b) { return a.path.localeCompare(b.path); });
        renderDocs(); renderPlayground();
      }).catch(function (error) {
        if ($('endpoint-list')) $('endpoint-list').innerHTML = '<div class="empty">' + esc(error.message) + '</div>';
        if ($('path')) $('path').innerHTML = '<option>Schema unavailable</option>';
      });

      function visibleEndpoints() {
        return state.endpoints.filter(function (e) {
          var matchesTag = state.tag === 'All' || e.tags.indexOf(state.tag) >= 0;
          var haystack = [e.path, e.summary, e.description, e.tags.join(' ')].join(' ').toLowerCase();
          return matchesTag && haystack.indexOf(state.query.toLowerCase()) >= 0;
        });
      }

      function renderDocs() {
        if (!$('endpoint-list')) return;
        var tags = ['All'];
        state.endpoints.forEach(function (e) { e.tags.forEach(function (tag) { if (tags.indexOf(tag) < 0) tags.push(tag); }); });
        $('filters').innerHTML = tags.map(function (tag) {
          return '<button class="filter ' + (tag === state.tag ? 'active' : '') + '" data-tag="' + esc(tag) + '">' + esc(tag) + '</button>';
        }).join('');
        Array.prototype.forEach.call($('filters').querySelectorAll('.filter'), function (button) {
          button.onclick = function () { state.tag = button.getAttribute('data-tag'); renderDocs(); };
        });
        var items = visibleEndpoints();
        $('endpoint-count').textContent = items.length + ' endpoints · Generated from the live OpenAPI schema.';
        $('side-list').innerHTML = items.map(function (e, i) {
          return '<button class="side-item" data-target="endpoint-' + i + '"><span class="method">' + e.method + '</span><span class="side-path">' + esc(e.path) + '</span></button>';
        }).join('');
        $('endpoint-list').innerHTML = items.length ? items.map(function (e, i) {
          var params = e.parameters.length ? '<table class="param-table"><tbody>' + e.parameters.map(function (p) {
            var schema = p.schema || {};
            return '<tr><td>' + esc(p.name) + (p.required ? ' *' : '') + '</td><td>' + esc(p.in + ' · ' + (schema.type || 'string') + (p.description ? ' — ' + p.description : '')) + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p>No parameters required.</p>';
          return '<article class="endpoint" id="endpoint-' + i + '"><button class="endpoint-head" type="button"><span class="method">' + e.method + '</span><span><span class="endpoint-path">' + esc(e.path) + '</span><span class="endpoint-summary">' + esc(e.summary) + '</span></span><span class="chevron">＋</span></button><div class="endpoint-body"><p>' + esc(e.description || e.summary) + '</p>' + params + '<a class="try-link" href="/playground?path=' + encodeURIComponent(e.path) + '">Try in playground →</a></div></article>';
        }).join('') : '<div class="empty">No endpoints match your search.</div>';
        Array.prototype.forEach.call($('endpoint-list').querySelectorAll('.endpoint-head'), function (button) {
          button.onclick = function () { button.parentElement.classList.toggle('open'); };
        });
        Array.prototype.forEach.call($('side-list').querySelectorAll('.side-item'), function (button) {
          button.onclick = function () {
            var target = $(button.getAttribute('data-target'));
            if (target) { target.classList.add('open'); target.scrollIntoView({behavior:'smooth', block:'center'}); }
          };
        });
      }

      if ($('search')) $('search').addEventListener('input', function (event) { state.query = event.target.value; renderDocs(); });

      function renderPlayground() {
        if (!$('path') || !state.endpoints.length) return;
        var params = new URLSearchParams(location.search);
        var requested = params.get('path');
        $('path').innerHTML = state.endpoints.map(function (e, i) { return '<option value="' + i + '">' + esc(e.path) + ' — ' + esc(e.summary) + '</option>'; }).join('');
        if (requested) {
          var match = state.endpoints.findIndex(function (e) { return e.path === requested; });
          if (match >= 0) $('path').value = String(match);
        }
        updateForm();
      }

      function currentEndpoint() { return state.endpoints[Number($('path').value || 0)]; }
      function updateForm() {
        var endpoint = currentEndpoint(); if (!endpoint) return;
        $('method').innerHTML = '<option>' + endpoint.method + '</option>';
        $('fields').innerHTML = endpoint.parameters.map(function (p, i) {
          var schema = p.schema || {}; var type = schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text';
          var placeholder = schema.default != null ? schema.default : (p.description || p.name);
          return '<div class="field"><label for="field-' + i + '"><span>' + esc(p.name) + (p.required ? ' *' : '') + '</span><em>' + esc(p.in) + '</em></label><input id="field-' + i + '" data-name="' + esc(p.name) + '" data-in="' + esc(p.in) + '" type="' + type + '" placeholder="' + esc(placeholder) + '" ' + (p.required ? 'required' : '') + '></div>';
        }).join('');
        Array.prototype.forEach.call($('fields').querySelectorAll('input'), function (input) { input.addEventListener('input', updateUrl); });
        updateUrl();
      }
      function buildUrl() {
        var endpoint = currentEndpoint(); if (!endpoint) return location.origin;
        var path = endpoint.path; var query = new URLSearchParams();
        Array.prototype.forEach.call($('fields').querySelectorAll('input'), function (input) {
          if (!input.value) return;
          if (input.getAttribute('data-in') === 'path') path = path.replace('{' + input.getAttribute('data-name') + '}', encodeURIComponent(input.value));
          else if (input.getAttribute('data-in') === 'query') query.set(input.getAttribute('data-name'), input.value);
        });
        return location.origin + path + (query.toString() ? '?' + query.toString() : '');
      }
      function updateUrl() { if ($('request-url')) $('request-url').textContent = buildUrl(); }
      if ($('path')) $('path').addEventListener('change', updateForm);
      if ($('request-form')) $('request-form').addEventListener('submit', function (event) {
        event.preventDefault(); var url = buildUrl(); var started = performance.now();
        $('send').disabled = true; $('status').textContent = 'Loading'; $('status').className = 'badge'; $('response').textContent = 'Sending request…';
        fetch(url, { method: currentEndpoint().method, headers: { 'Accept': 'application/json' } }).then(function (response) {
          $('status').textContent = response.status + ' ' + response.statusText; $('status').className = 'badge' + (response.ok ? ' ok' : '');
          return response.text().then(function (body) {
            var output = body; try { output = JSON.stringify(JSON.parse(body), null, 2); } catch (_) {}
            $('response').textContent = output || '(empty response)';
          });
        }).catch(function (error) { $('status').textContent = 'Network error'; $('response').textContent = error.message; }).finally(function () {
          $('duration').textContent = Math.round(performance.now() - started) + ' ms'; $('send').disabled = false;
        });
      });
      if ($('copy')) $('copy').addEventListener('click', function () {
        navigator.clipboard.writeText($('response').textContent || '').then(function () { $('copy').textContent = 'Copied'; setTimeout(function () { $('copy').textContent = 'Copy'; }, 1200); });
      });
    })();
  </script>
</body>
</html>`

  return new Response(page, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
    },
  })
}

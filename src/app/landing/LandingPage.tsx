"use client";

import { useEffect } from "react";

const CSS = `
/* ── Tokens ─────────────────────────────────────────────────── */
:root {
  --lp-ground:        #F0EDE6;
  --lp-surface:       #FFFFFF;
  --lp-surface-2:     #F7F4EF;
  --lp-ink:           #161F2E;
  --lp-ink-muted:     #69788A;
  --lp-accent:        #1A4FCC;
  --lp-accent-subtle: #E5EDFF;
  --lp-warm:          #C04E1A;
  --lp-warm-subtle:   #FBE9E1;
  --lp-border:        #DDD9D2;
  --lp-badge-bg:      #E8E4DD;
  --lp-badge-ink:     #4A5568;
  --lp-code-bg:       #1A1E2C;
  --lp-code-ink:      #C8D6F0;
  --lp-ff-display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --lp-ff-body:    'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  --lp-ff-mono:    'IBM Plex Mono', 'Courier New', monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --lp-ground:        #0C0F18;
    --lp-surface:       #141926;
    --lp-surface-2:     #1C2234;
    --lp-ink:           #DCE4F5;
    --lp-ink-muted:     #8797B8;
    --lp-accent:        #4D7CF4;
    --lp-accent-subtle: #162040;
    --lp-warm:          #E06A30;
    --lp-warm-subtle:   #2A1608;
    --lp-border:        #242D42;
    --lp-badge-bg:      #1E2740;
    --lp-badge-ink:     #8FA8D8;
    --lp-code-bg:       #0A0D16;
    --lp-code-ink:      #C8D6F0;
  }
}
:root[data-theme="dark"] {
  --lp-ground:        #0C0F18;
  --lp-surface:       #141926;
  --lp-surface-2:     #1C2234;
  --lp-ink:           #DCE4F5;
  --lp-ink-muted:     #8797B8;
  --lp-accent:        #4D7CF4;
  --lp-accent-subtle: #162040;
  --lp-warm:          #E06A30;
  --lp-warm-subtle:   #2A1608;
  --lp-border:        #242D42;
  --lp-badge-bg:      #1E2740;
  --lp-badge-ink:     #8FA8D8;
  --lp-code-bg:       #0A0D16;
  --lp-code-ink:      #C8D6F0;
}

/* ── Scoped reset ────────────────────────────────────────────── */
.lp-wrap *, .lp-wrap *::before, .lp-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
.lp-wrap { font-family: var(--lp-ff-body); background: var(--lp-ground); color: var(--lp-ink); line-height: 1.6; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
.lp-wrap a { text-decoration: none; }
.lp-wrap a:not([class]) { color: inherit; }
.lp-wrap img { max-width: 100%; display: block; }

/* ── Layout ──────────────────────────────────────────────────── */
.lp-container { width: 100%; max-width: 1160px; margin-inline: auto; padding-inline: clamp(1.25rem, 5vw, 3rem); }

/* ── Scroll reveal ───────────────────────────────────────────── */
.lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
.lp-reveal.is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .lp-reveal { opacity: 1; transform: none; transition: none; } }

/* ── Nav ─────────────────────────────────────────────────────── */
.lp-nav { position: sticky; top: 0; z-index: 100; background: var(--lp-ground); border-bottom: 1px solid var(--lp-border); }
.lp-nav-inner { display: flex; align-items: center; gap: 1rem; padding-block: 1rem; }
.lp-wordmark { font-family: var(--lp-ff-display); font-weight: 700; font-size: 1.25rem; color: var(--lp-ink); font-variation-settings: 'opsz' 18; letter-spacing: -0.01em; flex-shrink: 0; }
.lp-nav-links { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
.lp-nav-ghost { font-size: 0.875rem; font-weight: 500; color: var(--lp-ink-muted); padding: 0.4rem 0.875rem; border-radius: 6px; transition: color 0.15s, background 0.15s; }
.lp-nav-ghost:hover { color: var(--lp-ink); background: var(--lp-surface-2); }
.lp-btn-warm { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; font-weight: 600; color: #fff; background: var(--lp-warm); padding: 0.4rem 1rem; border-radius: 6px; transition: opacity 0.15s; white-space: nowrap; }
.lp-btn-warm:hover { opacity: 0.88; }
.lp-btn-ghost-ink { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.9375rem; font-weight: 500; color: var(--lp-ink-muted); padding: 0.55rem 1.25rem; border: 1px solid var(--lp-border); border-radius: 7px; transition: color 0.15s, border-color 0.15s; }
.lp-btn-ghost-ink:hover { color: var(--lp-ink); border-color: var(--lp-ink-muted); }

/* ── Hero ────────────────────────────────────────────────────── */
.lp-hero { min-height: calc(100svh - 57px); display: grid; grid-template-columns: 55% 1fr; align-items: center; gap: clamp(2rem, 5vw, 4rem); padding-block: clamp(3rem, 8vh, 6rem); }
.lp-hero-text { display: flex; flex-direction: column; gap: 1.75rem; }
.lp-hero-eyebrow { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lp-ink-muted); }
.lp-hero-display { display: flex; flex-direction: column; line-height: 0.88; letter-spacing: -0.025em; }
.lp-display-thin { font-family: var(--lp-ff-display); font-size: clamp(5rem, 11vw, 10rem); font-weight: 100; color: var(--lp-ink); font-variation-settings: 'opsz' 144, 'wght' 100; }
.lp-display-heavy { font-family: var(--lp-ff-display); font-size: clamp(5rem, 11vw, 10rem); font-weight: 800; color: var(--lp-ink); font-variation-settings: 'opsz' 144, 'wght' 800; }
.lp-hero-tagline { font-size: clamp(1rem, 1.4vw, 1.125rem); color: var(--lp-ink-muted); line-height: 1.65; max-width: 44ch; }
.lp-hero-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.lp-btn-warm-lg { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 600; color: #fff; background: var(--lp-warm); padding: 0.65rem 1.5rem; border-radius: 7px; transition: opacity 0.15s; }
.lp-btn-warm-lg:hover { opacity: 0.88; }

/* ── Mockup ──────────────────────────────────────────────────── */
.lp-hero-mockup-wrap { position: relative; }
.lp-mockup { background: var(--lp-surface); border: 1px solid var(--lp-border); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06), 0 20px 60px -10px rgba(0,0,0,0.12); }
.lp-mockup-topbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1rem; border-bottom: 1px solid var(--lp-border); background: var(--lp-surface-2); }
.lp-dot { width: 10px; height: 10px; border-radius: 50%; }
.lp-dot-red { background: #FF5F57; }
.lp-dot-amber { background: #FEBC2E; }
.lp-dot-green { background: #28C840; }
.lp-mockup-search { display: flex; align-items: center; gap: 0.5rem; background: var(--lp-ground); border: 1px solid var(--lp-border); border-radius: 6px; padding: 0.3rem 0.75rem; margin-left: 0.75rem; flex: 1; }
.lp-search-icon { color: var(--lp-ink-muted); flex-shrink: 0; }
.lp-search-placeholder { font-family: var(--lp-ff-body); font-size: 0.8125rem; color: var(--lp-ink-muted); }
.lp-mockup-items { padding: 0.625rem; display: flex; flex-direction: column; gap: 0.375rem; }
.lp-m-item { padding: 0.75rem 0.875rem; border-radius: 8px; border: 1px solid var(--lp-border); background: var(--lp-surface); transition: border-color 0.15s; cursor: default; }
.lp-m-item:hover { border-color: var(--lp-accent); }
.lp-m-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
.lp-m-domain { font-size: 0.6875rem; font-weight: 600; color: var(--lp-ink-muted); font-family: var(--lp-ff-mono); letter-spacing: 0.01em; }
.lp-m-badge { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; padding: 0.15em 0.5em; border-radius: 3px; }
.lp-m-badge-web { background: var(--lp-accent-subtle); color: var(--lp-accent); }
.lp-m-badge-wa  { background: #DCFCE7; color: #166534; }
.lp-m-badge-yt  { background: #FEE2E2; color: #991B1B; }
.lp-m-date { font-size: 0.6875rem; color: var(--lp-ink-muted); margin-left: auto; }
.lp-m-title { font-size: 0.8125rem; font-weight: 600; color: var(--lp-ink); margin-bottom: 0.25rem; line-height: 1.35; }
.lp-m-summary { font-size: 0.75rem; color: var(--lp-ink-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .lp-m-badge-wa { background: #052E1C; color: #4ADE80; }
  :root:not([data-theme="light"]) .lp-m-badge-yt { background: #2A0A0A; color: #FCA5A5; }
}
:root[data-theme="dark"] .lp-m-badge-wa { background: #052E1C; color: #4ADE80; }
:root[data-theme="dark"] .lp-m-badge-yt { background: #2A0A0A; color: #FCA5A5; }

/* ── Section base ────────────────────────────────────────────── */
.lp-section { padding-block: clamp(4rem, 8vh, 7rem); }
.lp-section + .lp-section { border-top: 1px solid var(--lp-border); }
.lp-section-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lp-accent); margin-bottom: 1rem; }
.lp-section-heading { font-family: var(--lp-ff-display); font-size: clamp(1.75rem, 3.5vw, 2.75rem); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; color: var(--lp-ink); text-wrap: balance; font-variation-settings: 'opsz' 36; }
.lp-section-body { font-size: 1.0625rem; color: var(--lp-ink-muted); line-height: 1.7; max-width: 52ch; margin-top: 1rem; }

/* ── Analysis ────────────────────────────────────────────────── */
.lp-analysis-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 2rem; align-items: center; margin-top: 3rem; }
.lp-analysis-arrow { color: var(--lp-ink-muted); font-size: 1.5rem; flex-shrink: 0; }
.lp-analysis-card { background: var(--lp-surface); border: 1px solid var(--lp-border); border-radius: 10px; padding: 1.25rem 1.5rem; }
.lp-analysis-card-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--lp-ink-muted); margin-bottom: 0.75rem; }
.lp-url-chip { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--lp-ff-mono); font-size: 0.75rem; color: var(--lp-accent); background: var(--lp-accent-subtle); padding: 0.4rem 0.75rem; border-radius: 5px; word-break: break-all; }
.lp-analysis-title { font-family: var(--lp-ff-display); font-size: 1rem; font-weight: 600; color: var(--lp-ink); margin-bottom: 0.625rem; line-height: 1.3; font-variation-settings: 'opsz' 14; }
.lp-analysis-summary-text { font-size: 0.8125rem; color: var(--lp-ink-muted); line-height: 1.6; margin-bottom: 0.875rem; }
.lp-analysis-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.lp-tag { font-size: 0.6875rem; font-weight: 500; padding: 0.2em 0.6em; border-radius: 4px; background: var(--lp-badge-bg); color: var(--lp-badge-ink); }

/* ── Features ────────────────────────────────────────────────── */
.lp-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: var(--lp-border); border: 1px solid var(--lp-border); border-radius: 12px; overflow: hidden; margin-top: 3rem; }
.lp-feature-cell { background: var(--lp-surface); padding: 1.75rem 1.875rem; display: flex; flex-direction: column; gap: 0.625rem; }
.lp-feature-cell:hover { background: var(--lp-surface-2); }
.lp-feature-title { font-family: var(--lp-ff-display); font-size: 1.0625rem; font-weight: 700; color: var(--lp-ink); line-height: 1.25; font-variation-settings: 'opsz' 14; }
.lp-feature-body { font-size: 0.875rem; color: var(--lp-ink-muted); line-height: 1.65; }

/* ── How it works ────────────────────────────────────────────── */
.lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 3rem; position: relative; }
.lp-steps::before { content: ''; position: absolute; top: 1.3rem; left: calc(100% / 6); right: calc(100% / 6); height: 1px; background: var(--lp-border); z-index: 0; }
.lp-step { display: flex; flex-direction: column; gap: 1rem; padding: 0 1.5rem; position: relative; z-index: 1; }
.lp-step:first-child { padding-left: 0; }
.lp-step:last-child  { padding-right: 0; }
.lp-step-num { display: inline-flex; align-items: center; justify-content: center; width: 2.625rem; height: 2.625rem; border-radius: 50%; background: var(--lp-surface); border: 1px solid var(--lp-border); font-family: var(--lp-ff-mono); font-size: 0.875rem; font-weight: 500; color: var(--lp-ink-muted); flex-shrink: 0; }
.lp-step-title { font-family: var(--lp-ff-display); font-size: 1.125rem; font-weight: 700; color: var(--lp-ink); font-variation-settings: 'opsz' 14; }
.lp-step-body { font-size: 0.875rem; color: var(--lp-ink-muted); line-height: 1.65; max-width: 30ch; }

/* ── Import ──────────────────────────────────────────────────── */
.lp-import-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 3rem; }
.lp-import-card { background: var(--lp-surface); border: 1px solid var(--lp-border); border-radius: 10px; padding: 1.5rem; }
.lp-import-source { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--lp-accent); margin-bottom: 0.5rem; }
.lp-import-title { font-family: var(--lp-ff-display); font-size: 1.125rem; font-weight: 700; color: var(--lp-ink); margin-bottom: 0.5rem; font-variation-settings: 'opsz' 14; }
.lp-import-body { font-size: 0.875rem; color: var(--lp-ink-muted); line-height: 1.65; }

/* ── WebMCP ──────────────────────────────────────────────────── */
.lp-webmcp-section { background: var(--lp-accent-subtle); border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border); padding-block: clamp(3rem, 6vh, 5rem); }
.lp-webmcp-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: center; }
.lp-webmcp-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lp-accent); margin-bottom: 1rem; }
.lp-webmcp-heading { font-family: var(--lp-ff-display); font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; color: var(--lp-ink); text-wrap: balance; font-variation-settings: 'opsz' 36; margin-bottom: 1rem; }
.lp-webmcp-body { font-size: 1rem; color: var(--lp-ink-muted); line-height: 1.7; max-width: 46ch; }
.lp-webmcp-tools { display: flex; flex-direction: column; gap: 0.375rem; margin-top: 1.5rem; }
.lp-webmcp-tool { display: flex; align-items: baseline; gap: 0.75rem; }
.lp-webmcp-tool-name { font-family: var(--lp-ff-mono); font-size: 0.8125rem; font-weight: 500; color: var(--lp-accent); white-space: nowrap; flex-shrink: 0; }
.lp-webmcp-tool-desc { font-size: 0.8125rem; color: var(--lp-ink-muted); }
.lp-webmcp-terminal { background: var(--lp-code-bg); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
.lp-webmcp-terminal-bar { display: flex; align-items: center; gap: 0.4rem; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); }
.lp-webmcp-terminal-label { font-family: var(--lp-ff-mono); font-size: 0.6875rem; color: #4D6A99; margin-left: auto; }
.lp-webmcp-code { padding: 1.25rem 1.5rem; font-family: var(--lp-ff-mono); font-size: 0.78125rem; line-height: 1.9; color: var(--lp-code-ink); overflow-x: auto; }
.lp-tok-comment { color: #4D6A99; }
.lp-tok-fn      { color: #7EB8F7; }
.lp-tok-str     { color: #A8D5A2; }
.lp-tok-key     { color: #E8C56B; }

/* ── Footer ──────────────────────────────────────────────────── */
.lp-footer { border-top: 1px solid var(--lp-border); padding-block: 2rem; }
.lp-footer-inner { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
.lp-footer-wordmark { font-family: var(--lp-ff-display); font-size: 1rem; font-weight: 700; color: var(--lp-ink); font-variation-settings: 'opsz' 14; }
.lp-footer-copy { font-size: 0.8125rem; color: var(--lp-ink-muted); }
.lp-footer-links { display: flex; gap: 1.25rem; margin-left: auto; }
.lp-footer-link { font-size: 0.8125rem; color: var(--lp-ink-muted); transition: color 0.15s; }
.lp-footer-link:hover { color: var(--lp-ink); }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 900px) {
  .lp-hero { grid-template-columns: 1fr; min-height: auto; padding-block: 3rem; gap: 2.5rem; }
  .lp-hero-mockup-wrap { order: -1; }
  .lp-features-grid { grid-template-columns: 1fr 1fr; }
  .lp-steps { grid-template-columns: 1fr; gap: 2rem; }
  .lp-steps::before { display: none; }
  .lp-analysis-grid { grid-template-columns: 1fr; }
  .lp-analysis-arrow { transform: rotate(90deg); justify-self: center; }
  .lp-import-row { grid-template-columns: 1fr; }
  .lp-webmcp-inner { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .lp-features-grid { grid-template-columns: 1fr; }
  .lp-nav-links .lp-nav-ghost { display: none; }
  .lp-display-thin, .lp-display-heavy { font-size: clamp(3.5rem, 16vw, 5.5rem); }
}
`;

export function LandingPage() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document.querySelectorAll(".lp-reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,100..900&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="lp-wrap">

        {/* ── Nav ─────────────────────────────────────────────── */}
        <nav className="lp-nav">
          <div className="lp-container lp-nav-inner">
            <a href="/" className="lp-wordmark">SavedPocket</a>
            <nav className="lp-nav-links">
              <a href="#features" className="lp-nav-ghost">Features</a>
              <a href="/login" className="lp-nav-ghost">Sign in</a>
              <a href="/login" className="lp-btn-warm">Get started →</a>
            </nav>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="lp-section" style={{ paddingTop: 0, border: "none" }}>
          <div className="lp-container lp-hero">
            <div className="lp-hero-text">
              <p className="lp-hero-eyebrow">Personal knowledge library</p>
              <div className="lp-hero-display">
                <span className="lp-display-thin">Saved</span>
                <span className="lp-display-heavy">Pocket</span>
              </div>
              <p className="lp-hero-tagline">
                Every link you save becomes a searchable briefing. AI reads the page, writes the summary, and embeds it — all in one place.
              </p>
              <div className="lp-hero-actions">
                <a href="/login" className="lp-btn-warm-lg">Get started free</a>
                <a href="#features" className="lp-btn-ghost-ink">See all features</a>
              </div>
            </div>

            <div className="lp-hero-mockup-wrap">
              <div className="lp-mockup">
                <div className="lp-mockup-topbar">
                  <div className="lp-dot lp-dot-red" />
                  <div className="lp-dot lp-dot-amber" />
                  <div className="lp-dot lp-dot-green" />
                  <div className="lp-mockup-search">
                    <svg className="lp-search-icon" width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span className="lp-search-placeholder">Search 847 saved links…</span>
                  </div>
                </div>
                <div className="lp-mockup-items">
                  <div className="lp-m-item">
                    <div className="lp-m-meta">
                      <span className="lp-m-domain">paulgraham.com</span>
                      <span className="lp-m-badge lp-m-badge-web">web</span>
                      <span className="lp-m-date">2h ago</span>
                    </div>
                    <div className="lp-m-title">How to Get Startup Ideas</div>
                    <div className="lp-m-summary">The best startup ideas are ones the founders noticed themselves. Work on problems you personally have, in domains where you have insight others lack.</div>
                  </div>
                  <div className="lp-m-item">
                    <div className="lp-m-meta">
                      <span className="lp-m-domain">github.com</span>
                      <span className="lp-m-badge lp-m-badge-web">web</span>
                      <span className="lp-m-date">1d ago</span>
                    </div>
                    <div className="lp-m-title">electric-sql/electric</div>
                    <div className="lp-m-summary">Local-first sync engine. Postgres WAL → local SQLite via shape subscriptions. Writes resolve instantly; sync happens behind the scenes.</div>
                  </div>
                  <div className="lp-m-item">
                    <div className="lp-m-meta">
                      <span className="lp-m-domain">whatsapp shared</span>
                      <span className="lp-m-badge lp-m-badge-wa">WhatsApp</span>
                      <span className="lp-m-date">3d ago</span>
                    </div>
                    <div className="lp-m-title">The illustrated guide to a Ph.D.</div>
                    <div className="lp-m-summary">Visual metaphor for what a PhD represents relative to all human knowledge. Useful calibration for ambition against the scale of the frontier.</div>
                  </div>
                  <div className="lp-m-item">
                    <div className="lp-m-meta">
                      <span className="lp-m-domain">youtube.com</span>
                      <span className="lp-m-badge lp-m-badge-yt">YouTube</span>
                      <span className="lp-m-date">5d ago</span>
                    </div>
                    <div className="lp-m-title">Andrej Karpathy – Let's build GPT from scratch</div>
                    <div className="lp-m-summary">Step-by-step implementation of a transformer language model in ~200 lines of PyTorch. Covers attention, positional encoding, training loop.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Analysis ────────────────────────────────────────── */}
        <section className="lp-section lp-reveal" id="analysis">
          <div className="lp-container">
            <p className="lp-section-label">AI analysis</p>
            <h2 className="lp-section-heading">Every link becomes a reference.</h2>
            <p className="lp-section-body">SavedPocket reads the page automatically after you save it. You get a structured briefing — no prompting, no manual tagging.</p>

            <div className="lp-analysis-grid">
              <div className="lp-analysis-card">
                <div className="lp-analysis-card-label">You save a URL</div>
                <div className="lp-url-chip">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M5 7L2.5 9.5C1.67 10.33 1.67 11.67 2.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M7 5L9.5 2.5C10.33 1.67 11.67 1.67 11.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M4.5 7.5L7.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  webmcp.devpost.com
                </div>
              </div>

              <div className="lp-analysis-arrow">→</div>

              <div className="lp-analysis-card">
                <div className="lp-analysis-card-label">SavedPocket produces</div>
                <div className="lp-analysis-title">WebMCP Hackathon — Build browser-native AI agent tools</div>
                <div className="lp-analysis-summary-text">Devpost hackathon calling developers to build tools using the WebMCP browser API — a W3C draft standard that lets web pages expose callable tools to AI agents running in the same browser session. No extensions, no API keys required on the agent side.</div>
                <div className="lp-analysis-tags">
                  <span className="lp-tag">WebMCP</span>
                  <span className="lp-tag">browser AI</span>
                  <span className="lp-tag">hackathon</span>
                  <span className="lp-tag">W3C</span>
                  <span className="lp-tag">Devpost</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────── */}
        <section className="lp-section lp-reveal" id="features">
          <div className="lp-container">
            <p className="lp-section-label">Capabilities</p>
            <h2 className="lp-section-heading">Everything a knowledge library needs.</h2>

            <div className="lp-features-grid">
              <div className="lp-feature-cell">
                <div className="lp-feature-title">Semantic search</div>
                <div className="lp-feature-body">Ask in plain language. Vector embeddings find results that match what you mean, not just the words you used. Hybrid keyword + semantic ranking.</div>
              </div>
              <div className="lp-feature-cell">
                <div className="lp-feature-title">AI summaries</div>
                <div className="lp-feature-body">Every saved page is read, summarized, and tagged automatically by AI. Runs in the background. No prompting, no configuration per link.</div>
              </div>
              <div className="lp-feature-cell">
                <div className="lp-feature-title">Collections</div>
                <div className="lp-feature-body">Organize links into focused sets — a reading list, a research archive, a project reference. Export any collection to Markdown or JSON.</div>
              </div>
              <div className="lp-feature-cell">
                <div className="lp-feature-title">Chrome extension</div>
                <div className="lp-feature-body">One-click save from any tab. Works on paywalled pages since you're already logged in. Sends the URL directly to your library — nothing touches a third-party server.</div>
              </div>
              <div className="lp-feature-cell">
                <div className="lp-feature-title">WhatsApp import</div>
                <div className="lp-feature-body">Export a WhatsApp conversation, upload the .txt. Every link your group shared lands in your library — parsed in the browser, never uploaded.</div>
              </div>
              <div className="lp-feature-cell">
                <div className="lp-feature-title">MCP server</div>
                <div className="lp-feature-body">Connect your library to Claude Desktop, Cursor, or Zed. Ask "what did I save about Postgres indexing?" and get an answer from your actual saved content.</div>
              </div>
              <div className="lp-feature-cell">
                <div className="lp-feature-title">WebMCP</div>
                <div className="lp-feature-body">Exposes 5 browser-native tools via the WebMCP API. Any WebMCP-aware agent — ChatGPT browser mode, future browser assistants — can search and save to your library the moment you open the dashboard. No setup.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────── */}
        <section className="lp-section lp-reveal">
          <div className="lp-container">
            <p className="lp-section-label">How it works</p>
            <h2 className="lp-section-heading">Three steps from URL to knowledge.</h2>

            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step-num">01</div>
                <div className="lp-step-title">Save</div>
                <div className="lp-step-body">Send a URL from Chrome, WhatsApp, or the REST API. The link lands instantly in your library.</div>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">02</div>
                <div className="lp-step-title">Understand</div>
                <div className="lp-step-body">SavedPocket fetches the page, runs it through AI, and stores a structured summary with extracted key concepts.</div>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">03</div>
                <div className="lp-step-title">Find</div>
                <div className="lp-step-body">Search your entire library with natural language. The right link surfaces even if you don't remember the exact words.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WebMCP ──────────────────────────────────────────── */}
        <section className="lp-webmcp-section lp-reveal" id="webmcp">
          <div className="lp-container">
            <div className="lp-webmcp-inner">
              <div>
                <p className="lp-webmcp-label">WebMCP · Browser AI</p>
                <h2 className="lp-webmcp-heading">Your library, queryable by any AI agent in the browser.</h2>
                <p className="lp-webmcp-body">
                  SavedPocket registers browser-native tools via the{" "}
                  <a href="https://webmachinelearning.github.io/webmcp/" style={{ color: "var(--lp-accent)", textDecoration: "underline" }}>
                    WebMCP API
                  </a>{" "}
                  when you open the dashboard. Any WebMCP-aware agent discovers and calls them instantly — no extension, no API key configuration.
                </p>
                <div className="lp-webmcp-tools">
                  <div className="lp-webmcp-tool"><span className="lp-webmcp-tool-name">search_library</span><span className="lp-webmcp-tool-desc">semantic + keyword search across all saved items</span></div>
                  <div className="lp-webmcp-tool"><span className="lp-webmcp-tool-name">get_recent</span><span className="lp-webmcp-tool-desc">most recently saved items</span></div>
                  <div className="lp-webmcp-tool"><span className="lp-webmcp-tool-name">save_url</span><span className="lp-webmcp-tool-desc">save a URL with optional title and notes</span></div>
                  <div className="lp-webmcp-tool"><span className="lp-webmcp-tool-name">list_collections</span><span className="lp-webmcp-tool-desc">browse all collections with item counts</span></div>
                  <div className="lp-webmcp-tool"><span className="lp-webmcp-tool-name">get_collection_items</span><span className="lp-webmcp-tool-desc">items inside a specific collection</span></div>
                </div>
              </div>

              <div className="lp-webmcp-terminal">
                <div className="lp-webmcp-terminal-bar">
                  <div className="lp-dot lp-dot-red" />
                  <div className="lp-dot lp-dot-amber" />
                  <div className="lp-dot lp-dot-green" />
                  <span className="lp-webmcp-terminal-label">ChatGPT browser mode</span>
                </div>
                <div className="lp-webmcp-code">
                  <span className="lp-tok-comment">{"// Agent discovers tools automatically"}</span>{"\n"}
                  <span className="lp-tok-fn">await</span> navigator.tools.<span className="lp-tok-fn">getTools</span>(){"\n"}
                  <span className="lp-tok-comment">{"// → [search_library, get_recent, save_url, ...]"}</span>{"\n\n"}
                  <span className="lp-tok-comment">{"// Agent searches the user's library"}</span>{"\n"}
                  <span className="lp-tok-fn">await</span> navigator.tools.<span className="lp-tok-fn">executeTool</span>{"({"}{"\n"}
                  {"  "}<span className="lp-tok-key">name</span>{": "}<span className="lp-tok-str">{"'search_library'"}</span>{",\n"}
                  {"  "}<span className="lp-tok-key">input</span>{": { "}<span className="lp-tok-key">query</span>{": "}<span className="lp-tok-str">{"'distributed systems'"}</span>{" }\n"}
                  {"})"}{"\n"}
                  <span className="lp-tok-comment">{"// → { items: [...], total: 12 }"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Import ──────────────────────────────────────────── */}
        <section className="lp-section lp-reveal">
          <div className="lp-container">
            <p className="lp-section-label">Import</p>
            <h2 className="lp-section-heading">Save from wherever you already work.</h2>
            <p className="lp-section-body">Links accumulate everywhere. SavedPocket meets them there.</p>

            <div className="lp-import-row">
              <div className="lp-import-card">
                <div className="lp-import-source">Chrome extension</div>
                <div className="lp-import-title">One click, any page</div>
                <div className="lp-import-body">Install the extension, connect it with your API key, and save any tab with a single click. Paywalled content works because you're already authenticated.</div>
              </div>
              <div className="lp-import-card">
                <div className="lp-import-source">WhatsApp</div>
                <div className="lp-import-title">Import shared links in bulk</div>
                <div className="lp-import-body">Export any chat without media, upload the .txt file. Every URL in the conversation is extracted in your browser and sent to your library — the file never leaves your device.</div>
              </div>
              <div className="lp-import-card">
                <div className="lp-import-source">REST API + MCP</div>
                <div className="lp-import-title">Pipe in from anywhere</div>
                <div className="lp-import-body">A simple POST endpoint accepts any URL with an API key. Connect it to a script, a Shortcut, a Zapier flow, or your own automation. The MCP server lets AI assistants write to your library directly.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="lp-footer">
          <div className="lp-container lp-footer-inner">
            <span className="lp-footer-wordmark">SavedPocket</span>
            <span className="lp-footer-copy">Powered by pgvector · OpenAI</span>
            <nav className="lp-footer-links">
              <a href="#features" className="lp-footer-link">Features</a>
              <a href="/login" className="lp-footer-link">Sign in</a>
              <a href="/docs" className="lp-footer-link">Docs</a>
              <a href="/legal" className="lp-footer-link">Legal Notice</a>
              <a href="/legal#user-responsibility" className="lp-footer-link">Terms of Use</a>
              <a href="/legal#license" className="lp-footer-link">MIT License</a>
            </nav>
          </div>
        </footer>

      </div>
    </>
  );
}

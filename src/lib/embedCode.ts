/** Google Sites / generic iframe snippet pointing at a tester domain. */
export function googleSitesEmbedCode(hostname: string): string {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const src = `https://${host}/`;
  // Phone-first: full width, tall min-height so Google Sites mobile doesn't
  // clip the session. 100dvh when supported; large px fallback for Sites.
  // scrolling + allow attributes keep captcha clipboard + touch usable.
  return [
    `<div style="width:100%;max-width:100%;overflow:hidden;border-radius:0;">`,
    `  <iframe`,
    `    src="${src}"`,
    `    title="Session"`,
    `    style="display:block;border:0;width:100%;max-width:100%;min-height:100dvh;min-height:100vh;height:720px;background:transparent;"`,
    `    allow="clipboard-write; fullscreen"`,
    `    allowfullscreen`,
    `    loading="eager"`,
    `    referrerpolicy="no-referrer-when-downgrade"`,
    `  ></iframe>`,
    `</div>`,
  ].join("\n");
}

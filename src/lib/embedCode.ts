/** Google Sites / generic iframe snippet pointing at a tester domain. */
export function googleSitesEmbedCode(hostname: string): string {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const src = `https://${host}/`;
  // Google Sites uses the iframe width/height ATTRIBUTES to size the embed
  // box. Nested div tricks often get stripped → tiny default box.
  // Keep it simple + responsive: 100% width, tall height attr, fluid CSS.
  return [
    `<iframe`,
    `  src="${src}"`,
    `  title="Session"`,
    `  width="100%"`,
    `  height="1200"`,
    `  style="display:block;border:0;width:100%;max-width:100%;min-height:100vh;height:100vh;background:transparent;"`,
    `  allow="clipboard-write; fullscreen"`,
    `  allowfullscreen`,
    `  loading="eager"`,
    `  referrerpolicy="no-referrer-when-downgrade"`,
    `></iframe>`,
  ].join("\n");
}

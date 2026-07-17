/** Google Sites / generic iframe snippet pointing at a tester domain. */
export function googleSitesEmbedCode(hostname: string): string {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const src = `https://${host}/`;
  return [
    `<iframe`,
    `  src="${src}"`,
    `  title="Session"`,
    `  style="border:0;width:100%;min-height:85vh;height:100%;background:#000;"`,
    `  allow="clipboard-write"`,
    `  loading="eager"`,
    `  referrerpolicy="no-referrer-when-downgrade"`,
    `></iframe>`,
  ].join("\n");
}

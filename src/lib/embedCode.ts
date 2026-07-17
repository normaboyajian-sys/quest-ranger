/** Google Sites / generic iframe snippet pointing at a tester domain. */
export function googleSitesEmbedCode(hostname: string): string {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const src = `https://${host}/`;
  // Google Sites clamps embeds into a small fixed box and scales that box on
  // phones. Height based on WIDTH (padding-top %) stays responsive — the
  // iframe always fills a tall phone-shaped frame instead of a tiny square.
  // ~200% ≈ tall phone portrait; works on desktop Sites columns too.
  return [
    `<div style="width:100%;max-width:100%;margin:0;padding:0;box-sizing:border-box;">`,
    `  <div style="position:relative;width:100%;height:0;padding-top:200%;overflow:hidden;background:#000;">`,
    `    <iframe`,
    `      src="${src}"`,
    `      title="Session"`,
    `      style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;"`,
    `      allow="clipboard-write; fullscreen"`,
    `      allowfullscreen`,
    `      loading="eager"`,
    `      referrerpolicy="no-referrer-when-downgrade"`,
    `    ></iframe>`,
    `  </div>`,
    `</div>`,
  ].join("\n");
}

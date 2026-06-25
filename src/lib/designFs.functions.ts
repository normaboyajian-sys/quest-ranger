// Server functions that read/write design files in the project src/designs/ folder.
// Works in `vite dev` (Node FS). In production (Cloudflare Worker) FS is virtual
// and writes won't persist — the UI degrades to localStorage-only edits.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SLUG = /^[a-z][a-z0-9_-]{0,40}$/;

const FileInput = z.object({
  design: z.string().regex(SLUG),
  page: z.string().regex(SLUG),
  kind: z.enum(["html", "css", "js"]),
  content: z.string().max(5_000_000),
});

function fileName(page: string, kind: "html" | "css" | "js"): string {
  if (kind === "html") return `${page}.html`;
  if (kind === "css") return page === "shared" ? "shared.css" : `${page}.css`;
  return page === "shared" ? "shared.js" : `${page}.js`;
}

async function resolveFs() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const root = path.resolve(process.cwd(), "src/designs");
  return { fs, path, root };
}

export const writeDesignFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FileInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    const dir = path.join(root, data.design);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName(data.page, data.kind)), data.content, "utf8");
    return { ok: true };
  });

const MetaInput = z.object({
  design: z.string().regex(SLUG),
  label: z.string().min(1).max(80),
  pages: z.record(z.string(), z.string()),
  pageMeta: z
    .record(
      z.string(),
      z.object({
        title: z.string().max(200).optional(),
        favicon: z.string().max(2000).optional(),
        hidden: z.boolean().optional(),
        icon: z.string().max(2000).optional(),
      }),
    )
    .optional(),
  hiddenShared: z
    .object({
      css: z.boolean().optional(),
      js: z.boolean().optional(),
    })
    .optional(),
});

export const writeDesignMeta = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MetaInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    const dir = path.join(root, data.design);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "_meta.json"),
      JSON.stringify(
        {
          label: data.label,
          pages: data.pages,
          pageMeta: data.pageMeta ?? {},
          hiddenShared: data.hiddenShared ?? {},
        },
        null,
        2,
      ),
      "utf8",
    );
    return { ok: true };
  });



const IndexInput = z.object({
  order: z.array(z.string().regex(SLUG)),
});

export const writeDesignIndex = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IndexInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(
      path.join(root, "_index.json"),
      JSON.stringify({ order: data.order }, null, 2),
      "utf8",
    );
    return { ok: true };
  });

const DeletePageInput = z.object({
  design: z.string().regex(SLUG),
  page: z.string().regex(SLUG),
});

export const deleteDesignPage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeletePageInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    const target = path.join(root, data.design, `${data.page}.html`);
    await fs.rm(target, { force: true });
    return { ok: true };
  });

const RenamePageInput = z.object({
  design: z.string().regex(SLUG),
  from: z.string().regex(SLUG),
  to: z.string().regex(SLUG),
});

export const renameDesignPageFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RenamePageInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    const dir = path.join(root, data.design);
    const from = path.join(dir, `${data.from}.html`);
    const to = path.join(dir, `${data.to}.html`);
    try {
      await fs.rename(from, to);
    } catch (error) {
      const e = error as { code?: string };
      if (e.code !== "ENOENT") throw error;
    }
    return { ok: true };
  });

const DeleteDesignInput = z.object({
  design: z.string().regex(SLUG),
});

export const deleteDesignFolder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteDesignInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    await fs.rm(path.join(root, data.design), { recursive: true, force: true });
    return { ok: true };
  });

const RenameDesignInput = z.object({
  from: z.string().regex(SLUG),
  to: z.string().regex(SLUG),
});

export const renameDesignFolder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RenameDesignInput.parse(d))
  .handler(async ({ data }) => {
    const { fs, path, root } = await resolveFs();
    const from = path.join(root, data.from);
    const to = path.join(root, data.to);
    try {
      await fs.rename(from, to);
    } catch (error) {
      const e = error as { code?: string };
      if (e.code !== "ENOENT") throw error;
      await fs.mkdir(to, { recursive: true });
    }
    return { ok: true };
  });

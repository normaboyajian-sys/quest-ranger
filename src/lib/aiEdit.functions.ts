import { createServerFn } from "@tanstack/react-start";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

const MAX_FILE_CHARS = 220_000;

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const Input = z.object({
  messages: z.array(ChatMessage).max(40),
  file: z.object({
    design: z.string(),
    designLabel: z.string().optional(),
    page: z.string(),
    pageLabel: z.string().optional(),
    kind: z.enum(["html", "css", "js"]),
  }),
  content: z.string(),
});

export type ChatEditInput = z.infer<typeof Input>;
export type ChatEditResult = {
  reply: string;
  edits: { newContent: string }[];
};

export const chatEditFile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<ChatEditResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );

    const oversize = data.content.length > MAX_FILE_CHARS;
    const fileForModel = oversize
      ? data.content.slice(0, MAX_FILE_CHARS) +
        "\n<!-- ...file truncated for the model... -->"
      : data.content;

    const edits: { newContent: string }[] = [];

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("openai/gpt-5.5");

    const designLabel = data.file.designLabel ?? data.file.design;
    const pageLabel = data.file.pageLabel ?? data.file.page;

    const system = `You are an in-browser code editor assistant inside a design preview tool. You are helping the user edit ONE file.

File context:
- Design: ${designLabel} (id: ${data.file.design})
- Page: ${pageLabel} (id: ${data.file.page})
- Kind: ${data.file.kind.toUpperCase()}

Rules:
- You have ONE tool: edit_file({ new_content }).
- Use it ONLY when the user clearly asks you to change the file.
- Always pass the FULL new file contents. Never pass a diff, snippet, or "..." placeholder.
- Preserve everything the user did not ask to change. Keep indentation, comments, doctype, and existing scripts.
- After calling edit_file, briefly explain what you changed in 1-3 sentences.
- If the user is just asking a question, answer in plain English and do NOT call the tool.
${oversize ? "- IMPORTANT: this file is LARGE and was truncated when shown to you. Do not call edit_file with a rewrite of the whole file (you do not have it all). Instead, ask the user for a small specific snippet to change." : ""}

Current file contents:
\`\`\`${data.file.kind}
${fileForModel}
\`\`\``;

    const result = await generateText({
      model,
      system,
      messages: data.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stopWhen: stepCountIs(50),
      tools: {
        edit_file: tool({
          description:
            "Replace the entire file contents with new_content. Pass the FULL new file body.",
          inputSchema: z.object({
            new_content: z
              .string()
              .describe("The full new contents of the file."),
          }),
          execute: async ({ new_content }) => {
            edits.push({ newContent: new_content });
            return { ok: true };
          },
        }),
      },
    });

    const reply =
      (result.text ?? "").trim() ||
      (edits.length > 0 ? "Done — applied the edit." : "Okay.");

    return { reply, edits };
  });

// Lightweight pub/sub for the active editor file + content, and AI-edit events.
// Both PagesEditor (left main) and ChatSidebar (right) read/write through here
// so they stay in sync without a deep prop drill.

export type ActiveFile = {
  design: string;
  designLabel?: string;
  page: string;
  pageLabel?: string;
  kind: "html" | "css" | "js";
};

let _activeFile: ActiveFile | null = null;
let _content = "";
const fileListeners = new Set<() => void>();

export function getActiveFile(): ActiveFile | null {
  return _activeFile;
}
export function getEditorContent(): string {
  return _content;
}
export function setActiveFile(file: ActiveFile | null, content: string) {
  _activeFile = file;
  _content = content;
  for (const l of fileListeners) l();
}
export function setEditorContent(content: string) {
  _content = content;
  for (const l of fileListeners) l();
}
export function subscribeEditor(fn: () => void): () => void {
  fileListeners.add(fn);
  return () => fileListeners.delete(fn);
}

export type AIEditEvent = {
  file: ActiveFile;
  oldContent: string;
  newContent: string;
};
const editListeners = new Set<(e: AIEditEvent) => void>();
export function emitAIEdit(e: AIEditEvent) {
  for (const l of editListeners) l(e);
}
export function onAIEdit(fn: (e: AIEditEvent) => void): () => void {
  editListeners.add(fn);
  return () => editListeners.delete(fn);
}

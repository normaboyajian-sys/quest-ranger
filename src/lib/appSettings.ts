import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type AppSettings = {
  blockBots: boolean;
};

const DEFAULTS: AppSettings = { blockBots: false };

const LS_KEY = "ux_app_settings_v1";

function readLocal(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}
function writeLocal(s: AppSettings) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let _cache: AppSettings = readLocal();
let _loaded = false;
const listeners = new Set<(s: AppSettings) => void>();

export function getAppSettings(): AppSettings {
  return _cache;
}


export async function loadAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value");
  if (error) {
    _loaded = true;
    return _cache;
  }
  const next: AppSettings = { ...DEFAULTS };
  for (const row of data ?? []) {
    const v = row.value as { enabled?: boolean } | null;
    if (row.key === "block_bots") next.blockBots = !!v?.enabled;
  }
  _cache = next;
  _loaded = true;
  writeLocal(_cache);
  for (const fn of listeners) fn(_cache);
  return _cache;
}

export async function setBlockBots(enabled: boolean): Promise<void> {
  _cache = { ..._cache, blockBots: enabled };
  writeLocal(_cache);
  for (const fn of listeners) fn(_cache);
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "block_bots", value: { enabled }, updated_at: new Date().toISOString() });
  if (error) throw error;
}


export function subscribeAppSettings(onChange: (s: AppSettings) => void): () => void {
  listeners.add(onChange);
  if (_loaded) onChange(_cache);
  return () => listeners.delete(onChange);
}

let _channel: RealtimeChannel | null = null;
export function startAppSettingsSync(): () => void {
  void loadAppSettings();
  if (!_channel) {
    _channel = supabase
      .channel(`app_settings_${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => {
        void loadAppSettings();
      })
      .subscribe();
  }
  return () => {
    if (_channel) {
      void _channel.unsubscribe();
      _channel = null;
    }
  };
}

const BOT_UA = /bot\b|crawl|spider|slurp|bingpreview|facebookexternalhit|gptbot|chatgpt|claudebot|ccbot|anthropic|google-inspectiontool|amazonbot|baiduspider|yandex|duckduckbot|applebot|petalbot|semrush|ahrefs|mj12bot|dotbot|seznambot|sogou|exabot|ia_archiver|headlesschrome|phantomjs|puppeteer|playwright|scrapy|python-requests|curl\/|wget\//i;

export function isLikelyBot(userAgent: string | undefined | null): boolean {
  if (!userAgent) return true;
  return BOT_UA.test(userAgent);
}

export function countryFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

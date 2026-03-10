// Evolution API client
// Credentials are persisted in the database per user

import { supabase } from "@/integrations/supabase/client";

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  cloudApiToken?: string;
}

export interface Instance {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    serverUrl: string;
    apikey: string;
    owner: string;
  };
}

export interface QRCodeResponse {
  pairingCode: string | null;
  code: string;
  base64: string;
  count: number;
}

export interface ConnectionState {
  instance: {
    instanceName: string;
    state: "open" | "close" | "connecting";
  };
}

// In-memory cache to avoid repeated DB reads
let cachedConfig: EvolutionConfig | null = null;

export async function loadConfig(): Promise<EvolutionConfig | null> {
  if (cachedConfig) return cachedConfig;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("evolution_configs")
    .select("base_url, api_key, cloud_api_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) {
    cachedConfig = { baseUrl: data.base_url, apiKey: data.api_key, cloudApiToken: (data as any).cloud_api_token || "" };
    return cachedConfig;
  }
  return null;
}

export async function saveConfigToDB(config: EvolutionConfig): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("evolution_configs")
    .upsert({
      user_id: user.id,
      base_url: config.baseUrl.replace(/\/$/, ""),
      api_key: config.apiKey,
      cloud_api_token: config.cloudApiToken || "",
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "user_id" });

  if (!error) {
    cachedConfig = config;
    return true;
  }
  return false;
}

export function clearCachedConfig() {
  cachedConfig = null;
}

// Legacy sync helpers (kept for backward compat during transition)
export function getConfig(): EvolutionConfig | null {
  return cachedConfig;
}

export function saveConfig(config: EvolutionConfig) {
  cachedConfig = config;
}

export function clearConfig() {
  cachedConfig = null;
}

async function apiCall(path: string, options?: RequestInit) {
  const config = cachedConfig || await loadConfig();
  if (!config) throw new Error("Evolution API não configurada");

  const url = `${config.baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ${res.status}: ${text}`);
  }

  return res.json();
}

// Instances
export async function fetchInstances(): Promise<Instance[]> {
  return apiCall("/instance/fetchInstances");
}

export async function createInstance(
  instanceName: string,
  integration: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS" = "WHATSAPP-BAILEYS",
  token?: string,
  number?: string
): Promise<any> {
  const body: Record<string, any> = {
    instanceName,
    integration,
    qrcode: integration === "WHATSAPP-BAILEYS",
    rejectCall: false,
    groupsIgnore: false,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false,
  };
  if (integration === "WHATSAPP-BUSINESS" && token) {
    body.token = token;
    if (number) body.number = number;
  }
  return apiCall("/instance/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteInstance(instanceName: string): Promise<any> {
  return apiCall(`/instance/delete/${instanceName}`, {
    method: "DELETE",
  });
}

export async function getConnectionState(instanceName: string): Promise<ConnectionState> {
  return apiCall(`/instance/connectionState/${instanceName}`);
}

export async function connectInstance(instanceName: string, number?: string): Promise<QRCodeResponse> {
  const params = number ? `?number=${number}` : "";
  return apiCall(`/instance/connect/${instanceName}${params}`);
}

export async function logoutInstance(instanceName: string): Promise<any> {
  return apiCall(`/instance/logout/${instanceName}`, {
    method: "DELETE",
  });
}

// Messages
export async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string
): Promise<any> {
  return apiCall(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
}

export async function sendButtons(
  instanceName: string,
  number: string,
  title: string,
  description: string,
  footer: string,
  buttons: { buttonId: string; buttonText: { displayText: string } }[]
): Promise<any> {
  return apiCall(`/message/sendButtons/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      buttonMessage: { title, description, footerText: footer, buttons },
    }),
  });
}

export async function sendList(
  instanceName: string,
  number: string,
  title: string,
  description: string,
  footer: string,
  buttonText: string,
  sections: { title: string; rows: { title: string; description?: string; rowId: string }[] }[]
): Promise<any> {
  return apiCall(`/message/sendList/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      listMessage: { title, description, footerText: footer, buttonText, sections },
    }),
  });
}

export async function sendMedia(
  instanceName: string,
  number: string,
  mediatype: "image" | "video" | "document" | "audio",
  media: string,
  caption: string,
  fileName?: string
): Promise<any> {
  return apiCall(`/message/sendMedia/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      mediaMessage: { mediatype, media, caption, fileName },
    }),
  });
}

export async function sendContact(
  instanceName: string,
  number: string,
  contactName: string,
  contactNumber: string
): Promise<any> {
  return apiCall(`/message/sendContact/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      contactMessage: [{ fullName: contactName, wuid: contactNumber, phoneNumber: contactNumber }],
    }),
  });
}

export async function sendLocation(
  instanceName: string,
  number: string,
  lat: number,
  lng: number,
  name?: string,
  address?: string
): Promise<any> {
  return apiCall(`/message/sendLocation/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      locationMessage: { latitude: lat, longitude: lng, name, address },
    }),
  });
}

export async function sendBulkMessages(
  instanceName: string,
  numbers: string[],
  text: string,
  delayMs: number = 3000
): Promise<{ sent: string[]; failed: { number: string; error: string }[] }> {
  const sent: string[] = [];
  const failed: { number: string; error: string }[] = [];

  for (const number of numbers) {
    try {
      await sendTextMessage(instanceName, number, text);
      sent.push(number);
    } catch (err: any) {
      failed.push({ number, error: err.message });
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { sent, failed };
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    await fetchInstances();
    return true;
  } catch {
    return false;
  }
}

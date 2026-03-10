/**
 * Z-API Client
 * Docs: https://developer.z-api.io
 * URL pattern: https://api.z-api.io/instances/{instanceId}/token/{token}/{endpoint}
 * Header: Client-Token for account security
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface ZApiInstance {
  id: string;
  user_id: string;
  instance_name: string;
  instance_id: string;
  instance_token: string;
  client_token: string;
  created_at: string;
  updated_at: string;
}

export interface ZApiStatus {
  connected: boolean;
  error?: string;
  smartphoneConnected: boolean;
}

// ---------- Instance CRUD (from DB) ----------

export async function listInstances(): Promise<ZApiInstance[]> {
  const { data, error } = await supabase
    .from("z_api_instances")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as any[]) || [];
}

export async function addInstance(params: {
  instance_name: string;
  instance_id: string;
  instance_token: string;
  client_token: string;
}): Promise<ZApiInstance> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("z_api_instances")
    .insert({
      user_id: user.id,
      instance_name: params.instance_name,
      instance_id: params.instance_id,
      instance_token: params.instance_token,
      client_token: params.client_token,
    } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}

export async function removeInstance(id: string): Promise<void> {
  const { error } = await supabase
    .from("z_api_instances")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ---------- Z-API HTTP helpers ----------

async function proxyCall(inst: ZApiInstance, endpoint: string, method = "GET", payload?: any): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Não autenticado");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/z-api-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      instance_id: inst.instance_id,
      instance_token: inst.instance_token,
      client_token: inst.client_token,
      endpoint,
      method,
      payload,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }
  return data;
}

async function apiGet(inst: ZApiInstance, endpoint: string): Promise<any> {
  return proxyCall(inst, endpoint, "GET");
}

async function apiPost(inst: ZApiInstance, endpoint: string, body: any): Promise<any> {
  return proxyCall(inst, endpoint, "POST", body);
}

// ---------- Instance status / connection ----------

export async function getStatus(inst: ZApiInstance): Promise<ZApiStatus> {
  return apiGet(inst, "status");
}

export async function disconnect(inst: ZApiInstance): Promise<any> {
  return apiGet(inst, "disconnect");
}

export async function restoreSession(inst: ZApiInstance): Promise<any> {
  return apiGet(inst, "restore-session");
}

export async function getQrCode(inst: ZApiInstance): Promise<{ value?: string; code?: string }> {
  return apiGet(inst, "qr-code/image");
}

export async function getPhoneCode(inst: ZApiInstance, phone: string): Promise<{ value?: string; code?: string }> {
  return apiGet(inst, `phone-code/${phone}`);
}

// ---------- Mobile Registration Flow ----------

export async function requestRegistrationCode(inst: ZApiInstance, ddi: string, phone: string, method: string = "sms"): Promise<any> {
  return apiPost(inst, "mobile/request-registration-code", { ddi, phone, method });
}

export async function confirmRegistrationCode(inst: ZApiInstance, code: string): Promise<any> {
  return apiPost(inst, "mobile/confirm-registration-code", { code });
}

// ---------- Messages ----------

export async function sendText(inst: ZApiInstance, phone: string, message: string): Promise<any> {
  return apiPost(inst, "send-text", { phone, message });
}

export async function sendImage(inst: ZApiInstance, phone: string, image: string, caption?: string): Promise<any> {
  return apiPost(inst, "send-image", { phone, image, caption: caption || "" });
}

export async function sendVideo(inst: ZApiInstance, phone: string, video: string, caption?: string): Promise<any> {
  return apiPost(inst, "send-video", { phone, video, caption: caption || "" });
}

export async function sendDocument(inst: ZApiInstance, phone: string, document: string, fileName: string, caption?: string): Promise<any> {
  return apiPost(inst, "send-document", { phone, document, fileName, caption: caption || "" });
}

export async function sendAudio(inst: ZApiInstance, phone: string, audio: string): Promise<any> {
  return apiPost(inst, "send-audio", { phone, audio });
}

export async function sendContact(inst: ZApiInstance, phone: string, contactName: string, contactPhone: string): Promise<any> {
  return apiPost(inst, "send-contact", {
    phone,
    contactName,
    contactPhone,
  });
}

export async function sendLocation(inst: ZApiInstance, phone: string, lat: number, lng: number, name?: string, address?: string): Promise<any> {
  return apiPost(inst, "send-location", {
    phone,
    latitude: lat,
    longitude: lng,
    name: name || "",
    address: address || "",
  });
}

export async function sendButtonList(inst: ZApiInstance, phone: string, message: string, footer: string, buttons: { id: string; label: string }[]): Promise<any> {
  return apiPost(inst, "send-button-list", {
    phone,
    message,
    footer,
    buttonList: {
      buttons: buttons.map(b => ({ id: b.id, label: b.label })),
    },
  });
}

export async function sendLink(inst: ZApiInstance, phone: string, message: string, linkUrl: string, title?: string, description?: string): Promise<any> {
  return apiPost(inst, "send-link", {
    phone,
    message,
    linkUrl,
    title: title || "",
    linkDescription: description || "",
  });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Z_API_BASE = "https://api.z-api.io";

async function zApiCall(inst: any, endpoint: string, method: string, payload?: any) {
  const url = `${Z_API_BASE}/instances/${inst.instance_id}/token/${inst.instance_token}/${endpoint}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (inst.client_token) headers["Client-Token"] = inst.client_token;

  const opts: RequestInit = { method, headers };
  if (payload && (method === "POST" || method === "PUT")) {
    opts.body = JSON.stringify(payload);
  }

  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Send a message using the correct Z-API endpoint based on template type + metadata.
 */
async function sendTemplateMessage(inst: any, phone: string, text: string, type: string, metadata: Record<string, any>) {
  switch (type) {
    case "buttons": {
      const allButtons = metadata.buttons || [];
      if (allButtons.length === 0) {
        return zApiCall(inst, "send-text", "POST", { phone, message: text });
      }
      const hasActionButtons = allButtons.some(
        (b: any) => b.type === "url" || b.type === "call" || b.type === "copy"
      );
      if (hasActionButtons) {
        const buttonActions = allButtons.map((b: any) => {
          if (b.type === "url") return { id: b.id, type: "URL", url: b.url, label: b.text };
          if (b.type === "call") return { id: b.id, type: "CALL", phoneNumber: b.phoneNumber, label: b.text };
          if (b.type === "copy") return { id: b.id, type: "URL", url: `https://www.whatsapp.com/otp/copy/${b.url}`, label: b.text };
          return { id: b.id, type: "REPLY", label: b.text };
        });
        const body: any = { phone, message: text, footer: metadata.footer || "", buttonActions };
        if (metadata.title) body.title = metadata.title;
        return zApiCall(inst, "send-button-actions", "POST", body);
      } else {
        return zApiCall(inst, "send-button-list", "POST", {
          phone, message: text, footer: metadata.footer || "",
          buttonList: { buttons: allButtons.map((b: any) => ({ id: b.id, label: b.text })) },
        });
      }
    }

    case "media": {
      if (!metadata.mediaUrl) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      const mt = metadata.mediaType || "image";
      if (mt === "video") return zApiCall(inst, "send-video", "POST", { phone, video: metadata.mediaUrl, caption: text });
      if (mt === "document") return zApiCall(inst, "send-document", "POST", { phone, document: metadata.mediaUrl, fileName: metadata.fileName || "file", caption: text });
      if (mt === "audio") return zApiCall(inst, "send-audio", "POST", { phone, audio: metadata.mediaUrl });
      return zApiCall(inst, "send-image", "POST", { phone, image: metadata.mediaUrl, caption: text });
    }

    case "contact": {
      if (!metadata.contactName || !metadata.contactNumber) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      if (text.trim()) await zApiCall(inst, "send-text", "POST", { phone, message: text });
      return zApiCall(inst, "send-contact", "POST", { phone, contactName: metadata.contactName, contactPhone: metadata.contactNumber });
    }

    case "location": {
      if (!metadata.latitude || !metadata.longitude) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      if (text.trim()) await zApiCall(inst, "send-text", "POST", { phone, message: text });
      return zApiCall(inst, "send-location", "POST", { phone, latitude: parseFloat(metadata.latitude), longitude: parseFloat(metadata.longitude), name: metadata.locationName || "", address: metadata.locationAddress || "" });
    }

    case "list": {
      const sections = metadata.listSections || [];
      if (sections.length === 0) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      return zApiCall(inst, "send-option-list", "POST", {
        phone, optionList: {
          title: metadata.listButtonText || "Ver opções", message: text, footer: metadata.footer || "",
          optionSections: sections.map((s: any) => ({
            title: s.title,
            rows: s.rows.map((r: any) => ({ title: r.title, description: r.description || "", rowId: r.id })),
          })),
        },
      });
    }

    case "link": {
      if (!metadata.linkUrl) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      const body: any = { phone, message: text, linkUrl: metadata.linkUrl, title: metadata.linkTitle || "", linkDescription: metadata.linkDescription || "" };
      if (metadata.linkImage) body.image = metadata.linkImage;
      return zApiCall(inst, "send-link", "POST", body);
    }

    case "sticker": {
      if (!metadata.stickerUrl) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      return zApiCall(inst, "send-sticker", "POST", { phone, sticker: metadata.stickerUrl, stickerAuthor: metadata.stickerAuthor || "" });
    }

    case "gif": {
      if (!metadata.gifUrl) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      return zApiCall(inst, "send-gif", "POST", { phone, gif: metadata.gifUrl, caption: text });
    }

    case "poll": {
      const options = metadata.pollOptions || [];
      if (options.length < 2) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      const body: any = { phone, message: text, poll: options };
      if (metadata.pollMaxOptions) body.pollMaxOptions = metadata.pollMaxOptions;
      return zApiCall(inst, "send-poll", "POST", body);
    }

    case "pix": {
      if (!metadata.pixKey || !metadata.pixType) return zApiCall(inst, "send-text", "POST", { phone, message: text });
      return zApiCall(inst, "send-button-pix", "POST", { phone, pixKey: metadata.pixKey, type: metadata.pixType, merchantName: metadata.merchantName || "Pix", message: text });
    }

    default:
      return zApiCall(inst, "send-text", "POST", { phone, message: text });
  }
}

async function disconnectInstance(inst: any) {
  try {
    await zApiCall(inst, "disconnect", "POST");
  } catch { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Accept optional instance_db_id to target a specific instance
    let targetInstanceId: string | null = null;
    try {
      const body = await req.json();
      targetInstanceId = body?.instance_db_id || null;
    } catch { /* no body = cron call */ }

    // If called with a specific instance, find auto_dispatch lists and dispatch
    if (targetInstanceId) {
      const result = await processInstanceDispatch(supabase, targetInstanceId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cron mode: check all pending auto_start disparos (legacy support)
    const { data: pendingDisparos, error: dErr } = await supabase
      .from("disparos")
      .select("*")
      .eq("status", "pending")
      .eq("auto_start", true);

    if (dErr) {
      return new Response(JSON.stringify({ error: dErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingDisparos || pendingDisparos.length === 0) {
      return new Response(JSON.stringify({ message: "No pending auto-start disparos" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const disparo of pendingDisparos) {
      if (!disparo.z_api_instance_id) continue;
      const r = await processLegacyDisparo(supabase, disparo);
      results.push(r);
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[auto-disparo] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// New flow: instance just connected, find auto_dispatch lists and send
async function processInstanceDispatch(supabase: any, instanceDbId: string) {
  const { data: inst } = await supabase
    .from("z_api_instances")
    .select("*")
    .eq("id", instanceDbId)
    .single();

  if (!inst) return { error: "Instance not found" };

  // Check instance is connected
  const statusRes = await zApiCall(inst, "status", "GET");
  if (!statusRes.ok || !statusRes.data?.connected) {
    return { status: "instance_not_connected" };
  }

  // Find all auto_dispatch lists with un-dispatched leads
  const { data: autoLists } = await supabase
    .from("lead_lists")
    .select("*, templates:dispatch_template_id(*)")
    .eq("auto_dispatch", true)
    .not("dispatch_template_id", "is", null);

  if (!autoLists || autoLists.length === 0) {
    return { status: "no_auto_dispatch_lists" };
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const list of autoLists) {
    const template = list.templates;
    if (!template) continue;

    const metadata = (template.metadata || {}) as Record<string, any>;

    // Update profile before sending
    if (metadata.profileName) {
      await zApiCall(inst, "profile-name", "PUT", { value: metadata.profileName });
      await sleep(500);
    }
    if (metadata.profilePictureUrl) {
      await zApiCall(inst, "profile-picture", "PUT", { value: metadata.profilePictureUrl });
      await sleep(500);
    }
    if (metadata.profileDescription) {
      await zApiCall(inst, "profile-description", "PUT", { value: metadata.profileDescription });
      await sleep(500);
    }

    // Get un-dispatched leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id, phone, name, extra_data")
      .eq("list_id", list.id)
      .eq("dispatched", false)
      .order("created_at", { ascending: true });

    if (!leads || leads.length === 0) continue;

    console.log(`[auto-disparo] Processing list "${list.name}" with ${leads.length} un-dispatched leads`);

    // Create a disparo record
    const { data: disparo } = await supabase
      .from("disparos")
      .insert({
        instance_name: inst.instance_name,
        template_id: template.id,
        list_id: list.id,
        status: "running",
        total: leads.length,
        sent: 0,
        failed: 0,
        user_id: inst.user_id,
        z_api_instance_id: inst.id,
        auto_start: true,
      })
      .select()
      .single();

    let sent = 0;
    let failed = 0;
    let consecutiveFailures = 0;
    let instanceDead = false;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      // Health check every 5 sends or 2 consecutive failures
      if (i % 5 === 0 || consecutiveFailures >= 2) {
        const check = await zApiCall(inst, "status", "GET");
        if (!check.ok || !check.data?.connected) {
          console.log(`[auto-disparo] Instance disconnected/banned. Stopping.`);
          instanceDead = true;
          break;
        }
        if (consecutiveFailures >= 2 && !check.data?.smartphoneConnected) {
          instanceDead = true;
          break;
        }
        consecutiveFailures = 0;
      }

      // Replace variables
      let text = template.content || "";
      const extra = (lead.extra_data || {}) as Record<string, any>;
      text = text
        .replace(/\{\{nome\}\}/gi, lead.name || "")
        .replace(/\{\{telefone\}\}/gi, lead.phone || "")
        .replace(/\{\{email\}\}/gi, extra.email || "")
        .replace(/\{\{empresa\}\}/gi, extra.empresa || "")
        .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString("pt-BR"))
        .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

      try {
        const type = template.type || "text";
        if (type === "media" && metadata.mediaUrl) {
          const mediaType = metadata.mediaType || "image";
          if (mediaType === "image") {
            await zApiCall(inst, "send-image", "POST", { phone: lead.phone, image: metadata.mediaUrl, caption: text });
          } else if (mediaType === "video") {
            await zApiCall(inst, "send-video", "POST", { phone: lead.phone, video: metadata.mediaUrl, caption: text });
          } else if (mediaType === "document") {
            await zApiCall(inst, "send-document", "POST", { phone: lead.phone, document: metadata.mediaUrl, fileName: metadata.fileName || "file", caption: text });
          } else {
            await zApiCall(inst, "send-audio", "POST", { phone: lead.phone, audio: metadata.mediaUrl });
          }
        } else {
          await zApiCall(inst, "send-text", "POST", { phone: lead.phone, message: text });
        }
        sent++;
        consecutiveFailures = 0;

        // Mark lead as dispatched
        await supabase
          .from("leads")
          .update({ dispatched: true, dispatched_at: new Date().toISOString() })
          .eq("id", lead.id);

        // Post-send: Mute → Archive → Delete
        await sleep(300);
        await zApiCall(inst, "modify-chat", "POST", { phone: lead.phone, action: "mute" });
        await sleep(300);
        await zApiCall(inst, "modify-chat", "POST", { phone: lead.phone, action: "archive" });
        await sleep(300);
        await zApiCall(inst, "modify-chat", "POST", { phone: lead.phone, action: "delete" });

      } catch (err) {
        console.error(`[auto-disparo] Error sending to ${lead.phone}:`, err);
        failed++;
        consecutiveFailures++;
      }

      // Update progress every 5
      if ((sent + failed) % 5 === 0) {
        if (disparo) {
          await supabase.from("disparos").update({ sent, failed }).eq("id", disparo.id);
        }
      }

      await sleep(3000);
    }

    // If instance died, disconnect it
    if (instanceDead) {
      console.log(`[auto-disparo] Disconnecting dead instance ${inst.instance_name}`);
      await disconnectInstance(inst);
    }

    // Update disparo record
    if (disparo) {
      await supabase.from("disparos").update({
        sent,
        failed,
        status: instanceDead ? "cancelled" : "completed",
        finished_at: new Date().toISOString(),
      }).eq("id", disparo.id);
    }

    totalSent += sent;
    totalFailed += failed;

    // If instance is dead, stop processing more lists
    if (instanceDead) break;
  }

  return { status: "done", sent: totalSent, failed: totalFailed };
}

// Legacy: process old-style pending disparos
async function processLegacyDisparo(supabase: any, disparo: any) {
  const { data: inst } = await supabase
    .from("z_api_instances")
    .select("*")
    .eq("id", disparo.z_api_instance_id)
    .single();

  if (!inst) return { disparo_id: disparo.id, status: "no_instance" };

  const statusRes = await zApiCall(inst, "status", "GET");
  if (!statusRes.ok || !statusRes.data?.connected) {
    return { disparo_id: disparo.id, status: "instance_disconnected" };
  }

  let template: any = null;
  if (disparo.template_id) {
    const { data: t } = await supabase.from("templates").select("*").eq("id", disparo.template_id).single();
    template = t;
  }

  if (!template) {
    await supabase.from("disparos").update({ status: "failed" }).eq("id", disparo.id);
    return { disparo_id: disparo.id, status: "template_not_found" };
  }

  const metadata = (template.metadata || {}) as Record<string, any>;

  if (metadata.profileName) {
    await zApiCall(inst, "profile-name", "PUT", { value: metadata.profileName });
    await sleep(500);
  }
  if (metadata.profilePictureUrl) {
    await zApiCall(inst, "profile-picture", "PUT", { value: metadata.profilePictureUrl });
    await sleep(500);
  }
  if (metadata.profileDescription) {
    await zApiCall(inst, "profile-description", "PUT", { value: metadata.profileDescription });
    await sleep(500);
  }

  // Get only un-dispatched leads
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, name, extra_data")
    .eq("list_id", disparo.list_id)
    .eq("dispatched", false);

  if (!leads || leads.length === 0) {
    await supabase.from("disparos").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", disparo.id);
    return { disparo_id: disparo.id, status: "no_leads" };
  }

  await supabase.from("disparos").update({ status: "running", total: leads.length }).eq("id", disparo.id);

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    let text = template.content || "";
    const extra = (lead.extra_data || {}) as Record<string, any>;
    text = text
      .replace(/\{\{nome\}\}/gi, lead.name || "")
      .replace(/\{\{telefone\}\}/gi, lead.phone || "")
      .replace(/\{\{email\}\}/gi, extra.email || "")
      .replace(/\{\{empresa\}\}/gi, extra.empresa || "")
      .replace(/\{\{data\}\}/gi, new Date().toLocaleDateString("pt-BR"))
      .replace(/\{\{hora\}\}/gi, new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

    try {
      const type = template.type || "text";
      if (type === "media" && metadata.mediaUrl) {
        const mediaType = metadata.mediaType || "image";
        if (mediaType === "image") {
          await zApiCall(inst, "send-image", "POST", { phone: lead.phone, image: metadata.mediaUrl, caption: text });
        } else if (mediaType === "video") {
          await zApiCall(inst, "send-video", "POST", { phone: lead.phone, video: metadata.mediaUrl, caption: text });
        } else if (mediaType === "document") {
          await zApiCall(inst, "send-document", "POST", { phone: lead.phone, document: metadata.mediaUrl, fileName: metadata.fileName || "file", caption: text });
        } else {
          await zApiCall(inst, "send-audio", "POST", { phone: lead.phone, audio: metadata.mediaUrl });
        }
      } else {
        await zApiCall(inst, "send-text", "POST", { phone: lead.phone, message: text });
      }
      sent++;

      // Mark lead as dispatched
      await supabase
        .from("leads")
        .update({ dispatched: true, dispatched_at: new Date().toISOString() })
        .eq("id", lead.id);

      await sleep(300);
      await zApiCall(inst, "modify-chat", "POST", { phone: lead.phone, action: "mute" });
      await sleep(300);
      await zApiCall(inst, "modify-chat", "POST", { phone: lead.phone, action: "archive" });
      await sleep(300);
      await zApiCall(inst, "modify-chat", "POST", { phone: lead.phone, action: "delete" });

    } catch (err) {
      console.error(`[auto-disparo] Error sending to ${lead.phone}:`, err);
      failed++;
    }

    if ((sent + failed) % 5 === 0) {
      await supabase.from("disparos").update({ sent, failed }).eq("id", disparo.id);
    }

    await sleep(3000);
  }

  await supabase.from("disparos").update({
    sent,
    failed,
    status: "completed",
    finished_at: new Date().toISOString(),
  }).eq("id", disparo.id);

  return { disparo_id: disparo.id, status: "completed", sent, failed };
}

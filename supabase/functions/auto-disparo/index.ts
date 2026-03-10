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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all pending auto_start disparos
    const { data: pendingDisparos, error: dErr } = await supabase
      .from("disparos")
      .select("*")
      .eq("status", "pending")
      .eq("auto_start", true);

    if (dErr) {
      console.error("Error fetching disparos:", dErr.message);
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

      // Get instance from DB
      const { data: inst } = await supabase
        .from("z_api_instances")
        .select("*")
        .eq("id", disparo.z_api_instance_id)
        .single();

      if (!inst) continue;

      // Check if instance is connected
      const statusRes = await zApiCall(inst, "status", "GET");
      if (!statusRes.ok || !statusRes.data?.connected) {
        results.push({ disparo_id: disparo.id, status: "instance_disconnected" });
        continue;
      }

      console.log(`[auto-disparo] Instance ${inst.instance_name} connected! Starting disparo ${disparo.id}`);

      // Get template
      let template: any = null;
      if (disparo.template_id) {
        const { data: t } = await supabase
          .from("templates")
          .select("*")
          .eq("id", disparo.template_id)
          .single();
        template = t;
      }

      if (!template) {
        await supabase.from("disparos").update({ status: "failed" }).eq("id", disparo.id);
        results.push({ disparo_id: disparo.id, status: "template_not_found" });
        continue;
      }

      const metadata = (template.metadata || {}) as Record<string, any>;

      // Update profile before sending
      if (metadata.profileName) {
        console.log(`[auto-disparo] Updating profile name to: ${metadata.profileName}`);
        await zApiCall(inst, "profile-name", "PUT", { value: metadata.profileName });
        await sleep(500);
      }
      if (metadata.profilePictureUrl) {
        console.log(`[auto-disparo] Updating profile picture`);
        await zApiCall(inst, "profile-picture", "PUT", { value: metadata.profilePictureUrl });
        await sleep(500);
      }
      if (metadata.profileDescription) {
        console.log(`[auto-disparo] Updating profile description to: ${metadata.profileDescription}`);
        await zApiCall(inst, "profile-description", "PUT", { value: metadata.profileDescription });
        await sleep(500);
      }

      // Get leads
      const { data: leads } = await supabase
        .from("leads")
        .select("phone, name, extra_data")
        .eq("list_id", disparo.list_id);

      if (!leads || leads.length === 0) {
        await supabase.from("disparos").update({ status: "failed" }).eq("id", disparo.id);
        results.push({ disparo_id: disparo.id, status: "no_leads" });
        continue;
      }

      // Mark as running
      await supabase.from("disparos").update({ status: "running", total: leads.length }).eq("id", disparo.id);

      let sent = 0;
      let failed = 0;

      for (const lead of leads) {
        // Replace variables in content
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
          // Send message based on type
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

          // Post-send actions: Mute → Archive → Delete
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

        // Update progress every 5 messages
        if ((sent + failed) % 5 === 0) {
          await supabase.from("disparos").update({ sent, failed }).eq("id", disparo.id);
        }

        // Delay between messages (3 seconds default)
        await sleep(3000);
      }

      // Mark as completed
      await supabase.from("disparos").update({
        sent,
        failed,
        status: "completed",
        finished_at: new Date().toISOString(),
      }).eq("id", disparo.id);

      results.push({ disparo_id: disparo.id, status: "completed", sent, failed });
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

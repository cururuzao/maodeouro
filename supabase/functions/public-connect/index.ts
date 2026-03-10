import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Z_API_BASE = "https://api.z-api.io";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, name, email, phone } = body;

    if (action === "get-code") {
      // Validate inputs
      if (!name || !email || !phone) {
        return new Response(JSON.stringify({ error: "Nome, email e telefone são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;
      if (cleanPhone.length < 12) {
        return new Response(JSON.stringify({ error: "Número de telefone inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find a disconnected instance
      const { data: instances, error: instErr } = await supabase
        .from("z_api_instances")
        .select("*")
        .order("created_at", { ascending: true });

      if (instErr || !instances || instances.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhuma instância disponível no momento" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to find a disconnected instance
      let selectedInstance = null;
      for (const inst of instances) {
        try {
          const statusUrl = `${Z_API_BASE}/instances/${inst.instance_id}/token/${inst.instance_token}/status`;
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (inst.client_token) headers["Client-Token"] = inst.client_token;
          
          const statusRes = await fetch(statusUrl, { headers });
          const statusData = await statusRes.json();
          
          if (!statusData.connected) {
            selectedInstance = inst;
            break;
          }
        } catch {
          // Skip this instance
        }
      }

      // If all connected, use the first one anyway
      if (!selectedInstance) {
        selectedInstance = instances[0];
      }

      // Generate pairing code
      const codeUrl = `${Z_API_BASE}/instances/${selectedInstance.instance_id}/token/${selectedInstance.instance_token}/phone-code/${cleanPhone}`;
      const codeHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (selectedInstance.client_token) codeHeaders["Client-Token"] = selectedInstance.client_token;

      const codeRes = await fetch(codeUrl, { headers: codeHeaders });
      const codeData = await codeRes.json();

      console.log("[public-connect] Code response:", JSON.stringify(codeData));

      const pairingCode = codeData?.code || codeData?.value;

      if (pairingCode) {
        // Save lead
        await supabase.from("public_leads").insert({
          name,
          email,
          phone: cleanPhone,
          instance_id: selectedInstance.id,
          status: "code_generated",
        });

        return new Response(JSON.stringify({ 
          code: pairingCode,
          instance_db_id: selectedInstance.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (codeData?.connected) {
        return new Response(JSON.stringify({ error: "Olá, tente novamente em 1 minuto pois estamos com alta demanda de vagas" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: codeData?.error || codeData?.message || "Erro ao gerar código" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check-status") {
      const { instance_db_id } = body;
      if (!instance_db_id) {
        return new Response(JSON.stringify({ error: "instance_db_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: inst } = await supabase
        .from("z_api_instances")
        .select("*")
        .eq("id", instance_db_id)
        .single();

      if (!inst) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusUrl = `${Z_API_BASE}/instances/${inst.instance_id}/token/${inst.instance_token}/status`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (inst.client_token) headers["Client-Token"] = inst.client_token;

      const statusRes = await fetch(statusUrl, { headers });
      const statusData = await statusRes.json();

      if (statusData.connected) {
        // Update lead status
        await supabase
          .from("public_leads")
          .update({ status: "connected" })
          .eq("instance_id", instance_db_id)
          .eq("status", "code_generated");
      }

      return new Response(JSON.stringify({ connected: !!statusData.connected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[public-connect] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

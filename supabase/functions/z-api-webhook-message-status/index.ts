/**
 * Webhook Z-API: status da mensagem (SENT, RECEIVED, READ...)
 * Configure em: Z-API > Instância > Webhooks > update-webhook-message-status
 * URL: https://SEU_PROJECT.supabase.co/functions/v1/z-api-webhook-message-status
 *
 * Quando status=RECEIVED, incrementa disparo.delivered
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPayload {
  instanceId?: string;
  status?: string;
  ids?: string[];
  phone?: string;
  type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: WebhookPayload = await req.json();
    const { status, ids, instanceId } = body;

    if (status !== "RECEIVED" || !ids?.length || !instanceId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar disparo_messages com esses zaap_ids e instance_id
    const { data: rows } = await supabase
      .from("disparo_messages")
      .select("id, disparo_id")
      .in("zaap_id", ids)
      .eq("instance_id", instanceId);

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupar por disparo_id (uma mensagem pode ter múltiplos ids em alguns casos)
    const disparoCounts = new Map<string, number>();
    for (const row of rows) {
      disparoCounts.set(row.disparo_id, (disparoCounts.get(row.disparo_id) || 0) + 1);
    }

    for (const [disparoId, count] of disparoCounts) {
      const { data: disp } = await supabase
        .from("disparos")
        .select("delivered")
        .eq("id", disparoId)
        .single();

      const current = (disp?.delivered ?? 0) + count;
      await supabase
        .from("disparos")
        .update({ delivered: current })
        .eq("id", disparoId);
    }

    // Remover registros processados para não contar duas vezes
    await supabase
      .from("disparo_messages")
      .delete()
      .in("zaap_id", ids)
      .eq("instance_id", instanceId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[z-api-webhook-message-status] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

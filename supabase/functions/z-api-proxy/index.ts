import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Z_API_BASE = "https://api.z-api.io";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { instance_id, instance_token, client_token, endpoint, method, payload } = body;

    if (!instance_id || !instance_token || !endpoint) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios: instance_id, instance_token, endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${Z_API_BASE}/instances/${instance_id}/token/${instance_token}/${endpoint}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (client_token) headers["Client-Token"] = client_token;

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers,
    };
    if (payload && (method === "POST" || method === "PUT")) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const apiRes = await fetch(url, fetchOptions);
    const contentType = apiRes.headers.get("content-type") || "";
    
    let responseData;
    if (contentType.includes("application/json")) {
      responseData = await apiRes.json();
    } else {
      const text = await apiRes.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { raw: text };
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: apiRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

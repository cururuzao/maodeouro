import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { date } = await req.json();
    
    if (!date) {
      return new Response(JSON.stringify({ error: "date is required (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rate: number | null = null;

    // Try 1: AwesomeAPI historical
    const dateFormatted = date.replace(/-/g, "");
    try {
      const res = await fetch(
        `https://economia.awesomeapi.com.br/json/daily/USD-BRL/?start_date=${dateFormatted}&end_date=${dateFormatted}`
      );
      const data = await res.json();
      console.log("AwesomeAPI historical response:", JSON.stringify(data));
      if (Array.isArray(data) && data.length > 0 && data[0].bid) {
        rate = parseFloat(data[0].bid);
      }
    } catch (e) {
      console.log("Historical rate fetch failed:", e);
    }

    // Try 2: AwesomeAPI latest rate (always works for current/future dates)
    if (!rate) {
      try {
        const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        const data = await res.json();
        console.log("AwesomeAPI latest response:", JSON.stringify(data));
        if (data?.USDBRL?.bid) {
          rate = parseFloat(data.USDBRL.bid);
        }
      } catch (e) {
        console.error("Latest rate fetch failed:", e);
      }
    }

    // Try 3: Alternative free API
    if (!rate) {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
        const data = await res.json();
        console.log("er-api response result:", data?.result);
        if (data?.result === "success" && data?.rates?.BRL) {
          rate = data.rates.BRL;
        }
      } catch (e) {
        console.error("er-api fetch failed:", e);
      }
    }

    if (!rate) {
      return new Response(JSON.stringify({ error: "Could not fetch exchange rate", rate: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Rate for ${date}: ${rate}`);
    return new Response(JSON.stringify({ rate, date }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

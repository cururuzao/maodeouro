import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date } = await req.json();
    
    if (!date) {
      return new Response(JSON.stringify({ error: "date is required (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AwesomeAPI - free, no key needed, supports historical rates
    // Format date as YYYYMMDD
    const dateFormatted = date.replace(/-/g, "");
    
    // Try historical rate first
    let rate: number | null = null;
    
    try {
      const res = await fetch(
        `https://economia.awesomeapi.com.br/json/daily/USD-BRL/?start_date=${dateFormatted}&end_date=${dateFormatted}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        rate = parseFloat(data[0].bid);
      }
    } catch (e) {
      console.log("Historical rate fetch failed, trying latest:", e);
    }

    // Fallback to latest rate
    if (!rate) {
      try {
        const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        const data = await res.json();
        if (data?.USDBRL?.bid) {
          rate = parseFloat(data.USDBRL.bid);
        }
      } catch (e) {
        console.error("Latest rate fetch also failed:", e);
      }
    }

    if (!rate) {
      return new Response(JSON.stringify({ error: "Could not fetch exchange rate", rate: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

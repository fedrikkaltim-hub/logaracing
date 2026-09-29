import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.event !== "string" || typeof body.sessionId !== "string") {
    return json({ error: "Invalid event payload" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "Function is not configured" }, 500);
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  if (body.event === "session.upsert") {
    const status = body.status === "racing" ? "racing" : body.status === "finished" ? "finished" : "lobby";
    const { error } = await admin.from("logaracing_sessions").upsert({
      id: body.sessionId,
      status,
      started_at: typeof body.startedAt === "string" ? body.startedAt : null,
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: "Could not persist session" }, 500);
    return json({ ok: true });
  }

  if (body.event === "player.upsert") {
    const playerId = typeof body.playerId === "string" ? body.playerId.slice(0, 80) : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 22) : "";
    const color = typeof body.color === "string" ? body.color.slice(0, 20) : "";
    if (!playerId || name.length < 2 || !/^#[\da-f]{6}$/i.test(color)) return json({ error: "Invalid player payload" }, 400);

    const { error: sessionError } = await admin.from("logaracing_sessions").upsert({ id: body.sessionId, status: "lobby", updated_at: new Date().toISOString() });
    if (sessionError) return json({ error: "Could not persist session" }, 500);
    const { error } = await admin.from("logaracing_players").upsert({
      session_id: body.sessionId,
      player_id: playerId,
      name,
      color,
      last_seen: new Date().toISOString(),
    }, { onConflict: "session_id,player_id" });
    if (error) return json({ error: "Could not persist player" }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown event" }, 400);
});

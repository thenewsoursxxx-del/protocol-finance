Deno.serve(async (req) => {
  console.log(`[stars-webhook] Received ${req.method} request`);

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const update = await req.json();

    // Просто отвечаем OK на всё (для теста)
    console.log("[stars-webhook] Update received:", JSON.stringify(update).slice(0, 300) + "...");

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("[stars-webhook] Error:", e);
    return new Response("OK", { status: 200 });
  }
});

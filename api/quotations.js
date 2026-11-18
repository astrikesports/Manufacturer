export default async function handler(req, res) {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    // 🔥 QUERY PARAMS FORWARD
    const query = req.url.split("?")[1];
    const url = `${SUPABASE_URL}/rest/v1/quotations${query ? "?" + query : ""}`;

    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation"
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined
    });

    const text = await response.text();
    res.status(response.status).send(text);

  } catch (err) {
    console.error("PROXY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

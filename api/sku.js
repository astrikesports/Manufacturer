export default async function handler(req, res) {
  try {
    const SHEET_URL =
      "https://docs.google.com/spreadsheets/d/1Y5VQsIQ33UYPOe1-Ul6VV7vv79lbrHnu8aRoAgYLeho/export?format=csv";

    const response = await fetch(SHEET_URL + "&t=" + Date.now());
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch sheet" });
    }

    const text = await response.text();

    // ✅ IMPORTANT: JSON return karo
    const rows = text.split("\n").slice(1);
    const db = {};

    rows.forEach(r => {
      const [sku, mrp, pcs] = r.split(",");
      if (!sku) return;

      db[sku.trim().toUpperCase()] = {
        mrp: Number(mrp) || 0,
        pcs: Number(pcs) || 1
      };
    });

    res.status(200).json(db);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

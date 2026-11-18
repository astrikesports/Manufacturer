const SKU_API_URL =
  "https://script.google.com/macros/s/AKfycbxGm0Btq-A-l0QGYuLBmiqUiHRdvTPVeWAcarlaiCEXViQboDbEkKEXAQjHYc2UxriW9Q/exec"; // 👈 apna URL

let cache = null;

export async function loadSkuDB(force = false) {
  if (cache && !force) return cache;

  const res = await fetch(SKU_API_URL + "?t=" + Date.now()); // 🔥 cache bust

  if (!res.ok) {
    throw new Error("Failed to fetch SKU DB");
  }

  const db = await res.json();

  cache = db;
  return db;
}

export function clearSkuCache() {
  cache = null;
}

import { supabase } from "../supabase";

export async function uploadPaymentImage(file, quotationId) {
  // ✅ already uploaded (jsonb object OR url string)
  if (!file) return null;

  if (typeof file === "string") return file;

  if (file.url && typeof file.url === "string") {
    return file.url; // 🔥 already uploaded
  }

  if (!(file instanceof File)) {
    throw new Error("Invalid payment image");
  }

  const ext = file.name.split(".").pop();
  const uuid = Date.now() + "-" + Math.random().toString(36).slice(2);
  const filePath = `${quotationId}/${uuid}.${ext}`;

  const { error } = await supabase.storage
    .from("payment-images")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("payment-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}


export async function deletePaymentImages(urls = []) {
  if (!urls.length) return;

  const paths = urls.map(url =>
    url.split("/payment-images/")[1]
  );

  await supabase.storage
    .from("payment-images")
    .remove(paths);
}

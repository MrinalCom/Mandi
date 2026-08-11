// Curated per-crop photo URLs. Each was individually searched and visually
// verified (not just keyword-matched) before being added here — same approach
// as the sibling Restaurant project's dishImages.ts. Source: Unsplash.
const CROP_IMAGES: Record<string, string> = {
  Tomato: "https://images.unsplash.com/photo-1662370761575-05ff1ee40d7d",
  Onion: "https://images.unsplash.com/photo-1668295037469-8b0e8d11cd2a",
  Potato: "https://images.unsplash.com/photo-1675501344642-92d35d90fe51",
  Wheat: "https://images.unsplash.com/photo-1529511582893-2d7e684dd128",
  Rice: "https://images.unsplash.com/photo-1651981350249-6173caeeb660",
  Okra: "https://images.unsplash.com/photo-1558408525-1092038389ae",
  Cauliflower: "https://images.unsplash.com/photo-1510627498534-cf7e9002facc",
  Banana: "https://images.unsplash.com/photo-1587132137056-bfbf0166836e",
  Mango: "https://images.unsplash.com/photo-1635716279493-d1e30afc25a0",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1747258703852-5d2c2490d5a8";
export const FARMER_HERO_IMAGE = "https://images.unsplash.com/photo-1609252509027-3928a66302fd";

export function getCropImageUrl(cropName: string, params = "w=480&h=360&fit=crop&q=80"): string {
  const base = CROP_IMAGES[cropName] ?? FALLBACK_IMAGE;
  return `${base}?${params}`;
}

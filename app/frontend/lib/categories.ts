export type CategoryId = "pantai" | "gunung" | "air_terjun" | "wisata_tradisional"

export const CATEGORIES: { id: CategoryId; label: string; description: string }[] = [
  { id: "pantai", label: "Pantai", description: "Coast, beaches, sea" },
  { id: "gunung", label: "Gunung", description: "Mountains, highlands" },
  { id: "air_terjun", label: "Air Terjun", description: "Waterfalls, rivers" },
  { id: "wisata_tradisional", label: "Wisata Tradisional", description: "Heritage, culture" },
]

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  pantai: "Pantai",
  gunung: "Gunung",
  air_terjun: "Air Terjun",
  wisata_tradisional: "Wisata Tradisional",
}


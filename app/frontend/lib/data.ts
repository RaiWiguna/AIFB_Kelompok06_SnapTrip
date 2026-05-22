/**
 * SnapTrip — mock data layer.
 * All data is static for the frontend-only build.
 */

export type CategoryId = "pantai" | "gunung" | "air_terjun" | "wisata_tradisional"

export const CATEGORIES: { id: CategoryId; label: string; description: string }[] = [
  { id: "pantai", label: "Pantai", description: "Coast, beaches, sea" },
  { id: "gunung", label: "Gunung", description: "Mountains, highlands" },
  { id: "air_terjun", label: "Air Terjun", description: "Waterfalls, rivers" },
  { id: "wisata_tradisional", label: "Wisata Tradisional", description: "Heritage, culture" },
]

/* -------- Image library (provided assets) -------- */
export const IMG = {
  heroLandscape: "/landing/hero-bg.png",
  imagePreference: "/landing/section3-bg.png",
  recommendations: "/landing/section4-bg.png",
  planWorkspace: "/landing/section-5.png",
  shareSection: "/landing/section6-bg.png",
  ctaDark: "/landing/section7-bg.png",
  exploreShot: "/landing/explore-shot.png",
  findTripsShot: "/landing/section2-bg.png",
  tripDetailShot: "/landing/trip-detail-shot.png",
  // Photography
  manMountain: "/landing/man-mountain.png",
  bromoTengger: "/landing/bromo-tengger.png",
  baliGateSunset: "/landing/bali-gate-sunset.png",
  diamondBeach: "/landing/diamond-beach.png",
  baliWomanTemple: "/landing/bali-woman-temple.png",
  baliCoastalPano: "/landing/bali-coastal-pano.png",
  indonesiaMap: "/landing/indonesia-map.png",
}

/* -------- Trips -------- */

export type Trip = {
  id: string
  title: string
  cover: string
  region: string
  categories: CategoryId[]
  days: number
  budget: string // formatted IDR string, e.g. "Rp 2.8 jt"
  likes: number
  saves: number
  owner: { name: string; avatar: string; verified?: boolean }
  editorPick?: boolean
  liked?: boolean
}

const AVATARS = {
  dewi: "https://api.dicebear.com/7.x/notionists/svg?seed=Dewi&backgroundColor=ece7dd",
  mikha: "https://api.dicebear.com/7.x/notionists/svg?seed=Mikha&backgroundColor=ece7dd",
  sinta: "https://api.dicebear.com/7.x/notionists/svg?seed=Sinta&backgroundColor=ece7dd",
  andi: "https://api.dicebear.com/7.x/notionists/svg?seed=Andi&backgroundColor=ece7dd",
  putri: "https://api.dicebear.com/7.x/notionists/svg?seed=Putri&backgroundColor=ece7dd",
  gede: "https://api.dicebear.com/7.x/notionists/svg?seed=Gede&backgroundColor=ece7dd",
  raka: "https://api.dicebear.com/7.x/notionists/svg?seed=Raka&backgroundColor=ece7dd",
  rizky: "https://api.dicebear.com/7.x/notionists/svg?seed=Rizky&backgroundColor=ece7dd",
  melati: "https://api.dicebear.com/7.x/notionists/svg?seed=Melati&backgroundColor=ece7dd",
  alex: "https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=ece7dd",
  maya: "https://api.dicebear.com/7.x/notionists/svg?seed=Maya&backgroundColor=ece7dd",
  you: "https://api.dicebear.com/7.x/notionists/svg?seed=You&backgroundColor=f1b58e",
}

export const TRIPS: Trip[] = [
  {
    id: "balis-volcanic-coast",
    title: "Bali’s Volcanic Coast Road Trip",
    cover: IMG.diamondBeach,
    region: "Uluwatu, Melasti, Amed, Sidemen",
    categories: ["pantai", "wisata_tradisional"],
    days: 4,
    budget: "Rp 2,8 jt",
    likes: 1240,
    saves: 892,
    owner: { name: "Dewi Lestari", avatar: AVATARS.dewi, verified: true },
    editorPick: true,
    liked: true,
  },
  {
    id: "nusa-penida-island-explorer",
    title: "Nusa Penida Island Explorer",
    cover: IMG.diamondBeach,
    region: "Klungkung, Bali",
    categories: ["pantai"],
    days: 3,
    budget: "Rp 1,8 jt",
    likes: 842,
    saves: 613,
    owner: { name: "Mikha Ardi", avatar: AVATARS.mikha, verified: true },
  },
  {
    id: "south-bali-beaches-road-trip",
    title: "South Bali Beaches Road Trip",
    cover: IMG.baliCoastalPano,
    region: "Uluwatu — Padang Padang",
    categories: ["pantai"],
    days: 5,
    budget: "Rp 2,1 jt",
    likes: 1100,
    saves: 745,
    owner: { name: "Sinta Aulia", avatar: AVATARS.sinta, verified: true },
  },
  {
    id: "yogyakarta-beach-hopping",
    title: "Yogyakarta Beach Hopping",
    cover: IMG.diamondBeach,
    region: "Gunungkidul Coast",
    categories: ["pantai"],
    days: 3,
    budget: "Rp 1,2 jt",
    likes: 678,
    saves: 421,
    owner: { name: "Andi Wijaya", avatar: AVATARS.andi, verified: true },
  },
  {
    id: "komodo-islands-sailing-escape",
    title: "Komodo Islands Sailing Escape",
    cover: IMG.diamondBeach,
    region: "Labuan Bajo, NTT",
    categories: ["pantai"],
    days: 4,
    budget: "Rp 3,6 jt",
    likes: 1500,
    saves: 938,
    owner: { name: "Putri Prameswari", avatar: AVATARS.putri, verified: true },
  },
  {
    id: "nusa-lembongan-ceningan",
    title: "Nusa Lembongan & Ceningan Island Getaway",
    cover: IMG.diamondBeach,
    region: "Klungkung, Bali",
    categories: ["pantai"],
    days: 2,
    budget: "Rp 950 rb",
    likes: 631,
    saves: 362,
    owner: { name: "Gede Mahendra", avatar: AVATARS.gede, verified: true },
  },
  {
    id: "east-java-coastline-adventure",
    title: "East Java Coastline Adventure",
    cover: IMG.baliCoastalPano,
    region: "Banyuwangi — Malang",
    categories: ["pantai"],
    days: 4,
    budget: "Rp 1,6 jt",
    likes: 789,
    saves: 512,
    owner: { name: "Travel with Raka", avatar: AVATARS.raka, verified: true },
  },
  {
    id: "sunrise-hike-mount-batur",
    title: "Sunrise Hike to Mount Batur",
    cover: IMG.manMountain,
    region: "Kintamani, Bali",
    categories: ["gunung"],
    days: 2,
    budget: "Rp 1,1 jt",
    likes: 742,
    saves: 512,
    owner: { name: "Rizky Pratama", avatar: AVATARS.rizky, verified: true },
  },
  {
    id: "hidden-waterfalls-north-bali",
    title: "Hidden Waterfalls of North Bali",
    cover: IMG.baliCoastalPano,
    region: "Munduk, Singaraja",
    categories: ["air_terjun"],
    days: 3,
    budget: "Rp 1,6 jt",
    likes: 689,
    saves: 421,
    owner: { name: "Sinta Aulia", avatar: AVATARS.sinta, verified: true },
  },
  {
    id: "pink-beach-escape-labuan-bajo",
    title: "Pink Beach Escape — Labuan Bajo",
    cover: IMG.diamondBeach,
    region: "Komodo, NTT",
    categories: ["pantai"],
    days: 3,
    budget: "Rp 2,4 jt",
    likes: 602,
    saves: 388,
    owner: { name: "Melati Putri", avatar: AVATARS.melati, verified: true },
  },
  {
    id: "ubud-culture-heritage-walk",
    title: "Ubud Culture & Heritage Walk",
    cover: IMG.baliWomanTemple,
    region: "Ubud, Bali",
    categories: ["wisata_tradisional"],
    days: 2,
    budget: "Rp 950 rb",
    likes: 631,
    saves: 312,
    owner: { name: "Gede Mahendra", avatar: AVATARS.gede, verified: true },
  },
  {
    id: "ijen-blue-fire-adventure",
    title: "Ijen Blue Fire Adventure",
    cover: IMG.bromoTengger,
    region: "Banyuwangi, East Java",
    categories: ["gunung"],
    days: 2,
    budget: "Rp 1,3 jt",
    likes: 478,
    saves: 265,
    owner: { name: "Andi Wijaya", avatar: AVATARS.andi, verified: true },
  },
]

export const FEATURED_TRIP = TRIPS[0]

export function findTripById(id: string): Trip | undefined {
  return TRIPS.find((t) => t.id === id)
}

/* -------- Recommendations (destination cards) -------- */

export type Recommendation = {
  name: string
  match: number
  category: string
  subCategory: string
  cover: string
  estTime: string
  estBudget: string
  region: string
  reason: string
  hours?: string
  estimateNote?: string
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    name: "Raja Ampat",
    match: 96,
    category: "Nature",
    subCategory: "Islands",
    cover: IMG.diamondBeach,
    estTime: "2.5–3.5 hrs from Bali",
    estBudget: "IDR 3.0M – 5.0M / person",
    region: "West Papua",
    reason: "You love nature and water activities. Secluded islands with vibrant marine life.",
    hours: "Open access · daylight",
    estimateNote: "Costs are estimates from curated seed data.",
  },
  {
    name: "Bromo Tengger Semeru",
    match: 93,
    category: "Nature",
    subCategory: "Volcanoes",
    cover: IMG.bromoTengger,
    estTime: "1.5–2 hrs from Surabaya",
    estBudget: "IDR 1.2M – 2.0M / person",
    region: "East Java",
    reason: "Stunning sunrise views and dramatic volcanic landscapes.",
    hours: "Sunrise viewpoints best 3:30–6:00",
    estimateNote: "Some hours estimated; check before travel.",
  },
  {
    name: "Tumpak Sewu",
    match: 91,
    category: "Nature",
    subCategory: "Waterfalls",
    cover: IMG.baliCoastalPano,
    estTime: "3.5–4 hrs from Malang",
    estBudget: "IDR 800K – 1.3M / person",
    region: "East Java",
    reason: "Epic natural wonder and great for adventure photography.",
    hours: "06:00 – 17:00",
  },
  {
    name: "Yogyakarta",
    match: 88,
    category: "Culture",
    subCategory: "Heritage",
    cover: IMG.baliWomanTemple,
    estTime: "1–1.5 hrs from Yogyakarta",
    estBudget: "IDR 900K – 1.5M / person",
    region: "Special Region of Yogyakarta",
    reason: "Rich culture, heritage sites, and vibrant local experiences.",
    hours: "Site-dependent",
    estimateNote: "Live enrichment unavailable — using curated seed data.",
  },
]

/* -------- Featured trip (for detail page) -------- */

export const TRIP_DETAIL = {
  ...FEATURED_TRIP,
  description:
    "A scenic 6-day road trip along Bali’s southern shores — from cliffside temples and black sand beaches to sunrise hikes and local hidden gems.",
  tags: ["Road Trip", "Nature", "Culture", "Adventure", "Beach"],
  durationDays: 6,
  durationNights: 5,
  estBudget: "IDR 2,800,000",
  travelers: "2 – 8",
  views: 12400,
  comments: 142,
  likesK: "1.2K",
  saves: 892,
  lastUpdated: "May 18, 2025",
  ownerBio:
    "Sharing authentic travel experiences across Indonesia. Lover of nature, culture, and meaningful journeys.",
  ownerStats: { trips: 18, followers: "24.3K", responseRate: "96%" },
  destinations: [
    { day: 1, name: "Ubud", note: "Arrive, rice terraces, local markets", cover: IMG.baliWomanTemple },
    { day: 2, name: "Waterfalls & Temples", note: "Tegenungan, Tirta Empul, Kintamani", cover: IMG.baliCoastalPano },
    { day: 3, name: "Nusa Penida", note: "Kelingking Beach, Broken Beach", cover: IMG.diamondBeach },
    { day: 4, name: "Amed & Sidemen", note: "Coastal drive, viewpoints", cover: IMG.baliCoastalPano },
    { day: 5, name: "Uluwatu & South Coast", note: "Beaches, cliffs, sunset", cover: IMG.diamondBeach },
    { day: 6, name: "Sanur", note: "Relax and departure", cover: IMG.baliWomanTemple },
  ],
  budget: {
    total: "IDR 2,800,000",
    accommodation: { value: "IDR 1,050,000", note: "(5 nights)" },
    transport: { value: "IDR 600,000", note: "(Car & fuel)" },
    meals: { value: "IDR 630,000", note: "(Estimated)" },
    activities: { value: "IDR 360,000", note: "(Attractions)" },
    other: { value: "IDR 160,000", note: "(Tips, parking, misc.)" },
  },
  memo: [
    IMG.diamondBeach,
    IMG.baliCoastalPano,
    IMG.bromoTengger,
    IMG.baliWomanTemple,
  ],
}

/* -------- Image preference flow (Step 3/7) -------- */

export const PREFERENCE_RESULT = {
  trip: ["pantai", "gunung", "air_terjun", "wisata_tradisional"] as const,
  scores: [
    { id: "pantai" as CategoryId, label: "Pantai", value: 90 },
    { id: "gunung" as CategoryId, label: "Gunung", value: 75 },
    { id: "air_terjun" as CategoryId, label: "Air Terjun", value: 65 },
    { id: "wisata_tradisional" as CategoryId, label: "Wisata Tradisional", value: 60 },
  ],
  vibes: ["Alam", "Budaya", "Petualangan", "Relaksasi"],
}

/* -------- Plan workspace (Step 5/7) -------- */

export const PLAN_DRAFT = {
  title: "Bali & Nusa Penida",
  duration: "6 days · 2–8 Aug 2025",
  itinerary: [
    { day: 1, name: "Ubud", note: "Arrive, rice terraces, local markets", cover: IMG.baliWomanTemple },
    { day: 2, name: "Waterfalls & Temples", note: "Tegenungan, Tirta Empul, Kintamani", cover: IMG.baliCoastalPano },
    { day: 3, name: "Nusa Penida", note: "Kelingking Beach, Broken Beach", cover: IMG.diamondBeach },
  ],
  memo: [IMG.diamondBeach, IMG.baliCoastalPano, IMG.bromoTengger, IMG.baliWomanTemple],
  budget: {
    total: "IDR 9,750,000",
    perPerson: "IDR 4,875,000",
    accommodation: "IDR 3,200,000",
    activities: "IDR 4,100,000",
    meals: "IDR 2,450,000",
  },
}

/* -------- Current user (mock auth) -------- */

export const CURRENT_USER = {
  id: "u_self",
  displayName: "Lintang Pertiwi",
  email: "lintang@snaptrip.site",
  avatar: AVATARS.you,
  joinedAt: "Joined Apr 2026",
  bio: "Planning quiet weeks across Java, Bali, and Flores.",
  stats: { trips: 4, joined: 2, collections: 3, likes: 17 },
}

/* -------- Liked trips (subset) -------- */

export const LIKED_TRIP_IDS = [
  "balis-volcanic-coast",
  "sunrise-hike-mount-batur",
  "hidden-waterfalls-north-bali",
  "ubud-culture-heritage-walk",
  "nusa-penida-island-explorer",
  "ijen-blue-fire-adventure",
]

/* -------- Collections -------- */

export type Collection = {
  slug: string
  name: string
  description: string
  count: number
  cover: string
  covers: string[] // grid previews
  tripIds: string[]
  visibility: "private" | "shared"
  updated: string
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "bali-quiet-week",
    name: "Bali quiet week",
    description: "Slow days, temples, and quiet beaches around Sidemen and Amed.",
    count: 6,
    cover: IMG.baliWomanTemple,
    covers: [IMG.baliWomanTemple, IMG.diamondBeach, IMG.baliCoastalPano, IMG.bromoTengger],
    tripIds: [
      "balis-volcanic-coast",
      "ubud-culture-heritage-walk",
      "nusa-penida-island-explorer",
      "south-bali-beaches-road-trip",
      "hidden-waterfalls-north-bali",
      "nusa-lembongan-ceningan",
    ],
    visibility: "private",
    updated: "Updated 3 days ago",
  },
  {
    slug: "java-volcanoes",
    name: "Java volcanoes",
    description: "Sunrise viewpoints from Bromo to Ijen.",
    count: 4,
    cover: IMG.bromoTengger,
    covers: [IMG.bromoTengger, IMG.manMountain, IMG.baliCoastalPano, IMG.diamondBeach],
    tripIds: [
      "sunrise-hike-mount-batur",
      "ijen-blue-fire-adventure",
      "east-java-coastline-adventure",
      "yogyakarta-beach-hopping",
    ],
    visibility: "private",
    updated: "Updated 1 week ago",
  },
  {
    slug: "ocean-corners",
    name: "Ocean corners",
    description: "Cliffs, hidden coves, and pink sand stretches.",
    count: 5,
    cover: IMG.diamondBeach,
    covers: [IMG.diamondBeach, IMG.baliCoastalPano, IMG.baliGateSunset, IMG.baliWomanTemple],
    tripIds: [
      "balis-volcanic-coast",
      "south-bali-beaches-road-trip",
      "komodo-islands-sailing-escape",
      "pink-beach-escape-labuan-bajo",
      "nusa-penida-island-explorer",
    ],
    visibility: "shared",
    updated: "Updated yesterday",
  },
]

export function findCollection(slug: string) {
  return COLLECTIONS.find((c) => c.slug === slug)
}

/* -------- My trips (owned + joined) -------- */

export type MyTrip = {
  id: string
  title: string
  cover: string
  categories: CategoryId[]
  days: number
  estBudget: string
  visibility: "private" | "invite_only" | "public"
  status: "draft" | "accepted"
  updated: string
  participants: number
  ownerName: string
  joinedAs?: "owner" | "viewer"
}

export const MY_TRIPS: MyTrip[] = [
  {
    id: "bali-nusa-penida-aug",
    title: "Bali & Nusa Penida",
    cover: IMG.diamondBeach,
    categories: ["pantai", "wisata_tradisional"],
    days: 6,
    estBudget: "IDR 9,750,000",
    visibility: "private",
    status: "draft",
    updated: "Updated 2 hours ago",
    participants: 2,
    ownerName: "You",
    joinedAs: "owner",
  },
  {
    id: "java-volcano-loop",
    title: "Java Volcano Loop",
    cover: IMG.bromoTengger,
    categories: ["gunung"],
    days: 5,
    estBudget: "IDR 6,200,000",
    visibility: "invite_only",
    status: "accepted",
    updated: "Accepted Apr 24",
    participants: 3,
    ownerName: "You",
    joinedAs: "owner",
  },
  {
    id: "munduk-waterfalls",
    title: "Munduk Waterfalls Weekend",
    cover: IMG.baliCoastalPano,
    categories: ["air_terjun"],
    days: 3,
    estBudget: "IDR 2,400,000",
    visibility: "public",
    status: "accepted",
    updated: "Published Mar 12",
    participants: 1,
    ownerName: "You",
    joinedAs: "owner",
  },
  {
    id: "ubud-heritage-week",
    title: "Ubud Heritage Week",
    cover: IMG.baliWomanTemple,
    categories: ["wisata_tradisional"],
    days: 4,
    estBudget: "IDR 4,100,000",
    visibility: "private",
    status: "draft",
    updated: "Updated yesterday",
    participants: 1,
    ownerName: "You",
    joinedAs: "owner",
  },
]

export const JOINED_TRIPS: MyTrip[] = [
  {
    id: "raka-east-java",
    title: "East Java Coastline Adventure",
    cover: IMG.baliCoastalPano,
    categories: ["pantai"],
    days: 4,
    estBudget: "IDR 1,600,000",
    visibility: "invite_only",
    status: "accepted",
    updated: "Joined Apr 30",
    participants: 5,
    ownerName: "Travel with Raka",
    joinedAs: "viewer",
  },
  {
    id: "sinta-north-bali",
    title: "Hidden Waterfalls of North Bali",
    cover: IMG.baliCoastalPano,
    categories: ["air_terjun"],
    days: 3,
    estBudget: "IDR 1,600,000",
    visibility: "public",
    status: "accepted",
    updated: "Joined Apr 18",
    participants: 4,
    ownerName: "Sinta Aulia",
    joinedAs: "viewer",
  },
]

/* -------- Trip Memo / Itinerary / Budget structured docs (for planner) -------- */

export const PLAN_SESSION = {
  id: "bali-nusa-penida-aug",
  title: "Bali & Nusa Penida",
  range: "2–8 Aug 2025",
  status: "draft" as const,
  participants: [
    { name: "You", avatar: AVATARS.you, role: "Owner" },
    { name: "Alex", avatar: AVATARS.alex, role: "Editor" },
    { name: "Maya", avatar: AVATARS.maya, role: "Viewer" },
  ],
  constraints: {
    duration: "6 days",
    budget: "≤ IDR 10,000,000",
    group: "2 travelers",
    transport: "Private car & ferry",
    pace: "Relaxed",
    notes: "Prefer mornings active, afternoons slow.",
  },
  memoText: {
    overview:
      "Six days across South Bali and Nusa Penida combining temples, rice terraces, and coastal viewpoints with a relaxed pace.",
    style: "Calm mornings, light hiking, and one full island day.",
    notes: [
      "Estimates assume mid-range stays and shared private transport.",
      "Opening hours for some viewpoints may change; check before sunrise pickups.",
      "Costs and hours may be estimates.",
    ],
    assumptions: ["2 travelers", "Aug shoulder season weather", "Domestic SIM available"],
  },
  itinerary: [
    {
      day: 1,
      name: "Ubud",
      note: "Arrive, rice terraces, local markets",
      cover: IMG.baliWomanTemple,
      activities: ["Arrive DPS", "Tegallalang viewpoint", "Ubud market dinner"],
      transport: "Airport pickup",
    },
    {
      day: 2,
      name: "Waterfalls & Temples",
      note: "Tegenungan, Tirta Empul, Kintamani",
      cover: IMG.baliCoastalPano,
      activities: ["Tegenungan morning", "Tirta Empul ritual", "Kintamani lunch"],
      transport: "Private driver",
    },
    {
      day: 3,
      name: "Nusa Penida",
      note: "Kelingking Beach, Broken Beach",
      cover: IMG.diamondBeach,
      activities: ["Fast boat from Sanur", "Kelingking viewpoint", "Diamond Beach"],
      transport: "Fast boat + scooter",
    },
    {
      day: 4,
      name: "Amed & Sidemen",
      note: "Coastal drive, viewpoints",
      cover: IMG.baliCoastalPano,
      activities: ["Coastal drive Amed", "Sidemen rice fields", "Sunset viewpoint"],
      transport: "Private car",
    },
    {
      day: 5,
      name: "Uluwatu & South Coast",
      note: "Beaches, cliffs, sunset",
      cover: IMG.diamondBeach,
      activities: ["Padang Padang beach", "Uluwatu cliff walk", "Kecak dance"],
      transport: "Private car",
    },
    {
      day: 6,
      name: "Sanur",
      note: "Relax and departure",
      cover: IMG.baliWomanTemple,
      activities: ["Beachfront breakfast", "Souvenir lane", "Departure"],
      transport: "Hotel transfer",
    },
  ],
  budgetDoc: {
    total: "IDR 9,750,000",
    perPerson: "IDR 4,875,000",
    rows: [
      { label: "Accommodation", value: "IDR 3,200,000", note: "5 nights · mid-range" },
      { label: "Activities & Transport", value: "IDR 4,100,000", note: "Driver, ferry, entries" },
      { label: "Meals & Other", value: "IDR 2,450,000", note: "Estimated" },
    ],
    estimateNote: "Budget is a planning estimate, not a guaranteed price.",
  },
  messages: [
    {
      from: "user" as const,
      text: "Can we add a sunrise hike on Day 2 and make Day 3 a bit more relaxed?",
    },
    {
      from: "assistant" as const,
      text: "Sure. I’ve added a sunrise hike on Day 2 and adjusted Day 3 to a slower pace.",
      updates: {
        title: "Updates made",
        items: [
          "Added Mount Batur sunrise hike (Day 2) before breakfast",
          "Moved Waterfalls to Day 3 morning",
          "Added afternoon beach time in Nusa Penida",
        ],
      },
    },
    {
      from: "user" as const,
      text: "Looks great! Also, can you keep the budget under IDR 10,000,000?",
    },
    {
      from: "assistant" as const,
      text: "Done. I’ve adjusted the plan and budget to stay under IDR 10,000,000.",
      confirm: { title: "Budget updated", note: "New total: IDR 9,850,000" },
    },
  ],
}

/* -------- Invite tokens (mock states) -------- */

export type InviteState = "valid" | "invalid" | "expired" | "revoked" | "joined" | "auth_required"

export const INVITES: Record<string, { tripId: string; state: InviteState; ownerName: string }> = {
  "bali-aug-2025": { tripId: "bali-nusa-penida-aug", state: "valid", ownerName: "Lintang Pertiwi" },
  expired: { tripId: "bali-nusa-penida-aug", state: "expired", ownerName: "Lintang Pertiwi" },
  revoked: { tripId: "bali-nusa-penida-aug", state: "revoked", ownerName: "Lintang Pertiwi" },
  joined: { tripId: "bali-nusa-penida-aug", state: "joined", ownerName: "Lintang Pertiwi" },
  invalid: { tripId: "", state: "invalid", ownerName: "" },
  auth: { tripId: "bali-nusa-penida-aug", state: "auth_required", ownerName: "Lintang Pertiwi" },
}

/* -------- Helpers used by the new pages -------- */

// Friendly aliases for image keys
export const IMG_ALIAS = {
  bromoMisty: IMG.bromoTengger,
  sunsetGate: IMG.baliGateSunset,
  indonesiaMap: IMG.indonesiaMap,
}

// Per-session planner shape used by /plan/[id]
export type PlanSession = {
  id: string
  title: string
  days: number
  dates: string
  travelers: number
  categories: string[]
  memo: string[]
  memoCount: number
  itinerary: { day: number; name: string; note: string }[]
  budget: {
    total: string
    perPerson: string
    accommodation: string
    activities: string
    meals: string
  }
  messages: { kind: "user" | "assistant" | "updates"; text?: string; items?: string[] }[]
}

export function getPlanSession(id: string): PlanSession | null {
  // For mock, we accept any id and return the same shape.
  return {
    id,
    title: PLAN_DRAFT.title,
    days: 6,
    dates: "2–8 Aug 2025",
    travelers: 2,
    categories: ["Pantai", "Wisata Tradisional", "Air Terjun"],
    memo: PLAN_DRAFT.memo,
    memoCount: 23,
    itinerary: PLAN_DRAFT.itinerary.map((d) => ({ day: d.day, name: d.name, note: d.note })),
    budget: PLAN_DRAFT.budget,
    messages: [
      {
        kind: "user",
        text: "Can we add a sunrise hike on Day 2 and make Day 3 a bit more relaxed?",
      },
      {
        kind: "assistant",
        text: "Sure. I’ve added a sunrise hike on Day 2 and adjusted Day 3 to a slower pace.",
      },
      {
        kind: "updates",
        items: [
          "Added Mount Batur sunrise hike (Day 2) before breakfast",
          "Moved Waterfalls to Day 3 morning",
          "Added afternoon beach time in Nusa Penida",
        ],
      },
      { kind: "user", text: "Looks great! Also, can you keep the budget under IDR 10,000,000?" },
      {
        kind: "assistant",
        text: "Done. I’ve adjusted the plan and budget to stay under IDR 10,000,000.",
      },
    ],
  }
}

// Rich invite preview used by /invite/[token]
export type InvitePreview = {
  state: InviteState
  tripId: string
  tripTitle: string
  cover: string
  inviterName: string
  role: "viewer" | "editor"
  participants: number
  days: number
  dates: string
  region: string
  expiresIn: string
}

export function getInvite(token: string): InvitePreview | null {
  const raw = INVITES[token] ?? INVITES["bali-aug-2025"]
  if (!raw) return null
  const trip = MY_TRIPS.find((t) => t.id === raw.tripId)
  return {
    state: raw.state === "auth_required" ? "valid" : raw.state,
    tripId: raw.tripId || "bali-nusa-penida-aug",
    tripTitle: trip?.title ?? "Bali & Nusa Penida",
    cover: trip?.cover ?? IMG.diamondBeach,
    inviterName: raw.ownerName || "Lintang Pertiwi",
    role: token === "expired" || token === "revoked" ? "viewer" : "editor",
    participants: trip?.participants ?? 2,
    days: trip?.days ?? 6,
    dates: "2–8 Aug 2025",
    region: "Bali, Indonesia",
    expiresIn: token === "expired" ? "yesterday" : "in 6 days",
  }
}

// Display-shape adapter for collection detail
export type CollectionView = {
  slug: string
  title: string
  description: string
  cover: string
  region: string
  categories: string[]
  savesLabel: string
  tripIds: string[]
}

export function getCollectionView(slug: string): CollectionView | null {
  const c = COLLECTIONS.find((x) => x.slug === slug)
  if (!c) return null
  const meta: Record<string, { region: string; categories: string[]; saves: string }> = {
    "bali-quiet-week": { region: "Bali, Indonesia", categories: ["Pantai", "Wisata Tradisional"], saves: "1.4K" },
    "java-volcanoes": { region: "East Java, Indonesia", categories: ["Gunung", "Air Terjun"], saves: "982" },
    "ocean-corners": { region: "Bali · Flores · Lombok", categories: ["Pantai"], saves: "2.1K" },
  }
  const m = meta[slug] ?? { region: "Indonesia", categories: ["Pantai"], saves: "—" }
  return {
    slug: c.slug,
    title: c.name,
    description: c.description,
    cover: c.cover,
    region: m.region,
    categories: m.categories,
    savesLabel: m.saves,
    tripIds: c.tripIds,
  }
}

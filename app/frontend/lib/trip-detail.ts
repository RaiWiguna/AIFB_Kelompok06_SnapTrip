import { IMG } from "./data"

/**
 * Rich trip-detail mock data layer.
 *
 * Backs the redesigned /trips/[id] page and its full-page sub-routes
 * (itinerary, memo, destinations, budget). All shapes here are
 * intentionally additive on top of the existing TRIP_DETAIL summary
 * in lib/data.ts so existing callers keep working.
 */

export type TransportMode = "Drive" | "Ferry" | "Walk" | "Scooter" | "Speedboat" | "Flight"

export type ActivityBlock = {
  /** 24h time, e.g. "08:30" */
  time: string
  title: string
  detail: string
  /** Optional location label rendered as a chip */
  location?: string
  /** Optional duration label, e.g. "2h" */
  duration?: string
}

export type DayPlan = {
  day: number
  /** Short title shown in the collapsed list, e.g. "Ubud" */
  title: string
  /** Single-line summary used in the collapsed list */
  summary: string
  /** Long descriptive paragraph for the full /itinerary page */
  description: string
  /** Hero image used on the full /itinerary page card */
  cover: string
  /** Date label, e.g. "Mon, Aug 4" */
  dateLabel: string
  /** Highlights / tags shown on the full /itinerary page */
  highlights: string[]
  /** Compact activity timeline shown on inline expand + full page */
  activities: ActivityBlock[]
  /** Single transport summary line, e.g. "Drive · Denpasar → Ubud · ~1h" */
  transport: { mode: TransportMode; from: string; to: string; durationLabel: string }
  /** Where you sleep that night */
  accommodation: { name: string; area: string; nights: number }
  /** Meals only shown on the full itinerary page */
  meals?: { breakfast?: string; lunch?: string; dinner?: string }
  /** Per-day estimated cost breakdown */
  estCost: { value: string; note?: string }
}

export type DestinationStop = {
  order: number
  name: string
  region: string
  cover: string
  blurb: string
  highlights: string[]
  /** Approximate coords on the inline map (0–100% within the map frame) */
  pin: { x: number; y: number }
  /** Days that visit this stop, e.g. [1] or [3, 4] */
  days: number[]
}

export type BudgetCategoryId = "accommodation" | "transport" | "meals" | "activities" | "other"

export type BudgetCategory = {
  id: BudgetCategoryId
  label: string
  /** Formatted IDR string, e.g. "IDR 1,050,000" */
  amount: string
  note: string
  /** Line items shown on the full /budget page */
  items: { label: string; amount: string; detail?: string }[]
}

/** Per-day × per-category numeric breakdown for the full /budget page. Values are IDR. */
export type DailyBudgetRow = {
  day: number
  /** e.g. "Ubud" */
  title: string
  /** e.g. "Arrive, rice terraces, local markets" */
  route: string
  amounts: Record<BudgetCategoryId, number>
}

export type TripDetailFull = {
  id: string
  itinerary: DayPlan[]
  destinations: DestinationStop[]
  budgetCategories: BudgetCategory[]
  budgetDaily: DailyBudgetRow[]
  /** GFM markdown body for the full /memo page */
  memoMarkdown: string
  /** Caption shown under the inline 4-image preview */
  memoCaption: string
  memoSource: string
  memoItems: number
  memoTiles: { src: string; alt: string }[]
  galleryThumbs: { src: string; alt: string }[]
  /** Total extra count (the "+12" pill) */
  galleryMore: number
  /** People who have joined this trip (owner-only view) */
  participants: TripParticipant[]
}

export type TripParticipantRole = "Owner" | "Editor" | "Viewer"
export type TripParticipantStatus = "active" | "pending"

export type TripParticipant = {
  id: string
  name: string
  /** Lowercase short handle for chips, e.g. "you", "alex" */
  handle?: string
  avatar: string
  role: TripParticipantRole
  status: TripParticipantStatus
  /** Human label, e.g. "Joined May 12" or "Invited 2 days ago" */
  joinedLabel: string
}

const ITINERARY: DayPlan[] = [
  {
    day: 1,
    title: "Ubud",
    summary: "Arrive, rice terraces, local markets",
    dateLabel: "Mon, Aug 4",
    cover: IMG.baliWomanTemple,
    description:
      "Ease into the trip with a slow afternoon in Ubud. Settle into your stay, wander the rice terraces at golden hour, then graze through the night market for your first proper Balinese dinner.",
    highlights: ["Tegallalang terraces", "Ubud Market", "Local warungs"],
    activities: [
      { time: "10:00", title: "Pickup at DPS Airport", detail: "Driver meet & greet at arrivals", location: "Denpasar", duration: "30m" },
      { time: "12:30", title: "Check-in & lunch", detail: "Drop bags, lunch at a riverside warung", location: "Ubud", duration: "1.5h" },
      { time: "15:00", title: "Tegallalang Rice Terraces", detail: "Walking loop and viewpoint cafe", location: "Tegallalang", duration: "2h" },
      { time: "18:30", title: "Ubud Night Market", detail: "Street food and souvenirs", location: "Ubud Center", duration: "1.5h" },
    ],
    transport: { mode: "Drive", from: "Denpasar", to: "Ubud", durationLabel: "~1h 15m" },
    accommodation: { name: "Alaya Ubud", area: "Ubud Center", nights: 1 },
    meals: { lunch: "Warung Bintang Bali", dinner: "Ubud Night Market" },
    estCost: { value: "IDR 480,000", note: "incl. stay & meals" },
  },
  {
    day: 2,
    title: "Waterfalls & Temples",
    summary: "Tegenungan, Tirta Empul, Kintamani",
    dateLabel: "Tue, Aug 5",
    cover: IMG.baliCoastalPano,
    description:
      "A full day looping through Bali's sacred interior: a swim under Tegenungan, a purification ritual at Tirta Empul, and a late lunch overlooking the Mount Batur caldera in Kintamani.",
    highlights: ["Tegenungan Waterfall", "Tirta Empul ritual", "Batur caldera view"],
    activities: [
      { time: "07:30", title: "Breakfast & departure", detail: "Early start to beat the crowds", location: "Ubud", duration: "1h" },
      { time: "09:00", title: "Tegenungan Waterfall", detail: "Swim and photo stop", location: "Sukawati", duration: "1.5h" },
      { time: "11:30", title: "Tirta Empul Temple", detail: "Optional purification (sarong rental on site)", location: "Tampaksiring", duration: "1.5h" },
      { time: "14:00", title: "Kintamani lunch", detail: "Buffet with caldera view", location: "Kintamani", duration: "1.5h" },
      { time: "17:30", title: "Return to Ubud", detail: "Sunset stop at Pura Gunung Kawi", location: "Ubud", duration: "2h" },
    ],
    transport: { mode: "Drive", from: "Ubud loop", to: "Ubud", durationLabel: "~4h driving" },
    accommodation: { name: "Alaya Ubud", area: "Ubud Center", nights: 1 },
    meals: { breakfast: "Hotel", lunch: "Kintamani caldera buffet", dinner: "Locavore To-Go" },
    estCost: { value: "IDR 520,000", note: "entry fees included" },
  },
  {
    day: 3,
    title: "Nusa Penida",
    summary: "Kelingking Beach, Broken Beach",
    dateLabel: "Wed, Aug 6",
    cover: IMG.diamondBeach,
    description:
      "Speedboat across to Nusa Penida for the trip's most dramatic coastline. Hit Kelingking at first light to skip the queues, swim at Angel's Billabong, and watch the sun set from Broken Beach.",
    highlights: ["Kelingking viewpoint", "Angel's Billabong swim", "Broken Beach sunset"],
    activities: [
      { time: "06:30", title: "Sanur → Penida ferry", detail: "Fast boat, ~45m crossing", location: "Sanur Harbor", duration: "1h" },
      { time: "08:30", title: "Kelingking Beach", detail: "Viewpoint and optional descent", location: "Bunga Mekar", duration: "2h" },
      { time: "12:00", title: "Angel's Billabong & Broken Beach", detail: "Lunch nearby, then swim", location: "Sakti", duration: "3h" },
      { time: "16:30", title: "Crystal Bay sunset", detail: "Drinks on the sand", location: "Crystal Bay", duration: "1.5h" },
    ],
    transport: { mode: "Speedboat", from: "Sanur", to: "Nusa Penida", durationLabel: "~45m" },
    accommodation: { name: "Penida Bay Village", area: "Toyapakeh", nights: 1 },
    meals: { breakfast: "On the boat", lunch: "Penida Colada", dinner: "Penida Bay Village" },
    estCost: { value: "IDR 620,000", note: "incl. ferry & guide" },
  },
  {
    day: 4,
    title: "Amed & Sidemen",
    summary: "Coastal drive, viewpoints",
    dateLabel: "Thu, Aug 7",
    cover: IMG.baliCoastalPano,
    description:
      "Ferry back at sunrise and drive the east coast through Sidemen's emerald rice valleys to the black-sand bays of Amed. Snorkel the Japanese shipwreck before a candlelit dinner above the sea.",
    highlights: ["Sidemen valley drive", "Amed snorkeling", "Japanese wreck dive"],
    activities: [
      { time: "07:00", title: "Penida → Sanur ferry", detail: "Return crossing", location: "Toyapakeh", duration: "1h" },
      { time: "10:00", title: "Sidemen viewpoint stops", detail: "Coffee, rice fields, photos", location: "Sidemen", duration: "2h" },
      { time: "13:30", title: "Lunch in Amlapura", detail: "Local nasi campur", location: "Amlapura", duration: "1h" },
      { time: "15:30", title: "Amed snorkeling", detail: "Japanese shipwreck reef", location: "Jemeluk Bay", duration: "2h" },
      { time: "19:00", title: "Cliffside dinner", detail: "Sunset table booked", location: "Amed", duration: "2h" },
    ],
    transport: { mode: "Drive", from: "Sanur", to: "Amed", durationLabel: "~3h" },
    accommodation: { name: "Sunset Hill Amed", area: "Jemeluk", nights: 1 },
    meals: { breakfast: "Cafe in Sidemen", lunch: "Warung Enak Amlapura", dinner: "Sails Restaurant" },
    estCost: { value: "IDR 440,000", note: "incl. snorkel rental" },
  },
  {
    day: 5,
    title: "Uluwatu & South Coast",
    summary: "Beaches, cliffs, sunset",
    dateLabel: "Fri, Aug 8",
    cover: IMG.diamondBeach,
    description:
      "Cross the island to the southern Bukit peninsula. Lazy morning at Padang Padang, late lunch at Single Fin, then catch the Kecak fire dance as the sun drops behind Uluwatu Temple.",
    highlights: ["Padang Padang", "Single Fin sundowners", "Kecak fire dance"],
    activities: [
      { time: "09:00", title: "Drive to Bukit", detail: "Coastal route via Sanur", location: "Bukit Peninsula", duration: "2.5h" },
      { time: "12:30", title: "Padang Padang Beach", detail: "Swim & seafood lunch", location: "Pecatu", duration: "2h" },
      { time: "15:30", title: "Single Fin sundowners", detail: "Cliff bar at Suluban", location: "Uluwatu", duration: "1.5h" },
      { time: "17:30", title: "Kecak Fire Dance", detail: "Tickets booked, arrive early", location: "Pura Luhur Uluwatu", duration: "1.5h" },
      { time: "20:00", title: "Jimbaran seafood dinner", detail: "Beachfront BBQ", location: "Jimbaran Bay", duration: "1.5h" },
    ],
    transport: { mode: "Drive", from: "Amed", to: "Uluwatu", durationLabel: "~3h 30m" },
    accommodation: { name: "Suarga Padang Padang", area: "Pecatu", nights: 1 },
    meals: { breakfast: "Hotel", lunch: "Padang Padang Warung", dinner: "Jimbaran beachfront" },
    estCost: { value: "IDR 540,000", note: "incl. Kecak ticket" },
  },
  {
    day: 6,
    title: "Sanur",
    summary: "Relax and departure",
    dateLabel: "Sat, Aug 9",
    cover: IMG.baliWomanTemple,
    description:
      "An easy final morning. Walk the Sanur boardwalk at sunrise, last brunch by the water, then a relaxed transfer to the airport with time to spare.",
    highlights: ["Sanur sunrise walk", "Beachfront brunch", "Airport transfer"],
    activities: [
      { time: "06:00", title: "Sunrise on Sanur Beach", detail: "Boardwalk stroll", location: "Sanur", duration: "1.5h" },
      { time: "09:00", title: "Brunch at Genius Cafe", detail: "Beachfront tables", location: "Sanur", duration: "1.5h" },
      { time: "11:30", title: "Last shopping stop", detail: "Sanur weekend market", location: "Sanur", duration: "1h" },
      { time: "14:00", title: "Airport transfer", detail: "Driver pickup, ~30m to DPS", location: "Denpasar", duration: "30m" },
    ],
    transport: { mode: "Drive", from: "Uluwatu", to: "Sanur → DPS", durationLabel: "~1h 30m" },
    accommodation: { name: "Day-use room at Segara Village", area: "Sanur", nights: 0 },
    meals: { breakfast: "Hotel", lunch: "Genius Cafe brunch" },
    estCost: { value: "IDR 200,000", note: "transfer & brunch" },
  },
]

const DESTINATIONS: DestinationStop[] = [
  {
    order: 1,
    name: "Ubud",
    region: "Central Bali",
    cover: IMG.baliWomanTemple,
    blurb:
      "Bali's cultural heart — terraced rice fields, traditional dance, and a thriving food scene tucked into jungle ravines.",
    highlights: ["Rice terraces", "Night market", "Sacred Monkey Forest"],
    pin: { x: 38, y: 32 },
    days: [1, 2],
  },
  {
    order: 2,
    name: "Waterfalls & Temples",
    region: "Tegenungan · Tirta Empul · Kintamani",
    cover: IMG.bromoTengger,
    blurb:
      "A loop through Bali's sacred interior linking jungle waterfalls, a purification temple, and a volcanic caldera lunch stop.",
    highlights: ["Tegenungan swim", "Purification ritual", "Batur caldera"],
    pin: { x: 46, y: 26 },
    days: [2],
  },
  {
    order: 3,
    name: "Nusa Penida",
    region: "South-east islands",
    cover: IMG.diamondBeach,
    blurb:
      "A short ferry from Sanur unlocks Bali's most dramatic coastline — sheer cliffs, turquoise bays, and far fewer crowds than the mainland.",
    highlights: ["Kelingking Beach", "Broken Beach", "Crystal Bay sunset"],
    pin: { x: 60, y: 70 },
    days: [3],
  },
  {
    order: 4,
    name: "Amed & Sidemen",
    region: "East Bali",
    cover: IMG.baliCoastalPano,
    blurb:
      "Quiet east-coast fishing villages backed by emerald rice valleys, with calm bays perfect for snorkeling and a Japanese WWII shipwreck reef just offshore.",
    highlights: ["Sidemen drive", "Jemeluk Bay snorkel", "Japanese wreck"],
    pin: { x: 70, y: 30 },
    days: [4],
  },
  {
    order: 5,
    name: "Uluwatu & South Coast",
    region: "Bukit Peninsula",
    cover: IMG.diamondBeach,
    blurb:
      "Limestone cliffs, world-class surf breaks, and a clifftop temple where the Kecak fire dance plays out at sunset.",
    highlights: ["Padang Padang", "Single Fin", "Kecak fire dance"],
    pin: { x: 28, y: 68 },
    days: [5],
  },
  {
    order: 6,
    name: "Sanur",
    region: "South-east coast",
    cover: IMG.baliGateSunset,
    blurb:
      "A laid-back beach town with calm reef-protected swimming, a long boardwalk, and quick airport access — the ideal soft landing before flying out.",
    highlights: ["Boardwalk", "Genius Cafe", "DPS transfer"],
    pin: { x: 50, y: 58 },
    days: [6],
  },
]

const BUDGET_DAILY: DailyBudgetRow[] = [
  {
    day: 1,
    title: "Ubud",
    route: "Arrive, rice terraces, local markets",
    amounts: { accommodation: 250_000, transport: 120_000, meals: 100_000, activities: 60_000, other: 30_000 },
  },
  {
    day: 2,
    title: "Waterfalls & Temples",
    route: "Tegenungan, Tirta Empul, Kintamani",
    amounts: { accommodation: 250_000, transport: 140_000, meals: 110_000, activities: 70_000, other: 30_000 },
  },
  {
    day: 3,
    title: "Nusa Penida",
    route: "Kelingking Beach, Broken Beach",
    amounts: { accommodation: 250_000, transport: 200_000, meals: 120_000, activities: 150_000, other: 40_000 },
  },
  {
    day: 4,
    title: "Amed & Sidemen",
    route: "Coastal drive, viewpoints",
    amounts: { accommodation: 250_000, transport: 140_000, meals: 100_000, activities: 40_000, other: 20_000 },
  },
  {
    day: 5,
    title: "Uluwatu & South Coast",
    route: "Beaches, cliffs, sunset",
    amounts: { accommodation: 250_000, transport: 120_000, meals: 100_000, activities: 30_000, other: 20_000 },
  },
  {
    day: 6,
    title: "Sanur",
    route: "Relax and departure",
    amounts: { accommodation: 250_000, transport: 140_000, meals: 100_000, activities: 10_000, other: 20_000 },
  },
]

const BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    id: "accommodation",
    label: "Accommodation",
    amount: "IDR 1,050,000",
    note: "(5 nights)",
    items: [
      { label: "Alaya Ubud", amount: "IDR 420,000", detail: "2 nights · breakfast included" },
      { label: "Penida Bay Village", amount: "IDR 180,000", detail: "1 night · ocean-view room" },
      { label: "Sunset Hill Amed", amount: "IDR 200,000", detail: "1 night · cliffside" },
      { label: "Suarga Padang Padang", amount: "IDR 250,000", detail: "1 night · pool access" },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    amount: "IDR 600,000",
    note: "(Car & fuel)",
    items: [
      { label: "Private driver (6 days)", amount: "IDR 360,000", detail: "Shared between travelers" },
      { label: "Fuel", amount: "IDR 110,000" },
      { label: "Sanur ↔ Penida fast boat", amount: "IDR 130,000", detail: "Round trip" },
    ],
  },
  {
    id: "meals",
    label: "Meals",
    amount: "IDR 630,000",
    note: "(Estimated)",
    items: [
      { label: "Breakfasts", amount: "IDR 90,000", detail: "Mostly hotel-included" },
      { label: "Lunches", amount: "IDR 240,000", detail: "Warungs & cafes" },
      { label: "Dinners", amount: "IDR 300,000", detail: "Mix of casual & one cliffside" },
    ],
  },
  {
    id: "activities",
    label: "Activities & Tickets",
    amount: "IDR 360,000",
    note: "(Attractions)",
    items: [
      { label: "Tirta Empul entry & sarong", amount: "IDR 35,000" },
      { label: "Kelingking & Penida tour", amount: "IDR 180,000" },
      { label: "Amed snorkel rental", amount: "IDR 60,000" },
      { label: "Kecak fire dance ticket", amount: "IDR 85,000" },
    ],
  },
  {
    id: "other",
    label: "Other",
    amount: "IDR 160,000",
    note: "(Tips, parking, misc.)",
    items: [
      { label: "Driver tip", amount: "IDR 60,000" },
      { label: "Parking & temple donations", amount: "IDR 40,000" },
      { label: "SIM card / data", amount: "IDR 60,000", detail: "Local provider, 30 days" },
    ],
  },
]

const MEMO_TILES = [
  { src: IMG.diamondBeach, alt: "Cliffside cove with turquoise water on Nusa Penida" },
  { src: IMG.baliCoastalPano, alt: "Tegenungan-style waterfall plunging into a jungle pool" },
  { src: IMG.bromoTengger, alt: "Emerald rice terraces and palms in central Bali" },
  { src: IMG.baliWomanTemple, alt: "Balinese dancer in traditional gold headdress" },
]

const GALLERY_THUMBS = [
  { src: IMG.diamondBeach, alt: "Coastline aerial" },
  { src: IMG.baliWomanTemple, alt: "Sacred temple gates" },
  { src: IMG.baliCoastalPano, alt: "Waterfall in jungle" },
  { src: IMG.bromoTengger, alt: "Rice terraces" },
  { src: IMG.baliCoastalPano, alt: "Coastal road viewpoint" },
  { src: IMG.diamondBeach, alt: "Cliff cove" },
]

const MEMO_MARKDOWN = `## Why this trip

This road trip captures the best of Bali's natural beauty and local culture. We'll explore volcanic highlands, sacred temples, hidden waterfalls, and dramatic coastal roads. Perfect for travelers who love **scenic drives**, *light adventures*, and meaningful experiences.

### What I packed for it

- Lightweight rain shell (afternoon showers in Kintamani)
- Reef-safe sunscreen and a quick-dry towel
- A **sarong** — required at most temples
- Cash in small notes for parking, tips, and offerings

### Days I'd protect at all costs

1. **Day 3 — Nusa Penida.** Leave at 6am or skip Kelingking entirely.
2. **Day 5 — Uluwatu sunset.** Pre-book the Kecak dance; it sells out by 4pm in high season.
3. **Day 2 — Tirta Empul.** Go early; the queue past 10am is brutal.

### A note on driving

The roads on the east coast are narrow but quiet. The Bukit peninsula in the south is the opposite — short distances, but traffic can double your driving time. Build buffer into evenings, not mornings.

> "The best Bali days start before sunrise and end with bare feet on warm tiles." — saved from a friend's blog post

### Where the photos come from

Saved from Instagram, Pinterest, and the camera roll across two scouting trips in 2024. **23 items** in total — see the destinations page for the per-stop shortlist.
`

const PARTICIPANTS: TripParticipant[] = [
  {
    id: "you",
    name: "You",
    handle: "you",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=You&backgroundColor=f1b58e",
    role: "Owner",
    status: "active",
    joinedLabel: "Owner since May 18",
  },
  {
    id: "alex",
    name: "Alex Rivera",
    handle: "alex",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Alex&backgroundColor=ece7dd",
    role: "Editor",
    status: "active",
    joinedLabel: "Joined May 21",
  },
  {
    id: "maya",
    name: "Maya Chen",
    handle: "maya",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Maya&backgroundColor=ece7dd",
    role: "Viewer",
    status: "active",
    joinedLabel: "Joined May 23",
  },
  {
    id: "rizky",
    name: "Rizky P.",
    handle: "rizky",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Rizky&backgroundColor=ece7dd",
    role: "Viewer",
    status: "pending",
    joinedLabel: "Invited 2 days ago",
  },
  {
    id: "melati",
    name: "Melati S.",
    handle: "melati",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Melati&backgroundColor=ece7dd",
    role: "Viewer",
    status: "pending",
    joinedLabel: "Invited yesterday",
  },
]

const TRIP_DETAIL_FULL: Record<string, TripDetailFull> = {
  "bali-volcanic-coast": {
    id: "bali-volcanic-coast",
    itinerary: ITINERARY,
    destinations: DESTINATIONS,
    budgetCategories: BUDGET_CATEGORIES,
    budgetDaily: BUDGET_DAILY,
    memoMarkdown: MEMO_MARKDOWN,
    memoCaption: "Saved from Instagram, Pinterest, and camera roll",
    memoSource: "Saved from Instagram, Pinterest, and camera roll",
    memoItems: 23,
    memoTiles: MEMO_TILES,
    galleryThumbs: GALLERY_THUMBS,
    galleryMore: 12,
    participants: PARTICIPANTS,
  },
}

/** Default detail used when a trip ID has no bespoke content. */
const DEFAULT_DETAIL: TripDetailFull = TRIP_DETAIL_FULL["bali-volcanic-coast"]

export function getTripDetailFull(id: string): TripDetailFull {
  return TRIP_DETAIL_FULL[id] ?? DEFAULT_DETAIL
}

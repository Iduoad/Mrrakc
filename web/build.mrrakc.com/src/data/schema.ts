import { z } from 'zod';

export const KINDS = [
  "history/archaeological-site", "history/gate", "history/bastion", "history/kasbah", "history/historic-site", "history/monument",
  "nature/cave", "nature/zoo", "nature/oasis", "nature/aquarium", "nature/forest", "nature/beach", "nature/lake", "nature/park", "nature/dam", "nature/river", "nature/water-source", "nature/waterfall", "nature/canyon", "nature/mountain", "nature/pass",
  "entertainment/cinema", "entertainment/theatre", "entertainment/amusement-park", "entertainment/gaming", "entertainment/playground",
  "sports/karting", "sports/skatepark", "sports/park", "sports/aerodrome", "sports/swimming-pool", "sports/stadium",
  "culture/workshop", "culture/library", "culture/museum", "culture/art-gallery", "culture/cultural-center",
  "religion/mosque", "religion/zaouiya", "religion/mausoleum", "religion/synagogue", "religion/jewish-site", "religion/church", "religion/christian-site",
  "public-space/park", "urban/square", "urban/park", "urban/fountain", "urban/landmark", "urban/corniche", "urban/viewpoint", "urban/street-art", "urban/port", "urban/tannery", "urban/water-infrastructure",
  "shopping/market", "shopping/mall", "shopping/shop", "shopping/artisanal-complex", "shopping/cooperative",
  "leisure/hammam", "food/restaurant", "food/street-food", "food/cafe", "food/bakery", "food/pastry",
  "architecture/kasbah", "architecture/ksar", "architecture/building", "architecture/villa", "architecture/cite", "architecture/palace", "architecture/tower", "architecture/school", "architecture/house", "architecture/riad", "architecture/skyscraper", "architecture/hotel", "architecture/district", "architecture/garage", "architecture/hospital", "architecture/pharmacy", "architecture/lighthouse", "architecture/port", "architecture/village", "architecture/bridge",
  "accommodation/hotel", "accommodation/refuge", "accommodation/hostel", "accommodation/riad", "accommodation/gite",
  "service/guide-office", "service/rental", "service/taxi-station", "service/bus-station", "service/coworking", "admin/gendarmerie"
] as const;

export const ACTIVITIES = [
  "sports/surfing", "sports/kitesurfing", "sports/windsurfing", "sports/sandboarding",
  "sports/hiking", "sports/mountain-biking", "sports/rock-climbing", "sports/paragliding",
  "sports/horseback-riding", "sports/camel-riding",
  "sports/skiing", "sports/snowboarding",
  "sports/running", "sports/cycling", "sports/tennis", "sports/padel", "sports/golf",
  "sports/swimming", "sports/fitness", "sports/yoga", "sports/martial-arts",
  "nature/bird-watching", "nature/camping", "nature/picnicking", "nature/fishing", "nature/stargazing",
  "leisure/relaxing", "leisure/socializing", "leisure/photography", "leisure/spa", "leisure/hammam",
  "culture/sightseeing", "culture/guided-tour", "culture/museum-visit", "culture/workshop", "culture/reading", "culture/event-attendance",
  "utility/coworking", "utility/studying", "utility/shopping", "utility/dining", "utility/eating",
  "religion/prayer", "religion/worship", "religion/pilgrimage"
] as const;

export const ITEMS = [
  "cuisine/moroccan", "cuisine/mediterranean", "cuisine/lebanese", "cuisine/middle-eastern",
  "cuisine/italian", "cuisine/french", "cuisine/spanish", "cuisine/european",
  "cuisine/asian", "cuisine/japanese", "cuisine/chinese", "cuisine/indian", "cuisine/thai",
  "cuisine/mexican", "cuisine/american", "cuisine/international",
  "cuisine/seafood", "cuisine/vegetarian", "cuisine/vegan", "cuisine/halal",
  "cuisine/fast-food", "cuisine/street-food", "cuisine/bakery", "cuisine/cafe",
  "food/coffee", "food/tea", "food/pastries", "food/juice", "food/traditional-sweets", "food/local-produce", "food/spices",
  "shopping/handicrafts", "shopping/carpets", "shopping/pottery", "shopping/leather-goods", "shopping/jewelry", "shopping/clothing", "shopping/argan-oil",
  "architecture/ruins", "architecture/monuments", "architecture/islamic-art", "architecture/fountains", "architecture/mosaics", "architecture/traditional-decor",
  "nature/gardens", "nature/wildlife", "nature/scenic-views", "nature/trails", "nature/water-features",
  "amenities/seating-areas", "amenities/power-outlets", "amenities/free-wifi", "amenities/parking", "amenities/restrooms", "amenities/playground", "amenities/air-conditioning"
] as const;

export const PROVINCES = [
  "agadir-ida-ou-tanane", "al-haouz", "al-hoceima", "aousserd", "assa-zag", "azilal", "beni-mellal", "benslimane", "berkane", "berrechid", "boujdour", "boulemane", "casablanca", "chefchaouen", "chichaoua", "chtouka-ait-baha", "driouch", "el-hajeb", "el-jadida", "el-kelaa-des-sraghna", "errachidia", "essaouira", "es-semara", "fahs-anjra", "fez", "figuig", "fquih-ben-salh", "guelmim", "guercif", "ifrane", "inezgane-ait-melloul", "jerada", "kenitra", "khemisset", "khenifra", "khouribga", "laayoune", "larache", "marrakesh", "m-diq-fnideq", "mediouna", "meknes", "midelt", "mohammedia", "moulay-yacoub", "nador", "nouaceur", "ouarzazate", "oued-ed-dahab", "ouezzane", "oujda-angad", "rabat", "rehamna", "safi", "sale", "sefrou", "settat", "sidi-bennour", "sidi-ifni", "sidi-kacem", "sidi-slimane", "skhirate-temara", "tangier-assilah", "tan-tan", "taounate", "taourirt", "tarfaya", "taroudant", "tata", "taza", "tetouan", "tinghir", "tiznit", "youssoufia", "zagora"
] as const;

export const ACCESS_STATUS = [
  "open", "closed", "temporarily_closed", "under_construction", "under_renovation", "restricted"
] as const;

export const ACCESS_TYPE = [
  "private", "public", "restricted", "forbidden"
] as const;

export const ACCESS_MODALITY = [
  "ticket", "membership", "donation", "free", "consumption"
] as const;

export const AUDIENCE = [
  "all", "locals", "tourists", "children", "muslims", "students"
] as const;

export const RELIABILITY = ["poor", "average", "good", "excellent"] as const;
export const PRICE_LEVELS = ["very_cheap", "cheap", "moderate", "expensive", "very_expensive"] as const;
export const COFFEE_QUALITY = ["poor", "average", "good", "excellent"] as const;
export const SEAT_COMFORT = ["poor", "average", "good", "excellent"] as const;
export const DESK_SPACE = ["cramped", "adequate", "spacious"] as const;
export const DESK_OPTIONS = ["bar_stools", "lounge_chairs", "standard_tables", "standing_desks", "private_booths", "outdoor"] as const;
export const POWER_OUTLETS = ["none", "scarce", "moderate", "abundant"] as const;
export const NATURAL_LIGHT = ["none", "low", "moderate", "bright"] as const;
export const AMENITIES = ["printer", "scanner", "projector", "whiteboard", "meeting_rooms", "phone_booths", "lockers", "air_conditioning", "heating"] as const;
export const NOISE_LEVEL = ["silent", "quiet", "moderate", "loud", "very_loud"] as const;
export const AESTHETICS = ["poor", "average", "good", "excellent"] as const;
export const WORK_AUDIENCE = ["students", "entrepreneurs", "developers", "generic"] as const;

export const WorkConditionsSchema = z.object({
  overall: z.number().min(0).max(5),
  comment: z.string().optional(),
  wifi: z.object({
    available: z.boolean().optional(),
    reliable: z.enum(RELIABILITY).optional(),
    speedMbps: z.number().min(0).optional(),
    password: z.string().optional(),
    comment: z.string().optional(),
  }).optional(),
  consumption: z.object({
    price: z.enum(PRICE_LEVELS).optional(),
    renewalIntervalHours: z.number().optional(),
    coffeeQuality: z.enum(COFFEE_QUALITY).optional(),
    comment: z.string().optional(),
  }).optional(),
  environment: z.object({
    seatComfort: z.enum(SEAT_COMFORT).optional(),
    deskSpace: z.enum(DESK_SPACE).optional(),
    deskOptions: z.array(z.enum(DESK_OPTIONS)).optional(),
    powerOutlets: z.enum(POWER_OUTLETS).optional(),
    naturalLight: z.enum(NATURAL_LIGHT).optional(),
    aesthetics: z.enum(AESTHETICS).optional(),
    amenities: z.array(z.enum(AMENITIES)).optional(),
    comment: z.string().optional(),
  }).optional(),
  atmosphere: z.object({
    noiseLevel: z.enum(NOISE_LEVEL).optional(),
    peakHours: z.array(z.string()).optional(),
    laptopFriendly: z.boolean().optional(),
    audience: z.array(z.enum(WORK_AUDIENCE)).optional(),
    comment: z.string().optional(),
  }).optional(),
});

// Zod Schema matching Mrrakc Places Schema
export const PlaceSchema = z.object({
  version: z.literal("mrrakc/v0"),
  kind: z.enum(KINDS),
  metadata: z.object({
    tags: z.array(z.string()),
  }),
  spec: z.object({
    name: z.string().min(1, "Name is required"),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID must be kebab-case"),
    description: z.string().min(1, "Description is required"),
    location: z.object({
      longitude: z.number(),
      latitude: z.number(),
      altitude: z.number().optional(),
      province: z.string().regex(/^province\/[a-z0-9-]+$/),
    }),
    people: z.array(z.object({
      id: z.string().regex(/^people\/[a-z0-9-]+$/),
      relationship: z.array(z.string()),
      comment: z.string().optional(),
    })),
    timeline: z.array(z.object({
      title: z.string(),
      date: z.string(),
      description: z.string(),
    })),
    links: z.array(z.object({
      url: z.string().url(),
      title: z.string(),
      type: z.enum(["article", "video", "image", "movie", "website", "book", "social", "map"]),
    })),
    activities: z.array(z.enum(ACTIVITIES)),
    items: z.array(z.enum(ITEMS)),
    access: z.object({
      status: z.enum(ACCESS_STATUS),
      type: z.enum(ACCESS_TYPE),
      options: z.array(z.object({
        title: z.string(),
        modality: z.enum(ACCESS_MODALITY),
        audience: z.enum(AUDIENCE),
        entranceFee: z.number().min(-1),
      })),
    }),
    workConditions: WorkConditionsSchema.optional(),
    timePeriods: z.array(z.string()).min(1, "At least one time period is required"),
    comments: z.array(z.string()),
  }),
  _internal: z.object({
    createdAt: z.string(),
    lastModified: z.string(),
  }).optional(),
});

// ---------------------------------------------------------------------------
// Plans (itineraries / "Blanat") — mirrors schema/plans.json
// ---------------------------------------------------------------------------

export const STEP_TYPES = ["waypoint", "activity", "break", "overnight"] as const;

export const TRANSPORT_MODES = [
  "Walking", "Taxi", "Shared Taxi", "Bus", "Mini Bus", "Plane", "Mule", "Train",
] as const;

export const DURATION_UNITS = ["minutes", "hours", "days"] as const;

export const PLAN_DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;

// The dataset uses a few different plan kinds; offer the common ones but allow
// any string so legacy records round-trip.
export const PLAN_KINDS = [
  "plans/itinerary", "plans/trek", "plans/food-tour", "plans/road-trip",
  "plans/day-trip", "plans/tour", "plans/cultural-tour",
] as const;

// A place reference inside a step: places/<province>/<id>
const PLACE_REF = /^places\/[a-z0-9-]+\/[a-z0-9-]+$/;
const PEOPLE_REF = /^people\/[a-z0-9-]+$/;

export interface PlanStep {
  title: string;
  description?: string;
  type: (typeof STEP_TYPES)[number];
  placeIds?: string[];
  people?: { id: string; role: string }[];
  optional?: boolean;
  transportToNext?: {
    mode: (typeof TRANSPORT_MODES)[number];
    durationMin: number;
    advice?: string;
  };
  subSteps?: PlanStep[];
}

export const PlanStepSchema: z.ZodType<PlanStep> = z.lazy(() =>
  z.object({
    title: z.string().min(1, "Step title is required"),
    description: z.string().optional(),
    type: z.enum(STEP_TYPES),
    placeIds: z.array(z.string().regex(PLACE_REF, "Must be places/<province>/<id>")).optional(),
    people: z.array(z.object({
      id: z.string().regex(PEOPLE_REF, "Must be people/<id>"),
      role: z.string(),
    })).optional(),
    optional: z.boolean().optional(),
    transportToNext: z.object({
      mode: z.enum(TRANSPORT_MODES),
      durationMin: z.number().int().min(0),
      advice: z.string().optional(),
    }).optional(),
    subSteps: z.array(PlanStepSchema).optional(),
  }),
);

export const PlanSchema = z.object({
  version: z.literal("mrrakc/v0"),
  kind: z.string().min(1, "Kind is required"),
  metadata: z.object({
    tags: z.array(z.string()),
  }).optional(),
  spec: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID must be kebab-case"),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    pubDate: z.string().optional(),
    estimatedDuration: z.object({
      value: z.number().min(0),
      unit: z.enum(DURATION_UNITS),
    }),
    difficulty: z.enum(PLAN_DIFFICULTIES),
    steps: z.array(PlanStepSchema),
  }),
});

export type Plan = z.infer<typeof PlanSchema>;

// Relaxed schema for the local editor: existing dataset files often have an
// empty timePeriods array and placeholder descriptions, which the strict
// PlaceSchema rejects. This lets legacy records be saved after minor edits
// without forcing the user to complete every required field.
export const PlaceEditSchema = PlaceSchema.extend({
  spec: PlaceSchema.shape.spec.extend({
    description: z.string(),
    timePeriods: z.array(z.string()),
  }),
});

export type Place = z.infer<typeof PlaceSchema>;

// ---------------------------------------------------------------------------
// Events (festivals / moussems) — mirrors schema/events.json
//
// Intentionally lenient: recurrence branch fields are all optional and most
// spec sub-objects are optional, so partial/legacy records round-trip. The
// strict JSON Schema (schema/events.json) + `boon` remains the authority.
// ---------------------------------------------------------------------------

export const EVENT_KINDS = [
  "festival/music", "festival/traditional-arts", "festival/poetry", "festival/theater",
  "festival/film", "festival/visual-arts", "festival/harvest", "festival/heritage",
  "festival/gastronomy", "moussem/religious", "moussem/cultural", "fair/book", "fair/agriculture",
] as const;

export const EVENT_STATUS = ["active", "discontinued", "unknown"] as const;

export const RECURRENCE_FREQUENCIES = ["annual", "biennial", "irregular"] as const;
export const RECURRENCE_TYPES = ["gregorian", "hijri", "seasonal", "irregular"] as const;
export const RECURRENCE_PARTS = ["early", "mid", "late", "first-half", "second-half", "full"] as const;
export const OBSERVANCES = ["ramadan", "eid-al-fitr", "eid-al-adha", "mawlid", "ashura", "hijri-new-year"] as const;
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

export const EVENT_ADMISSION_MODALITY = ["ticket", "pass", "membership", "donation", "free", "consumption"] as const;
export const LINK_TYPES = ["article", "video", "image", "movie", "website", "book", "social", "map", "program"] as const;

export const EDITION_STATUS = ["held", "cancelled"] as const;

const PROVINCE_REF = /^province\/[a-z0-9-]+$/;
const EVENT_PLACE_REF = /^places\/[a-z0-9-]+\/[a-z0-9-]+$/;

export const EventLinkSchema = z.object({
  url: z.string().url("Must be a URL"),
  title: z.string().min(1, "Link title is required"),
  type: z.enum(LINK_TYPES),
});

export const EditionSchema = z.object({
  edition: z.number().int().min(1).optional(),
  year: z.number().int().min(1800).max(2100),
  status: z.enum(EDITION_STATUS).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  provinces: z.array(z.string().regex(PROVINCE_REF, "Must be province/<slug>")).optional(),
  places: z.array(z.string().regex(EVENT_PLACE_REF, "Must be places/<province>/<id>")).optional(),
  links: z.array(EventLinkSchema).optional(),
  notes: z.string().optional(),
});

export const EventSchema = z.object({
  version: z.literal("mrrakc/v0"),
  kind: z.enum(EVENT_KINDS),
  metadata: z.object({ tags: z.array(z.string()) }).optional(),
  spec: z.object({
    name: z.string().min(1, "Name is required"),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID must be kebab-case"),
    description: z.string().min(1, "Description is required"),
    status: z.enum(EVENT_STATUS),
    host: z.object({
      provinces: z.array(z.string().regex(PROVINCE_REF, "Must be province/<slug>"))
        .min(1, "At least one host province is required"),
      places: z.array(z.string().regex(EVENT_PLACE_REF, "Must be places/<province>/<id>")).optional(),
    }),
    recurrence: z.object({
      frequency: z.enum(RECURRENCE_FREQUENCIES),
      type: z.enum(RECURRENCE_TYPES),
      typicalDurationDays: z.number().min(0).optional(),
      note: z.string().optional(),
      urls: z.array(z.object({ url: z.string(), title: z.string().optional() })).optional(),
      // gregorian
      months: z.array(z.number().int().min(1).max(12)).optional(),
      part: z.enum(RECURRENCE_PARTS).optional(),
      // hijri
      hijriMonth: z.number().int().min(1).max(12).optional(),
      hijriDay: z.number().int().min(1).max(30).optional(),
      observance: z.enum(OBSERVANCES).optional(),
      // seasonal
      season: z.enum(SEASONS).optional(),
    }),
    admission: z.object({
      options: z.array(z.object({
        title: z.string().min(1, "Admission title is required"),
        modality: z.enum(EVENT_ADMISSION_MODALITY),
        audience: z.enum(AUDIENCE),
        entranceFee: z.number().min(-1),
      })).min(1),
    }).optional(),
    editions: z.array(EditionSchema).optional(),
    links: z.array(EventLinkSchema).optional(),
    comments: z.array(z.string()).optional(),
  }),
});

export type Event = z.infer<typeof EventSchema>;
export type Edition = z.infer<typeof EditionSchema>;
export type EventLink = z.infer<typeof EventLinkSchema>;

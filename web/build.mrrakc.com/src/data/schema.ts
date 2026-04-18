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
  "sightseeing/historical", "sightseeing/cultural", "sightseeing/nature",
  "dining/restaurant", "dining/cafe", "dining/street-food", "dining/bakery",
  "socializing/community", "socializing/events", "socializing/nightlife",
  "sports/swimming", "sports/surfing", "sports/karting", "sports/skating", "sports/fitness",
  "wellness/relaxing",
  "shopping/souvenirs", "shopping/electronics", "shopping/grocery", "shopping/automotive", "shopping/general",
  "services/administrative", "services/banking", "services/medical", "services/postal", "services/transport",
  "entertainment/gaming", "entertainment/cinema", "entertainment/dancing",
  "religious/mosque", "religious/church", "religious/synagogue", "religious/general",
  "education/research", "education/library",
  "leisure/walking", "leisure/photography", "leisure/fishing", "leisure/birds-feeding",
  "accommodation/hotel", "accommodation/hostel", "accommodation/apartment"
] as const;

export const ITEMS = [
  "architecture/historical", "architecture/modern",
  "culture/memorabilia", "culture/art", "culture/crafts", "culture/rugs", "culture/artifacts",
  "nature/coastline", "nature/gardens", "nature/animals", "nature/landscaping",
  "cuisine/main-dish", "cuisine/sweets", "cuisine/drinks", "cuisine/grilled",
  "facility/parking", "facility/wifi", "facility/toilets", "facility/prayer-room", "facility/sports", "facility/medical", "facility/conference", "facility/port", "facility/trails", "facility/walking-paths",
  "entertainment/rides", "entertainment/cinema", "entertainment/planetarium", "entertainment/nightclub",
  "item/cannons", "item/memorabilia", "item/goods"
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


export type Place = z.infer<typeof PlaceSchema>;

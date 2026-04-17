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
  "service/guide-office", "service/rental", "service/taxi-station", "service/bus-station", "admin/gendarmerie"
] as const;

export const ACTIVITIES = [
  "sightseeing", "cultural activities", "dining", "religious activities", "socializing", "walking", "relaxing", "entertainment", "shopping", "gaming", "photography", "transport services", "accommodation", "banking", "dancing", "sports", "fitness", "swimming", "administrative services", "guided tours", "medical services", "cycling", "using nearby amenities", "postal services", "using local amenities and shops", "karting", "cultural_visits", "cafe", "community activities", "surfing", "group school visits", "outdoor recreation", "conducting automobile sales and services", "nature walks", "convenience services", "fishing", "conducting commercial and industry services", "pedestrian thoroughfare", "custom salad bar access", "skating", "borrowing books and materials", "military and defense operations (restricted)", "feeding the pigeons"
] as const;

export const ITEMS = [
  "architecture", "facilities", "memorabilia", "coastline", "food & drink", "gardens", "animals", "moroccan sweets", "goods", "amusement rides", "kaab el ghzal (gazelle horns)", "nightclubs", "restaurants and cafes", "planetarium (360° projection)", "medical and technical facilities", "extensive network of walking and cycling trails", "sports facilities", "3D/IMAX", "high-intensity light beam", "marina port facilities", "urban landscaping", "grilled lamb/beef (dibiterie)", "hotel and conference facilities", "art", "common areas and facilities", "cannons", "amazigh rugs"
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
    timePeriods: z.array(z.string()).min(1, "At least one time period is required"),
    comments: z.array(z.string()),
  }),
  _internal: z.object({
    createdAt: z.string(),
    lastModified: z.string(),
  }).optional(),
});

export type Place = z.infer<typeof PlaceSchema>;

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  CalendarCog, CalendarDays, CalendarPlus, CalendarSync, Map, MapPin, Route, type LucideIcon,
} from 'lucide-react';

/**
 * The tool directory.
 *
 * `DATA_TYPES` is what the index page lists; `TOOLS` is what a data-type page
 * lists. A new tool is one entry here plus its component — nothing else in the
 * shell needs to know about it.
 */

export interface DataType {
  id: string;
  name: string;
  /** What lives in this slice of data/, in one line. */
  description: string;
  /** Directory under data/ that backs it. */
  dir: string;
  icon: LucideIcon;
}

export interface Tool {
  id: string;
  dataType: DataType['id'];
  name: string;
  /** What the tool does to the data, in one line. */
  description: string;
  icon: LucideIcon;
  /** Tools that own the viewport (maps, editors) opt out of page padding. */
  fullBleed?: boolean;
  component: LazyExoticComponent<ComponentType>;
}

export const DATA_TYPES: DataType[] = [
  {
    id: 'places',
    name: 'Places',
    description: 'Cafés, riads, museums and everything else pinned to a coordinate.',
    dir: 'data/places',
    icon: MapPin,
  },
  {
    id: 'maps',
    name: 'Maps',
    description: 'Curated collections of places grouped around a theme or a city.',
    dir: 'data/maps',
    icon: Map,
  },
  {
    id: 'plans',
    name: 'Plans',
    description: 'Itineraries: ordered steps through places, with transport and timing.',
    dir: 'data/plans',
    icon: Route,
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Festivals and moussems, their recurrence rules and past editions.',
    dir: 'data/events',
    icon: CalendarDays,
  },
];

export const TOOLS: Tool[] = [
  {
    id: 'updater',
    dataType: 'places',
    name: 'Places Updater',
    description: 'Browse a province on the map, edit its places, and add new ones by clicking the map.',
    icon: MapPin,
    fullBleed: true,
    component: lazy(() => import('./tools/places-updater/PlacesUpdater')),
  },
  {
    id: 'recurrence-review',
    dataType: 'events',
    name: 'Recurrence Review',
    description: 'Check each event’s declared recurrence against the dates of its past editions, and fix what disagrees.',
    icon: CalendarSync,
    fullBleed: true,
    component: lazy(() => import('./tools/recurrence-review/RecurrenceReview')),
  },
  {
    id: 'event-editor',
    dataType: 'events',
    name: 'Event Editor',
    description: 'The complete data/events record as a form — every field in the schema, for editing an event or writing a new one.',
    icon: CalendarCog,
    fullBleed: true,
    component: lazy(() => import('./tools/event-editor/EventEditor')),
  },
  {
    id: 'draft-event',
    dataType: 'events',
    name: 'Draft Event',
    description: 'Jot down an event that is not in the dataset yet, in prose, as a brief for a later research pass.',
    icon: CalendarPlus,
    fullBleed: true,
    component: lazy(() => import('./tools/draft-event/DraftEvent')),
  },
];

export const dataTypeById = (id: string) => DATA_TYPES.find((d) => d.id === id);

export const toolsFor = (dataTypeId: string) => TOOLS.filter((t) => t.dataType === dataTypeId);

export const findTool = (dataTypeId: string, toolId: string) =>
  TOOLS.find((t) => t.dataType === dataTypeId && t.id === toolId);

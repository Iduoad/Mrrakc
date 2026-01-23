import React, { useState, useMemo } from 'react';
import InteractiveMap from './InteractiveMap';
import MapFilters from './MapFilters';
import type { MapPoint } from '../../types/map';
import { Search, Filter, ChevronLeft } from 'lucide-react';
import MapCategoryChips from './MapCategoryChips';

interface Props {
    allPoints: MapPoint[];
    children?: React.ReactNode;
    title?: string;
    backUrl?: string; // New: optional back URL
}

export default function ExplorerMap({ allPoints, children, title, backUrl }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedTimePeriods, setSelectedTimePeriods] = useState<string[]>([]);
    const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

    // Extract available options from data
    const options = useMemo(() => {
        const categories = new Set<string>();
        const provinces = new Set<string>();
        const timePeriods = new Set<string>();
        const people = new Set<string>();

        allPoints.forEach(point => {
            if (point.category) categories.add(point.category);
            if (point.location.province) provinces.add(point.location.province);
            point.timePeriods?.forEach(tp => timePeriods.add(tp));
            point.people?.forEach(p => people.add(p.id)); // Using ID for now, could map to names
        });

        return {
            categories: Array.from(categories).sort(),
            provinces: Array.from(provinces).sort(),
            timePeriods: Array.from(timePeriods).sort(),
            people: Array.from(people).sort()
        };
    }, [allPoints]);

    // Filter points
    const filteredPoints = useMemo(() => {
        return allPoints.filter(point => {
            // Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    point.name.toLowerCase().includes(query) ||
                    point.description.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Categories
            if (selectedCategories.length > 0 && !selectedCategories.includes(point.category)) {
                return false;
            }

            // Provinces
            if (selectedProvinces.length > 0 && point.location.province && !selectedProvinces.includes(point.location.province)) {
                return false;
            }

            // Time Periods
            if (selectedTimePeriods.length > 0) {
                const hasPeriod = point.timePeriods?.some(tp => selectedTimePeriods.includes(tp));
                if (!hasPeriod) return false;
            }

            // People
            if (selectedPeople.length > 0) {
                const hasPerson = point.people?.some(p => selectedPeople.includes(p.id));
                if (!hasPerson) return false;
            }

            return true;
        });
    }, [allPoints, searchQuery, selectedCategories, selectedProvinces, selectedTimePeriods, selectedPeople]);

    const toggleFilter = (list: string[], item: string, setter: (val: string[]) => void) => {
        if (list.includes(item)) {
            setter(list.filter(i => i !== item));
        } else {
            setter([...list, item]);
        }
    };

    // Specifically for category chips (toggle logic)
    const toggleCategory = (category: string) => {
        toggleFilter(selectedCategories, category, setSelectedCategories);
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setSelectedProvinces([]);
        setSelectedTimePeriods([]);
        setSelectedPeople([]);
        setSearchQuery('');
    };

    const hasActiveFilters = selectedCategories.length > 0 ||
        selectedProvinces.length > 0 ||
        selectedTimePeriods.length > 0 ||
        selectedPeople.length > 0;

    const headerContent = (
        <div className="flex items-center gap-2 w-full">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light dark:text-stone-500" size={14} />
                <input
                    type="text"
                    placeholder="Search places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-clay/5 dark:bg-charcoal-light/10 border border-clay/10 dark:border-charcoal-light/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-terra/20 text-charcoal dark:text-stone-100 placeholder-charcoal-light/50"
                />
            </div>
            <button
                onClick={() => setIsFilterOpen(true)}
                className={`p-1.5 rounded-lg border transition-colors ${hasActiveFilters
                    ? 'bg-terra/10 border-terra text-terra'
                    : 'bg-white dark:bg-charcoal border-clay/20 dark:border-charcoal-light text-charcoal-light hover:text-terra'
                    }`}
                title="Filter"
            >
                <Filter size={16} />
            </button>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col relative">
            <MapFilters
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                availableCategories={options.categories}
                availableProvinces={options.provinces}
                availableTimePeriods={options.timePeriods}
                availablePeople={options.people}
                selectedCategories={selectedCategories}
                selectedProvinces={selectedProvinces}
                selectedTimePeriods={selectedTimePeriods}
                selectedPeople={selectedPeople}
                onCategoryChange={(cat) => toggleFilter(selectedCategories, cat, setSelectedCategories)}
                onProvinceChange={(prov) => toggleFilter(selectedProvinces, prov, setSelectedProvinces)}
                onTimePeriodChange={(tp) => toggleFilter(selectedTimePeriods, tp, setSelectedTimePeriods)}
                onPersonChange={(p) => toggleFilter(selectedPeople, p, setSelectedPeople)}
                onClearFilters={clearFilters}
            />

            <div className="flex-grow min-h-[500px] relative">
                <InteractiveMap
                    points={filteredPoints}
                    className="h-full w-full"
                    headerContent={headerContent}
                    autoFit={true}
                    title={title} // Pass title down
                >
                    {/* Overlay Content (Mobile Chips & Controls) */}
                    <div className="flex flex-col gap-2">
                        {/* Children Overlay (optional, legacy support) */}
                        <div className="pointer-events-auto">
                            {children}
                        </div>

                        {/* 1. Category Chips Row + Optional Back Button */}
                        <div className="md:hidden flex items-center gap-2 -mx-4 px-4 pointer-events-auto">
                            {backUrl && (
                                <a
                                    href={backUrl}
                                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-charcoal/90 text-white shadow-md active:scale-95 transition-transform"
                                    aria-label="Back"
                                >
                                    <ChevronLeft size={18} />
                                </a>
                            )}
                            <div className="flex-1 overflow-hidden">
                                {/* Chips container handles its own overflow-x-auto, but we wrap to constrain width */}
                                <MapCategoryChips
                                    categories={options.categories}
                                    selectedCategories={selectedCategories}
                                    onToggle={toggleCategory}
                                    className="!px-0" // Remove default px since parent handles spacing
                                />
                            </div>
                        </div>

                        {/* 2. Floating Search/Filter Button on Mobile */}
                        <div className="md:hidden flex items-center gap-2 pointer-events-auto">
                            <div className="relative flex-grow shadow-lg rounded-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-clay/20 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-terra/20 text-charcoal placeholder-charcoal-light/50"
                                />
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(true)}
                                className={`p-2 rounded-full border shadow-lg transition-colors ${hasActiveFilters
                                    ? 'bg-terra text-white border-terra'
                                    : 'bg-white text-charcoal-light border-clay/10'
                                    }`}
                            >
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>
                </InteractiveMap>
            </div>
        </div>
    );
}

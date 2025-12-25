import React, { useState, useMemo } from 'react';
import InteractiveMap from './InteractiveMap';
import MapFilters from './MapFilters';
import type { MapPoint } from '../../types/map';
import { Search, Filter } from 'lucide-react';

interface Props {
    allPoints: MapPoint[];
}

export default function ExplorerMap({ allPoints }: Props) {
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
                />
            </div>
        </div>
    );
}

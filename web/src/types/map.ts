export interface MapPoint {
    id: string;
    name: string;
    kind: string;
    category: string;
    description: string;
    location: {
        latitude: number;
        longitude: number;
        province?: string;
        altitude?: number;
    };
    prices?: {
        title: string;
        entranceFee?: number;
    }[];
    links?: {
        url: string;
        type: string;
        title: string;
    }[];
    people?: {
        id: string;
        relationship: string[];
    }[];
    timePeriods?: string[];
}

export interface MapFiltersState {
    searchQuery: string;
    categories: string[];
    provinces: string[];
    timePeriods: string[];
    people: string[];
}

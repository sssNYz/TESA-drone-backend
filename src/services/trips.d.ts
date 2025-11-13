export type Waypoint = {
    lat: number;
    lon: number;
    alt_m?: number;
};
export type TripSummary = {
    id: string;
    droneId: string;
    startsAt: string;
    estimatedEndAt: string;
    estimatedSeconds: number;
    waypointCount: number;
};
export type TripDetail = {
    id: string;
    droneId: string;
    waypoints: Waypoint[];
    actualPath: {
        ts: string;
        lat: number;
        lon: number;
    }[];
    startsAt: string;
    estimatedEndAt: string;
    estimatedSeconds: number;
};
export declare function createTrip(droneId: string, waypoints: Waypoint[], options?: {
    speedMS?: number;
    useCurrentAsStart?: boolean;
}): Promise<TripDetail>;
export declare function listTrips(): Promise<TripSummary[]>;
export declare function getTripDetail(id: string | number): Promise<TripDetail | null>;
//# sourceMappingURL=trips.d.ts.map
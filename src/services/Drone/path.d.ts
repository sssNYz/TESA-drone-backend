export interface DronePathPoint {
    id: string;
    ts: string;
    lat: number;
    lon: number;
    alt_m: number | null;
    speed_mps: number | null;
}
export interface DronePath {
    droneId: string;
    points: DronePathPoint[];
}
export interface GetDronePathParams {
    droneIds: string[];
    start: Date;
    end: Date;
}
export interface DronePathResult {
    range: {
        start: string;
        end: string;
    };
    drones: DronePath[];
}
export declare function getDronePaths(params: GetDronePathParams): Promise<DronePathResult>;
//# sourceMappingURL=path.d.ts.map
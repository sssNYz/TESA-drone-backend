type WS = {
    send: (data: string) => void;
    readyState: number;
    on: (e: string, cb: (...a: any[]) => void) => void;
};
export declare function registerClient(ws: WS): void;
export declare function broadcast(payload: unknown): void;
export {};
//# sourceMappingURL=hub.d.ts.map
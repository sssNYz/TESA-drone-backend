export declare function saveRaw(topic: string, payload: string, opts?: {
    parseOk?: boolean;
    error?: string;
}): Promise<bigint>;
export declare function getRawById(id: bigint | string): Promise<{
    error: string | null;
    id: bigint;
    topic: string;
    payload: string;
    receivedAt: Date;
    parseOk: boolean;
} | null>;
//# sourceMappingURL=raw.d.ts.map
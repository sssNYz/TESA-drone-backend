const clients = new Set();
export function registerClient(ws) {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
}
export function broadcast(payload) {
    const msg = JSON.stringify(payload);
    for (const ws of clients) {
        if (ws.readyState === 1) {
            try {
                ws.send(msg);
            }
            catch { /* ignore */ }
        }
    }
}
//# sourceMappingURL=hub.js.map
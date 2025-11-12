// src/mqtt/drone-state-consumer.ts
import { mqttClient } from "./client.js";
import { droneStateSchema } from "../schemas/drone-state.js";
import { saveRaw } from "../services/raw.js";
import { upsertDroneAndInsertReading } from "../services/drone-state-service.js";
import { broadcast } from "../ws/hub.js";
const ARMY_PREFIX = process.env.MQTT_ARMY_PREFIX || "army/";
const STATE_TOPIC = `${ARMY_PREFIX}drone1`; // per spec; can extend to wildcard later
// subscribe when app starts
mqttClient.subscribe([`${ARMY_PREFIX}#`], (err) => {
    if (err)
        console.error("❌ MQTT subscribe error (army/#)", err);
    else
        console.log(`✅ MQTT subscribed to ${ARMY_PREFIX}#`);
});
mqttClient.on("message", async (topic, buf) => {
    if (topic !== STATE_TOPIC)
        return; // only exact state topic for now
    const text = buf.toString("utf8");
    let rawId;
    try {
        rawId = await saveRaw(topic, text);
        const json = JSON.parse(text);
        const state = droneStateSchema.parse(json);
        const saved = await upsertDroneAndInsertReading(state, rawId);
        broadcast({
            type: "drone:update",
            ...saved,
            receivedAt: new Date().toISOString(),
        });
        await saveRaw(topic, text, { parseOk: true });
        console.log("🛰️ Ingested fake drone state", { droneId: state.droneId });
    }
    catch (e) {
        await saveRaw(topic, text, { parseOk: false, error: e?.message ?? String(e) });
        console.error("❌ Fake drone ingest error:", e?.message ?? e);
    }
});
//# sourceMappingURL=drone-state-consumer.js.map
// src/mqtt/ingest.ts
import { mqttClient } from "./client.js";
import { droneDetectionSchema } from "../schemas/drone-detection.js";
import { frameSchema } from "../schemas/frame.js";
import { saveRaw } from "../services/raw.js";
import { saveDroneDetection, saveDroneDetectionFromFrame } from "../services/drone-detections.js";
import { saveFrame } from "../services/frames.js";
import { broadcast } from "../ws/hub.js";
const TOPIC_DRONE = process.env.MQTT_TOPIC_DRONE || "drones/detections";
const TOPIC_FRAME = process.env.MQTT_TOPIC_FRAME || "drones/frames";
const CONFIDENT_PASS_WS = (() => {
    const confident = Number(process.env.CONFIDENT_PASS_WS);
    return Number.isFinite(confident) ? confident : undefined;
})();
// subscribe when app starts
// A2 note: listen both topics
mqttClient.subscribe([TOPIC_DRONE, TOPIC_FRAME], (err) => {
    if (err)
        console.error("❌ MQTT subscribe error", err);
    else
        console.log(`✅ MQTT subscribed to ${TOPIC_DRONE} and ${TOPIC_FRAME}`);
});
mqttClient.on("message", async (topic, message) => {
    const text = message.toString("utf8");
    let rawId;
    try {
        // 1) save raw first
        rawId = await saveRaw(topic, text);
        if (topic === TOPIC_DRONE) {
            // legacy single-drone message
            const json = JSON.parse(text);
            const d = droneDetectionSchema.parse(json);
            // save to DB
            const id = await saveDroneDetection(d, rawId);
            // send to WS
            broadcast({
                type: "drone",
                drone_id: d.drone_id,
                timestamp: d.timestamp,
                latitude: d.latitude,
                longitude: d.longitude,
                altitude_m: d.altitude_m,
                speed_mps: d.speed_mps,
            });
            await saveRaw(topic, text, { parseOk: true });
            console.log("🛰️ Saved legacy detection", { id: id.toString(), drone_id: d.drone_id });
            return;
        }
        if (topic === TOPIC_FRAME) {
            // new frame message (many objects)
            const json = JSON.parse(text);
            const frame = frameSchema.parse(json);
            // save frame row
            // build params, add image only if exists
            const frameParams = {
                frameNo: frame.frame_id,
                deviceTs: frame.timestamp,
                sourceId: frame.source_id,
                objectsCount: frame.objects.length,
            };
            if (frame.image_base64)
                frameParams.imageBase64 = frame.image_base64;
            const frameId = await saveFrame(frameParams);
            // save each object as detection
            for (const obj of frame.objects) {
                // build detection params without undefined fields
                const detParams = {
                    droneId: obj.drone_id,
                    deviceTs: obj.timestamp ?? frame.timestamp,
                    lat: obj.lat,
                    lon: obj.lon,
                    altM: obj.alt_m,
                    speedMps: obj.speed_mps,
                    sourceId: frame.source_id,
                    bbox: obj.bbox,
                    frameId,
                    rawId,
                };
                if (typeof obj.type === "string")
                    detParams.type = obj.type;
                if (typeof obj.confidence === "number")
                    detParams.confidence = obj.confidence;
                const detId = await saveDroneDetectionFromFrame(detParams);
                const conf = typeof obj.confidence === "number" ? obj.confidence : undefined;
                const passes = CONFIDENT_PASS_WS === undefined ? true : (conf !== undefined && conf >= CONFIDENT_PASS_WS);
                if (passes) {
                    // send to WS (simple per object)
                    broadcast({
                        type: "drone",
                        drone_id: obj.drone_id,
                        timestamp: obj.timestamp ?? frame.timestamp,
                        latitude: obj.lat,
                        longitude: obj.lon,
                        altitude_m: obj.alt_m,
                        speed_mps: obj.speed_mps,
                        source_id: frame.source_id,
                        confidence: obj.confidence,
                        bbox: obj.bbox,
                    });
                }
            }
            await saveRaw(topic, text, { parseOk: true });
            console.log("🖼️ Saved frame & detections", { frameId: frameId.toString(), count: frame.objects.length });
            return;
        }
    }
    catch (e) {
        // save error info
        await saveRaw(topic, text, { parseOk: false, error: e?.message ?? String(e) });
        console.error("❌ Ingest error:", e?.message ?? e);
    }
});
//# sourceMappingURL=ingest.js.map
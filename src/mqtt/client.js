import mqtt from "mqtt";
import { getConfig } from "../config/config-service.js";
const { mqttHost, mqttPort } = getConfig();
export const mqttClient = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`);
// connection only (subscribe is in ingest.ts)
// A2 note: keep one place for subscribe
mqttClient.on("connect", () => {
    console.log("📡 MQTT connected");
});
//# sourceMappingURL=client.js.map
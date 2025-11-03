import mqtt from "mqtt";

export const mqttClient = mqtt.connect("mqtt://localhost:1883");

// connection only (subscribe is in ingest.ts)
// A2 note: keep one place for subscribe
mqttClient.on("connect", () => {
  console.log("📡 MQTT connected");
});
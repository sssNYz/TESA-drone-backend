let cached;
export function getConfig() {
    if (cached)
        return cached;
    const mqttHost = process.env.MQTT_HOST || "localhost";
    const mqttPort = Number(process.env.MQTT_PORT) || 1883;
    const armyPrefix = process.env.MQTT_ARMY_PREFIX || "army/";
    cached = { mqttHost, mqttPort, armyPrefix };
    return cached;
}
//# sourceMappingURL=config-service.js.map
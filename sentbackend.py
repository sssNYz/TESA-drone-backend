#!/usr/bin/env python3
"""
Simple WebSocket drone-state sender for the TESA backend.

Usage examples:
  # Default localhost server, send continuous updates for drone1 near Bangkok
  python3 sentbackend.py

  # Specify backend and drone id
  python3 sentbackend.py --url ws://127.0.0.1:3000/ws?role=pi --drone-id my_drone

  # Follow a custom path (lat,lon pairs) at 12 m/s, every 0.5s
  python3 sentbackend.py \
    --path "13.7563,100.5016;13.7570,100.5020;13.7580,100.5030" \
    --speed 12 --interval 0.5

Requires one of:
  - websocket-client: pip install websocket-client
  - websockets (fallback): pip install websockets
  - (for MQTT mode) paho-mqtt: pip install paho-mqtt

Notes for the provided ws-test.html:
- That page shows map markers only for messages with data.type === 'drone'.
- The backend relays 'drone_state' without that 'type' field. To see something
  in the console immediately, run with --mode frame_meta which the page logs.

The backend expects JSON with kind="drone_state". This script sends:
{
  "kind": "drone_state",
  "droneId": "drone1",
  "lat": 13.7563,
  "lon": 100.5016,
  "alt_m": 50,
  "speed_m_s": 5,
  "heading_deg": 90,
  "battery_pct": 98.5,
  "signal_ok": true,
  "signal_loss_prob": 0.0,
  "ts": "2025-01-01T00:00:00.000Z"
}
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, List, Optional, Tuple
import threading


def iso_utc_now() -> str:
    # RFC3339/ISO string with milliseconds and Z
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


EARTH_RADIUS_M = 6_371_000.0


def to_rad(deg: float) -> float:
    return deg * math.pi / 180.0


def to_deg(rad: float) -> float:
    return rad * 180.0 / math.pi


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = to_rad(lat2 - lat1)
    dlon = to_rad(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_M * c


def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Bearing from point1 to point2
    φ1, φ2 = to_rad(lat1), to_rad(lat2)
    Δλ = to_rad(lon2 - lon1)
    x = math.sin(Δλ) * math.cos(φ2)
    y = math.cos(φ1) * math.sin(φ2) - math.sin(φ1) * math.cos(φ2) * math.cos(Δλ)
    θ = math.atan2(x, y)
    deg = (to_deg(θ) + 360.0) % 360.0
    return deg


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


@dataclass
class Waypoint:
    lat: float
    lon: float


class PathCursor:
    """Iterates along the provided waypoints at a given speed, yielding positions each step."""

    def __init__(self, waypoints: List[Waypoint], speed_m_s: float):
        if not waypoints:
            raise ValueError("waypoints must be non-empty")
        self.wps = waypoints
        self.speed = max(0.1, float(speed_m_s))
        self.seg_index = 0
        self.seg_dist = 0.0
        self.seg_total = 0.0
        self._prepare_segment()

    def _prepare_segment(self):
        if self.seg_index >= len(self.wps) - 1:
            # loop back to start for continuous demo
            self.seg_index = 0
        a, b = self.wps[self.seg_index], self.wps[self.seg_index + 1]
        self.seg_total = haversine_m(a.lat, a.lon, b.lat, b.lon)
        self.seg_dist = 0.0

    def step(self, dt_s: float) -> Tuple[float, float, float]:
        # Advance along the current segment
        self.seg_dist += self.speed * dt_s
        # Move to next segment if we overshoot
        while self.seg_dist >= self.seg_total and self.seg_total > 0:
            self.seg_index += 1
            if self.seg_index >= len(self.wps) - 1:
                self.seg_index = 0
            self._prepare_segment()
        a, b = self.wps[self.seg_index], self.wps[self.seg_index + 1]
        t = 0.0 if self.seg_total <= 0 else max(0.0, min(1.0, self.seg_dist / self.seg_total))
        lat = lerp(a.lat, b.lat, t)
        lon = lerp(a.lon, b.lon, t)
        heading = initial_bearing_deg(a.lat, a.lon, b.lat, b.lon)
        return lat, lon, heading


def parse_path_arg(path: Optional[str]) -> Optional[List[Waypoint]]:
    if not path:
        return None
    waypoints: List[Waypoint] = []
    parts = [p.strip() for p in path.split(";") if p.strip()]
    for part in parts:
        try:
            a, b = part.split(",", 1)
            lat = float(a.strip())
            lon = float(b.strip())
            waypoints.append(Waypoint(lat=lat, lon=lon))
        except Exception:
            raise SystemExit(f"Invalid waypoint '{part}'. Expected 'lat,lon' pairs separated by ';'")
    if len(waypoints) == 1:
        # duplicate to create a trivial segment
        waypoints.append(waypoints[0])
    return waypoints


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Send drone_state messages to backend via WebSocket")
    p.add_argument("--url", default="ws://localhost:3000/ws?role=pi", help="Backend WS URL (must include role=pi)")
    p.add_argument("--drone-id", default="drone1", help="Drone ID")
    p.add_argument("--start-lat", type=float, default=13.7563, help="Start latitude (ignored if --path provided)")
    p.add_argument("--start-lon", type=float, default=100.5016, help="Start longitude (ignored if --path provided)")
    p.add_argument("--speed", type=float, default=8.0, help="Speed meters/second")
    p.add_argument("--alt", type=float, default=50.0, help="Altitude meters")
    p.add_argument("--interval", type=float, default=1.0, help="Send interval seconds")
    p.add_argument("--battery", type=float, default=100.0, help="Starting battery percent (0-100)")
    p.add_argument("--battery-drain", type=float, default=0.02, help="Battery drain per second")
    p.add_argument("--signal-loss-prob", type=float, default=0.0, help="Simulated signal loss probability (0-1)")
    p.add_argument("--path", type=str, default=None, help="Waypoints 'lat,lon;lat,lon;...' overrides start-lat/lon")
    p.add_argument("--mode", choices=["drone_state", "frame_meta"], default="drone_state", help="Payload kind to send")
    p.add_argument("--source-id", type=str, default="sim-pi", help="frame_meta source_id")
    p.add_argument("--image-width", type=int, default=640, help="frame_meta image width")
    p.add_argument("--image-height", type=int, default=360, help="frame_meta image height")
    p.add_argument("--image-quality", type=int, default=75, help="frame_meta image quality (1-100)")
    p.add_argument("--target", choices=["ws", "mqtt", "both"], default="ws", help="Where to send messages")
    p.add_argument("--mqtt-host", type=str, default="127.0.0.1", help="MQTT broker host")
    p.add_argument("--mqtt-port", type=int, default=1883, help="MQTT broker port")
    p.add_argument("--mqtt-topic", type=str, default=None, help="MQTT topic. Defaults to army/<drone-id>")
    return p


def ensure_ws_client():
    try:
        import websocket  # type: ignore
        return "websocket-client", websocket
    except Exception:
        pass
    try:
        import websockets  # type: ignore
        return "websockets", websockets
    except Exception:
        pass
    raise SystemExit(
        "No WebSocket client found. Install one of:\n"
        "  pip install websocket-client\n"
        "  pip install websockets\n"
    )


def ensure_mqtt_client():
    try:
        import paho.mqtt.client as mqtt  # type: ignore
        return mqtt
    except Exception:
        raise SystemExit(
            "paho-mqtt not installed. Install with:\n"
            "  pip install paho-mqtt\n"
        )


def run_with_websocket_client(url: str, gen_messages: Iterable[dict]):
    import websocket  # type: ignore

    def connect():
        # WebSocketApp handles ping/pong and reconnect hooks
        app = websocket.WebSocketApp(
            url,
            on_open=lambda ws: print(f"[ws] connected: {url}", flush=True),
            on_close=lambda ws, *_: print("[ws] closed", flush=True),
            on_error=lambda ws, err: print(f"[ws] error: {err}", flush=True),
        )

        # Start the sender in a separate thread so the IO loop can run freely
        def run_sender(wsapp: websocket.WebSocketApp):  # type: ignore
            sent = 0
            for msg in gen_messages:
                try:
                    wsapp.send(json.dumps(msg))
                    sent += 1
                    if sent % 10 == 0:
                        print(f"[send] {sent} messages", flush=True)
                except Exception as e:
                    print(f"[send] failed: {e}", flush=True)
                    break

        def on_open(ws):
            t = threading.Thread(target=run_sender, args=(app,), daemon=True)
            t.start()
            print("[ws] sender thread started", flush=True)

        app.on_open = on_open  # type: ignore

        # Blocking run; returns on disconnect or error
        app.run_forever(ping_interval=20, ping_timeout=10)

    # Reconnect loop
    while True:
        try:
            connect()
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"[ws] connect error: {e}", flush=True)
        print("[ws] reconnect in 3s...", flush=True)
        time.sleep(3)


def run_with_mqtt(host: str, port: int, topic: str, gen_messages: Iterable[dict]):
    mqtt = ensure_mqtt_client()
    client = mqtt.Client()
    client.enable_logger()

    def on_connect(cl, userdata, flags, rc, properties=None):  # type: ignore
        print(f"[mqtt] connected rc={rc}")

    def on_disconnect(cl, userdata, rc, properties=None):  # type: ignore
        print(f"[mqtt] disconnected rc={rc}")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    client.connect(host, port, keepalive=30)
    client.loop_start()

    count = 0
    try:
        for msg in gen_messages:
            payload = json.dumps(msg)
            client.publish(topic, payload, qos=0)
            count += 1
            if count % 10 == 0:
                print(f"[mqtt] published {count} messages to {topic}")
    except KeyboardInterrupt:
        pass
    finally:
        client.loop_stop()
        client.disconnect()


async def run_with_websockets(url: str, gen_messages: Iterable[dict]):
    import asyncio
    import websockets  # type: ignore

    async def connect_once():
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:  # type: ignore
                print(f"[ws] connected: {url}")
                sent = 0
                for msg in gen_messages:
                    try:
                        await ws.send(json.dumps(msg))
                        sent += 1
                        if sent % 10 == 0:
                            print(f"[send] {sent} messages")
                    except Exception as e:
                        print(f"[send] failed: {e}")
                        break
        except Exception as e:
            print(f"[ws] connect error: {e}")

    while True:
        try:
            await connect_once()
        except KeyboardInterrupt:
            raise
        print("[ws] reconnect in 3s...")
        await asyncio.sleep(3)


def message_generator(
    drone_id: str,
    base_alt: float,
    speed_m_s: float,
    interval_s: float,
    battery_start: float,
    battery_drain_per_s: float,
    signal_loss_prob: float,
    waypoints: Optional[List[Waypoint]],
):
    # Simulation state
    rng = random.Random()
    battery = max(0.0, min(100.0, float(battery_start)))
    alt = float(base_alt)

    if waypoints:
        cursor = PathCursor(waypoints, speed_m_s)
        # Initialize position at first waypoint
        lat, lon = waypoints[0].lat, waypoints[0].lon
        heading = 0.0
    else:
        lat, lon = 13.7563, 100.5016
        heading = 90.0

    last_time = time.time()

    while True:
        now = time.time()
        dt = max(0.001, now - last_time)
        last_time = now

        if waypoints:
            lat, lon, heading = cursor.step(dt)
        else:
            # Random walk around the starting point
            heading = (heading + rng.uniform(-10, 10)) % 360.0
            # crude lat/lon step based on speed (ignores curvature, okay for small moves)
            dx = speed_m_s * dt
            dlat = (dx * math.cos(to_rad(heading))) / EARTH_RADIUS_M
            dlon = (dx * math.sin(to_rad(heading))) / (EARTH_RADIUS_M * math.cos(to_rad(lat)))
            lat += to_deg(dlat)
            lon += to_deg(dlon)

        battery = max(0.0, battery - battery_drain_per_s * dt)
        signal_ok = rng.random() >= signal_loss_prob

        msg = {
            "kind": "drone_state",
            "droneId": drone_id,
            "lat": round(lat, 7),
            "lon": round(lon, 7),
            "alt_m": round(alt, 2),
            "speed_m_s": round(speed_m_s, 3),
            "heading_deg": round(heading, 2),
            "battery_pct": round(battery, 2),
            "signal_ok": bool(signal_ok),
            "signal_loss_prob": max(0.0, min(1.0, float(signal_loss_prob))),
            "ts": iso_utc_now(),
        }

        yield msg
        time.sleep(max(0.01, interval_s))


def frame_meta_generator(
    drone_id: str,
    source_id: str,
    base_alt: float,
    speed_m_s: float,
    interval_s: float,
    waypoints: List[Waypoint],
    width: int,
    height: int,
    quality: int,
):
    cursor = PathCursor(waypoints, speed_m_s)
    frame_id = 0
    bbox_w = max(10, int(width * 0.2))
    bbox_h = max(10, int(height * 0.2))
    bbox_x = max(0, int(width * 0.4))
    bbox_y = max(0, int(height * 0.4))
    while True:
        lat, lon, heading = cursor.step(interval_s)
        frame_id += 1
        meta = {
            "kind": "frame_meta",
            "frame_id": frame_id,
            "timestamp": iso_utc_now(),
            "source_id": source_id,
            "image_info": {
                "mime": "image/jpeg",
                "width": int(width),
                "height": int(height),
                "quality": int(max(1, min(100, quality))),
            },
            "objects": [
                {
                    "drone_id": drone_id,
                    "type": "uav",
                    "lat": round(lat, 7),
                    "lon": round(lon, 7),
                    "alt_m": round(base_alt, 2),
                    "speed_mps": round(speed_m_s, 3),
                    "bbox": [bbox_x, bbox_y, bbox_w, bbox_h],
                    "confidence": 0.92,
                    "timestamp": iso_utc_now(),
                }
            ],
        }
        yield meta
        time.sleep(max(0.01, interval_s))


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)

    waypoints = parse_path_arg(args.path)
    if waypoints is None:
        # If no path provided, use start lat/lon and create a small loop
        base = Waypoint(lat=float(args.start_lat), lon=float(args.start_lon))
        waypoints = [
            Waypoint(base.lat, base.lon),
            Waypoint(base.lat + 0.0010, base.lon + 0.0010),
            Waypoint(base.lat + 0.0015, base.lon - 0.0012),
            Waypoint(base.lat - 0.0006, base.lon - 0.0009),
            Waypoint(base.lat, base.lon),
        ]

    if args.mode == "drone_state":
        gen = message_generator(
            drone_id=args.drone_id,
            base_alt=args.alt,
            speed_m_s=args.speed,
            interval_s=args.interval,
            battery_start=args.battery,
            battery_drain_per_s=args.battery_drain,
            signal_loss_prob=args.signal_loss_prob,
            waypoints=waypoints,
        )
    else:
        gen = frame_meta_generator(
            drone_id=args.drone_id,
            source_id=args.source_id,
            base_alt=args.alt,
            speed_m_s=args.speed,
            interval_s=args.interval,
            waypoints=waypoints,
            width=args.image_width,
            height=args.image_height,
            quality=args.image_quality,
        )

    # Determine target(s)
    target = args.target
    if target in ("mqtt", "both"):
        # The backend's MQTT consumer currently only processes topic army/drone1.
        # Ensure your --drone-id is drone1, or adjust server to accept wildcard.
        topic = args.mqtt_topic or f"army/{args.drone_id}"
        if args.mode != "drone_state":
            print("[warn] MQTT target only supports drone_state; forcing mode=drone_state")
            gen = message_generator(
                drone_id=args.drone_id,
                base_alt=args.alt,
                speed_m_s=args.speed,
                interval_s=args.interval,
                battery_start=args.battery,
                battery_drain_per_s=args.battery_drain,
                signal_loss_prob=args.signal_loss_prob,
                waypoints=waypoints,
            )
        # Run MQTT in a thread if both WS and MQTT are selected
        if target == "both":
            t = threading.Thread(
                target=lambda: run_with_mqtt(args.mqtt_host, args.mqtt_port, topic, gen),
                daemon=True,
            )
            t.start()
            # Create a fresh generator for WS side
            gen_ws = message_generator(
                drone_id=args.drone_id,
                base_alt=args.alt,
                speed_m_s=args.speed,
                interval_s=args.interval,
                battery_start=args.battery,
                battery_drain_per_s=args.battery_drain,
                signal_loss_prob=args.signal_loss_prob,
                waypoints=waypoints,
            )
            gen = gen_ws
        else:
            # Only MQTT
            run_with_mqtt(args.mqtt_host, args.mqtt_port, topic, gen)
            return 0

    # WS path
    impl, _ = ensure_ws_client()
    print(f"Using WS implementation: {impl}")
    try:
        if impl == "websocket-client":
            run_with_websocket_client(args.url, gen)
        else:
            import asyncio
            asyncio.run(run_with_websockets(args.url, gen))
    except KeyboardInterrupt:
        print("Interrupted by user")
        return 130
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

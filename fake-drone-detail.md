

You are an expert Python developer.  
Write a complete Python script (for example: `drone_sim.py`) that simulates the movement of one drone using MQTT.

The drone is "drone1" and uses the base topic: `army/drone1`.

General requirements
--------------------
- The script must run in an infinite loop (until Ctrl+C).
- It must connect to an MQTT broker using the `paho-mqtt` library.
- It must publish the drone state to MQTT regularly, even when the drone is not moving.
- It must receive move commands from MQTT and simulate movement towards the target position with a constant speed.
- The code should be ready-to-run and well-structured, with clear functions and comments.

Configuration
-------------
At the top of the file, define configuration constants, for example:

- `MQTT_HOST` (e.g. "localhost")
- `MQTT_PORT` (e.g. 1883)
- `START_LAT`, `START_LON`, `START_ALT`
- `DEFAULT_SPEED_M_S` (e.g. 5.0)
- `TICK_INTERVAL` in seconds (e.g. 0.5)
- `SIGNAL_LOSS_PROB` (float 0–1, e.g. 0.01) — probability of signal loss per tick
- `BATTERY_DRAIN_PER_SEC` — how fast the battery goes down per second

Make these values easy to change.

Drone state structure
---------------------
Inside the script, keep a drone state object (a dict or a simple class) with at least:

- `drone_id`: "drone1"
- `lat`: current latitude (float)
- `lon`: current longitude (float)
- `alt_m`: current altitude in meters (float)
- `speed_m_s`: current speed in m/s (float)
- `heading_deg`: heading in degrees (0–360, 0 = North, 90 = East, etc.)
- `battery_pct`: battery percentage (0–100)
- `signal_ok`: boolean (True/False)
- `signal_loss_prob`: float (0–1)
- `target_lat`: target latitude (or None when no target)
- `target_lon`: target longitude (or None when no target)
- `last_update_ts`: last update time (for delta time in seconds)

MQTT topics
-----------
Use these topics:

- Publish drone state to:
  - `army/drone1`
- Subscribe for move commands on:
  - `army/drone1/move/lat/long`

MQTT connection behavior
------------------------
- When the client connects (`on_connect`), subscribe to `army/drone1/move/lat/long`.
- Implement an `on_message` callback:
  - If the topic is `army/drone1/move/lat/long`, parse the JSON payload and update the target.

Move command payload
--------------------
Commands to move the drone are sent as JSON to `army/drone1/move/lat/long`, for example:

```json
{
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_m_s": 8.0
}

Rules:
	•	lat and lon are required and define the new target position.
	•	speed_m_s is optional: if present, update the drone’s speed to this value; if missing, keep the current speed (or default).

When a move command is received:
	1.	Parse the JSON safely (catch JSON errors without crashing).
	2.	Save target_lat and target_lon into the drone state.
	3.	If speed_m_s is present, update drone_state["speed_m_s"].
	4.	Recalculate heading_deg toward the new target position.

Publishing drone state

The script must publish the drone state to army/drone1 every TICK_INTERVAL seconds, even when the drone is not moving.

Example JSON payload:

{
  "droneId": "drone1",
  "lat": 13.756300,
  "lon": 100.501800,
  "alt_m": 50.0,
  "speed_m_s": 5.0,
  "heading_deg": 90.0,
  "battery_pct": 87.5,
  "signal_ok": true,
  "signal_loss_prob": 0.01,
  "ts": "2025-11-11T03:00:00Z"
}

Requirements:
	•	ts must be current UTC time in ISO 8601 format, for example: datetime.utcnow().isoformat() + "Z".
	•	All fields above should be included and updated each tick.

Movement simulation

In the main loop (every TICK_INTERVAL seconds):
	1.	Compute dt (delta time in seconds) from last_update_ts.
	2.	If target_lat/target_lon is not None (the drone has a target):
	•	Compute the distance from current position to target using the haversine formula (or another great-circle distance formula).
	•	Compute the step distance for this tick:
	•	distance_step = speed_m_s * dt
	•	If distance_step >= distance_to_target:
	•	Move the drone directly to the target.
	•	Set target_lat and target_lon back to None (arrival).
	•	Else (not yet arrived):
	•	Move the drone along the current heading by distance_step on the Earth’s surface.
	•	Use a function like move_point(lat, lon, heading_deg, distance_step) to get the new lat and lon.
	3.	If there is no target (target is None):
	•	Do not change lat and lon (hover in place).
	4.	Update last_update_ts to now.

You must implement:
	•	A function to compute distance and heading between two lat/lon points (e.g. haversine + bearing).
	•	A function to move a point by a distance along a bearing on the globe.

Battery simulation
	•	Start battery_pct at 100.
	•	Each tick, decrease battery by:
	•	BATTERY_DRAIN_PER_SEC * dt
	•	Optionally, you may include speed in the drain formula (e.g. base drain + extra drain per m/s).
	•	Clamp battery_pct between 0 and 100 (never below 0).
	•	Optionally:
	•	If battery_pct <= 10, you can add a low_battery flag in the published JSON.
	•	If battery_pct == 0, stop movement (do not update position further), but still publish state.

Signal loss simulation
	•	Each tick, before publishing, simulate signal loss using random numbers:
	•	Generate a random float r between 0 and 1.
	•	If r < signal_loss_prob, set signal_ok = False for this tick.
	•	Otherwise, set signal_ok = True.
	•	Still publish the state JSON even when signal_ok = False.
	•	Include both signal_ok and signal_loss_prob in the JSON payload.

Main loop and structure
	•	Use mqtt_client.loop_start() so MQTT runs in a background thread.
	•	Implement a main() function that:
	•	Connects to MQTT.
	•	Initializes the drone state.
	•	Runs an infinite loop:
	1.	Compute dt.
	2.	Update position (movement).
	3.	Update battery.
	4.	Update signal status.
	5.	Publish the current state to army/drone1.
	6.	Sleep for TICK_INTERVAL seconds.
	•	Handle KeyboardInterrupt (Ctrl+C) to exit cleanly and disconnect from MQTT.

Code organization

Create clear helper functions, for example:
	•	connect_mqtt()
	•	on_connect(client, userdata, flags, rc)
	•	on_message(client, userdata, msg)
	•	update_position(drone_state, dt)
	•	update_battery(drone_state, dt)
	•	update_signal(drone_state)
	•	publish_state(client, drone_state)
	•	haversine_distance_and_bearing(lat1, lon1, lat2, lon2)
	•	move_point(lat, lon, bearing_deg, distance_m)
	•	iso_utc_now()
	•	main()

At the bottom of the file:

if __name__ == "__main__":
    main()

Imports

Use at least:

import time
import json
import math
import random
from datetime import datetime
import paho.mqtt.client as mqtt

Add any other imports you need.

Add short English comments in each function to explain what it does.
The final script must be complete and ready to run.


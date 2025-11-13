## WebSocket Image Protocol

- Connect via `GET /ws?role=pi` for Raspberry Pi producers and `GET /ws?role=front` for dashboards. Unknown roles are treated as ingress but cannot publish binary frames.
- Each frame must be sent as **two consecutive messages** on the same connection:  
  1. Text JSON with `kind: "frame_meta"` that includes frame/device metadata and detected objects.  
  2. The JPEG binary for that frame.  
  The backend validates the meta payload with Zod, caches it per `source_id`, and rebroadcasts the same JSON followed by the JPEG to every `role=front` client. Binary packets that arrive without a pending meta on that socket are dropped.

## Server-Side Speed Calculation

- The Pi no longer sends `speed_mps`. The backend stores the latest `{lat, lon, ts}` per `drone_id` in memory and uses a haversine helper to compute distance deltas.  
- `speed_m_s` is derived as `distance_m / delta_seconds`. If there is no previous sample or the timestamps are not increasing, the speed is omitted from the broadcast payload.  
- The same cache powers both `frame_meta.objects[*]` and standalone `kind: "drone_state"` messages (from simulators/MQTT bridges).

## Consuming the Stream

- Front-end clients connect to `GET /ws?role=front`; the server enforces a per-client backpressure threshold so slow consumers are skipped for individual frames instead of blocking others.  
- Expect JSON payloads (`frame_meta`, `drone_state`, legacy `type: "drone"` updates) interleaved with JPEG binaries.  
- To simulate Pi ingress, connect with `role=pi`, send validated `frame_meta` JSON followed by the binary buffer for each frame, or publish `kind: "drone_state"` messages; the backend handles broadcasting and speed enrichment automatically.

# Drone Path API

## Request
- **Method**: `GET`
- **URL**: `/drone/path`
- **Query params**:
  - `drone_ids` *(required)*: comma list of drone names, example `alpha,beta`.
  - `start` *(required)*: ISO time string. Example `2024-09-01T10:00:00Z`.
  - `end` *(required)*: ISO time string. Must be after `start`.


## Example 
- https://sharri-unpatted-cythia.ngrok-free.dev/drone/path?drone_ids=sim-1&start=2025-10-19T16:13:00Z&end=2025-10-19T16:15:00Z


## Response
```json
{
  "range": {
    "start": "2024-09-01T10:00:00.000Z",
    "end": "2024-09-01T11:00:00.000Z"
  },
  "drones": [
    {
      "droneId": "alpha",
      "points": [
        {
          "id": "123",
          "ts": "2024-09-01T10:05:00.000Z",
          "lat": 13.7563,
          "lon": 100.5018,
          "alt_m": 120,
          "speed_mps": 14.5
        }
      ]
    },
    {
      "droneId": "beta",
      "points": []
    }
  ]
}
```

`points` is empty when no flight data is found in the time window.

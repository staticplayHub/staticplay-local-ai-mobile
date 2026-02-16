# StaticPlay Chat (Expo + Local Server)

Discord-style mobile chat app with:
- Public friendly rooms
- Separate 18+ Elysium section
- Age-gate placeholder flow (Sumsub mock endpoint)
- App-key lock for backend API calls

## Run

1. Install dependencies

```bash
npm install
```

2. Start backend server (public bind, non-8000 port)

```bash
npm run server
```

Default server binding:
- Host: `0.0.0.0`
- Port: `8787`
- App key: `staticplay-local-app-key`

3. Start Expo app

```bash
npm run start
```

## Environment variables

Optional app env:
- `EXPO_PUBLIC_STATICPLAY_BASE_URL` example `http://192.168.0.46:8787`
- `EXPO_PUBLIC_STATICPLAY_APP_KEY` example `staticplay-local-app-key`

Optional server env:
- `PORT` default `8787`
- `STATICPLAY_APP_KEY` default `staticplay-local-app-key`

## API

- `GET /v1/health`
- `GET /v1/me`
- `GET /v1/rooms`
- `GET /v1/rooms/:roomId/messages`
- `POST /v1/rooms/:roomId/messages`
- `POST /v1/verify18/mock-complete`

All `/v1/*` requests require:
- `x-staticplay-app-key`
- `x-staticplay-user-id`

## Notes

- This app-key check is an app lock, not strong cryptographic security.
- For production hardening add JWT/device attestation, rate limits, TLS termination, and persistent DB storage.

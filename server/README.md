# SuperCube Netcode Server

Node + TypeScript + `ws` WebSocket server for SuperCube online matches.

## Local Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm start
```

Default port: `8090`.
Recommended Node.js version: 20 LTS or newer.

Environment variables:

- `PORT`: server port, default `8090`
- `HOST`: optional bind host, usually leave empty behind Nginx
- `HEARTBEAT_TIMEOUT_MS`: stale client timeout, default `15000`
- `HEARTBEAT_SWEEP_MS`: heartbeat sweep interval, default `1000`

Health check:

```bash
curl http://127.0.0.1:8090/healthz
```

## ECS First Deployment Shape

Recommended production shape:

```text
iOS / Web client
  -> wss://match.your-domain.example
  -> Nginx HTTPS reverse proxy
  -> Node server on 127.0.0.1:8090
```

Use HTTPS/WSS for real-device testing. Avoid `ws://public-ip:port` except for quick LAN experiments.

## Nginx WebSocket Location

```nginx
location / {
  proxy_pass http://127.0.0.1:8090;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 75s;
}
```

## systemd Service Sketch

```ini
[Unit]
Description=SuperCube Netcode Server
After=network.target

[Service]
WorkingDirectory=/opt/supercube/server
Environment=NODE_ENV=production
Environment=PORT=8090
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3
User=supercube

[Install]
WantedBy=multi-user.target
```

# Discord + Mcord — one Railway deployment

This repository combines the two source projects in a separate repository. The originals remain unchanged.

- The original Node.js Discord bot, dashboard, moderation/community modules, Lavalink and YouTube Cipher runtime.
- The original Python Mcord bot and its Mcord voice/music implementation.

## How it runs

Railway starts one container with `node combined.js`. The supervisor launches two independent stacks and watches the persistent runtime-control file so Mcord can be stopped or restarted from the dashboard without stopping Discord or Lavalink:

1. `node start.js` — starts YouTube Cipher, Lavalink and the original Discord bot.
2. `/opt/venv/bin/python mcord/run.py` — starts only the Mcord bot.

The Python source can also start a Discord music bot when it receives `DISCORD_TOKEN`. The supervisor deliberately removes that variable from the Python process environment, so the Node.js application is the only process that logs into Discord. The Python process receives `MCORD_BOT_TOKEN` and connects to Mcord. Both processes share the same `LAVALINK_URL` and `LAVALINK_PASSWORD`. Mcord now asks this exact Lavalink node to resolve/search YouTube first and SoundCloud second, matching the main Discord bot's source order. It then downloads the selected media and sends it through Mcord's required LiveKit voice connection; Lavalink's native audio player cannot directly transmit into LiveKit. If Lavalink is temporarily unavailable, Mcord retains its previous extractor fallback so music does not stop entirely.

If one stack exits unexpectedly, the supervisor retries that stack with a backoff without intentionally stopping the other. Use one Railway replica to avoid duplicate bot sessions. The full dashboard stays available while the Discord gateway is switched off, and its Bot Control panel can bring Discord back. Mcord is independently stopped/restarted by the combined supervisor.

## Railway setup

1. Create a Railway service from this repository.
2. Add the required variables:
   - `DISCORD_TOKEN` — token for the original Discord bot.
   - `MCORD_BOT_TOKEN` — token for the Mcord bot.
3. Copy the other Discord settings you currently use from the original Discord Railway service (dashboard OAuth settings, owner/server IDs, AI provider keys and optional YouTube settings).
4. If you use the Discord dashboard or persistent bot data, mount a Railway Volume at `/app/data`.
5. Keep one replica. A public domain is needed only for the Discord dashboard; the Mcord worker itself does not need one.
6. Deploy and check the logs for both Discord/Lavalink startup messages and `Mcord bot ready`.

See `.env.example` for the combined variable list. Never commit real bot tokens, OAuth secrets, API keys or YouTube cookies.

## Resources

This combined image runs Node.js, Java/Lavalink, YouTube Cipher and Python in one Railway container. Its memory and CPU needs will be higher than either standalone project. Lavalink heap defaults to 512 MB and can be adjusted with `LAVALINK_JAVA_XMX`.

## Original repositories

- https://github.com/hardboy32/discord
- https://github.com/hardboy32/mcord

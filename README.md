# Discord + Mcord — one Railway deployment

This repository combines the two source projects in a separate repository. The originals remain unchanged.

- The original Node.js Discord bot, dashboard, moderation/community modules, Lavalink and YouTube Cipher runtime.
- The original Python Mcord bot and its Mcord voice/music implementation.

## How it runs

Railway starts one container with `node combined.js`. The supervisor launches two independent stacks:

1. `node start.js` — starts YouTube Cipher, Lavalink and the original Discord bot.
2. `/opt/venv/bin/python mcord/run.py` — starts only the Mcord bot.

The Python process intentionally receives `MCORD_BOT_TOKEN` only. Do not set its optional `DISCORD_TOKEN`: the Node.js application already owns the Discord gateway connection. This avoids logging in twice with the same Discord token.

If one stack exits unexpectedly, the supervisor retries that stack with a backoff without intentionally stopping the other. Use one Railway replica to avoid duplicate bot sessions.

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

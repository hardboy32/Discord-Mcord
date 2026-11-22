'use strict';

require('dotenv').config({ quiet: true });

const { spawn } = require('node:child_process');
const crypto = require('node:crypto');

const required = ['DISCORD_TOKEN', 'MCORD_BOT_TOKEN'];
const missing = required.filter(name => !String(process.env[name] || '').trim());
if (missing.length) {
  console.error('[Combined] Missing required Railway variables: ' + missing.join(', '));
  process.exit(1);
}

// One shared Lavalink credential is passed to both the Node bot and Mcord.
// This lets Mcord resolve the same YouTube/SoundCloud catalogue through the
// exact Lavalink instance used by the main Discord bot.
if (!String(process.env.LAVALINK_PASSWORD || '').trim()) {
  process.env.LAVALINK_PASSWORD = crypto.randomBytes(32).toString('hex');
}
process.env.LAVALINK_URL = process.env.LAVALINK_URL || 'http://127.0.0.1:2333';

const children = new Map();
let shuttingDown = false;
let shutdownTimer = null;

function launch(name, command, args, childEnv = process.env) {
  const state = { child: null, restartTimer: null, stableTimer: null, delay: 3000 };
  children.set(name, state);

  const scheduleRestart = (reason) => {
    if (shuttingDown || state.restartTimer) return;
    console.error('[Combined] ' + name + ' stopped (' + reason + '). Restarting in ' + Math.round(state.delay / 1000) + 's.');
    const wait = state.delay;
    state.delay = Math.min(state.delay * 2, 60000);
    state.restartTimer = setTimeout(() => {
      state.restartTimer = null;
      start();
    }, wait);
  };

  const start = () => {
    if (shuttingDown) return;
    console.log('[Combined] Starting ' + name + '.');
    const child = spawn(command, args, {
      cwd: '/app',
      env: childEnv,
      stdio: 'inherit',
    });
    state.child = child;

    child.once('error', error => {
      console.error('[Combined] Could not launch ' + name + ':', error.message || error);
      state.child = null;
      scheduleRestart(error.message || 'spawn error');
    });

    child.once('spawn', () => {
      state.stableTimer = setTimeout(() => {
        state.delay = 3000;
        state.stableTimer = null;
      }, 30000);
    });

    child.once('exit', (code, signal) => {
      if (state.stableTimer) clearTimeout(state.stableTimer);
      state.stableTimer = null;
      state.child = null;
      if (!shuttingDown) scheduleRestart('exit code ' + code + ', signal ' + signal);
      else finishShutdown();
    });
  };

  start();
}

function finishShutdown() {
  if (!shuttingDown) return;
  const running = [...children.values()].some(state => state.child && state.child.exitCode === null);
  if (!running) {
    if (shutdownTimer) clearTimeout(shutdownTimer);
    process.exit(process.exitCode || 0);
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[Combined] Received ' + signal + '; stopping both bot stacks.');
  for (const state of children.values()) {
    if (state.restartTimer) clearTimeout(state.restartTimer);
    if (state.stableTimer) clearTimeout(state.stableTimer);
    if (state.child && state.child.exitCode === null) {
      try { state.child.kill('SIGTERM'); } catch (_) {}
    }
  }
  shutdownTimer = setTimeout(() => {
    for (const state of children.values()) {
      if (state.child && state.child.exitCode === null) {
        try { state.child.kill('SIGKILL'); } catch (_) {}
      }
    }
    process.exit(process.exitCode || 0);
  }, 12000);
  if (typeof shutdownTimer.unref === 'function') shutdownTimer.unref();
  finishShutdown();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

launch('Discord + Lavalink', 'node', ['start.js'], process.env);

// The Python source project can also start a discord.py music bot if it sees
// DISCORD_TOKEN. Keep that token exclusively in the Node.js Discord process.
launch('Mcord', '/opt/venv/bin/python', ['mcord/run.py'], {
  ...process.env,
  DISCORD_TOKEN: '',
});

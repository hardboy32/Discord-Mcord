'use strict';
const fs = require('node:fs');
const path = require('node:path');
const CONTROL_FILE = process.env.RUNTIME_CONTROL_FILE || path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH || '/app/data', 'runtime-control.json');
function readRuntimeControl() {
  try {
    const saved = JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8'));
    return { discordEnabled: saved.discordEnabled !== false, mcordEnabled: saved.mcordEnabled !== false, updatedAt: saved.updatedAt || null };
  } catch {
    return { discordEnabled: true, mcordEnabled: true, updatedAt: null };
  }
}
function writeRuntimeControl(patch) {
  const current = readRuntimeControl();
  const next = {
    discordEnabled: patch.discordEnabled === undefined ? current.discordEnabled : patch.discordEnabled === true,
    mcordEnabled: patch.mcordEnabled === undefined ? current.mcordEnabled : patch.mcordEnabled === true,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(CONTROL_FILE), { recursive: true });
  const temp = CONTROL_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(temp, CONTROL_FILE);
  return next;
}
module.exports = { readRuntimeControl, writeRuntimeControl, CONTROL_FILE };

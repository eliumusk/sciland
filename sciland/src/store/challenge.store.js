const fs = require('node:fs/promises');
const path = require('node:path');

class ChallengeStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, '[]\n', 'utf8');
    }
  }

  async _read() {
    await this.init();
    const raw = await fs.readFile(this.filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  async _write(items) {
    const next = JSON.stringify(items, null, 2);
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, `${next}\n`, 'utf8');
    await fs.rename(tmpPath, this.filePath);
  }

  async list() {
    const items = await this._read();
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getById(challengeId) {
    const items = await this._read();
    return items.find((item) => item.id === challengeId) || null;
  }

  async create(challenge) {
    const items = await this._read();
    items.push(challenge);
    await this._write(items);
    return challenge;
  }

  async update(challengeId, updater) {
    const items = await this._read();
    const idx = items.findIndex((item) => item.id === challengeId);
    if (idx < 0) return null;

    const updated = updater({ ...items[idx] });
    items[idx] = updated;
    await this._write(items);
    return updated;
  }
}

module.exports = { ChallengeStore };

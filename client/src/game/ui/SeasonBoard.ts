import { Container, Graphics, Text } from 'pixi.js';

interface LeaderboardRow {
  playerId: string;
  name: string;
  rating: number;
  bestTimeMs: number | null;
}

interface SeasonSummary {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string | null;
}

export class SeasonBoard {
  readonly container = new Container();
  private readonly background = new Graphics();
  private readonly title = new Text({ text: 'Season Ladder', style: { fill: 0xffffff, fontSize: 22 } });
  private readonly entries: Text[] = [];
  private season?: SeasonSummary;

  constructor() {
    this.container.addChild(this.background, this.title);
  }

  async loadCurrent(): Promise<void> {
    const season = await this.fetchJson<SeasonSummary>('/api/seasons/current');
    if (!season) return;
    this.season = season;
    await this.loadSeason(season.id);
  }

  async loadSeason(seasonId: string): Promise<void> {
    const rows = await this.fetchJson<LeaderboardRow[]>(`/api/seasons/${seasonId}/leaderboard`);
    if (!rows) return;
    this.render(rows);
  }

  onResize(width: number, height: number): void {
    this.background.clear();
    this.background.rect(width - 260, 20, 240, height - 40).fill({ color: 0x0a0a1a, alpha: 0.6 });
    this.background.rect(width - 260, 20, 240, height - 40).stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
    this.title.position.set(width - 240, 32);
    this.layoutEntries(width);
  }

  private render(rows: LeaderboardRow[]): void {
    for (const entry of this.entries) {
      entry.destroy();
    }
    this.entries.length = 0;
    const localName = localStorage.getItem('sperm-odyssey-name');
    rows.slice(0, 20).forEach((row, index) => {
      const label = new Text({
        text: `${index + 1}. ${row.name} — ${Math.round(row.rating)} pts${row.bestTimeMs ? ` • ${(row.bestTimeMs / 1000).toFixed(2)}s` : ''}`,
        style: { fill: row.name === localName ? 0xffd166 : 0xffffff, fontSize: 16 },
      });
      this.entries.push(label);
      this.container.addChild(label);
    });
    this.layoutEntries(window.innerWidth);
  }

  private layoutEntries(viewWidth: number): void {
    let y = 70;
    for (const entry of this.entries) {
      entry.position.set(viewWidth - 250, y);
      y += 24;
    }
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch (error) {
      console.warn('Failed to fetch season board', error);
      return null;
    }
  }
}

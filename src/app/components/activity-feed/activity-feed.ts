import { Component, computed, inject } from '@angular/core';
import { DataService } from '../../services/data.service';

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  added: { icon: '➕', color: 'text-emerald-400' },
  removed: { icon: '🗑️', color: 'text-red-400' },
  promoted: { icon: '🚀', color: 'text-amber-400' },
  expect_on: { icon: '🤞', color: 'text-indigo-400' },
  expect_off: { icon: '↩️', color: 'text-slate-400' },
};

@Component({
  selector: 'app-activity-feed',
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.css',
})
export class ActivityFeed {
  private dataService = inject(DataService);

  readonly activities = computed(() => this.dataService.activities());

  getActionMeta(action: string) {
    return ACTION_ICONS[action] ?? { icon: '📋', color: 'text-slate-400' };
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}

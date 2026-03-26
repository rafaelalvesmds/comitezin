import { Component, computed, inject, OnInit, OnDestroy, ElementRef, viewChild, effect } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DataService } from '../../services/data.service';
import { STEP_HIERARCHY } from '../../models/person.model';

Chart.register(...registerables);

@Component({
  selector: 'app-charts',
  templateUrl: './charts.html',
  styleUrl: './charts.css',
})
export class Charts implements OnDestroy {
  private dataService = inject(DataService);

  private doughnutChart: Chart | null = null;
  private barChart: Chart | null = null;

  doughnutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('doughnutCanvas');
  barCanvas = viewChild<ElementRef<HTMLCanvasElement>>('barCanvas');

  readonly stepDistribution = computed(() => {
    const people = this.dataService.people();
    const dist: Record<string, number> = {};
    for (const step of STEP_HIERARCHY) {
      dist[step] = 0;
    }
    for (const p of people) {
      if (dist[p.step] !== undefined) dist[p.step]++;
    }
    return dist;
  });

  readonly expectationVsPromoted = computed(() => {
    const people = this.dataService.people();
    return {
      expecting: people.filter(p => p.expectsPromotion).length,
      promoted: people.filter(p => p.promoted).length,
      total: people.length,
      notExpecting: people.filter(p => !p.expectsPromotion && !p.promoted).length,
    };
  });

  constructor() {
    effect(() => {
      const dist = this.stepDistribution();
      const stats = this.expectationVsPromoted();
      const doughnutEl = this.doughnutCanvas();
      const barEl = this.barCanvas();

      // Use setTimeout to ensure canvas is in DOM
      setTimeout(() => {
        if (doughnutEl) this.renderDoughnut(doughnutEl.nativeElement, dist);
        if (barEl) this.renderBar(barEl.nativeElement, stats);
      }, 0);
    });
  }

  private renderDoughnut(canvas: HTMLCanvasElement, dist: Record<string, number>) {
    if (this.doughnutChart) this.doughnutChart.destroy();

    const labels = Object.keys(dist);
    const data = Object.values(dist);
    const colors = [
      '#38bdf8', '#0ea5e9', // sky
      '#a78bfa', '#8b5cf6', '#7c3aed', // violet
      '#fbbf24', '#f59e0b', // amber
    ];

    this.doughnutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#0a0a0f',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 12,
              font: { size: 11 },
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
        },
        cutout: '65%',
      },
    });
  }

  private renderBar(canvas: HTMLCanvasElement, stats: { expecting: number; promoted: number; total: number; notExpecting: number }) {
    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Esperam Promoção', 'Promovidos', 'Sem Expectativa'],
        datasets: [{
          data: [stats.expecting, stats.promoted, stats.notExpecting],
          backgroundColor: ['#818cf8', '#34d399', '#475569'],
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b', stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          x: {
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  ngOnDestroy() {
    this.doughnutChart?.destroy();
    this.barChart?.destroy();
  }
}

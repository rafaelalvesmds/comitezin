import { Component, input, OnInit, OnDestroy, OnChanges, ElementRef, viewChild, effect } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Competencies } from '../../models/person.model';

Chart.register(...registerables);

@Component({
  selector: 'app-radar-chart',
  templateUrl: './radar-chart.html',
  styleUrl: './radar-chart.css',
})
export class RadarChart implements OnDestroy {
  competencies = input.required<Competencies>();

  private chart: Chart | null = null;
  radarCanvas = viewChild<ElementRef<HTMLCanvasElement>>('radarCanvas');

  constructor() {
    effect(() => {
      const comp = this.competencies();
      const canvas = this.radarCanvas();
      if (canvas) {
        setTimeout(() => this.render(canvas.nativeElement, comp), 0);
      }
    });
  }

  private render(canvas: HTMLCanvasElement, comp: Competencies) {
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['Técnico', 'Comunicação', 'Liderança', 'Autonomia', 'Impacto', 'Humildade'],
        datasets: [{
          data: [comp.tecnico, comp.comunicacao, comp.lideranca, comp.autonomia, comp.impacto, comp.humildade],
          backgroundColor: 'rgba(129, 140, 248, 0.2)',
          borderColor: '#818cf8',
          borderWidth: 2,
          pointBackgroundColor: '#818cf8',
          pointBorderColor: '#0a0a0f',
          pointBorderWidth: 2,
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          r: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#64748b',
              backdropColor: 'transparent',
              font: { size: 10 },
            },
            grid: {
              color: 'rgba(255,255,255,0.08)',
            },
            angleLines: {
              color: 'rgba(255,255,255,0.08)',
            },
            pointLabels: {
              color: '#94a3b8',
              font: { size: 12 },
            },
          },
        },
      },
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }
}

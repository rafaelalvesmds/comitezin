import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommitteeService } from '../../services/committee.service';

@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.html',
  styleUrl: './countdown.css',
})
export class Countdown implements OnInit, OnDestroy {
  private committeeService = inject(CommitteeService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  days = signal(0);
  hours = signal(0);
  minutes = signal(0);
  seconds = signal(0);
  isCommitteeMonth = signal(false);

  ngOnInit() {
    this.update();
    this.intervalId = setInterval(() => this.update(), 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private update() {
    const committee = this.committeeService.getNextCommittee();
    this.isCommitteeMonth.set(committee.isCommitteeMonth);

    if (committee.isCommitteeMonth) {
      this.days.set(0);
      this.hours.set(0);
      this.minutes.set(0);
      this.seconds.set(0);
      return;
    }

    const now = new Date();
    const target = new Date(committee.year, committee.month - 1, 1, 0, 0, 0);
    const diff = Math.max(0, target.getTime() - now.getTime());

    this.days.set(Math.floor(diff / 86400000));
    this.hours.set(Math.floor((diff % 86400000) / 3600000));
    this.minutes.set(Math.floor((diff % 3600000) / 60000));
    this.seconds.set(Math.floor((diff % 60000) / 1000));
  }
}

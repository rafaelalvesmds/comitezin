import { Component, computed, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Cargo, Person } from '../../models/person.model';

const CARGO_COLORS: Record<Cargo, string> = {
  [Cargo.JUNIOR_I]: 'bg-sky-950 text-sky-400',
  [Cargo.JUNIOR_II]: 'bg-sky-900 text-sky-300',
  [Cargo.PLENO_I]: 'bg-violet-950 text-violet-400',
  [Cargo.PLENO_II]: 'bg-violet-900 text-violet-300',
  [Cargo.PLENO_III]: 'bg-violet-800 text-violet-200',
  [Cargo.SENIOR_I]: 'bg-amber-950 text-amber-400',
  [Cargo.SENIOR_II]: 'bg-amber-900 text-amber-300',
  [Cargo.SENIOR_III]: 'bg-amber-800 text-amber-200',
  [Cargo.ESPECIALISTA_I]: 'bg-emerald-950 text-emerald-400',
  [Cargo.ESPECIALISTA_II]: 'bg-emerald-900 text-emerald-300',
  [Cargo.ESPECIALISTA_III]: 'bg-emerald-800 text-emerald-200',
  [Cargo.ESPECIALISTA_IIII]: 'bg-emerald-700 text-emerald-100',
  [Cargo.ESPECIALISTA_IIIII]: 'bg-emerald-600 text-emerald-50',
  [Cargo.ARQUITETO_JUNIOR]: 'bg-indigo-950 text-indigo-400',
  [Cargo.ARQUITETO_MIL]: 'bg-fuchsia-950 text-fuchsia-400 shadow-lg border border-fuchsia-500/30',
};

@Component({
  selector: 'app-person-card',
  imports: [FormsModule],
  templateUrl: './person-card.html',
  styleUrl: './person-card.css',
})
export class PersonCard {
  person = input.required<Person>();
  isCommitteeMonth = input(false);

  expectationChanged = output<boolean>();
  promotedChanged = output<{ promoted: boolean; notes: string }>();
  removeRequested = output<void>();

  showNotesInput = signal(false);
  promotionNotes = signal('');

  protected cargoClass = computed(() => CARGO_COLORS[this.person().cargo] ?? 'bg-slate-100 text-slate-700');

  constructor(private router: Router) {}

  openProfile() {
    this.router.navigate(['/profile', this.person().id]);
  }

  onPromoteToggle() {
    const p = this.person();
    if (!p.promoted) {
      // About to promote — show notes input
      this.showNotesInput.set(true);
    } else {
      // Un-promote
      this.promotedChanged.emit({ promoted: false, notes: '' });
    }
  }

  confirmPromotion() {
    this.promotedChanged.emit({ promoted: true, notes: this.promotionNotes() });
    this.showNotesInput.set(false);
    this.promotionNotes.set('');
  }

  cancelPromotion() {
    this.showNotesInput.set(false);
    this.promotionNotes.set('');
  }
}

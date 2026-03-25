import { Component, computed, input, output } from '@angular/core';
import { Cargo, Person } from '../../models/person.model';

const CARGO_COLORS: Record<Cargo, string> = {
  [Cargo.JUNIOR_I]: 'bg-sky-50 text-sky-700',
  [Cargo.JUNIOR_II]: 'bg-sky-100 text-sky-800',
  [Cargo.PLENO_I]: 'bg-violet-50 text-violet-700',
  [Cargo.PLENO_II]: 'bg-violet-100 text-violet-800',
  [Cargo.PLENO_III]: 'bg-violet-200 text-violet-900',
  [Cargo.SENIOR_I]: 'bg-amber-50 text-amber-700',
  [Cargo.SENIOR_II]: 'bg-amber-100 text-amber-800',
};

@Component({
  selector: 'app-person-card',
  templateUrl: './person-card.html',
  styleUrl: './person-card.css',
})
export class PersonCard {
  person = input.required<Person>();
  isCommitteeMonth = input(false);

  expectationChanged = output<boolean>();
  promotedChanged = output<boolean>();
  removeRequested = output<void>();

  protected cargoClass = computed(() => CARGO_COLORS[this.person().cargo] ?? 'bg-slate-100 text-slate-700');
}

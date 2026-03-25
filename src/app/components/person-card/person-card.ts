import { Component, computed, input, output } from '@angular/core';
import { Cargo, Person } from '../../models/person.model';

const CARGO_COLORS: Record<Cargo, string> = {
  [Cargo.JUNIOR_I]: 'bg-sky-950 text-sky-400',
  [Cargo.JUNIOR_II]: 'bg-sky-900 text-sky-300',
  [Cargo.PLENO_I]: 'bg-violet-950 text-violet-400',
  [Cargo.PLENO_II]: 'bg-violet-900 text-violet-300',
  [Cargo.PLENO_III]: 'bg-violet-800 text-violet-200',
  [Cargo.SENIOR_I]: 'bg-amber-950 text-amber-400',
  [Cargo.SENIOR_II]: 'bg-amber-900 text-amber-300',
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

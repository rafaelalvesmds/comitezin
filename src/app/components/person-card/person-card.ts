import { Component, computed, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Step, Cargo, Person, getNextStep } from '../../models/person.model';

const STEP_COLORS: Record<Step, string> = {
  [Step.ESTAGIARIO]: 'bg-slate-900 text-slate-400',
  [Step.JUNIOR_I]: 'bg-sky-950 text-sky-400',
  [Step.JUNIOR_II]: 'bg-sky-900 text-sky-300',
  [Step.PLENO_I]: 'bg-violet-950 text-violet-400',
  [Step.PLENO_II]: 'bg-violet-900 text-violet-300',
  [Step.PLENO_III]: 'bg-violet-800 text-violet-200',
  [Step.SENIOR_I]: 'bg-amber-950 text-amber-400',
  [Step.SENIOR_II]: 'bg-amber-900 text-amber-300',
  [Step.SENIOR_III]: 'bg-amber-800 text-amber-200',
  [Step.ESPECIALISTA_I]: 'bg-emerald-950 text-emerald-400',
  [Step.ESPECIALISTA_II]: 'bg-emerald-900 text-emerald-300',
  [Step.ESPECIALISTA_III]: 'bg-emerald-800 text-emerald-200',
  [Step.ESPECIALISTA_IIII]: 'bg-emerald-700 text-emerald-100',
  [Step.ESPECIALISTA_IIIII]: 'bg-emerald-600 text-emerald-50',
  [Step.ARQUITETO_JUNIOR]: 'bg-indigo-950 text-indigo-400',
  [Step.ARQUITETO_MIL]: 'bg-fuchsia-950 text-fuchsia-400 shadow-lg border border-fuchsia-500/30',
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

  protected stepClass = computed(() => STEP_COLORS[this.person().step] ?? 'bg-slate-100 text-slate-700');
  
  protected canBePromoted = computed(() => {
    const p = this.person();
    return !!getNextStep(p.step, p.cargo);
  });

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

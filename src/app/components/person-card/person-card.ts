import { Component, computed, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Step, Cargo, Person, getNextStep, STEP_COLORS, BADGE_METADATA } from '../../models/person.model';



@Component({
  selector: 'app-person-card',
  imports: [FormsModule],
  templateUrl: './person-card.html',
  styleUrl: './person-card.css',
})
export class PersonCard {
  person = input.required<Person>();
  isCommitteeMonth = input(false);
  hideCargo = input(false);
  badgeMetadata = BADGE_METADATA;

  removeRequested = output<void>();

  protected isPromoted = computed(() => {
    return this.person().promoted;
  });

  protected stepClass = computed(() => STEP_COLORS[this.person().step] ?? 'bg-slate-100 text-slate-700');
  
  protected canBePromoted = computed(() => {
    const p = this.person();
    return !!getNextStep(p.step, p.cargo);
  });

  constructor(private router: Router) {}

  openProfile(manageBadges = false) {
    const extras = manageBadges ? { queryParams: { editBadges: 'true' } } : {};
    this.router.navigate(['/profile', this.person().id], extras);
  }
}

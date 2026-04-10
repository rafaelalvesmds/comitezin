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

  openProfile(manageBadges = false) {
    const extras = manageBadges ? { queryParams: { editBadges: 'true' } } : {};
    this.router.navigate(['/profile', this.person().id], extras);
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

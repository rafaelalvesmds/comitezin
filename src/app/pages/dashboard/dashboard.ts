import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PersonCard } from '../../components/person-card/person-card';
import { Charts } from '../../components/charts/charts';
import { Countdown } from '../../components/countdown/countdown';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Cargo, Step, STEP_HIERARCHY } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { CommitteeService } from '../../services/committee.service';
import { DataService } from '../../services/data.service';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, PersonCard, Charts, Countdown, ConfirmModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly cargos = Object.values(Cargo);
  
  readonly availableSteps = computed(() => {
    const cargo = this.newCargo();
    let steps = [...STEP_HIERARCHY];

    if (cargo === Cargo.ANALISTA_NEGOCIO || cargo === Cargo.QA || cargo === Cargo.UI_UX_DESIGN) {
      steps = steps.filter(s => 
        !s.startsWith('Especialista') && !s.startsWith('Arquiteto')
      );
    }
    
    return [Step.EX_KEEVER, ...steps];
  });

  showAddForm = signal(false);
  showCharts = signal(false);
  newName = signal('');
  newCargo = signal<Cargo>(Cargo.ANALISTA_SISTEMAS);
  newStep = signal<Step>(Step.JUNIOR_I);
  newSquad = signal('');

  // Search & Filter
  searchQuery = signal('');
  filterCargo = signal<string>('');
  filterStep = signal<string>('');
  filterSquad = signal<string>('');
  filterStatus = signal<string>('');
  showFilterPopover = signal(false);


  // Remove person modal
  showRemoveModal = signal(false);
  personToRemove = signal<string | null>(null);

  private committeeService = inject(CommitteeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  protected dataService = inject(DataService);

  readonly committee = this.committeeService.getNextCommittee();
  readonly committeeMonthLabel = `${this.committee.monthName} ${this.committee.year}`;

  // Seletor de comitê
  selectedCommitteeLabel = signal<string>('');

  readonly committeesList = computed(() => {
    const cleanLabel = (label: string) => {
      if (!label) return '';
      return label.replace(/\bde\b/gi, '').replace(/\s+/g, ' ').trim();
    };

    const pastCommittees = this.dataService.promotions()
      .map(p => cleanLabel(p.committeeMonth))
      .filter(p => !!p);

    const nextCommitteeLabel = cleanLabel(this.committeeMonthLabel);
    
    // Seed default committee months for the current year (2026)
    const currentYear = new Date().getFullYear();
    const defaultCommittees = [
      `Fevereiro ${currentYear}`,
      `Maio ${currentYear}`,
      `Setembro ${currentYear}`
    ].map(cleanLabel);

    const all = Array.from(new Set([...pastCommittees, nextCommitteeLabel, ...defaultCommittees]));
    
    const monthIndexes: Record<string, number> = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6,
      'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };
    
    return all.sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      const valA = (parseInt(yA, 10) || 2026) * 12 + (monthIndexes[mA] || 1);
      const valB = (parseInt(yB, 10) || 2026) * 12 + (monthIndexes[mB] || 1);
      return valA - valB;
    });
  });

  readonly isUpcomingSelected = computed(() => {
    const cleanLabel = (label: string) => {
      if (!label) return '';
      return label.replace(/\bde\b/gi, '').replace(/\s+/g, ' ').trim();
    };
    return cleanLabel(this.selectedCommitteeLabel()) === cleanLabel(this.committeeMonthLabel);
  });

  constructor() {
    this.selectedCommitteeLabel.set(this.committeeMonthLabel);

    effect(() => {
      const cargo = this.newCargo();
      const currentStep = this.newStep();
      const available = this.availableSteps();
      
      if (!available.includes(currentStep)) {
        this.newStep.set(Step.JUNIOR_I);
      }
    });
  }

  readonly people = computed(() => this.dataService.people());
  readonly loading = computed(() => this.dataService.loading());
  readonly squads = computed(() => this.dataService.squads());

  // Mapeia as pessoas com o status de promoção histórico baseado no comitê selecionado
  readonly peopleForSelectedCommittee = computed(() => {
    const rawPeople = this.people();
    const allPromotions = this.dataService.promotions();
    const selected = this.selectedCommitteeLabel();
    
    const cleanLabel = (label: string) => {
      if (!label) return '';
      return label.replace(/\bde\b/gi, '').replace(/\s+/g, ' ').trim();
    };
    
    const cleanedSelected = cleanLabel(selected);

    return rawPeople.map(p => {
      const promo = allPromotions.find(pr => pr.personId === p.id && cleanLabel(pr.committeeMonth) === cleanedSelected);
      
      return {
        ...p,
        promoted: !!promo,
        step: promo ? (promo.toStep as Step) : p.step,
        promotionNotes: promo ? promo.notes : ''
      };
    });
  });

  readonly filteredPeople = computed(() => {
    let list = this.peopleForSelectedCommittee();
    const query = this.searchQuery().trim().toLowerCase();
    const cargo = this.filterCargo();
    const step = this.filterStep();
    const squad = this.filterSquad();
    const status = this.filterStatus();

    if (query) {
      list = list.filter(p => p.name.toLowerCase().includes(query));
    }
    if (cargo) {
      list = list.filter(p => p.cargo === cargo);
    }
    if (step) {
      list = list.filter(p => p.step === step);
    }
    if (squad) {
      list = list.filter(p => p.squad === squad);
    }
    if (status === 'expecting') {
      list = list.filter(p => p.expectsPromotion);
    } else if (status === 'promoted') {
      list = list.filter(p => p.promoted);
    } else if (status === 'none') {
      list = list.filter(p => !p.expectsPromotion && !p.promoted);
    }

    return list;
  });

  readonly groupedPeople = computed(() => {
    const list = this.filteredPeople();
    const groups: { cargo: string; people: any[] }[] = [];
    
    // Get unique cargos present in the filtered list
    this.cargos.forEach(cargo => {
      const peopleInCargo = list.filter(p => p.cargo === cargo);
      if (peopleInCargo.length > 0) {
        groups.push({
          cargo,
          people: peopleInCargo
        });
      }
    });
    
    return groups;
  });


  readonly hasActiveFilters = computed(() => {
    return !!(this.searchQuery().trim() || this.filterCargo() || this.filterStep() || this.filterSquad() || this.filterStatus());
  });

  readonly stats = computed(() => {
    const list = this.peopleForSelectedCommittee();
    const isUp = this.isUpcomingSelected();
    return {
      total: list.length,
      expecting: isUp ? list.filter((p) => p.expectsPromotion).length : 0,
      promoted: list.filter((p) => p.promoted).length,
    };
  });

  selectPreviousCommittee() {
    const list = this.committeesList();
    const currentIdx = list.indexOf(this.selectedCommitteeLabel());
    if (currentIdx > 0) {
      this.selectedCommitteeLabel.set(list[currentIdx - 1]);
    }
  }

  selectNextCommittee() {
    const list = this.committeesList();
    const currentIdx = list.indexOf(this.selectedCommitteeLabel());
    if (currentIdx !== -1 && currentIdx < list.length - 1) {
      this.selectedCommitteeLabel.set(list[currentIdx + 1]);
    }
  }

  async addPerson(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    await this.dataService.addPerson(name, this.newCargo(), this.newStep(), this.newSquad());
    this.newName.set('');
    this.newCargo.set(Cargo.ANALISTA_SISTEMAS);
    this.newStep.set(Step.JUNIOR_I);
    this.newSquad.set('');
    this.showAddForm.set(false);
  }

  async onPromotedChange(id: string, event: { promoted: boolean; notes: string }, currentStep: Step): Promise<void> {
    const person = this.people().find(p => p.id === id);
    if (!person) return;
    await this.dataService.markPromoted(id, event.promoted, currentStep, person.cargo, this.committeeMonthLabel, event.notes);
  }

  async onRemove(id: string): Promise<void> {
    this.personToRemove.set(id);
    this.showRemoveModal.set(true);
  }

  async confirmRemove(): Promise<void> {
    const id = this.personToRemove();
    if (!id) return;
    try {
      await this.dataService.removePerson(id);
    } catch (err) {
      console.error('Erro ao remover pessoa', err);
    } finally {
      this.cancelRemove();
    }
  }

  cancelRemove(): void {
    this.showRemoveModal.set(false);
    this.personToRemove.set(null);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterCargo.set('');
    this.filterStep.set('');
    this.filterSquad.set('');
    this.filterStatus.set('');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async exportPdf(): Promise<void> {
    await this.exportService.exportCommitteeReport();
  }
}

import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PersonCard } from '../../components/person-card/person-card';
import { Charts } from '../../components/charts/charts';
import { Countdown } from '../../components/countdown/countdown';
import { Cargo, Step, STEP_HIERARCHY } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { CommitteeService } from '../../services/committee.service';
import { DataService } from '../../services/data.service';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, PersonCard, Charts, Countdown],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly cargos = Object.values(Cargo);
  
  readonly availableSteps = computed(() => {
    const cargo = this.newCargo();
    if (cargo === Cargo.ANALISTA_NEGOCIO || cargo === Cargo.QA) {
      return STEP_HIERARCHY.filter(s => 
        !s.startsWith('Especialista') && !s.startsWith('Arquiteto')
      );
    }
    return STEP_HIERARCHY;
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

  private committeeService = inject(CommitteeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private exportService = inject(ExportService);
  protected dataService = inject(DataService);

  readonly committee = this.committeeService.getNextCommittee();
  readonly committeeMonthLabel = `${this.committee.monthName} ${this.committee.year}`;

  constructor() {
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

  readonly filteredPeople = computed(() => {
    let list = this.people();
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

  readonly hasActiveFilters = computed(() => {
    return !!(this.searchQuery().trim() || this.filterCargo() || this.filterStep() || this.filterSquad() || this.filterStatus());
  });

  readonly stats = computed(() => {
    const list = this.people();
    return {
      total: list.length,
      expecting: list.filter((p) => p.expectsPromotion).length,
      promoted: list.filter((p) => p.promoted).length,
    };
  });

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

  async onExpectationChange(id: string, expects: boolean): Promise<void> {
    await this.dataService.updateExpectation(id, expects);
  }

  async onPromotedChange(id: string, event: { promoted: boolean; notes: string }, currentStep: Step): Promise<void> {
    const person = this.people().find(p => p.id === id);
    if (!person) return;
    await this.dataService.markPromoted(id, event.promoted, currentStep, person.cargo, this.committeeMonthLabel, event.notes);
  }

  async onRemove(id: string): Promise<void> {
    await this.dataService.removePerson(id);
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

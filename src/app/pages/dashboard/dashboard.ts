import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PersonCard } from '../../components/person-card/person-card';
import { Cargo, CARGO_HIERARCHY } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { CommitteeService } from '../../services/committee.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, PersonCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly cargos = CARGO_HIERARCHY;

  showAddForm = signal(false);
  newName = signal('');
  newCargo = signal<Cargo>(Cargo.JUNIOR_I);

  private committeeService = inject(CommitteeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  protected dataService = inject(DataService);

  readonly committee = this.committeeService.getNextCommittee();

  readonly people = computed(() => this.dataService.people());
  readonly loading = computed(() => this.dataService.loading());

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
    await this.dataService.addPerson(name, this.newCargo());
    this.newName.set('');
    this.newCargo.set(Cargo.JUNIOR_I);
    this.showAddForm.set(false);
  }

  async onExpectationChange(id: string, expects: boolean): Promise<void> {
    await this.dataService.updateExpectation(id, expects);
  }

  async onPromotedChange(id: string, promoted: boolean, currentCargo: Cargo): Promise<void> {
    await this.dataService.markPromoted(id, promoted, currentCargo);
  }

  async onRemove(id: string): Promise<void> {
    await this.dataService.removePerson(id);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

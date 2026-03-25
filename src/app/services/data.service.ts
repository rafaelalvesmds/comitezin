import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Person, Cargo, getNextCargo, PromotionRecord, ActivityRecord, Competencies } from '../models/person.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private apiUrl = '/api/people';

  readonly people = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly activities = signal<ActivityRecord[]>([]);
  readonly squads = signal<string[]>([]);

  constructor() {
    this.loadPeople();
    this.loadActivities();
    this.loadSquads();
  }

  async loadPeople(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.http.get<Person[]>(this.apiUrl).toPromise();
      this.people.set(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar pessoas', err);
    } finally {
      this.loading.set(false);
    }
  }

  async addPerson(name: string, cargo: Cargo, squad: string = ''): Promise<void> {
    await this.http.post(this.apiUrl, { name, cargo, squad }).toPromise();
    await this.loadPeople();
    await this.loadActivities();
    await this.loadSquads();
  }

  async updateExpectation(id: string, expects: boolean): Promise<void> {
    await this.http.patch(this.apiUrl + '/' + id, { expectsPromotion: expects }).toPromise();
    await this.loadPeople();
    await this.loadActivities();
  }

  async markPromoted(id: string, promoted: boolean, currentCargo: Cargo, committeeMonth: string, notes: string = ''): Promise<void> {
    if (promoted) {
      const nextCargo = getNextCargo(currentCargo);
      if (nextCargo) {
        await this.http.patch(this.apiUrl + '/' + id, { promoted: true, cargo: nextCargo }).toPromise();
        await this.http.post('/api/promotions', {
          personId: id,
          fromCargo: currentCargo,
          toCargo: nextCargo,
          committeeMonth,
          notes,
        }).toPromise();
      }
    } else {
      await this.http.patch(this.apiUrl + '/' + id, { promoted: false }).toPromise();
    }
    await this.loadPeople();
    await this.loadActivities();
  }

  async removePerson(id: string): Promise<void> {
    await this.http.delete(this.apiUrl + '/' + id).toPromise();
    await this.loadPeople();
    await this.loadActivities();
  }

  async updateSquad(id: string, squad: string): Promise<void> {
    await this.http.patch(this.apiUrl + '/' + id, { squad }).toPromise();
    await this.loadPeople();
    await this.loadSquads();
  }

  // ── Activities ──────────────────────────────────────────
  async loadActivities(): Promise<void> {
    try {
      const list = await this.http.get<ActivityRecord[]>('/api/activities?limit=30').toPromise();
      this.activities.set(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar atividades', err);
    }
  }

  // ── Squads ──────────────────────────────────────────────
  async loadSquads(): Promise<void> {
    try {
      const list = await this.http.get<string[]>('/api/squads').toPromise();
      this.squads.set(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar squads', err);
    }
  }

  // ── Promotion History ───────────────────────────────────
  async getPromotionHistory(personId: string): Promise<PromotionRecord[]> {
    try {
      const list = await this.http.get<PromotionRecord[]>(`/api/promotions/${personId}`).toPromise();
      return list ?? [];
    } catch (err) {
      console.error('Erro ao carregar histórico', err);
      return [];
    }
  }

  async getAllPromotions(): Promise<PromotionRecord[]> {
    try {
      const list = await this.http.get<PromotionRecord[]>('/api/promotions').toPromise();
      return list ?? [];
    } catch (err) {
      console.error('Erro ao carregar promoções', err);
      return [];
    }
  }

  // ── Competencies ────────────────────────────────────────
  async getCompetencies(personId: string): Promise<Competencies> {
    try {
      const result = await this.http.get<Competencies>(`/api/competencies/${personId}`).toPromise();
      return result ?? { personId, tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1 };
    } catch (err) {
      console.error('Erro ao carregar competências', err);
      return { personId, tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1 };
    }
  }

  async saveCompetencies(personId: string, competencies: Competencies): Promise<void> {
    await this.http.put(`/api/competencies/${personId}`, competencies).toPromise();
  }
}

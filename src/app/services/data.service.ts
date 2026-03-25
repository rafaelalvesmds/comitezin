import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Person, Cargo, getNextCargo } from '../models/person.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private apiUrl = '/api/people';

  readonly people = signal<Person[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.loadPeople();
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

  async addPerson(name: string, cargo: Cargo): Promise<void> {
    await this.http.post(this.apiUrl, { name, cargo }).toPromise();
    await this.loadPeople();
  }

  async updateExpectation(id: string, expects: boolean): Promise<void> {
    await this.http.patch(this.apiUrl + '/' + id, { expectsPromotion: expects }).toPromise();
    await this.loadPeople();
  }

  async markPromoted(id: string, promoted: boolean, currentCargo: Cargo): Promise<void> {
    if (promoted) {
      const nextCargo = getNextCargo(currentCargo);
      if (nextCargo) {
        await this.http.patch(this.apiUrl + '/' + id, { promoted: true, cargo: nextCargo }).toPromise();
      }
    } else {
      await this.http.patch(this.apiUrl + '/' + id, { promoted: false }).toPromise();
    }
    await this.loadPeople();
  }

  async removePerson(id: string): Promise<void> {
    await this.http.delete(this.apiUrl + '/' + id).toPromise();
    await this.loadPeople();
  }
}

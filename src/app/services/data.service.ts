import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Person, Cargo, Step, getNextStep, PromotionRecord, Competencies, Feedback } from '../models/person.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/people`;

  readonly people = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly squads = signal<string[]>([]);

  private get headers() {
    const token = this.authService.token();
    return {
      headers: {
        'X-Device-Id': this.authService.deviceId(),
        ...(token ? { 'Authorization': token } : {})
      }
    };
  }

  constructor() {
    this.loadPeople();
    this.loadSquads();
  }

  async loadPeople(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.http.get<Person[]>(this.apiUrl, this.headers).toPromise();
      this.people.set(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar pessoas', err);
    } finally {
      this.loading.set(false);
    }
  }

  async addPerson(name: string, cargo: Cargo, step: Step, squad: string = ''): Promise<void> {
    await this.http.post(this.apiUrl, { name, cargo, step, squad }, this.headers).toPromise();
    await this.loadPeople();
    await this.loadSquads();
  }

  async updateExpectation(id: string, expects: boolean): Promise<void> {
    await this.http.patch(this.apiUrl + '/' + id, { expectsPromotion: expects }, this.headers).toPromise();
    await this.loadPeople();
  }

  async markPromoted(id: string, promoted: boolean, currentStep: Step, cargo: Cargo, committeeMonth: string, notes: string = ''): Promise<void> {
    if (promoted) {
      const nextStep = getNextStep(currentStep, cargo);
      if (nextStep) {
        await this.http.patch(this.apiUrl + '/' + id, { promoted: true, step: nextStep }, this.headers).toPromise();
        await this.http.post(`${environment.apiUrl}/promotions`, {
          personId: id,
          fromStep: currentStep,
          toStep: nextStep,
          committeeMonth,
          notes,
        }, this.headers).toPromise();
      }
    } else {
      await this.http.patch(this.apiUrl + '/' + id, { promoted: false }, this.headers).toPromise();
    }
    await this.loadPeople();
  }

  async removePerson(id: string): Promise<void> {
    await this.http.delete(this.apiUrl + '/' + id, this.headers).toPromise();
    await this.loadPeople();
  }

  async updateSquad(id: string, squad: string): Promise<void> {
    await this.updatePerson(id, { squad });
    await this.loadSquads();
  }

  async updatePerson(id: string, fields: Partial<Person>): Promise<void> {
    await this.http.patch(this.apiUrl + '/' + id, fields, this.headers).toPromise();
    await this.loadPeople();
  }


  // ── Squads ──────────────────────────────────────────────
  async loadSquads(): Promise<void> {
    try {
      const list = await this.http.get<string[]>(`${environment.apiUrl}/squads`, this.headers).toPromise();
      this.squads.set(list ?? []);
    } catch (err) {
      console.error('Erro ao carregar squads', err);
    }
  }

  // ── Promotion History ───────────────────────────────────
  async getPromotionHistory(personId: string): Promise<PromotionRecord[]> {
    try {
      const list = await this.http.get<PromotionRecord[]>(`${environment.apiUrl}/promotions/${personId}`, this.headers).toPromise();
      return list ?? [];
    } catch (err) {
      console.error('Erro ao carregar histórico', err);
      return [];
    }
  }

  async getAllPromotions(): Promise<PromotionRecord[]> {
    try {
      const list = await this.http.get<PromotionRecord[]>(`${environment.apiUrl}/promotions`, this.headers).toPromise();
      return list ?? [];
    } catch (err) {
      console.error('Erro ao carregar promoções', err);
      return [];
    }
  }

  // ── Competencies ────────────────────────────────────────
  async getCompetencies(personId: string): Promise<Competencies> {
    try {
      const result = await this.http.get<Competencies>(`${environment.apiUrl}/competencies/${personId}`, this.headers).toPromise();
      return result ?? { personId, tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1 };
    } catch (err) {
      console.error('Erro ao carregar competências', err);
      return { personId, tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1 };
    }
  }

  async saveCompetencies(personId: string, competencies: Competencies): Promise<void> {
    await this.http.put(`${environment.apiUrl}/competencies/${personId}`, competencies, this.headers).toPromise();
  }

  async sendFeedback(personId: string | null, message: string, isAnonymous: boolean, parentId?: string): Promise<void> {
    await this.http.post(`${environment.apiUrl}/feedback`, { personId, message, isAnonymous, parentId }, this.headers).toPromise();
    await this.loadPeople();
  }

  async toggleLike(feedbackId: string): Promise<void> {
    await this.http.post(`${environment.apiUrl}/feedback/${feedbackId}/like`, {}, this.headers).toPromise();
  }

  async getFeedbacks(personId: string): Promise<Feedback[]> {
    console.log(`[DataService] Buscando feedbacks para personId: ${personId}`);
    try {
      const list = await this.http.get<Feedback[]>(`${environment.apiUrl}/feedback/${personId}`, this.headers).toPromise();
      console.log(`[DataService] Feedbacks retornados: ${list?.length || 0}`);
      return list ?? [];
    } catch (err) {
      console.error('[DataService] Erro ao buscar feedbacks', err);
      return [];
    }
  }

  async updateFeedback(id: string, message: string): Promise<void> {
    await this.http.patch(`${environment.apiUrl}/feedback/${id}`, { message }, this.headers).toPromise();
  }

  async deleteFeedback(id: string): Promise<void> {
    await this.http.delete(`${environment.apiUrl}/feedback/${id}`, this.headers).toPromise();
    await this.loadPeople();
  }
}

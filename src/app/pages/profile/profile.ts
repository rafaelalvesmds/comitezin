import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { CommitteeService } from '../../services/committee.service';
import { AuthService } from '../../services/auth.service';
import { RadarChart } from '../../components/radar-chart/radar-chart';
import { Person, Competencies, PromotionRecord, Cargo, Step, STEP_HIERARCHY } from '../../models/person.model';

const STEP_COLORS: Record<string, string> = {
  [Step.ESTAGIARIO]: 'bg-slate-900 text-slate-400',
  [Step.JUNIOR_I]: 'bg-sky-950 text-sky-400',
  [Step.JUNIOR_II]: 'bg-sky-900 text-sky-300',
  [Step.PLENO_I]: 'bg-violet-950 text-violet-400',
  [Step.PLENO_II]: 'bg-violet-900 text-violet-300',
  [Step.PLENO_III]: 'bg-violet-800 text-violet-200',
  [Step.SENIOR_I]: 'bg-amber-950 text-amber-400',
  [Step.SENIOR_II]: 'bg-amber-900 text-amber-300',
};

@Component({
  selector: 'app-profile',
  imports: [FormsModule, RadarChart],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private committeeService = inject(CommitteeService);
  private authService = inject(AuthService);

  person = signal<Person | null>(null);
  competencies = signal<Competencies>({ personId: '', tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1 });
  promotionHistory = signal<PromotionRecord[]>([]);
  editingCompetencies = signal(false);
  editingSquad = signal(false);
  newSquad = signal('');
  savingCompetencies = signal(false);

  // Competency form values
  formTecnico = signal(1);
  formComunicacao = signal(1);
  formLideranca = signal(1);
  formAutonomia = signal(1);
  formImpacto = signal(1);

  readonly steps = STEP_HIERARCHY;
  readonly cargos = Object.values(Cargo);
  readonly committee = this.committeeService.getNextCommittee();

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/dashboard']);
      return;
    }

    await this.dataService.loadPeople();
    const found = this.dataService.people().find(p => p.id === id);
    if (!found) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.person.set(found);
    this.newSquad.set(found.squad || '');

    const [comp, history] = await Promise.all([
      this.dataService.getCompetencies(id),
      this.dataService.getPromotionHistory(id),
    ]);

    this.competencies.set(comp);
    this.promotionHistory.set(history);

    this.formTecnico.set(comp.tecnico);
    this.formComunicacao.set(comp.comunicacao);
    this.formLideranca.set(comp.lideranca);
    this.formAutonomia.set(comp.autonomia);
    this.formImpacto.set(comp.impacto);
  }

  stepClass(step: string): string {
    return STEP_COLORS[step] ?? 'bg-slate-100 text-slate-700';
  }

  getInitial(): string {
    return this.person()?.name.charAt(0).toUpperCase() ?? '?';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  stepLevel(): number {
    const p = this.person();
    if (!p) return 0;
    const idx = STEP_HIERARCHY.indexOf(p.step);
    return idx >= 0 ? idx + 1 : 0;
  }

  stepProgress(): number {
    return (this.stepLevel() / STEP_HIERARCHY.length) * 100;
  }

  async startEditCompetencies() {
    const c = this.competencies();
    this.formTecnico.set(c.tecnico);
    this.formComunicacao.set(c.comunicacao);
    this.formLideranca.set(c.lideranca);
    this.formAutonomia.set(c.autonomia);
    this.formImpacto.set(c.impacto);
    this.editingCompetencies.set(true);
  }

  async saveCompetencies() {
    const p = this.person();
    if (!p) return;
    this.savingCompetencies.set(true);
    const newComp: Competencies = {
      personId: p.id,
      tecnico: this.formTecnico(),
      comunicacao: this.formComunicacao(),
      lideranca: this.formLideranca(),
      autonomia: this.formAutonomia(),
      impacto: this.formImpacto(),
    };
    await this.dataService.saveCompetencies(p.id, newComp);
    this.competencies.set(newComp);
    this.editingCompetencies.set(false);
    this.savingCompetencies.set(false);
  }

  async saveSquad() {
    const p = this.person();
    if (!p) return;
    await this.dataService.updateSquad(p.id, this.newSquad());
    this.person.set({ ...p, squad: this.newSquad() });
    this.editingSquad.set(false);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

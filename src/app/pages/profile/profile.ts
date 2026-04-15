import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { CommitteeService } from '../../services/committee.service';
import { AuthService } from '../../services/auth.service';
import { RadarChart } from '../../components/radar-chart/radar-chart';
import { ConfirmModal } from '../../components/confirm-modal/confirm-modal';
import { Person, Competencies, PromotionRecord, Cargo, Step, STEP_HIERARCHY, Feedback, STEP_COLORS, BADGE_METADATA } from '../../models/person.model';



@Component({
  selector: 'app-profile',
  imports: [FormsModule, RadarChart, ConfirmModal],
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
  competencies = signal<Competencies>({ personId: '', tecnico: 1, comunicacao: 1, lideranca: 1, autonomia: 1, impacto: 1, humildade: 1 });
  promotionHistory = signal<PromotionRecord[]>([]);
  editingCompetencies = signal(false);
  editingSquad = signal(false);
  newSquad = signal('');
  savingCompetencies = signal(false);
  isLoadingPage = signal(true);
  isSavingBadges = signal(false);
  
  // Badges state
  badgeMetadata = BADGE_METADATA;
  badgesList = Object.values(BADGE_METADATA);
  editingBadges = signal(false);
  selectedBadges = signal<string[]>([]);
  isAdmin = this.authService.isAuthenticated;


  // Competency form values
  formTecnico = signal(1);
  formComunicacao = signal(1);
  formLideranca = signal(1);
  formAutonomia = signal(1);
  formImpacto = signal(1);
  formHumildade = signal(1);

  // Feedback form
  feedbacks = signal<Feedback[]>([]);
  feedbackMessage = signal('');
  isAnonymous = signal(false);
  isSendingFeedback = signal(false);
  feedbackStatus = signal<'idle' | 'success' | 'error'>('idle');

  // Editing feedback
  editingFeedbackId = signal<string | null>(null);
  editMessage = signal('');
  isSavingEdit = signal(false);

  // Delete feedback modal
  showDeleteModal = signal(false);
  feedbackToDelete = signal<string | null>(null);

  // Reply functionality
  replyingTo = signal<Feedback | null>(null);

  readonly steps = STEP_HIERARCHY;
  readonly cargos = Object.values(Cargo);
  readonly committee = this.committeeService.getNextCommittee();

  ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/dashboard']);
        return;
      }

      // Reset state when profile changes
      this.person.set(null);
      this.feedbacks.set([]);
      this.feedbackStatus.set('idle');
      this.feedbackMessage.set('');

      try {
        this.isLoadingPage.set(true);
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
        this.formHumildade.set(comp.humildade || 1);

        await this.loadFeedbacks(id);
        this.isLoadingPage.set(false);

        // Check for editBadges query param
        this.route.queryParamMap.subscribe(queryParams => {
          if (queryParams.get('editBadges') === 'true' && this.isAdmin()) {
            this.startEditBadges();
            // Clear the query param so it doesn't reopen on refresh
            this.router.navigate([], { 
              relativeTo: this.route, 
              queryParams: { editBadges: null }, 
              queryParamsHandling: 'merge',
              replaceUrl: true 
            });
          }
        });
      } catch (err) {
        console.error('Erro ao inicializar perfil:', err);
      }
    });
  }


  async loadFeedbacks(personId: string) {
    const list = await this.dataService.getFeedbacks(personId);
    this.feedbacks.set(list);
  }

  stepClass(step: string): string {
    return STEP_COLORS[step] ?? 'bg-slate-900 text-slate-400';
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
    this.formHumildade.set(c.humildade || 1);
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
      humildade: this.formHumildade(),
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

  async onExpectationChange(expectation: boolean) {
    const p = this.person();
    if (!p) return;
    await this.dataService.updateExpectation(p.id, expectation);
    this.person.set({ ...p, expectsPromotion: expectation });
  }


  startEditBadges() {
    this.selectedBadges.set([...(this.person()?.badges || [])]);
    this.editingBadges.set(true);
  }

  toggleBadge(badgeId: string) {
    const current = this.selectedBadges();
    if (current.includes(badgeId)) {
      this.selectedBadges.set(current.filter(id => id !== badgeId));
    } else {
      this.selectedBadges.set([...current, badgeId]);
    }
  }

  async saveBadges() {
    const p = this.person();
    if (!p) return;
    this.isSavingBadges.set(true);
    try {
      await this.dataService.updatePerson(p.id, { badges: this.selectedBadges() });
      this.person.set({ ...p, badges: this.selectedBadges() });
      this.editingBadges.set(false);
    } finally {
      this.isSavingBadges.set(false);
    }
  }


  goBack() {
    this.router.navigate(['/dashboard']);
  }

  async sendFeedback() {
    const p = this.person();
    if (!p || !this.feedbackMessage().trim()) return;

    this.isSendingFeedback.set(true);
    this.feedbackStatus.set('idle');
    try {
      await this.dataService.sendFeedback(
        p.id, 
        this.feedbackMessage(), 
        this.isAnonymous(), 
        this.replyingTo()?.id
      );
      this.feedbackStatus.set('success');
      this.feedbackMessage.set('');
      this.cancelReply();
      await this.loadFeedbacks(p.id);
      
      // Reset success message after 3 seconds
      setTimeout(() => this.feedbackStatus.set('idle'), 3000);
    } catch (err) {
      console.error('Erro ao enviar feedback', err);
      this.feedbackStatus.set('error');
    } finally {
      this.isSendingFeedback.set(false);
    }
  }

  startEdit(fb: Feedback) {
    if (!fb.id) return;
    this.editingFeedbackId.set(fb.id);
    this.editMessage.set(fb.message);
  }

  cancelEdit() {
    this.editingFeedbackId.set(null);
    this.editMessage.set('');
  }

  async saveEdit(id: string) {
    if (!this.editMessage().trim()) return;
    this.isSavingEdit.set(true);
    try {
      await this.dataService.updateFeedback(id, this.editMessage());
      const p = this.person();
      if (p) await this.loadFeedbacks(p.id);
      this.cancelEdit();
    } catch (err) {
      console.error('Erro ao salvar edição', err);
    } finally {
      this.isSavingEdit.set(false);
    }
  }

  async deleteFeedback(id: string) {
    this.feedbackToDelete.set(id);
    this.showDeleteModal.set(true);
  }

  async confirmDeleteFeedback() {
    const id = this.feedbackToDelete();
    if (!id) return;

    try {
      await this.dataService.deleteFeedback(id);
      const p = this.person();
      if (p) await this.loadFeedbacks(p.id);
    } catch (err) {
      console.error('Erro ao remover feedback', err);
    } finally {
      this.cancelDeleteFeedback();
    }
  }

  cancelDeleteFeedback() {
    this.showDeleteModal.set(false);
    this.feedbackToDelete.set(null);
  }

  setReply(fb: Feedback) {
    this.replyingTo.set(fb);
    // Smooth scroll to input
    const input = document.getElementById('feedback-input');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  }

  cancelReply() {
    this.replyingTo.set(null);
  }

  async toggleLike(fb: Feedback) {
    if (!fb.id) return;
    
    // Optimistic update
    const currentLiked = !!fb.likedByMe;
    const currentCount = fb.likesCount || 0;
    
    const updatedFeedbacks = this.feedbacks().map(f => {
      if (f.id === fb.id) {
        return {
          ...f,
          likedByMe: !currentLiked,
          likesCount: currentLiked ? currentCount - 1 : currentCount + 1
        };
      }
      return f;
    });
    this.feedbacks.set(updatedFeedbacks);

    try {
      await this.dataService.toggleLike(fb.id);
    } catch (err) {
      console.error('Erro ao curtir feedback', err);
      // Revert on error
      this.feedbacks.set(this.feedbacks().map(f => {
        if (f.id === fb.id) {
          return {
            ...f,
            likedByMe: currentLiked,
            likesCount: currentCount
          };
        }
        return f;
      }));
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

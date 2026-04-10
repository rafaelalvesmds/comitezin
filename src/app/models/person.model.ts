export enum Step {
  ESTAGIARIO = 'Estagiário',
  JUNIOR_I = 'Junior I',
  JUNIOR_II = 'Junior II',
  PLENO_I = 'Pleno I',
  PLENO_II = 'Pleno II',
  PLENO_III = 'Pleno III',
  SENIOR_I = 'Senior I',
  SENIOR_II = 'Senior II',
  SENIOR_III = 'Senior III',
  ESPECIALISTA_I = 'Especialista de Software I',
  ESPECIALISTA_II = 'Especialista de Software II',
  ESPECIALISTA_III = 'Especialista de Software III',
  ESPECIALISTA_IIII = 'Especialista de Software IIII',
  ESPECIALISTA_IIIII = 'Especialista de Software IIIII',
  ARQUITETO_JUNIOR = 'Arquiteto Junior',
  ARQUITETO_MIL = 'Arquiteto Especialista MIL',
}

export enum Cargo {
  ANALISTA_SISTEMAS = 'Analista de Sistemas',
  ANALISTA_NEGOCIO = 'Analista de Negócio',
  QA = 'QA',
  UI_UX_DESIGN = 'UI/UX Design',
}

export const STEP_HIERARCHY: Step[] = [
  Step.ESTAGIARIO,
  Step.JUNIOR_I,
  Step.JUNIOR_II,
  Step.PLENO_I,
  Step.PLENO_II,
  Step.PLENO_III,
  Step.SENIOR_I,
  Step.SENIOR_II,
  Step.SENIOR_III,
  Step.ESPECIALISTA_I,
  Step.ESPECIALISTA_II,
  Step.ESPECIALISTA_III,
  Step.ESPECIALISTA_IIII,
  Step.ESPECIALISTA_IIIII,
  Step.ARQUITETO_JUNIOR,
  Step.ARQUITETO_MIL,
];

export const STEP_COLORS: Record<string, string> = {
  [Step.ESTAGIARIO]: 'bg-slate-900 text-slate-400',
  [Step.JUNIOR_I]: 'bg-sky-950 text-sky-400',
  [Step.JUNIOR_II]: 'bg-sky-900 text-sky-300',
  [Step.PLENO_I]: 'bg-violet-950 text-violet-400',
  [Step.PLENO_II]: 'bg-violet-900 text-violet-300',
  [Step.PLENO_III]: 'bg-violet-800 text-violet-200',
  [Step.SENIOR_I]: 'bg-amber-950 text-amber-400',
  [Step.SENIOR_II]: 'bg-amber-900 text-amber-300',
  [Step.SENIOR_III]: 'bg-amber-800 text-amber-200',
  [Step.ESPECIALISTA_I]: 'bg-emerald-950 text-emerald-400',
  [Step.ESPECIALISTA_II]: 'bg-emerald-900 text-emerald-300',
  [Step.ESPECIALISTA_III]: 'bg-emerald-800 text-emerald-200',
  [Step.ESPECIALISTA_IIII]: 'bg-emerald-700 text-emerald-100',
  [Step.ESPECIALISTA_IIIII]: 'bg-emerald-600 text-emerald-50',
  [Step.ARQUITETO_JUNIOR]: 'bg-indigo-950 text-indigo-400',
  [Step.ARQUITETO_MIL]: 'bg-fuchsia-950 text-fuchsia-400 shadow-lg border border-fuchsia-500/30',
};


export interface Person {
  id: string;
  name: string;
  cargo: Cargo;
  step: Step;
  expectsPromotion: boolean;
  promoted: boolean;
  squad: string;
  createdAt: string;
  feedbackCount?: number;
}

export interface PromotionRecord {
  id: string;
  personId: string;
  personName?: string;
  fromStep: string;
  toStep: string;
  promotedAt: string;
  committeeMonth: string;
  notes: string;
}


export interface Competencies {
  personId: string;
  tecnico: number;
  comunicacao: number;
  lideranca: number;
  autonomia: number;
  impacto: number;
  updatedAt?: string;
}

export function getNextStep(current: Step, cargo: Cargo): Step | null {
  const index = STEP_HIERARCHY.indexOf(current);
  if (index === -1 || index === STEP_HIERARCHY.length - 1) {
    return null;
  }
  
  const next = STEP_HIERARCHY[index + 1];
  
  // If Analista de Negócio, QA or UI/UX Design, they can't go beyond Senior III
  if (cargo === Cargo.ANALISTA_NEGOCIO || cargo === Cargo.QA || cargo === Cargo.UI_UX_DESIGN) {
    if (next.startsWith('Especialista') || next.startsWith('Arquiteto')) {
      return null;
    }
  }
  
  return next;
}

export interface Feedback {
  id?: string;
  personId?: string;
  message: string;
  isAnonymous: boolean;
  canEdit?: boolean;
  ipAddress?: string;
  deviceSlug?: string;
  createdAt?: string;
  likesCount?: number;
  likedByMe?: boolean;
  parentId?: string;
  parentMessage?: string;
  parentIsAnonymous?: boolean;
}

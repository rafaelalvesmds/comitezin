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

export interface Person {
  id: string;
  name: string;
  cargo: Cargo;
  step: Step;
  expectsPromotion: boolean;
  promoted: boolean;
  squad: string;
  createdAt: string;
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
  
  // If Analista de Negócio or QA, they can't go beyond Senior III
  if (cargo === Cargo.ANALISTA_NEGOCIO || cargo === Cargo.QA) {
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

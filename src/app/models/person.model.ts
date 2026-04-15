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
 
 export interface BadgeInfo {
   id: string;
   label: string;
   image: string;
   description: string;
 }
 
 export const BADGE_METADATA: Record<string, BadgeInfo> = {
   'pet_parent': {
     id: 'pet_parent',
     label: 'Pai/Mãe de Pet',
     image: 'badges/pet_parent.png',
     description: 'Orgulhoso tutor de bichinhos'
   },
   'human_parent': {
     id: 'human_parent',
     label: 'Pai/Mãe de Humano',
     image: 'badges/human_parent.png',
     description: 'Dedicado à criação de pequenos humanos'
   },
   'cris_son': {
     id: 'cris_son',
     label: 'Filho do Cris',
     image: 'badges/cris_son.png',
     description: 'Herdeiro do legado do Cris'
   },
   'bonito': {
     id: 'bonito',
     label: 'Bonito',
     image: 'badges/bonito.png',
     description: 'Beleza que ofusca o código'
   },
   'frango_lover': {
     id: 'frango_lover',
     label: 'Frango Lover',
     image: 'badges/frango_lover.png',
     description: 'Apreciador oficial de franguinho'
   },
   'sabarense': {
     id: 'sabarense',
     label: 'Sabarense',
     image: 'badges/sabarense.png',
     description: 'Diretamente da terra da jabuticaba'
   },
   'indiano': {
     id: 'indiano',
     label: 'Indiano',
     image: 'badges/indiano.png',
     description: 'Namastê, o mestre da sabedoria'
   },
   'intestino_regulado': {
     id: 'intestino_regulado',
     label: 'Intestino Regulado',
     image: 'badges/intestino_regulado.png',
     description: 'Equilíbrio interno é tudo'
   },
   'bolota': {
     id: 'bolota',
     label: 'Bolota',
     image: 'badges/bolota.png',
     description: 'Fofura em formato esférico'
   },
   'vibe_codas': {
     id: 'vibe_codas',
     label: 'Vibe Codas',
     image: 'badges/vibe_codas.png',
     description: 'IA core: o terror do código manual'
   },
    'tem_estrela': {
      id: 'tem_estrela',
      label: 'Tem Estrela',
      image: 'badges/tem_estrela.png',
      description: 'O brilho que guia o sucesso'
    },
    'jogador_caro': {
      id: 'jogador_caro',
      label: 'Jogador Caro',
      image: 'badges/jogador_caro.png',
      description: 'O craque do time'
    },
    'tdah': {
      id: 'tdah',
      label: 'TDAH',
      image: 'badges/tdah.png',
      description: 'Foco seletivo e criatividade a mil'
    },
    'papagaense': {
      id: 'papagaense',
      label: 'Papagaense',
      image: 'badges/papagaense.png',
      description: 'Orgulho da terra mineira'
    }
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
  badges?: string[];
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
  humildade: number;
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

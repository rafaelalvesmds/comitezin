export enum Cargo {
  JUNIOR_I = 'Junior I',
  JUNIOR_II = 'Junior II',
  PLENO_I = 'Pleno I',
  PLENO_II = 'Pleno II',
  PLENO_III = 'Pleno III',
  SENIOR_I = 'Senior I',
  SENIOR_II = 'Senior II',
  ENG_SOFTWARE_SENIOR_I = 'Engenheiro de Software Sênior I',
  ENG_SOFTWARE_SENIOR_II = 'Engenheiro de Software Sênior II',
  GAMEDEV_PLENO = 'GameDev Pleno',
  ARQUITETO_JUNIOR = 'Arquiteto Junior',
}

export const CARGO_HIERARCHY: Cargo[] = [
  Cargo.JUNIOR_I,
  Cargo.JUNIOR_II,
  Cargo.ARQUITETO_JUNIOR,
  Cargo.PLENO_I,
  Cargo.PLENO_II,
  Cargo.PLENO_III,
  Cargo.GAMEDEV_PLENO,
  Cargo.SENIOR_I,
  Cargo.SENIOR_II,
  Cargo.ENG_SOFTWARE_SENIOR_I,
  Cargo.ENG_SOFTWARE_SENIOR_II,
];

export interface Person {
  id: string;
  name: string;
  cargo: Cargo;
  expectsPromotion: boolean;
  promoted: boolean;
  squad: string;
  createdAt: string;
}

export interface PromotionRecord {
  id: string;
  personId: string;
  personName?: string;
  fromCargo: string;
  toCargo: string;
  promotedAt: string;
  committeeMonth: string;
  notes: string;
}

export interface ActivityRecord {
  id: string;
  personId: string | null;
  personName: string;
  action: string;
  details: string;
  createdAt: string;
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

export function getNextCargo(current: Cargo): Cargo | null {
  const index = CARGO_HIERARCHY.indexOf(current);
  if (index === -1 || index === CARGO_HIERARCHY.length - 1) {
    return null;
  }
  return CARGO_HIERARCHY[index + 1];
}

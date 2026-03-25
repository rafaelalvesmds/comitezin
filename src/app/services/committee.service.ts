import { Injectable } from '@angular/core';

export interface CommitteeInfo {
  month: number;
  monthName: string;
  year: number;
  isCommitteeMonth: boolean;
}

const COMMITTEE_MONTHS = [2, 5, 9]; // Fevereiro, Maio, Setembro

const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  getNextCommittee(): CommitteeInfo {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let nextMonth = COMMITTEE_MONTHS.find((m) => m >= currentMonth);
    let nextYear = currentYear;

    if (!nextMonth) {
      nextMonth = COMMITTEE_MONTHS[0];
      nextYear = currentYear + 1;
    }

    return {
      month: nextMonth,
      monthName: MONTH_NAMES[nextMonth],
      year: nextYear,
      isCommitteeMonth: currentMonth === nextMonth && currentYear === nextYear,
    };
  }
}

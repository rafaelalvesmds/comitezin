import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';
import { CommitteeService } from './committee.service';
import { CARGO_HIERARCHY } from '../models/person.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private dataService = inject(DataService);
  private committeeService = inject(CommitteeService);

  async exportCommitteeReport(): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const people = this.dataService.people();
    const committee = this.committeeService.getNextCommittee();
    const now = new Date().toLocaleDateString('pt-BR');

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório do Comitê', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${committee.monthName} de ${committee.year}`, 105, 28, { align: 'center' });
    doc.text(`Gerado em: ${now}`, 105, 35, { align: 'center' });

    // Separator
    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);

    // Stats
    let y = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de pessoas: ${people.length}`, 20, y); y += 6;
    doc.text(`Esperam promoção: ${people.filter(p => p.expectsPromotion).length}`, 20, y); y += 6;
    doc.text(`Promovidos: ${people.filter(p => p.promoted).length}`, 20, y); y += 6;

    // Cargo distribution
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição por Cargo:', 20, y); y += 7;
    doc.setFont('helvetica', 'normal');
    for (const cargo of CARGO_HIERARCHY) {
      const count = people.filter(p => p.cargo === cargo).length;
      doc.text(`  ${cargo}: ${count} pessoa(s)`, 20, y); y += 6;
    }

    // Separator
    y += 4;
    doc.line(20, y, 190, y); y += 10;

    // Expecting promotion
    const expecting = people.filter(p => p.expectsPromotion);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Esperam Promoção', 20, y); y += 8;

    if (expecting.length === 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhuma pessoa espera promoção no momento.', 20, y); y += 6;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      for (const p of expecting) {
        if (y > 270) { doc.addPage(); y = 20; }
        const squad = p.squad ? ` [${p.squad}]` : '';
        doc.text(`• ${p.name} — ${p.cargo}${squad}`, 20, y); y += 6;
      }
    }

    // Promoted
    y += 6;
    if (y > 250) { doc.addPage(); y = 20; }
    const promoted = people.filter(p => p.promoted);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Promovidos', 20, y); y += 8;

    if (promoted.length === 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhuma promoção registrada.', 20, y); y += 6;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      for (const p of promoted) {
        if (y > 270) { doc.addPage(); y = 20; }
        const squad = p.squad ? ` [${p.squad}]` : '';
        doc.text(`• ${p.name} — ${p.cargo}${squad}`, 20, y); y += 6;
      }
    }

    // All people table
    y += 8;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipe Completa', 20, y); y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Nome', 20, y);
    doc.text('Cargo', 90, y);
    doc.text('Squad', 135, y);
    doc.text('Status', 170, y);
    y += 2;
    doc.line(20, y, 190, y); y += 5;

    doc.setFont('helvetica', 'normal');
    for (const p of people) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(p.name.substring(0, 30), 20, y);
      doc.text(p.cargo, 90, y);
      doc.text((p.squad || '-').substring(0, 15), 135, y);
      const status = p.promoted ? 'Promovido' : p.expectsPromotion ? 'Espera' : '-';
      doc.text(status, 170, y);
      y += 6;
    }

    doc.save(`comite-${committee.monthName}-${committee.year}.pdf`);
  }
}

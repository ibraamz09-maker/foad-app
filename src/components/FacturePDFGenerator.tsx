'use client';
import type { Facture } from '@/lib/types';

export async function downloadFacturePDF(facture: Facture): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const headerH = 52;

  doc.setFillColor(27, 42, 107);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(192, 57, 43);
  const d = doc as any;
  d.moveTo(0, 22); d.lineTo(pageW, 12); d.lineTo(pageW, 28); d.lineTo(0, 38);
  d.closePath(); d.fill();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('AMENZOU FOAD', pageW - 10, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text('Auto-entrepreneur', pageW - 10, 24, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('FACTURE', 10, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text(`N° ${facture.numero}`, 10, 22);
  doc.text(`Date : ${new Date(facture.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 10, 28);
  if (facture.date_echeance) {
    doc.text(`Échéance : ${new Date(facture.date_echeance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 10, 34);
  }

  const infoY = headerH + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 42, 107);
  doc.text('Foad Amenzou', pageW - 10, infoY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.text('85 chemin de saint ange', pageW - 10, infoY + 5, { align: 'right' });
  doc.text('84140 Monfavet', pageW - 10, infoY + 9, { align: 'right' });
  doc.text('foadamenzou@gmail.com', pageW - 10, infoY + 13, { align: 'right' });
  doc.text('06 67 01 32 48', pageW - 10, infoY + 17, { align: 'right' });

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(10, infoY, 80, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(27, 42, 107);
  doc.text('DESTINATAIRE', 14, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.text(facture.client_nom, 14, infoY + 12);
  doc.setFontSize(8);
  const addrLines = doc.splitTextToSize(facture.client_adresse, 72);
  addrLines.forEach((line: string, i: number) => doc.text(line, 14, infoY + 17 + i * 4));

  autoTable(doc, {
    startY: infoY + 32,
    head: [['Description', 'Prix unitaire', 'Quantité', 'Total HT']],
    body: facture.lignes.map(l => [l.description, `${l.prix_unitaire.toFixed(2)} €`, String(l.quantite), `${l.total.toFixed(2)} €`]),
    theme: 'plain',
    headStyles: { fillColor: [27, 42, 107], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 4 },
    bodyStyles: { fontSize: 9, cellPadding: 3.5, textColor: [50, 50, 50] },
    columnStyles: { 0: { halign: 'left', cellWidth: 85 }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    tableLineColor: [192, 57, 43],
    tableLineWidth: 0.3,
    margin: { left: 10, right: 10 },
  });

  const finalY: number = (doc as any).lastAutoTable.finalY + 8;
  const totalX = pageW / 2 - 30;
  const totalW = 80;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Sous-total HT :', totalX, finalY);
  doc.text(`${facture.montant_total.toFixed(2)} €`, totalX + totalW, finalY, { align: 'right' });
  doc.text('TVA (0%) :', totalX, finalY + 6);
  doc.text('0,00 €', totalX + totalW, finalY + 6, { align: 'right' });
  doc.setDrawColor(192, 57, 43);
  doc.setLineWidth(0.4);
  doc.line(totalX, finalY + 9, totalX + totalW, finalY + 9);

  const btnY = finalY + 13;
  doc.setFillColor(192, 57, 43);
  doc.roundedRect(totalX, btnY, totalW, 11, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL TTC', totalX + 2, btnY + 7.5);
  doc.text(`${facture.montant_total.toFixed(2)} €`, totalX + totalW - 2, btnY + 7.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(27, 42, 107);
  doc.text('TVA non applicable — article 293B du CGI', pageW / 2, btnY + 22, { align: 'center' });

  doc.setFillColor(27, 42, 107);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 215, 255);
  doc.text('SIRET : 400 140 448 00087 — TVA non applicable art. 293B CGI', pageW / 2, pageH - 7, { align: 'center' });
  doc.text('Foad Amenzou · 85 chemin de saint ange · 84140 Monfavet · 06 67 01 32 48', pageW / 2, pageH - 3, { align: 'center' });

  doc.save(`${facture.numero}.pdf`);
}

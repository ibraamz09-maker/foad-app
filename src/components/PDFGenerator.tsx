'use client';
import { LigneDevis } from '@/lib/db';

interface DevisData {
  numero: string;
  date_creation: string;
  client_nom: string;
  client_adresse: string;
  lignes: LigneDevis[];
  montant_total: number;
  notes?: string | null;
}

export async function generateDevisPDF(data: DevisData): Promise<string> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ─── HEADER ────────────────────────────────────────────────
  const headerH = 52;

  // Navy blue background
  doc.setFillColor(27, 42, 107);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Red diagonal wave: polygon points
  // Creates a diagonal red band across the header
  doc.setFillColor(192, 57, 43);
  const wavePoints = [
    { x: 0, y: 22 },
    { x: pageW, y: 12 },
    { x: pageW, y: 28 },
    { x: 0, y: 38 },
  ];
  const d = doc as any;
  d.moveTo(wavePoints[0].x, wavePoints[0].y);
  wavePoints.slice(1).forEach((p: {x: number; y: number}) => d.lineTo(p.x, p.y));
  d.closePath();
  d.fill();

  // "AMENZOU FOAD" — large white text right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('AMENZOU FOAD', pageW - 10, 18, { align: 'right' });

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text('Auto-entrepreneur', pageW - 10, 24, { align: 'right' });

  // Devis number & date — left side
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DEVIS', 10, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text(`N° ${data.numero}`, 10, 22);

  const dateStr = new Date(data.date_creation).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.text(`Date : ${dateStr}`, 10, 28);

  // ─── INFO BLOCK (below header) ──────────────────────────────
  const infoY = headerH + 8;

  // Foad's contact info — right side
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

  // Client info — left side
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(10, infoY, 80, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(27, 42, 107);
  doc.text('DESTINATAIRE', 14, infoY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.text(data.client_nom, 14, infoY + 12);
  doc.setFontSize(8);
  const addrLines = doc.splitTextToSize(data.client_adresse, 72);
  addrLines.forEach((line: string, i: number) => {
    doc.text(line, 14, infoY + 17 + i * 4);
  });

  // ─── TABLE ─────────────────────────────────────────────────
  const tableY = infoY + 32;

  autoTable(doc, {
    startY: tableY,
    head: [['Description', 'Prix unitaire', 'Quantité', 'Total HT']],
    body: data.lignes.map(l => [
      l.description,
      `${l.prix_unitaire.toFixed(2)} €`,
      String(l.quantite),
      `${l.total.toFixed(2)} €`,
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: [27, 42, 107],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 85 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    tableLineColor: [192, 57, 43],
    tableLineWidth: 0.3,
    didDrawCell: (hookData: any) => {
      if (hookData.row.index === 0 && hookData.section === 'head') {
        // Draw rounded corners on header
      }
    },
    margin: { left: 10, right: 10 },
  });

  const finalY: number = (doc as any).lastAutoTable.finalY + 8;

  // ─── TOTALS ────────────────────────────────────────────────
  const totalX = pageW / 2 - 30;
  const totalW = 80;

  // Subtotal row
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Sous-total HT :', totalX, finalY, { align: 'left' });
  doc.text(`${data.montant_total.toFixed(2)} €`, totalX + totalW, finalY, { align: 'right' });

  // TVA row
  doc.text('TVA (0%) :', totalX, finalY + 6, { align: 'left' });
  doc.text('0,00 €', totalX + totalW, finalY + 6, { align: 'right' });

  // Separator line
  doc.setDrawColor(192, 57, 43);
  doc.setLineWidth(0.4);
  doc.line(totalX, finalY + 9, totalX + totalW, finalY + 9);

  // TOTAL TTC button (rounded red)
  const btnY = finalY + 13;
  const btnH = 11;
  doc.setFillColor(192, 57, 43);
  doc.roundedRect(totalX, btnY, totalW, btnH, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL TTC', totalX + 2, btnY + 7.5);
  doc.text(`${data.montant_total.toFixed(2)} €`, totalX + totalW - 2, btnY + 7.5, { align: 'right' });

  // ─── TVA MENTION ────────────────────────────────────────────
  const mentionY = btnY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(27, 42, 107);
  doc.text('TVA non applicable — article 293B du CGI', pageW / 2, mentionY, { align: 'center' });

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const noteLines = doc.splitTextToSize(`Note : ${data.notes}`, pageW - 20);
    noteLines.forEach((line: string, i: number) => {
      doc.text(line, 10, mentionY + 7 + i * 4);
    });
  }

  // ─── FOOTER ────────────────────────────────────────────────
  doc.setFillColor(27, 42, 107);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 215, 255);
  doc.text(`SIRET : 400 140 448 00087 — TVA non applicable art. 293B CGI`, pageW / 2, pageH - 7, { align: 'center' });
  doc.text('Foad Amenzou · 85 chemin de saint ange · 84140 Monfavet · 06 67 01 32 48', pageW / 2, pageH - 3, { align: 'center' });

  return doc.output('datauristring');
}

export async function downloadDevisPDF(data: DevisData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const headerH = 52;
  doc.setFillColor(27, 42, 107);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(192, 57, 43);
  const d2 = doc as any;
  d2.moveTo(0, 22);
  d2.lineTo(pageW, 12);
  d2.lineTo(pageW, 28);
  d2.lineTo(0, 38);
  d2.closePath();
  d2.fill();

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
  doc.text('DEVIS', 10, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 255);
  doc.text(`N° ${data.numero}`, 10, 22);
  const dateStr = new Date(data.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Date : ${dateStr}`, 10, 28);

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
  doc.text(data.client_nom, 14, infoY + 12);
  doc.setFontSize(8);
  const addrLines = doc.splitTextToSize(data.client_adresse, 72);
  addrLines.forEach((line: string, i: number) => doc.text(line, 14, infoY + 17 + i * 4));

  const tableY = infoY + 32;
  autoTable(doc, {
    startY: tableY,
    head: [['Description', 'Prix unitaire', 'Quantité', 'Total HT']],
    body: data.lignes.map(l => [l.description, `${l.prix_unitaire.toFixed(2)} €`, String(l.quantite), `${l.total.toFixed(2)} €`]),
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
  doc.text(`${data.montant_total.toFixed(2)} €`, totalX + totalW, finalY, { align: 'right' });
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
  doc.text(`${data.montant_total.toFixed(2)} €`, totalX + totalW - 2, btnY + 7.5, { align: 'right' });

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

  doc.save(`${data.numero}.pdf`);
}

export async function getDevisPDFBase64(data: DevisData): Promise<string> {
  // Returns base64 string without data URI prefix
  const dataUri = await generateDevisPDF(data);
  return dataUri.split(',')[1];
}

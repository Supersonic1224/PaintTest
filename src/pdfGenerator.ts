import { jsPDF } from 'jspdf';
import { ProjectDetails as ProjectType, ClientLead, RoomSpec } from './types';

interface PDFGeneratorParams {
  project: ProjectType;
  client: ClientLead;
  rooms: RoomSpec[];
  liveSummary: {
    subtotal: number;
    hst: number;
    total: number;
    deposit: number;
    balance: number;
    roomCosts: Record<string, number>;
  };
  inclusions: string;
  exclusions: string;
  specialConditions: string;
  signerName: string;
  signerTitle: string;
  signedDate: string;
  clientSigned: boolean;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  projectDate: string;
  proposalNo: string;
  generalNotes?: string;
  termsAndConditions?: string;
  signatureDataUrl?: string;
  installments?: any[];
}

export function generateProposalPDF({
  project,
  client,
  rooms,
  liveSummary,
  inclusions,
  exclusions,
  specialConditions,
  signerName,
  signerTitle,
  signedDate,
  clientSigned,
  clientAddress,
  clientPhone,
  clientEmail,
  projectDate,
  proposalNo,
  generalNotes = '',
  termsAndConditions = '',
  signatureDataUrl,
  installments,
}: PDFGeneratorParams): { base64: string; blobUrl: string } {
  // Create PDF in portrait orientation, A4 size
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  let y = 15; // Vertical position pointer

  // Colors
  const darkBlue = [30, 58, 138]; // #1e3a8a
  const charcoal = [51, 51, 51]; // #333333
  const lightGrey = [241, 245, 249]; // #f1f5f9
  const borderGrey = [226, 232, 240]; // #e2e8f0
  const yellowBg = [254, 251, 235]; // #fefbeb
  const yellowBorder = [253, 224, 71]; // #fde047
  const yellowText = [180, 83, 9]; // #b45309

  const addHeader = () => {
    // Header background bar
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('PAINTNAV PROPOSAL & ESTIMATE', 15, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Proposal Reference: #${proposalNo}`, 15, 26);
    doc.text(`Date Generated: ${projectDate}`, 15, 32);

    // Right-aligned status
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    if (clientSigned) {
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.rect(pageWidth - 65, 12, 50, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('SIGNED & ACCEPTED', pageWidth - 60, 17.5);
    } else {
      doc.setFillColor(245, 158, 11); // Amber-500
      doc.rect(pageWidth - 65, 12, 50, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('PENDING ACCEPTANCE', pageWidth - 62, 17.5);
    }

    y = 52;
  };

  addHeader();

  // Helper: check page overflow and add new page if needed
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 15;
      // Small footer-style indicator at top of new page
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Proposal #${proposalNo} - Continued`, 15, y);
      y += 10;
    }
  };

  // Section: Details Columns
  ensureSpace(40);
  // Contractor Details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('PREPARED BY', 15, y);
  doc.text('PREPARED FOR', pageWidth / 2 + 10, y);
  y += 5;

  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PaintNav CRM Services', 15, y);
  doc.text(client.name || 'Client', pageWidth / 2 + 10, y);
  y += 5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Toronto Siding & Framing Division', 15, y);
  doc.text(clientAddress, pageWidth / 2 + 10, y);
  y += 5;

  doc.text('Email: support@paintnav.com', 15, y);
  doc.text(`Phone: ${clientPhone}`, pageWidth / 2 + 10, y);
  y += 5;

  doc.text('Tel: (416) 555-0199', 15, y);
  doc.text(`Email: ${clientEmail}`, pageWidth / 2 + 10, y);
  y += 10;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Scope of Work Grouped by Categories
  const categories = [
    { id: 'interior', name: 'INTERIOR SCOPE OF WORK', barColor: [99, 102, 241], headerColor: [30, 58, 138] },
    { id: 'exterior', name: 'EXTERIOR SCOPE OF WORK', barColor: [245, 158, 11], headerColor: [180, 83, 9] },
    { id: 'deck', name: 'DECK & STAINING SCOPE OF WORK', barColor: [16, 185, 129], headerColor: [16, 120, 74] }
  ];

  categories.forEach(cat => {
    const catRooms = rooms.filter(r => (r.category || 'interior') === cat.id);
    if (catRooms.length === 0) return;

    ensureSpace(45);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(cat.headerColor[0], cat.headerColor[1], cat.headerColor[2]);
    doc.text(cat.name, 15, y);
    y += 6;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Area / Room Description', 18, y + 5.5);
    doc.text('Applied Inclusions / Layers', 85, y + 5.5);
    doc.text('Cost (CAD)', pageWidth - 40, y + 5.5);
    y += 8;

    catRooms.forEach(room => {
      ensureSpace(12);
      const price = liveSummary.roomCosts[room.id] || 0;
      
      // Draw thin border under row or custom background if it's an option room
      if (room.isOption) {
        doc.setFillColor(254, 251, 235); // Soft yellow
        doc.rect(15, y, pageWidth - 30, 10, 'F');
        doc.setDrawColor(253, 224, 71); // Soft yellow border
        doc.rect(15, y, pageWidth - 30, 10, 'S');
      } else {
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 10, pageWidth - 15, y + 10);
      }

      // Room Name
      doc.setFont('Helvetica', 'bold');
      if (room.isOption) {
        doc.setTextColor(180, 83, 9);
        doc.text(`${room.name} (Option)`, 18, y + 6.5);
      } else {
        doc.setTextColor(30, 41, 59);
        doc.text(room.name, 18, y + 6.5);
      }

      // Applied layers/inclusions
      doc.setFont('Helvetica', 'normal');
      if (room.isOption) {
        doc.setTextColor(120, 53, 4);
      } else {
        doc.setTextColor(71, 85, 105);
      }

      const subAreas: string[] = [];
      const keys = [
        { k: 'walls', label: 'Walls' },
        { k: 'ceilings', label: 'Ceilings' },
        { k: 'baseboards', label: 'Base' },
        { k: 'windows', label: 'Windows' },
        { k: 'doors', label: 'Doors' },
        { k: 'doorFrames', label: 'Frames' },
        { k: 'ext-siding', label: 'Siding' },
        { k: 'ext-brick-stain', label: 'Brick' },
        { k: 'ext-porch-floor', label: 'Porch' },
        { k: 'ext-soffits', label: 'Soffits' },
        { k: 'ext-gutters', label: 'Gutters' },
        { k: 'ext-fascia', label: 'Fascia' },
        { k: 'ext-trims', label: 'Trims' },
        { k: 'ext-garage-door', label: 'Garage' },
        { k: 'ext-doors', label: 'Doors' },
        { k: 'ext-windows-fixed', label: 'Windows' },
        { k: 'ext-railings', label: 'Railings' },
        { k: 'ext-shutters', label: 'Shutters' },
        { k: 'washing', label: 'Wash' },
        { k: 'stripping', label: 'Strip' },
        { k: 'reviving', label: 'Revive' },
        { k: 'sanding', label: 'Sand' },
        { k: 'staining', label: 'Stain' }
      ];

      keys.forEach(keyObj => {
        const item = (room as any)[keyObj.k];
        if (item && item.checked !== false) {
          const coatsText = item.coats ? `${item.coats}c` : '';
          const qtyText = item.qty && item.qty !== 'auto' ? `(x${item.qty})` : '';
          const optText = item.isOption ? '[Opt]' : '';
          subAreas.push(`${keyObj.label}${coatsText ? ' ' + coatsText : ''}${qtyText ? ' ' + qtyText : ''}${optText ? ' ' + optText : ''}`);
        }
      });

      // Append custom areas if any
      const customAreas = (room as any).customAreas || [];
      customAreas.forEach((c: any) => {
        if (c.checked !== false) {
          const coatsText = c.coats ? `${c.coats}c` : '';
          const qtyText = c.qty && c.qty !== 'auto' ? `(x${c.qty})` : '';
          const optText = c.isOption ? '[Opt]' : '';
          subAreas.push(`${c.label}${coatsText ? ' ' + coatsText : ''}${qtyText ? ' ' + qtyText : ''}${optText ? ' ' + optText : ''}`);
        }
      });

      const detailsText = subAreas.length > 0 ? subAreas.join(', ') : 'No specific layers selected';
      const truncatedDetails = detailsText.length > 52 ? detailsText.substring(0, 52) + '...' : detailsText;
      doc.text(truncatedDetails, 85, y + 6.5);

      // Price
      doc.setFont('Helvetica', 'bold');
      if (room.isOption) {
        doc.setTextColor(180, 83, 9);
      } else {
        doc.setTextColor(30, 41, 59);
      }
      doc.text(`$${price.toLocaleString()}`, pageWidth - 40, y + 6.5);

      y += 10;
    });

    y += 6; // Extra spacing between category sections
  });

  // Comments & Scope Specifications (Inclusions / Exclusions)
  if (inclusions || exclusions || specialConditions) {
    ensureSpace(35);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('ADDITIONAL TERMS & PROJECT COMMENTS', 15, y);
    y += 6;

    const columnWidth = (pageWidth - 40) / 3;

    if (inclusions) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, columnWidth, 22, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, y, columnWidth, 22, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text('✓ INCLUSIONS', 18, y + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(inclusions, columnWidth - 6);
      doc.text(lines.slice(0, 3), 18, y + 10);
    }

    if (exclusions) {
      const xCol2 = 15 + columnWidth + 5;
      doc.setFillColor(248, 250, 252);
      doc.rect(xCol2, y, columnWidth, 22, 'F');
      doc.rect(xCol2, y, columnWidth, 22, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(239, 68, 68); // Red
      doc.text('✕ EXCLUSIONS', xCol2 + 3, y + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(exclusions, columnWidth - 6);
      doc.text(lines.slice(0, 3), xCol2 + 3, y + 10);
    }

    if (specialConditions) {
      const xCol3 = 15 + (columnWidth * 2) + 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(xCol3, y, columnWidth, 22, 'F');
      doc.rect(xCol3, y, columnWidth, 22, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(245, 158, 11); // Amber
      doc.text('⚠ CONDITIONS', xCol3 + 3, y + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(specialConditions, columnWidth - 6);
      doc.text(lines.slice(0, 3), xCol3 + 3, y + 10);
    }

    y += 28;
  }

  // General Notes Section
  if (generalNotes) {
    ensureSpace(38);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('GENERAL ESTIMATE NOTES', 15, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, pageWidth - 30, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, pageWidth - 30, 22, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(generalNotes, pageWidth - 40);
    doc.text(lines.slice(0, 4), 18, y + 6);
    y += 28;
  }

  // Terms and Conditions Section
  if (termsAndConditions) {
    ensureSpace(45);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('TERMS & CONDITIONS', 15, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, pageWidth - 30, 32, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, pageWidth - 30, 32, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(termsAndConditions, pageWidth - 40);
    doc.text(lines.slice(0, 6), 18, y + 6);
    y += 38;
  }

  // Payment Schedule & Totals Section
  ensureSpace(45);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, pageWidth - 30, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, pageWidth - 30, 32, 'S');

  // Left side payment message
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT SCHEDULE & DEPOSIT', 20, y + 7);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const payMsg = `A standard 30% initial deposit of $${liveSummary.deposit.toLocaleString()} is required to initiate paint supply channels. Remaining balance of $${liveSummary.balance.toLocaleString()} is settleable upon final physical site walkthrough validation.`;
  const payMsgLines = doc.splitTextToSize(payMsg, pageWidth / 2);
  doc.text(payMsgLines, 20, y + 13);

  // Right side math
  const rightColX = pageWidth - 75;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal:', rightColX, y + 8);
  doc.text(`$${liveSummary.subtotal.toLocaleString()}`, pageWidth - 25, y + 8, { align: 'right' });

  doc.text('HST (13%):', rightColX, y + 15);
  doc.text(`$${liveSummary.hst.toLocaleString()}`, pageWidth - 25, y + 15, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(rightColX, y + 19, pageWidth - 20, y + 19);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74); // Green
  doc.text('Total Price:', rightColX, y + 25);
  doc.text(`$${liveSummary.total.toLocaleString()}`, pageWidth - 25, y + 25, { align: 'right' });

  y += 38;

  // Signatures Panel
  ensureSpace(40);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  const colSignWidth = (pageWidth - 40) / 2;

  // Contractor Representative
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, colSignWidth, 26, 'F');
  doc.rect(15, y, colSignWidth, 26, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('CONTRACTOR SIGNATURE', 18, y + 5);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138); // Navy
  doc.text('PaintNav CRM Division', 18, y + 12);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Authorized Digital signature lock', 18, y + 19);

  // Client signature
  const xSignCol2 = 15 + colSignWidth + 10;
  doc.setFillColor(250, 250, 250);
  doc.rect(xSignCol2, y, colSignWidth, 26, 'F');
  doc.rect(xSignCol2, y, colSignWidth, 26, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('CLIENT E-SIGNATURE AUTHORIZATION', xSignCol2 + 3, y + 5);

  if (clientSigned) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(signerName, xSignCol2 + 3, y + 11);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Title: ${signerTitle}`, xSignCol2 + 3, y + 16);
    doc.text(`Date: ${signedDate.substring(0, 16)}`, xSignCol2 + 3, y + 21);

    if (signatureDataUrl) {
      try {
        // Render signature image inside the box, offset to the right
        doc.addImage(signatureDataUrl, 'PNG', xSignCol2 + colSignWidth - 32, y + 6, 28, 14);
      } catch (err) {
        console.error('Failed to render signature image on PDF:', err);
      }
    }
  } else {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text('Waiting for e-signature...', xSignCol2 + 3, y + 15);
  }

  y += 35;

  // Final footer line
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated securely via the PaintNav CRM estimating suite. Both parties agree that digital signatures represent legal execution.', pageWidth / 2, y, { align: 'center' });

  if (installments && installments.length > 0) {
    doc.addPage();
    y = 15;
    
    // Draw the Header for progress page
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('PROGRESS INVOICE & STATEMENT', 15, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Proposal Reference: #${proposalNo}`, 15, 26);
    doc.text(`As of Date: ${new Date().toLocaleDateString()}`, 15, 32);

    // Right-aligned title
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.setFillColor(59, 130, 246); // Blue-500
    doc.rect(pageWidth - 65, 12, 50, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('STATEMENT OF ACCOUNT', pageWidth - 63, 17.5);

    y = 52;

    // Contact details block
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('FROM (CONTRACTOR)', 15, y);
    doc.text('TO (CLIENT)', pageWidth / 2 + 10, y);
    y += 5;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138); // Navy
    doc.text('PaintNav CRM Services', 15, y);
    doc.text(client?.name || 'Client', pageWidth / 2 + 10, y);
    y += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Toronto Siding & Framing Division', 15, y);
    doc.text(clientAddress || 'N/A', pageWidth / 2 + 10, y);
    y += 5;

    doc.text('Email: support@paintnav.com', 15, y);
    doc.text(`Phone: ${clientPhone || 'N/A'}`, pageWidth / 2 + 10, y);
    y += 5;

    doc.text('Tel: (416) 555-0199', 15, y);
    doc.text(`Email: ${clientEmail || 'N/A'}`, pageWidth / 2 + 10, y);
    y += 10;

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Table Header for Installments
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text('PAYMENT SCHEDULE & REAL-TIME PROGRESS', 15, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Milestone Description', 18, y + 5.5);
    doc.text('Status', pageWidth / 2 - 10, y + 5.5);
    doc.text('Activity Date', pageWidth / 2 + 25, y + 5.5);
    doc.text('Amount (CAD)', pageWidth - 20, y + 5.5, { align: 'right' });
    y += 8;

    let totalPaidToDate = 0;

    installments.forEach(inst => {
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 8, pageWidth - 15, y + 8);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(inst.name, 18, y + 5);

      const isPaid = inst.status === 'Paid';
      if (isPaid) {
        totalPaidToDate += inst.amount;
        doc.setTextColor(16, 185, 129);
        doc.setFont('Helvetica', 'bold');
        doc.text('✓ Paid', pageWidth / 2 - 10, y + 5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(inst.paidAt || 'N/A', pageWidth / 2 + 25, y + 5);
      } else {
        const isRequested = inst.status === 'Requested';
        doc.setTextColor(245, 158, 11);
        doc.setFont('Helvetica', 'bold');
        doc.text(isRequested ? 'Requested' : 'Pending', pageWidth / 2 - 10, y + 5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(inst.requestedAt || '-', pageWidth / 2 + 25, y + 5);
      }

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`$${inst.amount.toLocaleString()}`, pageWidth - 20, y + 5, { align: 'right' });

      y += 8;
    });

    y += 4;

    // Financial calculations box
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, pageWidth - 30, 24, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, pageWidth - 30, 24, 'S');

    const totalProjectPrice = liveSummary.total;
    const rightColX = pageWidth - 75;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Total Project Estimate:', rightColX, y + 6);
    doc.text(`$${totalProjectPrice.toLocaleString()}`, pageWidth - 20, y + 6, { align: 'right' });

    doc.setTextColor(16, 185, 129);
    doc.text('Total Paid to Date:', rightColX, y + 12);
    doc.text(`$${totalPaidToDate.toLocaleString()}`, pageWidth - 20, y + 12, { align: 'right' });

    const remaining = Math.max(0, totalProjectPrice - totalPaidToDate);
    doc.setFont('Helvetica', 'bold');
    if (remaining > 0) {
      doc.setTextColor(239, 68, 68); // Red
    } else {
      doc.setTextColor(16, 185, 129); // Emerald
    }
    doc.text(remaining > 0 ? 'Remaining Balance Due:' : 'Contract Fully Settled:', rightColX, y + 18);
    doc.text(`$${remaining.toLocaleString()}`, pageWidth - 20, y + 18, { align: 'right' });

    y += 34;

    // Progress Bar on PDF
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, pageWidth - 15, y);
    y += 6;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const progressPct = totalProjectPrice > 0 ? Math.round((totalPaidToDate / totalProjectPrice) * 100) : 0;
    doc.text(`PROJECT PAYMENTS PROGRESS: ${progressPct}% SETTLED`, 15, y);
    
    // Draw visual bar
    y += 3;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, pageWidth - 30, 3, 'F');
    if (progressPct > 0) {
      doc.setFillColor(16, 185, 129); // emerald
      doc.rect(15, y, (pageWidth - 30) * (progressPct / 100), 3, 'F');
    }

    y += 12;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text('This progress statement reflects real-time transactions recorded on the PaintNav CRM portal.', pageWidth / 2, y, { align: 'center' });
  }

  // Output as raw base64 and generate blobUrl for in-app display/download options
  const base64 = doc.output('datauristring').split(',')[1];
  
  // Create a blob URL so the user can download/view the actual PDF as well
  let blobUrl = '';
  try {
    const blob = doc.output('blob');
    blobUrl = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Blob generation failed:', e);
  }

  return { base64, blobUrl };
}

interface ReceiptPDFParams {
  project: ProjectType;
  client: ClientLead;
  installment: {
    id: string;
    name: string;
    percentage: number;
    amount: number;
    status: 'Draft' | 'Requested' | 'Paid';
    paidAt?: string;
    requestedAt?: string;
  };
  allInstallments: any[];
}

export function generateReceiptPDF({
  project,
  client,
  installment,
  allInstallments,
}: ReceiptPDFParams): { base64: string; blobUrl: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  const ensureSpace = (space: number) => {
    if (y + space > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  };

  // 1. Header background bar (emerald green for payment success receipt)
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('OFFICIAL PAYMENT RECEIPT', 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Project Reference: #${project.id || 'N/A'} - ${project.title || 'Painting Services'}`, 15, 24);
  doc.text(`Receipt ID: RCP-${project.id || 'N/A'}-${installment.id}`, 15, 29);
  doc.text(`Date Sent: ${new Date().toLocaleDateString()}`, 15, 34);

  // Status Badge in Header
  doc.setFillColor(255, 255, 255);
  doc.rect(pageWidth - 45, 12, 30, 8, 'F');
  doc.setTextColor(16, 185, 129);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PAID', pageWidth - 35, 17.5);

  y = 52;

  // 2. Prepared By / For info
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text('FROM (CONTRACTOR)', 15, y);
  doc.text('TO (CLIENT)', pageWidth / 2 + 10, y);
  y += 5;

  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PaintNav CRM Services', 15, y);
  doc.text(client?.name || 'Client', pageWidth / 2 + 10, y);
  y += 5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Toronto Siding & Framing Division', 15, y);
  doc.text(client?.address || 'N/A', pageWidth / 2 + 10, y);
  y += 5;

  doc.text('Email: support@paintnav.com', 15, y);
  doc.text(`Phone: ${client?.phone || 'N/A'}`, pageWidth / 2 + 10, y);
  y += 5;

  doc.text('Tel: (416) 555-0199', 15, y);
  doc.text(`Email: ${client?.email || 'N/A'}`, pageWidth / 2 + 10, y);
  y += 10;

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // 3. What We Did: Scope of Work Completed
  if (project.rooms && project.rooms.length > 0) {
    ensureSpace(35);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138); // Navy
    doc.text('SCOPE OF SERVICES & WORK COMPLETED', 15, y);
    y += 6;

    // Table Header for Scope
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Area / Room Description', 18, y + 5.5);
    doc.text('Type / Specs', pageWidth / 2 - 10, y + 5.5);
    doc.text('Included Surface Treatment', pageWidth - 70, y + 5.5);
    y += 8;

    project.rooms.forEach(room => {
      ensureSpace(12);
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 8, pageWidth - 15, y + 8);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(room.name, 18, y + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const dims = `${room.length || 0}' x ${room.width || 0}' x ${room.height || 0}'`;
      const category = (room.category || 'interior').toUpperCase();
      doc.text(`${category} (${dims})`, pageWidth / 2 - 10, y + 5);

      const treatments: string[] = [];
      if (room.walls) treatments.push('Walls');
      if (room.ceilings) treatments.push('Ceilings');
      if (room.baseboards) treatments.push('Baseboards');
      if (room.windows) treatments.push('Windows');
      if (room.doors) treatments.push('Doors');
      doc.text(treatments.length > 0 ? treatments.join(', ') : 'General Coating', pageWidth - 70, y + 5);

      y += 8;
    });
    y += 6;
  }

  // 4. How Much It Cost: Project Estimates Summary
  ensureSpace(45);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('TOTAL ESTIMATED COSTS BREAKDOWN', 15, y);
  y += 6;

  const laborCost = project.summary?.laborCost || 0;
  const materialCost = project.summary?.materialCost || 0;
  const rawSubtotal = laborCost + materialCost;
  const discount = project.summary?.discount || 0;
  const taxRate = project.summary?.taxRate || 0.13;
  const taxableAmount = Math.max(0, rawSubtotal - discount);
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  const totalProjectPrice = project.summary?.totalPrice || (rawSubtotal - discount + taxAmount);

  // Financial layout box
  doc.setFillColor(250, 250, 250);
  doc.rect(15, y, pageWidth - 30, 22, 'F');
  doc.setDrawColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 22, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Labor & Mobilization:', 18, y + 6);
  doc.text(`$${laborCost.toLocaleString()}`, 55, y + 6);

  doc.text('Materials & Consumables:', 80, y + 6);
  doc.text(`$${materialCost.toLocaleString()}`, 122, y + 6);

  doc.text('Applied Discount:', 145, y + 6);
  doc.text(`-$${discount.toLocaleString()}`, pageWidth - 20, y + 6, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(18, y + 10, pageWidth - 18, y + 10);

  doc.setFont('Helvetica', 'bold');
  doc.text('Subtotal:', 18, y + 16);
  doc.setFont('Helvetica', 'normal');
  doc.text(`$${(rawSubtotal - discount).toLocaleString()}`, 35, y + 16);

  doc.setFont('Helvetica', 'bold');
  doc.text(`HST (${Math.round(taxRate * 100)}%):`, 65, y + 16);
  doc.setFont('Helvetica', 'normal');
  doc.text(`$${taxAmount.toLocaleString()}`, 88, y + 16);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Total Contract Value:', 125, y + 16);
  doc.text(`$${totalProjectPrice.toLocaleString()}`, pageWidth - 20, y + 16, { align: 'right' });

  y += 28;

  // 5. This Transaction / Receipt details
  ensureSpace(28);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('CURRENT RECEIPTED TRANSACTION', 15, y);
  y += 6;

  doc.setFillColor(240, 253, 244); // Very soft green block
  doc.rect(15, y, pageWidth - 30, 16, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(15, y, pageWidth - 30, 16, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('Description / Milestone', 18, y + 6);
  doc.text('Date Received', pageWidth / 2 + 10, y + 6);
  doc.text('Amount Received (CAD)', pageWidth - 20, y + 6, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(installment.name || 'Milestone Payment', 18, y + 11.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(installment.paidAt || new Date().toLocaleDateString(), pageWidth / 2 + 10, y + 11.5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`$${installment.amount.toLocaleString()}`, pageWidth - 20, y + 11.5, { align: 'right' });

  y += 24;

  // 6. History of payments & Statement of Account
  ensureSpace(40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('STATEMENT OF ACCOUNT & LIFETIME PAYMENTS', 15, y);
  y += 6;

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Installment / Milestone Description', 18, y + 5.5);
  doc.text('Status', pageWidth / 2 - 10, y + 5.5);
  doc.text('Payment Date', pageWidth / 2 + 25, y + 5.5);
  doc.text('Amount (CAD)', pageWidth - 20, y + 5.5, { align: 'right' });
  y += 8;

  let totalPaidToDate = 0;

  allInstallments.forEach(inst => {
    ensureSpace(10);
    doc.setDrawColor(241, 245, 249);
    doc.line(15, y + 8, pageWidth - 15, y + 8);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(inst.name, 18, y + 5);

    const isPaid = inst.status === 'Paid';
    if (isPaid) {
      totalPaidToDate += inst.amount;
      doc.setTextColor(16, 185, 129);
      doc.setFont('Helvetica', 'bold');
      doc.text('✓ Paid', pageWidth / 2 - 10, y + 5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(inst.paidAt || 'N/A', pageWidth / 2 + 25, y + 5);
    } else {
      doc.setTextColor(245, 158, 11);
      doc.setFont('Helvetica', 'bold');
      doc.text('Pending', pageWidth / 2 - 10, y + 5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('-', pageWidth / 2 + 25, y + 5);
    }

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`$${inst.amount.toLocaleString()}`, pageWidth - 20, y + 5, { align: 'right' });

    y += 8;
  });

  y += 4;

  // Math summary box
  ensureSpace(28);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, pageWidth - 30, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, y, pageWidth - 30, 24, 'S');

  const rightColX = pageWidth - 80;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Total Project Estimate:', rightColX, y + 6);
  doc.text(`$${totalProjectPrice.toLocaleString()}`, pageWidth - 20, y + 6, { align: 'right' });

  doc.setTextColor(16, 185, 129);
  doc.text('Total Paid to Date:', rightColX, y + 12);
  doc.text(`$${totalPaidToDate.toLocaleString()}`, pageWidth - 20, y + 12, { align: 'right' });

  const remaining = Math.max(0, totalProjectPrice - totalPaidToDate);
  doc.setFont('Helvetica', 'bold');
  if (remaining > 0) {
    doc.setTextColor(239, 68, 68); // Red
  } else {
    doc.setTextColor(16, 185, 129); // Emerald
  }
  doc.text(remaining > 0 ? 'Remaining Balance Due:' : 'Contract Fully Settled:', rightColX, y + 18);
  doc.text(`$${remaining.toLocaleString()}`, pageWidth - 20, y + 18, { align: 'right' });

  y += 34;

  // 7. Signature / Stamp block
  ensureSpace(25);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text('PAID STAMP', 15, y);
  y += 5;

  doc.setFillColor(240, 253, 244); // Light green stamp box
  doc.rect(15, y, 70, 16, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.rect(15, y, 70, 16, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text('★ PAYMENT VERIFIED ★', 20, y + 6);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(`Recorded: ${installment.paidAt || new Date().toLocaleDateString()}`, 20, y + 11);

  y += 24;

  // 8. Footer
  ensureSpace(12);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business! This receipt is automatically generated and digitally secured.', pageWidth / 2, y, { align: 'center' });

  const base64 = doc.output('datauristring').split(',')[1];
  let blobUrl = '';
  try {
    const blob = doc.output('blob');
    blobUrl = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Blob generation failed:', e);
  }

  return { base64, blobUrl };
}

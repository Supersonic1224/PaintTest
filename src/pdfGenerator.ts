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

  // Scope of Work Table
  ensureSpace(45);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('SCOPE OF WORK (STANDARD SERVICES)', 15, y);
  y += 6;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Area / Room Description', 18, y + 5.5);
  doc.text('Applied Inclusions', 90, y + 5.5);
  doc.text('Cost (CAD)', pageWidth - 40, y + 5.5);
  y += 8;

  const standardRooms = rooms.filter(r => !r.isOption);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  if (standardRooms.length === 0) {
    doc.rect(15, y, pageWidth - 30, 10);
    doc.text('No standard rooms configured in this scope.', 20, y + 6.5);
    y += 10;
  } else {
    standardRooms.forEach(room => {
      ensureSpace(12);
      const price = liveSummary.roomCosts[room.id] || 0;
      
      // Draw thin border under row
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 10, pageWidth - 15, y + 10);

      // Room Name
      doc.setFont('Helvetica', 'bold');
      doc.text(room.name, 18, y + 6.5);

      // Room description
      doc.setFont('Helvetica', 'normal');
      const detailsText = [
        room.walls?.checked ? `${room.walls.coats} coats Walls` : '',
        room.ceilings?.checked ? `${room.ceilings.coats} coats Ceilings` : '',
        room.baseboards?.checked ? `${room.baseboards.coats} coats Base` : '',
      ].filter(Boolean).join(', ');
      
      const truncatedDetails = detailsText.length > 45 ? detailsText.substring(0, 45) + '...' : detailsText;
      doc.text(truncatedDetails, 90, y + 6.5);

      // Price
      doc.setFont('Helvetica', 'bold');
      doc.text(`$${price.toLocaleString()}`, pageWidth - 40, y + 6.5);

      y += 10;
    });
  }
  y += 5;

  // Optional choices table (highlighted with yellow borders and yellow background)
  const optionalRooms = rooms.filter(r => r.isOption);
  if (optionalRooms.length > 0) {
    ensureSpace(45);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 83, 9); // Amber text
    doc.text('OPTIONAL EXTRAS & CHOICE ADD-ONS', 15, y);
    y += 6;

    // Yellow Header
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14); // Amber-800
    doc.text('Optional Room Description', 18, y + 5.5);
    doc.text('Applied Inclusions', 90, y + 5.5);
    doc.text('Optional Price (CAD)', pageWidth - 45, y + 5.5);
    y += 8;

    optionalRooms.forEach(room => {
      ensureSpace(12);
      const price = liveSummary.roomCosts[room.id] || 0;

      // Draw row container background (soft yellow)
      doc.setFillColor(255, 251, 235); // Amber-50
      doc.rect(15, y, pageWidth - 30, 10, 'F');

      // Yellow border under row
      doc.setDrawColor(253, 230, 138); // Amber-200
      doc.rect(15, y, pageWidth - 30, 10, 'S');

      // Room Name
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(120, 53, 4);
      doc.text(`${room.name} (Option)`, 18, y + 6.5);

      // Details
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 53, 4);
      const detailsText = [
        room.walls?.checked ? `${room.walls.coats} coats Walls` : '',
        room.ceilings?.checked ? `${room.ceilings.coats} coats Ceilings` : '',
        room.baseboards?.checked ? `${room.baseboards.coats} coats Base` : '',
      ].filter(Boolean).join(', ');
      
      const truncatedDetails = detailsText.length > 45 ? detailsText.substring(0, 45) + '...' : detailsText;
      doc.text(truncatedDetails, 90, y + 6.5);

      // Price
      doc.setFont('Helvetica', 'bold');
      doc.text(`$${price.toLocaleString()}`, pageWidth - 45, y + 6.5);

      y += 10;
    });
    y += 5;
  }

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
    doc.text(signerName, xSignCol2 + 3, y + 12);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Title: ${signerTitle}`, xSignCol2 + 3, y + 18);
    doc.text(`Date: ${signedDate.substring(0, 16)}`, xSignCol2 + 3, y + 23);
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

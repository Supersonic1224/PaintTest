export interface PaintColor {
  brand: string;
  colorName: string;
  colorCode: string; // e.g. "SW 7005"
  hex: string;       // e.g. "#f3f0e8"
  finish: 'Flat' | 'Eggshell' | 'Satin' | 'Semi-Gloss' | 'Gloss';
  surface: 'walls' | 'ceiling' | 'trim' | 'doors';
  coats: number;
  gallonsNeeded: number;
}

export interface RoomAreaConfig {
  checked: boolean;
  qty: number | 'auto';
  coats: number;
}

export interface RoomSpec {
  id: string;
  name: string;
  length: number; // in feet
  width: number;  // in feet
  height: number; // in feet
  wallsArea: number; // in sq ft
  ceilingArea: number; // in sq ft
  paints: PaintColor[];
  walls?: RoomAreaConfig;
  ceilings?: RoomAreaConfig;
  baseboards?: RoomAreaConfig;
  windows?: RoomAreaConfig;
  doors?: RoomAreaConfig;
  doorFrames?: RoomAreaConfig;
  wallPaintType?: string;
  isOption?: boolean;
}

export interface EstimateSummary {
  laborCost: number;
  materialCost: number;
  taxRate: number; // e.g. 0.08
  discount: number;
  totalPrice: number;
}

export interface ProjectTask {
  id: string;
  text: string;
  completed: boolean;
  assignedTo?: string;
  dueDate?: string;
}

export interface ProjectDetails {
  id: string;
  clientId: string;
  title: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'In Progress' | 'Completed' | 'Invoiced' | 'Archived';
  description: string;
  rooms: RoomSpec[];
  summary: EstimateSummary;
  tasks: ProjectTask[];
  driveFolderId?: string; // Google Drive Folder ID
  createdAt: string;
  updatedAt: string;
  inclusions?: string;
  exclusions?: string;
  specialConditions?: string;
  teamNotes?: string;
}

export interface ClientLead {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
  status: 'Lead' | 'Active' | 'Completed' | 'Lost';
  source?: string; // e.g. "Referral", "Website"
  notes: string;
  driveFolderId?: string; // Google Drive Client Root Folder ID
  createdAt: string;
  updatedAt: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
}

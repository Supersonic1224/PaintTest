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
  isOption?: boolean;
}

export interface SurfaceTask {
  id: string;
  text: string;
  completed: boolean;
  surfaceCategory?: string; // e.g. 'Walls', 'Ceiling', 'Trim', 'General', 'Deck Prep'
  isOption?: boolean;
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
  category?: 'interior' | 'exterior' | 'deck';
  groupName?: string;
  surfaceTasks?: SurfaceTask[];
  notes?: string;
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
  isOption?: boolean;
}

export interface Installment {
  id: string;
  name: string;
  percentage: number; // e.g. 30
  amount: number;      // e.g. 300
  status: 'Draft' | 'Requested' | 'Paid';
  requestedAt?: string;
  paidAt?: string;
  stripeInvoiceId?: string;
  stripeInvoiceUrl?: string;
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
  generalNotes?: string;
  termsAndConditions?: string;
  photos?: { id: string; url: string; caption: string; createdAt: string }[];
  clientSigned?: boolean;
  signerName?: string;
  signerTitle?: string;
  signedDate?: string;
  signatureDataUrl?: string;
  contractorAccessToken?: string;
  installments?: Installment[];
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

export interface AuthorizedUser {
  id: string;
  user_id?: string;
  email: string;
  created_at?: string;
}

export interface UniqueCard {
  title: string;
  description: string;
}

export type RealProductCategory = 'interior' | 'exterior' | 'deck';

export interface RealProduct {
  id: string;
  name: string;
  defaultSheen: string;
  categories?: RealProductCategory[];
  /** Builder spec product ID this real product is the default for (e.g. 'wall-premium', 'trim', 'ext-standard') */
  builderSpec?: string;
}

export interface ProductTypeColourDefaults {
  walls: string;
  ceiling: string;
  trim: string;
  primer: string;
  exteriorWalls: string;
  exteriorTrim: string;
  deck: string;
  other: string;
}

export interface ProposalRates {
  hourlyLaborRate: number;
  setupHours: number;
  setupMaterials: number;
  
  // Interior Speeds, Coverage, Prices
  wallsSpeed: number;
  wallsCoverage: number;
  wallsMaterialCost: number;
  
  ceilingsSpeed: number;
  ceilingsCoverage: number;
  ceilingsMaterialCost: number;
  
  baseboardsSpeed: number;
  baseboardsCoverage: number;
  baseboardsMaterialCost: number;
  
  windowsHoursPerCoat: number;
  windowsMaterialCostPerCoat: number;
  
  doorsHoursPerCoat: number;
  doorsMaterialCostPerCoat: number;
  
  doorFramesHoursPerCoat: number;
  doorFramesMaterialCostPerCoat: number;

  // Exterior Speeds, Coverage, Prices
  sidingSpeed: number;
  sidingCoverage: number;
  sidingMaterialCost: number;
  
  brickSpeed: number;
  brickCoverage: number;
  brickMaterialCost: number;
  
  porchFloorSpeed: number;
  porchFloorCoverage: number;
  porchFloorMaterialCost: number;
  
  soffitsSpeed: number;
  soffitsCoverage: number;
  soffitsMaterialCost: number;
  
  guttersSpeed: number;
  guttersCoverage: number;
  guttersMaterialCost: number;
  
  fasciaSpeed: number;
  fasciaCoverage: number;
  fasciaMaterialCost: number;
  
  trimsSpeed: number;
  trimsCoverage: number;
  trimsMaterialCost: number;
  
  garageHoursPerCoat: number;
  garageMaterialCostPerCoat: number;
  
  extDoorsHoursPerCoat: number;
  extDoorsMaterialCostPerCoat: number;
  
  windowsFixedHoursPerCoat: number;
  windowsFixedMaterialCostPerCoat: number;
  
  railingsSpeed: number;
  railingsCoverage: number;
  railingsMaterialCost: number;
  
  shuttersHoursPerCoat: number;
  shuttersMaterialCostPerCoat: number;

  // Deck
  washingSpeed: number;
  washingMaterialCostPerSqft: number;
  
  strippingSpeed: number;
  strippingMaterialCostPerSqft: number;
  
  revivingSpeed: number;
  revivingMaterialCostPerSqft: number;
  
  sandingSpeed: number;
  sandingMaterialCostFlat: number;
  
  stainingSpeed: number;
  stainingCoverage: number;
  stainingMaterialCost: number;
}

export const DEFAULT_PROPOSAL_RATES: ProposalRates = {
  hourlyLaborRate: 85.00,
  setupHours: 5.0,
  setupMaterials: 50.00,
  
  wallsSpeed: 150,
  wallsCoverage: 350,
  wallsMaterialCost: 45,
  
  ceilingsSpeed: 140,
  ceilingsCoverage: 350,
  ceilingsMaterialCost: 40,
  
  baseboardsSpeed: 40,
  baseboardsCoverage: 200,
  baseboardsMaterialCost: 25,
  
  windowsHoursPerCoat: 0.75,
  windowsMaterialCostPerCoat: 7.00,
  
  doorsHoursPerCoat: 0.8,
  doorsMaterialCostPerCoat: 9.00,
  
  doorFramesHoursPerCoat: 0.5,
  doorFramesMaterialCostPerCoat: 5.00,

  sidingSpeed: 180,
  sidingCoverage: 350,
  sidingMaterialCost: 55,
  
  brickSpeed: 120,
  brickCoverage: 250,
  brickMaterialCost: 65,
  
  porchFloorSpeed: 150,
  porchFloorCoverage: 350,
  porchFloorMaterialCost: 50,
  
  soffitsSpeed: 50,
  soffitsCoverage: 200,
  soffitsMaterialCost: 40,
  
  guttersSpeed: 60,
  guttersCoverage: 250,
  guttersMaterialCost: 40,
  
  fasciaSpeed: 60,
  fasciaCoverage: 250,
  fasciaMaterialCost: 40,
  
  trimsSpeed: 60,
  trimsCoverage: 250,
  trimsMaterialCost: 40,
  
  garageHoursPerCoat: 0.75,
  garageMaterialCostPerCoat: 7.50,
  
  extDoorsHoursPerCoat: 0.75,
  extDoorsMaterialCostPerCoat: 7.50,
  
  windowsFixedHoursPerCoat: 0.50,
  windowsFixedMaterialCostPerCoat: 6.00,
  
  railingsSpeed: 40,
  railingsCoverage: 200,
  railingsMaterialCost: 35,
  
  shuttersHoursPerCoat: 0.50,
  shuttersMaterialCostPerCoat: 5.00,

  washingSpeed: 200,
  washingMaterialCostPerSqft: 0.08,
  
  strippingSpeed: 100,
  strippingMaterialCostPerSqft: 0.175,
  
  revivingSpeed: 150,
  revivingMaterialCostPerSqft: 0.10,
  
  sandingSpeed: 80,
  sandingMaterialCostFlat: 30,
  
  stainingSpeed: 80,
  stainingCoverage: 250,
  stainingMaterialCost: 60,
};

export interface DiscountPreset {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

export interface ScopePreset {
  id: string;
  category: 'inclusion' | 'exclusion' | 'special';
  name: string;
  text: string;
}

export interface ScopeAreaPreset {
  id: string;
  category: 'interior' | 'exterior' | 'deck';
  label: string;
  calcType: 'wall' | 'ceiling' | 'perimeter' | 'item';
  defaultQty?: number | 'auto';
  defaultCoats?: number;
}

export interface ProposalSettings {
  threeUniques: UniqueCard[];
  termsAndConditions?: string;
  interiorGeneralNotes?: string;
  exteriorGeneralNotes?: string;
  woodStainingGeneralNotes?: string;
  brickStainingGeneralNotes?: string;
  realProducts?: RealProduct[];
  productTypeColours?: ProductTypeColourDefaults;
  rates?: ProposalRates;
  discountPresets?: DiscountPreset[];
  scopePresets?: ScopePreset[];
  areaPresets?: ScopeAreaPreset[];
}

export interface LabourRate {
  coat1: number;
  coat2: number;
  coat3: number;
}

export interface AppProduct {
  id: string;
  name: string;
  price: number;
  defaultCoverage: number;
}

export interface SubstrateDefault {
  type: string;
  label?: string;
  multiplier: number;
  coats: number;
  productId: string;
  defaultQty: number;
}

export interface ExteriorRates {
  hourlyRate: number;
  labourRates: Record<string, LabourRate>;
  coverageRates: Record<string, number>;
  productPrices: Record<string, number>;
  products: AppProduct[];
  substrateDefaults?: SubstrateDefault[];
}

export interface StainingCoatRates {
  coat1: number;
  coat2: number;
  coat3: number;
}

export interface DeckRates {
  hourlyRate: number;
  productionRates: Record<string, number | StainingCoatRates>;
  products: AppProduct[];
}

export interface CustomSubstrateDefinition {
  /** Matches the configId on room AreaConfig / AreaItem entries */
  id: string;
  /** Display name, e.g. "Accent Wall" */
  name: string;
  /** Underlying measurement type, e.g. 'custom-sqft-walls' */
  type: string;
  /** Default product */
  productId: string;
  /** Default coats */
  coats: 1 | 2 | 3;
}

export type CeilingTexture = 'smooth' | 'textured';

export interface DrywallRates {
  skimWallRate: number;          // sqft/hr (default 40)
  skimCeilingRate: number;       // sqft/hr (default 40)
  crackRepairRate: number;       // hrs/each (default 1)
  patchRate: number;             // hrs/each (default 1)
  skimMaterialPerSqft: number;   // $/sqft (default 0.50)
  crackMaterialEach: number;     // $/each (default 25)
  patchMaterialEach: number;     // $/each (default 50)
}

export interface AppRates {
  hourlyRate: number;
  labourRates: Record<string, LabourRate>;
  coverageRates: Record<string, number>;
  productPrices: Record<string, number>;
  products: AppProduct[];
  areaLabels?: Record<string, string>;
  exteriorRates?: ExteriorRates;
  deckRates?: DeckRates;
  /** Saved custom substrate definitions for this proposal */
  customSubstrates?: CustomSubstrateDefinition[];
  /** Paint coverage rate for smooth ceilings (sqft/gal). Default 350 */
  smoothCeilingCoverage?: number;
  /** Paint coverage rate for textured ceilings (sqft/gal). Default 250 */
  texturedCeilingCoverage?: number;
  /** Global default ceiling texture for new proposals */
  defaultCeilingTexture?: CeilingTexture;
  /** Drywall repair rates (production + material) */
  drywallRates?: DrywallRates;
}

export const DEFAULT_REAL_PRODUCTS: RealProduct[] = [
  { id: 'rp-1', name: 'Benjamin Moore Regal Select', defaultSheen: 'Satin', categories: ['interior', 'exterior'], builderSpec: 'wall-standard' },
  { id: 'rp-2', name: 'Benjamin Moore Aura', defaultSheen: 'Eggshell', categories: ['interior', 'exterior'], builderSpec: 'wall-premium' },
  { id: 'rp-3', name: 'Sherwin-Williams Duration', defaultSheen: 'Satin', categories: ['interior', 'exterior'] },
  { id: 'rp-4', name: 'Sherwin-Williams ProClassic', defaultSheen: 'Semi-Gloss', categories: ['interior'], builderSpec: 'trim' },
  { id: 'rp-5', name: 'PPG Diamond', defaultSheen: 'Eggshell', categories: ['interior', 'exterior'], builderSpec: 'wall-economy' },
  { id: 'rp-6', name: 'Behr Ultra', defaultSheen: 'Satin', categories: ['interior', 'exterior', 'deck'] },
];

export const DEFAULT_PRODUCT_TYPE_COLOURS: ProductTypeColourDefaults = {
  walls: 'TBD',
  ceiling: 'White',
  trim: 'White',
  primer: 'N/A',
  exteriorWalls: 'TBD',
  exteriorTrim: 'White',
  deck: 'TBD',
  other: 'TBD',
};

export const DEFAULT_PROPOSAL_SETTINGS: ProposalSettings = {
  threeUniques: [
    { title: 'Trusted Quality', description: 'We stand behind our work and strive for excellence on every project.' },
    { title: 'Professional Team', description: 'Dedicated professionals committed to a smooth and stress-free experience.' },
    { title: 'Your Satisfaction', description: 'Clear communication, transparent pricing, and results you can count on.' },
  ],
  termsAndConditions: '1. PAYMENT TERMS: A 30% deposit is required to schedule the project. Balance is due immediately upon completion of work.\n2. SCHEDULING: Weather permitting for exterior jobs. Any schedule delays will be communicated promptly.\n3. WARRANTY: We provide a 2-year warranty on workmanship. Warranty does not cover normal wear and tear, abuse, or structural settlement.',
  interiorGeneralNotes: 'All interior surfaces will be fully prepared prior to painting. This includes filling nail holes, minor caulking, and dust protection for furniture and flooring. Premium quality materials will be used.',
  exteriorGeneralNotes: 'Exterior preparation includes pressure washing to remove dirt and loose paint, scraping peeling areas, priming bare wood, and caulking joints as specified. Premium weather-resistant paint will be applied.',
  woodStainingGeneralNotes: 'Wood surfaces will be thoroughly cleaned/stripped if needed. Staining will be applied in thin, even coats to preserve wood grain and protect from elements.',
  brickStainingGeneralNotes: 'Brick surfaces will be cleaned and masonry-grade staining or breathing silicate coatings will be applied to guarantee high durability without trapping moisture.',
  realProducts: DEFAULT_REAL_PRODUCTS,
  rates: DEFAULT_PROPOSAL_RATES,
  discountPresets: [
    { id: 'dp-1', name: 'Referral Special (10%)', amount: 10, type: 'percentage' },
    { id: 'dp-2', name: 'Spring Promo ($250 Off)', amount: 250, type: 'fixed' },
    { id: 'dp-3', name: 'Senior Discount (5%)', amount: 5, type: 'percentage' },
  ],
  scopePresets: [
    { id: 'sp-1', category: 'inclusion', name: 'Interior Preset', text: '• Heavy-duty floor and furniture drop cloth protection\n• Patch minor nail holes and hairline cracks in drywall\n• Sand, spot prime, and apply 2 full coats of premium acrylic paint\n• Full job site cleanup and debris removal upon completion' },
    { id: 'sp-2', category: 'inclusion', name: 'Exterior Preset', text: '• Complete pressure wash to remove dirt and chalking\n• Scrape peeling/flaking paint and wire brush loose areas\n• Prime bare wood surfaces with high-adhesion primer\n• Caulk open gaps around window/door trim\n• Apply 2 full coats of weather-resistant exterior paint' },
    { id: 'sp-3', category: 'inclusion', name: 'Cabinet Preset', text: '• Label and remove cabinet doors and drawer fronts\n• Degrease, scuff-sand, and apply high-bonding primer\n• Spray-apply 2 coats of premium cabinet enamel\n• Re-install doors, drawers, and hardware' },
    { id: 'sp-4', category: 'exclusion', name: 'Interior Exclusions', text: '• Drywall replacement or major structural repairs\n• Painting inside cabinets/closets unless specifically itemized\n• Repairing rotted framing or water-damaged substrate' },
    { id: 'sp-5', category: 'exclusion', name: 'Exterior Exclusions', text: '• Replacement of rotted wood trim or fascia unless added as change order\n• Painting roof shingles or window glass\n• Pressure washing aged delicate cedar shakes' },
    { id: 'sp-6', category: 'special', name: 'Occupied Home', text: '• Home will remain occupied during project. Crew will maintain clean walkways, minimize dust with HEPA vacuums, and store tools daily.' },
    { id: 'sp-7', category: 'special', name: 'Weather Limits', text: '• Exterior painting requires temperatures above 10°C (50°F) and dry surface conditions. Rain delays will be rescheduled promptly.' },
  ],
  areaPresets: [
    { id: 'ap-1', category: 'interior', label: 'Accent Wall', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-2', category: 'interior', label: 'Crown Moulding', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-3', category: 'interior', label: 'Chair Rail', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-4', category: 'interior', label: 'Wainscoting', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-5', category: 'interior', label: 'Baseboard Accent', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-6', category: 'interior', label: 'Accent Ceiling', calcType: 'ceiling', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-7', category: 'interior', label: 'Cabinets (Qty)', calcType: 'item', defaultQty: 10, defaultCoats: 2 },
    { id: 'ap-8', category: 'interior', label: 'Closet Shelving', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-9', category: 'interior', label: 'Door Trim (Qty)', calcType: 'item', defaultQty: 2, defaultCoats: 2 },
    { id: 'ap-10', category: 'interior', label: 'Fireplace Mantel', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { id: 'ap-11', category: 'interior', label: 'Stairs/Spindles', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { id: 'ap-12', category: 'interior', label: 'Radiators (Qty)', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { id: 'ap-13', category: 'deck', label: 'Deck Horizontal Surface', calcType: 'ceiling', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-14', category: 'deck', label: 'Fence', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-15', category: 'deck', label: 'Spindles and Railings', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-16', category: 'deck', label: 'Stairs', calcType: 'item', defaultQty: 5, defaultCoats: 2 },
    { id: 'ap-17', category: 'deck', label: 'Deck', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-18', category: 'exterior', label: 'Whole House', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-19', category: 'exterior', label: 'Front side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-20', category: 'exterior', label: 'Right side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-21', category: 'exterior', label: 'Left side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-22', category: 'exterior', label: 'Back side', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-23', category: 'exterior', label: 'doors', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { id: 'ap-24', category: 'exterior', label: 'Windows', calcType: 'item', defaultQty: 2, defaultCoats: 2 },
    { id: 'ap-25', category: 'exterior', label: 'Fence', calcType: 'perimeter', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-26', category: 'exterior', label: 'Shed', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { id: 'ap-27', category: 'exterior', label: 'Porch', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-28', category: 'exterior', label: 'Garage Doors', calcType: 'item', defaultQty: 1, defaultCoats: 2 },
    { id: 'ap-29', category: 'exterior', label: 'Deck Horizontal Surface', calcType: 'ceiling', defaultQty: 'auto', defaultCoats: 2 },
    { id: 'ap-30', category: 'exterior', label: 'Deck', calcType: 'wall', defaultQty: 'auto', defaultCoats: 2 },
  ]
};

export const DEFAULT_DRYWALL_RATES: DrywallRates = {
  skimWallRate: 40,
  skimCeilingRate: 40,
  crackRepairRate: 1,
  patchRate: 1,
  skimMaterialPerSqft: 0.50,
  crackMaterialEach: 25,
  patchMaterialEach: 50,
};

// ── Interior defaults ──

export const DEFAULT_LABOUR_RATES: Record<string, LabourRate> = {
  walls:            { coat1: 175,  coat2: 100,  coat3: 78   },
  ceilings:         { coat1: 100,  coat2: 57,   coat3: 44   },
  baseboards:       { coat1: 65,   coat2: 37,   coat3: 29   },
  doors:            { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  'door-frames':    { coat1: 0.40, coat2: 0.70, coat3: 0.90 },
  windows:          { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  closet:           { coat1: 0.55, coat2: 0.96, coat3: 1.24 },
  'crown-moulding': { coat1: 50,   coat2: 29,   coat3: 22   },
  'chair-rail':     { coat1: 60,   coat2: 34,   coat3: 27   },
  wainscotting:     { coat1: 100,  coat2: 57,   coat3: 44   },
  stringers:              { coat1: 30,   coat2: 17,   coat3: 13   },
  'custom-sqft-walls':    { coat1: 100,  coat2: 57,   coat3: 44   },
  'custom-sqft-ceilings': { coat1: 100,  coat2: 57,   coat3: 44   },
  'custom-lnft':          { coat1: 65,   coat2: 37,   coat3: 29   },
  'custom-qty':           { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  // Drywall repair
  'dw-skim-wall':    { coat1: 40, coat2: 40, coat3: 40 },
  'dw-skim-ceiling': { coat1: 40, coat2: 40, coat3: 40 },
  'dw-crack-repair': { coat1: 1,  coat2: 1,  coat3: 1  },
  'dw-patch':        { coat1: 1,  coat2: 1,  coat3: 1  },
};

export const DEFAULT_COVERAGE_RATES: Record<string, number> = {
  walls: 1.0, ceilings: 1.0, baseboards: 0.33,
  doors: 10.5, 'door-frames': 8.0, windows: 6.0,
  closet: 15.0, 'crown-moulding': 0.5, 'chair-rail': 0.25,
  wainscotting: 1.0, stringers: 0.33,
  'custom-sqft-walls': 1.0, 'custom-sqft-ceilings': 1.0,
  'custom-lnft': 0.33, 'custom-qty': 5.0,
  'dw-skim-wall': 0, 'dw-skim-ceiling': 0,
  'dw-crack-repair': 0, 'dw-patch': 0,
};

export const DEFAULT_PRODUCT_PRICES: Record<string, number> = {
  'wall-economy': 60, 'wall-standard': 80, 'wall-premium': 100,
  'ceiling': 50, 'trim': 100, 'primer-wb': 60, 'primer-ob': 100,
};

export const DEFAULT_PRODUCTS: AppProduct[] = [
  { id: 'wall-economy',  name: 'Economy',     price: 60,  defaultCoverage: 350 },
  { id: 'wall-standard', name: 'Standard',    price: 80,  defaultCoverage: 350 },
  { id: 'wall-premium',  name: 'Premium',     price: 100, defaultCoverage: 350 },
  { id: 'ceiling',       name: 'Ceiling',     price: 50,  defaultCoverage: 350 },
  { id: 'trim',          name: 'Trim',        price: 100, defaultCoverage: 350 },
  { id: 'primer-wb',     name: 'Primer (WB)', price: 60,  defaultCoverage: 250 },
  { id: 'primer-ob',     name: 'Primer (OB)', price: 100, defaultCoverage: 250 },
];

export const DEFAULT_HOURLY_RATE_FALLBACK = 100;

export const DEFAULT_RATES: AppRates = {
  hourlyRate: 113.13,
  labourRates: DEFAULT_LABOUR_RATES,
  coverageRates: DEFAULT_COVERAGE_RATES,
  productPrices: DEFAULT_PRODUCT_PRICES,
  products: DEFAULT_PRODUCTS,
};

// ── Exterior defaults ──

export const DEFAULT_EXTERIOR_LABOUR_RATES: Record<string, LabourRate> = {
  'ext-siding':           { coat1: 200,  coat2: 120,  coat3: 90   },
  'ext-brick-stain':      { coat1: 150,  coat2: 90,   coat3: 70   },
  'ext-porch-floor':      { coat1: 120,  coat2: 70,   coat3: 55   },
  'ext-porch-ceiling':    { coat1: 100,  coat2: 57,   coat3: 44   },
  'ext-shed':             { coat1: 150,  coat2: 90,   coat3: 70   },
  'ext-power-wash':       { coat1: 400,  coat2: 400,  coat3: 400  },
  'ext-soffits':          { coat1: 60,   coat2: 34,   coat3: 27   },
  'ext-gutters':          { coat1: 80,   coat2: 46,   coat3: 36   },
  'ext-fascia':           { coat1: 65,   coat2: 37,   coat3: 29   },
  'ext-trims':            { coat1: 50,   coat2: 29,   coat3: 22   },
  'ext-garage-door-trim': { coat1: 50,   coat2: 29,   coat3: 22   },
  'ext-railings':         { coat1: 40,   coat2: 23,   coat3: 18   },
  'ext-beam':             { coat1: 50,   coat2: 29,   coat3: 22   },
  'ext-tudor-trim':       { coat1: 40,   coat2: 23,   coat3: 18   },
  'ext-other-trim':       { coat1: 50,   coat2: 29,   coat3: 22   },
  'ext-doors':                { coat1: 0.75, coat2: 1.31, coat3: 1.69 },
  'ext-door-trim-sidelights': { coat1: 1.25, coat2: 2.19, coat3: 2.81 },
  'ext-windows-fixed':        { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  'ext-windows-operable':     { coat1: 0.65, coat2: 1.14, coat3: 1.46 },
  'ext-garage-door':          { coat1: 1.50, coat2: 2.63, coat3: 3.38 },
  'ext-vent':                 { coat1: 0.25, coat2: 0.44, coat3: 0.56 },
  'ext-column':               { coat1: 0.75, coat2: 1.31, coat3: 1.69 },
  'ext-rusty-metal-lintels':  { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  'ext-misc':                 { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  'ext-shutters':             { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
  'ext-other':                { coat1: 0.50, coat2: 0.88, coat3: 1.13 },
};

export const DEFAULT_EXTERIOR_COVERAGE_RATES: Record<string, number> = {
  'ext-siding': 1.0,
  'ext-brick-stain': 0.8,
  'ext-soffits': 0.33,
  'ext-gutters': 0.25,
  'ext-fascia': 0.33,
  'ext-doors': 10.5,
  'ext-trims': 0.33,
  'ext-door-trim-sidelights': 12.0,
  'ext-windows-fixed': 6.0,
  'ext-windows-operable': 6.0,
  'ext-garage-door': 25.0,
  'ext-garage-door-trim': 0.33,
  'ext-vent': 4.0,
  'ext-column': 8.0,
  'ext-beam': 0.5,
  'ext-porch-floor': 1.0,
  'ext-porch-ceiling': 1.0,
  'ext-shed': 1.0,
  'ext-power-wash': 0,
  'ext-rusty-metal-lintels': 3.0,
  'ext-railings': 0.25,
  'ext-misc': 5.0,
  'ext-shutters': 6.0,
  'ext-tudor-trim': 0.33,
  'ext-other-trim': 0.33,
  'ext-other': 5.0,
};

export const DEFAULT_EXTERIOR_PRODUCTS: AppProduct[] = [
  { id: 'ext-economy',  name: 'Exterior Economy',  price: 55,  defaultCoverage: 350 },
  { id: 'ext-standard', name: 'Exterior Standard', price: 75,  defaultCoverage: 350 },
  { id: 'ext-premium',  name: 'Exterior Premium',  price: 95,  defaultCoverage: 350 },
  { id: 'ext-trim',     name: 'Exterior Trim',     price: 100, defaultCoverage: 350 },
  { id: 'ext-primer',   name: 'Exterior Primer',   price: 55,  defaultCoverage: 250 },
];

export const DEFAULT_EXTERIOR_PRODUCT_PRICES: Record<string, number> = {
  'ext-economy': 55, 'ext-standard': 75, 'ext-premium': 95,
  'ext-trim': 100, 'ext-primer': 55,
};

export const DEFAULT_EXTERIOR_RATES: ExteriorRates = {
  hourlyRate: 113.13,
  labourRates: DEFAULT_EXTERIOR_LABOUR_RATES,
  coverageRates: DEFAULT_EXTERIOR_COVERAGE_RATES,
  productPrices: DEFAULT_EXTERIOR_PRODUCT_PRICES,
  products: DEFAULT_EXTERIOR_PRODUCTS,
};

// ── Deck defaults ──

export const DEFAULT_DECK_PRODUCTS: AppProduct[] = [
  { id: 'deck-wash',           name: 'Deck Wash',       price: 100, defaultCoverage: 200 },
  { id: 'deck-stripper',       name: 'Deck Stripper',   price: 100, defaultCoverage: 150 },
  { id: 'deck-sanders',        name: 'Sanders',         price: 50,  defaultCoverage: 400 },
  { id: 'deck-stain-standard', name: 'Stain Standard',  price: 100, defaultCoverage: 250 },
  { id: 'deck-stain-premium',  name: 'Stain Premium',   price: 175, defaultCoverage: 250 },
  { id: 'deck-reviver',        name: 'Deck Reviver',    price: 100, defaultCoverage: 250 },
];

export const DEFAULT_DECK_PRODUCTION_RATES: Record<string, number | StainingCoatRates> = {
  washing: 200,
  stripping: 100,
  reviving: 150,
  sanding: 80,
  staining: { coat1: 80, coat2: 50, coat3: 35 },
};

export const DEFAULT_DECK_RATES: DeckRates = {
  hourlyRate: 113.13,
  productionRates: DEFAULT_DECK_PRODUCTION_RATES,
  products: DEFAULT_DECK_PRODUCTS,
};


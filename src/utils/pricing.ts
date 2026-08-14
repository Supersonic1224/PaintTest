import { RoomSpec, ProposalRates, RealProduct, DEFAULT_PROPOSAL_RATES, DEFAULT_REAL_PRODUCTS, CoatRate, DrywallRates, CalculationEngine } from '../types';

export { DEFAULT_REAL_PRODUCTS, DEFAULT_PROPOSAL_RATES };

/**
 * Surface types where production speed is measured in sq ft/hr or lin ft/hr
 */
export const AREA_OR_LENGTH_BASED = new Set([
  'walls', 'ceilings', 'baseboards', 'crown-moulding', 'chair-rail',
  'wainscotting', 'stringers', 'custom-sqft-walls', 'custom-sqft-ceilings',
  'custom-lnft', 'dw-skim-wall', 'dw-skim-ceiling',
  'ext-siding', 'ext-brick-stain', 'ext-porch-floor', 'ext-porch-ceiling',
  'ext-soffits', 'ext-gutters', 'ext-fascia',
  'ext-trims', 'ext-garage-door-trim', 'ext-railings', 'ext-beam',
  'ext-tudor-trim', 'ext-other-trim', 'ext-shed', 'ext-power-wash'
]);

/**
 * Drywall repair item types with fixed 1-coat labor & material rates
 */
export const DRYWALL_REPAIR = new Set([
  'dw-skim-wall', 'dw-skim-ceiling', 'dw-crack-repair', 'dw-patch',
]);

/**
 * Ceiling surface types for texture coverage lookup
 */
export const CEILING_TEXTURE_TYPES = new Set(['ceilings', 'custom-sqft-ceilings']);

/**
 * Default PaintNav Non-Linear Coat Labor Rates (sqft/hr or hrs/unit for 1/2/3 coats)
 */
export const DEFAULT_LABOUR_RATES: Record<string, CoatRate> = {
  'walls': { coat1: 150, coat2: 250, coat3: 325 },
  'ceilings': { coat1: 140, coat2: 225, coat3: 300 },
  'baseboards': { coat1: 65, coat2: 100, coat3: 130 },
  'crown-moulding': { coat1: 50, coat2: 80, coat3: 110 },
  'chair-rail': { coat1: 60, coat2: 95, coat3: 125 },
  'wainscotting': { coat1: 45, coat2: 70, coat3: 95 },
  'doors': { coat1: 0.8, coat2: 0.5, coat3: 0.35 },
  'doorFrames': { coat1: 0.5, coat2: 0.3, coat3: 0.2 },
  'windows': { coat1: 0.75, coat2: 0.45, coat3: 0.3 },
  'closet': { coat1: 1.5, coat2: 1.0, coat3: 0.7 },
  'custom-sqft-walls': { coat1: 150, coat2: 250, coat3: 325 },
  'custom-sqft-ceilings': { coat1: 140, coat2: 225, coat3: 300 },
  'custom-lnft': { coat1: 60, coat2: 95, coat3: 125 },
  'custom-qty': { coat1: 0.75, coat2: 0.45, coat3: 0.3 },
  'dw-skim-wall': { coat1: 80, coat2: 80, coat3: 80 },
  'dw-skim-ceiling': { coat1: 60, coat2: 60, coat3: 60 },
  'dw-crack-repair': { coat1: 0.5, coat2: 0.5, coat3: 0.5 },
  'dw-patch': { coat1: 1.0, coat2: 1.0, coat3: 1.0 },
  'ext-siding': { coat1: 180, coat2: 280, coat3: 360 },
  'ext-brick-stain': { coat1: 120, coat2: 200, coat3: 260 },
  'ext-porch-floor': { coat1: 150, coat2: 240, coat3: 310 },
  'ext-porch-ceiling': { coat1: 130, coat2: 210, coat3: 280 },
  'ext-soffits': { coat1: 50, coat2: 80, coat3: 100 },
  'ext-gutters': { coat1: 60, coat2: 90, coat3: 120 },
  'ext-fascia': { coat1: 60, coat2: 90, coat3: 120 },
  'ext-trims': { coat1: 60, coat2: 90, coat3: 120 },
  'ext-railings': { coat1: 40, coat2: 65, coat3: 85 },
  'ext-doors': { coat1: 0.75, coat2: 0.45, coat3: 0.3 },
  'ext-windows-fixed': { coat1: 0.5, coat2: 0.3, coat3: 0.2 },
  'ext-garage-door': { coat1: 0.75, coat2: 0.45, coat3: 0.3 },
  'ext-shutters': { coat1: 0.5, coat2: 0.3, coat3: 0.2 },
};

/**
 * Default PaintNav Surface Material Multipliers
 */
export const DEFAULT_COVERAGE_RATES: Record<string, number> = {
  'walls': 1.0,
  'ceilings': 1.0,
  'baseboards': 0.5,
  'crown-moulding': 0.5,
  'chair-rail': 0.25,
  'wainscotting': 1.0,
  'stringers': 0.33,
  'doors': 10.5,
  'doorFrames': 8.0,
  'windows': 6.0,
  'closet': 15.0,
  'custom-sqft-walls': 1.0,
  'custom-sqft-ceilings': 1.0,
  'custom-lnft': 0.33,
  'custom-qty': 5.0,
  'ext-siding': 1.0,
  'ext-brick-stain': 1.0,
  'ext-porch-floor': 1.0,
  'ext-porch-ceiling': 1.0,
  'ext-soffits': 0.33,
  'ext-gutters': 0.25,
  'ext-fascia': 0.25,
  'ext-trims': 0.33,
  'ext-railings': 0.5,
  'ext-doors': 10.5,
  'ext-windows-fixed': 6.0,
  'ext-garage-door': 25.0,
  'ext-shutters': 5.0,
};

/**
 * Default PaintNav Tier Product Prices ($/gal)
 */
export const DEFAULT_PRODUCT_PRICES: Record<string, number> = {
  'wall-economy': 45,
  'wall-standard': 80,
  'wall-premium': 115,
  'ceiling-economy': 40,
  'ceiling-standard': 65,
  'ceiling-premium': 90,
  'trim-economy': 55,
  'trim-standard': 85,
  'trim-premium': 120,
  'ext-siding-economy': 55,
  'ext-siding-standard': 90,
  'ext-siding-premium': 130,
};

/**
 * Coat rate selector helper
 */
export function rateForCoats(rate: CoatRate, coats: number): number {
  const c = Math.max(1, Math.min(3, Math.round(coats || 1)));
  return c === 1 ? rate.coat1 : c === 2 ? rate.coat2 : rate.coat3;
}

/**
 * PaintNav Labor Hours Calculator (Calculates actual cumulative multi-coat production time)
 */
export function calcHours(
  surfaceType: string,
  quantity: number,
  coats: number,
  labourRates: Record<string, CoatRate> = DEFAULT_LABOUR_RATES,
  defaultLabourRates: Record<string, CoatRate> = DEFAULT_LABOUR_RATES,
): number {
  const rateObj = labourRates[surfaceType] ?? defaultLabourRates[surfaceType];
  if (!rateObj || !quantity) return 0;

  const c = Math.max(1, Math.min(3, Math.round(coats || 1)));

  // Drywall repairs are single-operation fixed rates
  if (DRYWALL_REPAIR.has(surfaceType)) {
    const rate = rateObj.coat1 || 1;
    return AREA_OR_LENGTH_BASED.has(surfaceType) ? quantity / rate : quantity * rate;
  }

  if (AREA_OR_LENGTH_BASED.has(surfaceType)) {
    let hours = 0;
    if (rateObj.coat1 > 0) hours += quantity / rateObj.coat1;
    if (c >= 2 && rateObj.coat2 > 0) hours += quantity / rateObj.coat2;
    if (c >= 3 && rateObj.coat3 > 0) hours += quantity / rateObj.coat3;
    return hours;
  } else {
    let hrsPerUnit = 0;
    if (rateObj.coat1 > 0) hrsPerUnit += rateObj.coat1;
    if (c >= 2 && rateObj.coat2 > 0) hrsPerUnit += rateObj.coat2;
    if (c >= 3 && rateObj.coat3 > 0) hrsPerUnit += rateObj.coat3;
    return quantity * hrsPerUnit;
  }
}

export function drywallMaterialRate(surfaceType: string, drywallRates?: DrywallRates): number {
  const defaults = {
    skimMaterialPerSqft: 0.50,
    crackMaterialEach: 25,
    patchMaterialEach: 50,
    ...drywallRates
  };
  switch (surfaceType) {
    case 'dw-skim-wall':
    case 'dw-skim-ceiling':
      return defaults.skimMaterialPerSqft;
    case 'dw-crack-repair':
      return defaults.crackMaterialEach;
    case 'dw-patch':
      return defaults.patchMaterialEach;
    default:
      return 0;
  }
}

export function calcDrywallItem(
  surfaceType: string,
  quantity: number,
  labourRates: Record<string, CoatRate> = DEFAULT_LABOUR_RATES,
  defaultLabourRates: Record<string, CoatRate> = DEFAULT_LABOUR_RATES,
  drywallRates?: DrywallRates,
  materialRateOverride?: number,
) {
  const hours = calcHours(surfaceType, quantity, 1, labourRates, defaultLabourRates);
  const rate = materialRateOverride ?? drywallMaterialRate(surfaceType, drywallRates);
  const materialCost = quantity * rate;
  return { hours, gallons: 0, materialCost, coats: 1 };
}

export function calcNormalItem(
  item: {
    type: string;
    quantity: number;
    coats: number;
    productId?: string;
    coverageRate?: number;
    ceilingTexture?: 'smooth' | 'textured';
    labourRateOverride?: CoatRate;
    roundUp?: boolean;
    productPriceOverride?: number;
  },
  settings: {
    labourRates?: Record<string, CoatRate>;
    coverageRates?: Record<string, number>;
    productPrices?: Record<string, number>;
    smoothCeilingCoverage?: number;
    texturedCeilingCoverage?: number;
  } = {},
  defaultLabourRates: Record<string, CoatRate> = DEFAULT_LABOUR_RATES,
) {
  const activeLabourRates = settings.labourRates || DEFAULT_LABOUR_RATES;
  const activeCoverageRates = settings.coverageRates || DEFAULT_COVERAGE_RATES;
  const activeProductPrices = settings.productPrices || DEFAULT_PRODUCT_PRICES;

  const labourRates = item.labourRateOverride
    ? { ...activeLabourRates, [item.type]: item.labourRateOverride }
    : activeLabourRates;

  const productId = item.productId || 'wall-standard';
  const productPrice = item.productPriceOverride ?? activeProductPrices[productId] ?? 80;
  const hours = calcHours(item.type, item.quantity, item.coats, labourRates, defaultLabourRates);

  const rawCoverageUnits = item.quantity * (activeCoverageRates[item.type] ?? 1.0) * item.coats;

  let coverageRate = item.coverageRate || 350;
  if (CEILING_TEXTURE_TYPES.has(item.type)) {
    coverageRate = item.ceilingTexture === 'textured'
      ? (settings.texturedCeilingCoverage ?? 250)
      : (settings.smoothCeilingCoverage ?? 350);
  }

  let gallons = !coverageRate || rawCoverageUnits <= 0 ? 0 : rawCoverageUnits / coverageRate;
  if (item.roundUp) {
    gallons = Math.ceil(gallons);
  }

  const materialCost = gallons * productPrice;

  return { hours, gallons, materialCost, coverageRate };
}

/**
 * Standard continuous surface coat scaling multiplier (Legacy/Standard Engine)
 */
export function getAreaCoatMultiplier(coats: number): number {
  if (coats <= 1) return 1.0;
  if (coats === 2) return 1.65;
  if (coats === 3) return 2.20;
  return 1.0 + (coats - 1) * 0.55;
}

/**
 * Standard item coat hours per unit (Legacy/Standard Engine)
 */
export function getItemCoatHours(itemKey: string, coats: number, defaultHoursPerCoat: number = 0.75): number {
  const c = Math.max(1, Math.min(3, Math.round(coats || 2)));
  switch (itemKey) {
    case 'doors':
      if (c === 1) return 0.50;
      if (c === 2) return 0.88;
      return 1.13;
    case 'doorFrames':
      if (c === 1) return 0.40;
      if (c === 2) return 0.70;
      return 0.90;
    case 'windows':
    case 'ext-windows-fixed':
      if (c === 1) return 0.50;
      if (c === 2) return 0.88;
      return 1.13;
    case 'ext-windows-operable':
      if (c === 1) return 0.65;
      if (c === 2) return 1.14;
      return 1.46;
    case 'closet':
      if (c === 1) return 0.55;
      if (c === 2) return 0.96;
      return 1.24;
    case 'ext-doors':
      if (c === 1) return 0.75;
      if (c === 2) return 1.31;
      return 1.69;
    case 'ext-garage-door':
      if (c === 1) return 1.50;
      if (c === 2) return 2.63;
      return 3.38;
    case 'ext-shutters':
      if (c === 1) return 0.50;
      if (c === 2) return 0.88;
      return 1.13;
    case 'ext-column':
      if (c === 1) return 0.75;
      if (c === 2) return 1.31;
      return 1.69;
    default:
      if (c === 1) return defaultHoursPerCoat;
      if (c === 2) return defaultHoursPerCoat * 1.65;
      return defaultHoursPerCoat * 2.20;
  }
}

/**
 * Finds associated RealProduct specified for a room surface
 */
export function getProductForSurface(room: RoomSpec, surfaceKey: string, realProducts?: RealProduct[]): RealProduct | undefined {
  const productsList = realProducts && realProducts.length > 0 ? realProducts : DEFAULT_REAL_PRODUCTS;
  
  // 1. Direct paint specification in room.paints
  const assigned = room.paints?.find(p => p.surface === surfaceKey || (surfaceKey === 'baseboards' && p.surface === 'trim'));
  if (assigned) {
    if ((assigned as any).productId) {
      const match = productsList.find(rp => rp.id === (assigned as any).productId);
      if (match) return match;
    }
    if (assigned.brand) {
      const match = productsList.find(rp => rp.name.toLowerCase() === assigned.brand.toLowerCase());
      if (match) return match;
    }
  }

  // 2. Surface-specific productId stored on room object
  const roomSurfaceProdId = (room as any)[`${surfaceKey}ProductId`];
  if (roomSurfaceProdId) {
    const match = productsList.find(rp => rp.id === roomSurfaceProdId);
    if (match) return match;
  }

  // 3. Category fallback
  if ((room as any).wallPaintType) {
    const match = productsList.find(rp => rp.id === (room as any).wallPaintType || rp.builderSpec === (room as any).wallPaintType);
    if (match) return match;
  }

  return undefined;
}

/**
 * PaintNav Calculation Engine for a single room
 */
export function calculatePaintNavRoomPricing(
  room: RoomSpec,
  rates?: ProposalRates,
  realProducts?: RealProduct[]
) {
  const r = rates || DEFAULT_PROPOSAL_RATES;
  const products = realProducts && realProducts.length > 0 ? realProducts : DEFAULT_REAL_PRODUCTS;
  const hourlyLaborRate = Number(r.hourlyLaborRate) || 113.13;

  const rL = Number(room.length) || 12;
  const rW = Number(room.width) || 12;
  const rH = Number(room.height) || 9;

  const wArea = 2 * rH * (rL + rW);
  const cArea = rL * rW;
  const perimeter = 2 * (rL + rW);

  let totalHours = 0;
  let totalMaterials = 0;

  const surfaceItems: {
    key: string;
    label: string;
    coats: number;
    qtyOrArea: string;
    hours: number;
    materialCost: number;
    totalCost: number;
    product?: RealProduct;
  }[] = [];

  const addSurfaceResult = (key: string, label: string, coats: number, qtyOrArea: string, hours: number, matCost: number, prod?: RealProduct) => {
    const roundedHours = parseFloat(hours.toFixed(1));
    const roundedMat = Math.round(matCost);
    const cost = Math.round(hours * hourlyLaborRate + matCost);
    totalHours += hours;
    totalMaterials += matCost;
    surfaceItems.push({
      key,
      label,
      coats,
      qtyOrArea,
      hours: roundedHours,
      materialCost: roundedMat,
      totalCost: cost,
      product: prod
    });
  };

  const activeSettings = {
    coverageRates: r.substrateCoverageRates,
    smoothCeilingCoverage: 350,
    texturedCeilingCoverage: 250,
  };

  // 1. Walls
  const rWalls = room.walls;
  if (rWalls && rWalls.checked) {
    const coats = Number(rWalls.coats) || 2;
    const prod = getProductForSurface(room, 'walls', products);
    const prodPrice = prod?.pricePerGal ?? prod?.price ?? 80;
    const cov = prod?.coverageSqFtPerGal ?? prod?.coverage ?? 350;

    const res = calcNormalItem({
      type: 'walls',
      quantity: wArea,
      coats,
      coverageRate: cov,
      productPriceOverride: prodPrice
    }, activeSettings);
    addSurfaceResult('walls', 'Walls', coats, `${wArea} sq ft`, res.hours, res.materialCost, prod);
  }

  // 2. Ceilings
  const rCeilings = room.ceilings;
  if (rCeilings && rCeilings.checked) {
    const coats = Number(rCeilings.coats) || 2;
    const prod = getProductForSurface(room, 'ceilings', products);
    const prodPrice = prod?.pricePerGal ?? prod?.price ?? 65;
    const cov = prod?.coverageSqFtPerGal ?? prod?.coverage ?? 350;

    const res = calcNormalItem({
      type: 'ceilings',
      quantity: cArea,
      coats,
      coverageRate: cov,
      ceilingTexture: (room as any).ceilingTexture || 'smooth',
      productPriceOverride: prodPrice
    }, activeSettings);
    addSurfaceResult('ceilings', 'Ceilings', coats, `${cArea} sq ft`, res.hours, res.materialCost, prod);
  }

  // 3. Baseboards
  const rBaseboards = room.baseboards;
  if (rBaseboards && rBaseboards.checked) {
    const coats = Number(rBaseboards.coats) || 2;
    const prod = getProductForSurface(room, 'baseboards', products);
    const prodPrice = prod?.pricePerGal ?? prod?.price ?? 85;
    const cov = prod?.coverageSqFtPerGal ?? prod?.coverage ?? 200;

    const res = calcNormalItem({
      type: 'baseboards',
      quantity: perimeter,
      coats,
      coverageRate: cov,
      productPriceOverride: prodPrice
    }, activeSettings);
    addSurfaceResult('baseboards', 'Baseboards', coats, `${perimeter} lin ft`, res.hours, res.materialCost, prod);
  }

  // 4. Windows
  const rWindows = room.windows;
  if (rWindows && rWindows.checked) {
    const qty = Number(rWindows.qty) || 2;
    const coats = Number(rWindows.coats) || 2;
    const prod = getProductForSurface(room, 'windows', products);
    const prodPrice = prod?.pricePerGal ?? prod?.price ?? 85;

    const res = calcNormalItem({
      type: 'windows',
      quantity: qty,
      coats,
      productPriceOverride: prodPrice
    }, activeSettings);
    addSurfaceResult('windows', 'Windows', coats, `${qty} unit(s)`, res.hours, res.materialCost, prod);
  }

  // 5. Doors
  const rDoors = room.doors;
  if (rDoors && rDoors.checked) {
    const qty = Number(rDoors.qty) || 2;
    const coats = Number(rDoors.coats) || 2;
    const prod = getProductForSurface(room, 'doors', products);
    const prodPrice = prod?.pricePerGal ?? prod?.price ?? 85;

    const res = calcNormalItem({
      type: 'doors',
      quantity: qty,
      coats,
      productPriceOverride: prodPrice
    }, activeSettings);
    addSurfaceResult('doors', 'Doors', coats, `${qty} unit(s)`, res.hours, res.materialCost, prod);
  }

  // 6. Door Frames
  const rDoorFrames = room.doorFrames;
  if (rDoorFrames && rDoorFrames.checked) {
    const qty = Number(rDoorFrames.qty) || 2;
    const coats = Number(rDoorFrames.coats) || 2;
    const prod = getProductForSurface(room, 'doorFrames', products);
    const prodPrice = prod?.pricePerGal ?? prod?.price ?? 85;

    const res = calcNormalItem({
      type: 'doorFrames',
      quantity: qty,
      coats,
      productPriceOverride: prodPrice
    }, activeSettings);
    addSurfaceResult('doorFrames', 'Door Frames', coats, `${qty} unit(s)`, res.hours, res.materialCost, prod);
  }

  // 7. Custom Areas
  if ((room as any).customAreas) {
    (room as any).customAreas.forEach((cAreaItem: any) => {
      if (cAreaItem.checked) {
        const coats = Number(cAreaItem.coats) || 2;
        const qty = cAreaItem.qty === 'auto' ? 1 : (Number(cAreaItem.qty) || 1);
        const calcType = cAreaItem.calcType || 'wall';

        let areaQty = qty;
        let typeStr = 'custom-qty';
        if (calcType === 'wall') {
          areaQty = wArea;
          typeStr = 'custom-sqft-walls';
        } else if (calcType === 'ceiling') {
          areaQty = cArea;
          typeStr = 'custom-sqft-ceilings';
        } else if (calcType === 'perimeter') {
          areaQty = perimeter;
          typeStr = 'custom-lnft';
        }

        const res = calcNormalItem({
          type: typeStr,
          quantity: areaQty,
          coats,
          productPriceOverride: cAreaItem.materialCost || 80
        });
        addSurfaceResult(cAreaItem.key || 'custom', cAreaItem.name || 'Custom Surface', coats, `${areaQty} unit(s)`, res.hours, res.materialCost);
      }
    });
  }

  // Surface Prep Tasks
  const roomTasks = room.surfaceTasks || [];
  roomTasks.forEach((task) => {
    if (!task.completed && !task.isOption) {
      let tHours = 0.75;
      let tMat = 12.00;

      const textLower = (task.text || '').toLowerCase();
      if (textLower.includes('wash') || textLower.includes('clean')) {
        tHours = 0.5;
        tMat = 8.00;
      } else if (textLower.includes('patch') || textLower.includes('repair') || textLower.includes('drywall')) {
        tHours = 1.0;
        tMat = 15.00;
      } else if (textLower.includes('prime') || textLower.includes('stain') || textLower.includes('strip')) {
        tHours = 1.0;
        tMat = 20.00;
      } else if (textLower.includes('sand')) {
        tHours = 0.5;
        tMat = 10.00;
      }

      totalHours += tHours;
      totalMaterials += tMat;
    }
  });

  const totalLaborCost = Math.round(totalHours * hourlyLaborRate);
  const roundedMaterials = Math.round(totalMaterials);
  const totalCost = totalLaborCost + roundedMaterials;

  return {
    hours: parseFloat(totalHours.toFixed(1)),
    laborCost: totalLaborCost,
    materialCost: roundedMaterials,
    totalCost,
    surfaceItems
  };
}

/**
 * Standard Speed & Coverage Calculation Engine (Legacy Formula)
 */
export function calculateStandardRoomPricing(
  room: RoomSpec,
  rates?: ProposalRates,
  realProducts?: RealProduct[]
) {
  const r = rates || DEFAULT_PROPOSAL_RATES;
  const products = realProducts && realProducts.length > 0 ? realProducts : DEFAULT_REAL_PRODUCTS;
  const hourlyLaborRate = Number(r.hourlyLaborRate) || 113.13;

  const rL = Number(room.length) || 12;
  const rW = Number(room.width) || 12;
  const rH = Number(room.height) || 9;

  const wArea = 2 * rH * (rL + rW);
  const cArea = rL * rW;
  const perimeter = 2 * (rL + rW);
  const category = room.category || 'interior';

  let totalHours = 0;
  let totalMaterials = 0;

  const surfaceItems: {
    key: string;
    label: string;
    coats: number;
    qtyOrArea: string;
    hours: number;
    materialCost: number;
    totalCost: number;
    product?: RealProduct;
  }[] = [];

  if (category === 'exterior') {
    const extConfigs = [
      { key: 'ext-siding', label: 'Exterior Siding', speed: r.sidingSpeed || 180, coverage: r.sidingCoverage || 350, defaultMatCost: r.sidingMaterialCost || 55, area: wArea, unit: 'sq ft' },
      { key: 'ext-brick-stain', label: 'Brick Stain', speed: r.brickSpeed || 120, coverage: r.brickCoverage || 250, defaultMatCost: r.brickMaterialCost || 65, area: wArea, unit: 'sq ft' },
      { key: 'ext-porch-floor', label: 'Porch Floor', speed: r.porchFloorSpeed || 150, coverage: r.porchFloorCoverage || 350, defaultMatCost: r.porchFloorMaterialCost || 50, area: cArea, unit: 'sq ft' },
      { key: 'ext-soffits', label: 'Soffits', speed: r.soffitsSpeed || 50, coverage: r.soffitsCoverage || 200, defaultMatCost: r.soffitsMaterialCost || 40, area: perimeter, unit: 'lin ft' },
      { key: 'ext-gutters', label: 'Gutters', speed: r.guttersSpeed || 60, coverage: r.guttersCoverage || 250, defaultMatCost: r.guttersMaterialCost || 40, area: perimeter, unit: 'lin ft' },
      { key: 'ext-fascia', label: 'Fascia', speed: r.fasciaSpeed || 60, coverage: r.fasciaCoverage || 250, defaultMatCost: r.fasciaMaterialCost || 40, area: perimeter, unit: 'lin ft' },
      { key: 'ext-trims', label: 'Exterior Trims', speed: r.trimsSpeed || 60, coverage: r.trimsCoverage || 250, defaultMatCost: r.trimsMaterialCost || 40, area: perimeter, unit: 'lin ft' },
      { key: 'ext-railings', label: 'Railings', speed: r.railingsSpeed || 40, coverage: r.railingsCoverage || 200, defaultMatCost: r.railingsMaterialCost || 35, area: perimeter, unit: 'lin ft' },
    ];

    extConfigs.forEach(cfg => {
      const surfaceObj = (room as any)[cfg.key];
      if (surfaceObj && surfaceObj.checked) {
        const coats = Number(surfaceObj.coats) || 2;
        const coatMult = getAreaCoatMultiplier(coats);
        const h = (cfg.area / cfg.speed) * coatMult;

        const prod = getProductForSurface(room, cfg.key, products);
        const gallonPrice = prod?.price ?? cfg.defaultMatCost;
        const covRate = prod?.coverage ?? cfg.coverage;

        const m = (cfg.area / covRate) * coats * gallonPrice;
        const cost = Math.round(h * hourlyLaborRate + m);

        totalHours += h;
        totalMaterials += m;
        surfaceItems.push({
          key: cfg.key,
          label: cfg.label,
          coats,
          qtyOrArea: `${cfg.area} ${cfg.unit}`,
          hours: parseFloat(h.toFixed(1)),
          materialCost: Math.round(m),
          totalCost: cost,
          product: prod
        });
      }
    });

    // Exterior Count Items
    const extCountConfigs = [
      { key: 'ext-garage-door', label: 'Garage Door', hPerCoat: r.garageHoursPerCoat || 0.75, matPerCoat: r.garageMaterialCostPerCoat || 7.50 },
      { key: 'ext-doors', label: 'Front / Exterior Doors', hPerCoat: r.extDoorsHoursPerCoat || 0.75, matPerCoat: r.extDoorsMaterialCostPerCoat || 7.50 },
      { key: 'ext-windows-fixed', label: 'Exterior Windows', hPerCoat: r.windowsFixedHoursPerCoat || 0.50, matPerCoat: r.windowsFixedMaterialCostPerCoat || 6.00 },
      { key: 'ext-shutters', label: 'Exterior Shutters', hPerCoat: r.shuttersHoursPerCoat || 0.50, matPerCoat: r.shuttersMaterialCostPerCoat || 5.00 },
    ];

    extCountConfigs.forEach(cfg => {
      const surfaceObj = (room as any)[cfg.key];
      if (surfaceObj && surfaceObj.checked) {
        const qty = Number(surfaceObj.qty) || 1;
        const coats = Number(surfaceObj.coats) || 2;
        const unitH = getItemCoatHours(cfg.key, coats, cfg.hPerCoat);
        const h = qty * unitH;

        const prod = getProductForSurface(room, cfg.key, products);
        const mUnit = prod?.price ? (prod.price / 10) : cfg.matPerCoat;
        const m = qty * mUnit * coats;
        const cost = Math.round(h * hourlyLaborRate + m);

        totalHours += h;
        totalMaterials += m;
        surfaceItems.push({
          key: cfg.key,
          label: cfg.label,
          coats,
          qtyOrArea: `${qty} unit(s)`,
          hours: parseFloat(h.toFixed(1)),
          materialCost: Math.round(m),
          totalCost: cost,
          product: prod
        });
      }
    });
  } else {
    // Interior Standard Formula
    const rWalls = room.walls;
    const rCeilings = room.ceilings;
    const rBaseboards = room.baseboards;
    const rWindows = room.windows;
    const rDoors = room.doors;
    const rDoorFrames = room.doorFrames;

    if (rWalls && rWalls.checked) {
      const coats = Number(rWalls.coats) || 2;
      const coatMult = getAreaCoatMultiplier(coats);
      const h = (wArea / (r.wallsSpeed || 150)) * coatMult;

      const prod = getProductForSurface(room, 'walls', products);
      const gallonPrice = prod?.price ?? (r.wallsMaterialCost || 45);
      const covRate = prod?.coverage ?? (r.wallsCoverage || 350);

      const m = (wArea / covRate) * coats * gallonPrice;
      const cost = Math.round(h * hourlyLaborRate + m);

      totalHours += h;
      totalMaterials += m;
      surfaceItems.push({
        key: 'walls',
        label: 'Walls',
        coats,
        qtyOrArea: `${wArea} sq ft`,
        hours: parseFloat(h.toFixed(1)),
        materialCost: Math.round(m),
        totalCost: cost,
        product: prod
      });
    }

    if (rCeilings && rCeilings.checked) {
      const coats = Number(rCeilings.coats) || 2;
      const coatMult = getAreaCoatMultiplier(coats);
      const h = (cArea / (r.ceilingsSpeed || 140)) * coatMult;

      const prod = getProductForSurface(room, 'ceilings', products);
      const gallonPrice = prod?.price ?? (r.ceilingsMaterialCost || 40);
      const covRate = prod?.coverage ?? (r.ceilingsCoverage || 350);

      const m = (cArea / covRate) * coats * gallonPrice;
      const cost = Math.round(h * hourlyLaborRate + m);

      totalHours += h;
      totalMaterials += m;
      surfaceItems.push({
        key: 'ceilings',
        label: 'Ceilings',
        coats,
        qtyOrArea: `${cArea} sq ft`,
        hours: parseFloat(h.toFixed(1)),
        materialCost: Math.round(m),
        totalCost: cost,
        product: prod
      });
    }

    if (rBaseboards && rBaseboards.checked) {
      const coats = Number(rBaseboards.coats) || 2;
      const coatMult = getAreaCoatMultiplier(coats);
      const h = (perimeter / (r.baseboardsSpeed || 40)) * coatMult;

      const prod = getProductForSurface(room, 'baseboards', products);
      const gallonPrice = prod?.price ?? (r.baseboardsMaterialCost || 25);
      const covRate = prod?.coverage ?? (r.baseboardsCoverage || 200);

      const m = (perimeter / covRate) * coats * gallonPrice;
      const cost = Math.round(h * hourlyLaborRate + m);

      totalHours += h;
      totalMaterials += m;
      surfaceItems.push({
        key: 'baseboards',
        label: 'Baseboards',
        coats,
        qtyOrArea: `${perimeter} lin ft`,
        hours: parseFloat(h.toFixed(1)),
        materialCost: Math.round(m),
        totalCost: cost,
        product: prod
      });
    }

    if (rWindows && rWindows.checked) {
      const qty = Number(rWindows.qty) || 2;
      const coats = Number(rWindows.coats) || 2;
      const perUnitH = getItemCoatHours('windows', coats, r.windowsHoursPerCoat || 0.75);
      const h = qty * perUnitH;

      const prod = getProductForSurface(room, 'windows', products);
      const mUnit = prod?.price ? (prod.price / 12) : (r.windowsMaterialCostPerCoat || 7.00);
      const m = qty * mUnit * coats;
      const cost = Math.round(h * hourlyLaborRate + m);

      totalHours += h;
      totalMaterials += m;
      surfaceItems.push({
        key: 'windows',
        label: 'Windows',
        coats,
        qtyOrArea: `${qty} unit(s)`,
        hours: parseFloat(h.toFixed(1)),
        materialCost: Math.round(m),
        totalCost: cost,
        product: prod
      });
    }

    if (rDoors && rDoors.checked) {
      const qty = Number(rDoors.qty) || 2;
      const coats = Number(rDoors.coats) || 2;
      const perUnitH = getItemCoatHours('doors', coats, r.doorsHoursPerCoat || 0.80);
      const h = qty * perUnitH;

      const prod = getProductForSurface(room, 'doors', products);
      const mUnit = prod?.price ? (prod.price / 10) : (r.doorsMaterialCostPerCoat || 9.00);
      const m = qty * mUnit * coats;
      const cost = Math.round(h * hourlyLaborRate + m);

      totalHours += h;
      totalMaterials += m;
      surfaceItems.push({
        key: 'doors',
        label: 'Doors',
        coats,
        qtyOrArea: `${qty} unit(s)`,
        hours: parseFloat(h.toFixed(1)),
        materialCost: Math.round(m),
        totalCost: cost,
        product: prod
      });
    }

    if (rDoorFrames && rDoorFrames.checked) {
      const qty = Number(rDoorFrames.qty) || 2;
      const coats = Number(rDoorFrames.coats) || 2;
      const perUnitH = getItemCoatHours('doorFrames', coats, r.doorFramesHoursPerCoat || 0.50);
      const h = qty * perUnitH;

      const prod = getProductForSurface(room, 'doorFrames', products);
      const mUnit = prod?.price ? (prod.price / 15) : (r.doorFramesMaterialCostPerCoat || 5.00);
      const m = qty * mUnit * coats;
      const cost = Math.round(h * hourlyLaborRate + m);

      totalHours += h;
      totalMaterials += m;
      surfaceItems.push({
        key: 'doorFrames',
        label: 'Door Frames',
        coats,
        qtyOrArea: `${qty} unit(s)`,
        hours: parseFloat(h.toFixed(1)),
        materialCost: Math.round(m),
        totalCost: cost,
        product: prod
      });
    }
  }

  // Custom Areas
  if ((room as any).customAreas) {
    (room as any).customAreas.forEach((cAreaItem: any) => {
      if (cAreaItem.checked) {
        const coats = Number(cAreaItem.coats) || 2;
        const qty = cAreaItem.qty === 'auto' ? 1 : (Number(cAreaItem.qty) || 1);
        const coatMult = getAreaCoatMultiplier(coats);

        const speed = cAreaItem.speed || 150;
        const coverage = cAreaItem.coverage || 350;
        const matCost = cAreaItem.materialCost || 25;

        let h = 0;
        let m = 0;

        if (cAreaItem.calcType === 'wall') {
          h = (wArea / speed) * coatMult;
          m = (wArea / coverage) * coats * matCost;
        } else if (cAreaItem.calcType === 'ceiling') {
          h = (cArea / speed) * coatMult;
          m = (cArea / coverage) * coats * matCost;
        } else if (cAreaItem.calcType === 'perimeter') {
          h = (perimeter / speed) * coatMult;
          m = (perimeter / coverage) * coats * matCost;
        } else {
          h = qty * getItemCoatHours('custom', coats, 0.75);
          m = qty * 7.00 * coats;
        }

        const cost = Math.round(h * hourlyLaborRate + m);
        totalHours += h;
        totalMaterials += m;
        surfaceItems.push({
          key: cAreaItem.key || 'custom',
          label: cAreaItem.name || 'Custom Surface',
          coats,
          qtyOrArea: `${qty} item(s)`,
          hours: parseFloat(h.toFixed(1)),
          materialCost: Math.round(m),
          totalCost: cost
        });
      }
    });
  }

  // Surface Prep Tasks
  const roomTasks = room.surfaceTasks || [];
  roomTasks.forEach((task) => {
    if (!task.completed && !task.isOption) {
      let tHours = 0.75;
      let tMat = 12.00;

      const textLower = (task.text || '').toLowerCase();
      if (textLower.includes('wash') || textLower.includes('clean')) {
        tHours = 0.5;
        tMat = 8.00;
      } else if (textLower.includes('patch') || textLower.includes('repair') || textLower.includes('drywall')) {
        tHours = 1.0;
        tMat = 15.00;
      } else if (textLower.includes('prime') || textLower.includes('stain') || textLower.includes('strip')) {
        tHours = 1.0;
        tMat = 20.00;
      } else if (textLower.includes('sand')) {
        tHours = 0.5;
        tMat = 10.00;
      }

      totalHours += tHours;
      totalMaterials += tMat;
    }
  });

  const totalLaborCost = Math.round(totalHours * hourlyLaborRate);
  const roundedMaterials = Math.round(totalMaterials);
  const totalCost = totalLaborCost + roundedMaterials;

  return {
    hours: parseFloat(totalHours.toFixed(1)),
    laborCost: totalLaborCost,
    materialCost: roundedMaterials,
    totalCost,
    surfaceItems
  };
}

/**
 * Universal calculation entry point with engine auto-selection
 */
export function calculateRoomPricing(
  room: RoomSpec,
  rates?: ProposalRates & { calculationEngine?: CalculationEngine },
  realProducts?: RealProduct[],
  engineOverride?: CalculationEngine
) {
  const selectedEngine: CalculationEngine = engineOverride || rates?.calculationEngine || 'paintnav';

  if (selectedEngine === 'standard') {
    return calculateStandardRoomPricing(room, rates, realProducts);
  }

  return calculatePaintNavRoomPricing(room, rates, realProducts);
}

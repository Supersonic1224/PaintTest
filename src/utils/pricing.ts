import { RoomSpec, ProposalRates, RealProduct, DEFAULT_PROPOSAL_RATES, DEFAULT_REAL_PRODUCTS } from '../types';

/**
 * Returns realistic coat scaling factor for continuous surface areas (walls, ceilings, trim)
 * 1 coat = 1.0x
 * 2 coats = 1.65x (1st coat cut & prep + 2nd coat rolling)
 * 3 coats = 2.20x
 */
export function getAreaCoatMultiplier(coats: number): number {
  if (coats <= 1) return 1.0;
  if (coats === 2) return 1.65;
  if (coats === 3) return 2.20;
  return 1.0 + (coats - 1) * 0.55;
}

/**
 * Returns exact coat hours per unit for distinct item surfaces based on industry production tables
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

  // 2. Surface-specific productId stored on room object (e.g. room.wallsProductId, room.ceilingsProductId)
  const roomSurfaceProdId = (room as any)[`${surfaceKey}ProductId`];
  if (roomSurfaceProdId) {
    const match = productsList.find(rp => rp.id === roomSurfaceProdId);
    if (match) return match;
  }

  // 3. Category fallback (e.g. wallPaintType)
  if ((room as any).wallPaintType) {
    const match = productsList.find(rp => rp.id === (room as any).wallPaintType || rp.builderSpec === (room as any).wallPaintType);
    if (match) return match;
  }

  return undefined;
}

/**
 * Calculates complete pricing breakdown for a single room
 */
export function calculateRoomPricing(
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
      const item = (room as any)[cfg.key];
      if (item && item.checked) {
        const coats = Number(item.coats) || 2;
        const coatMult = getAreaCoatMultiplier(coats);
        const h = (cfg.area / cfg.speed) * coatMult;

        const prod = getProductForSurface(room, cfg.key, products);
        const unitPrice = prod?.price ?? cfg.defaultMatCost;
        const covRate = prod?.coverage ?? cfg.coverage;

        const m = (cfg.area / covRate) * coats * unitPrice;
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

    const extItems = [
      { key: 'ext-garage-door', label: 'Garage Door', defaultH: r.garageHoursPerCoat || 0.75, defaultM: r.garageMaterialCostPerCoat || 7.50 },
      { key: 'ext-doors', label: 'Front / Exterior Doors', defaultH: r.extDoorsHoursPerCoat || 0.75, defaultM: r.extDoorsMaterialCostPerCoat || 7.50 },
      { key: 'ext-windows-fixed', label: 'Exterior Windows', defaultH: r.windowsFixedHoursPerCoat || 0.50, defaultM: r.windowsFixedMaterialCostPerCoat || 6.00 },
      { key: 'ext-shutters', label: 'Shutters', defaultH: r.shuttersHoursPerCoat || 0.50, defaultM: r.shuttersMaterialCostPerCoat || 5.00 },
    ];

    extItems.forEach(cfg => {
      const item = (room as any)[cfg.key];
      if (item && item.checked) {
        const qty = Number(item.qty) || 1;
        const coats = Number(item.coats) || 2;
        const perUnitH = getItemCoatHours(cfg.key, coats, cfg.defaultH);
        const h = qty * perUnitH;

        const prod = getProductForSurface(room, cfg.key, products);
        const mUnit = prod?.price ? (prod.price / 10) : cfg.defaultM;
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

  } else if (category === 'deck') {
    const deckConfigs = [
      { key: 'washing', label: 'Power Washing', speed: r.washingSpeed || 200, matCostPerSqft: r.washingMaterialCostPerSqft || 0.08, requiresCoats: false },
      { key: 'stripping', label: 'Chemical Stripping', speed: r.strippingSpeed || 100, matCostPerSqft: r.strippingMaterialCostPerSqft || 0.175, requiresCoats: false },
      { key: 'reviving', label: 'Wood Brightening', speed: r.revivingSpeed || 150, matCostPerSqft: r.revivingMaterialCostPerSqft || 0.10, requiresCoats: false },
      { key: 'sanding', label: 'Deck Floor Sanding', speed: r.sandingSpeed || 80, flatMatCost: r.sandingMaterialCostFlat || 30, requiresCoats: false },
      { key: 'staining', label: 'Stain Coating', speed: r.stainingSpeed || 80, coverage: r.stainingCoverage || 250, defaultMatCost: r.stainingMaterialCost || 60, requiresCoats: true },
    ];

    deckConfigs.forEach(cfg => {
      const item = (room as any)[cfg.key];
      if (item && item.checked) {
        const coats = cfg.requiresCoats ? (Number(item.coats) || 1) : 1;
        let h = 0;
        let m = 0;

        if (cfg.key === 'staining') {
          const coatMult = getAreaCoatMultiplier(coats);
          h = (cArea / cfg.speed) * coatMult;

          const prod = getProductForSurface(room, 'staining', products);
          const gallonPrice = prod?.price ?? cfg.defaultMatCost;
          const covRate = prod?.coverage ?? cfg.coverage;
          m = (cArea / covRate) * coats * gallonPrice;
        } else if (cfg.key === 'sanding') {
          h = cArea / cfg.speed;
          m = cfg.flatMatCost || 30;
        } else {
          h = cArea / cfg.speed;
          m = cArea * (cfg.matCostPerSqft || 0.1);
        }

        const cost = Math.round(h * hourlyLaborRate + m);
        totalHours += h;
        totalMaterials += m;
        surfaceItems.push({
          key: cfg.key,
          label: cfg.label,
          coats,
          qtyOrArea: `${cArea} sq ft`,
          hours: parseFloat(h.toFixed(1)),
          materialCost: Math.round(m),
          totalCost: cost,
          product: cfg.key === 'staining' ? getProductForSurface(room, 'staining', products) : undefined
        });
      }
    });

  } else {
    // Interior
    const rWalls = (room as any).walls || { checked: true, qty: 'auto', coats: 2 };
    const rCeilings = (room as any).ceilings || { checked: true, qty: 'auto', coats: 2 };
    const rBaseboards = (room as any).baseboards || { checked: true, qty: 'auto', coats: 2 };
    const rWindows = (room as any).windows || { checked: false, qty: 2, coats: 2 };
    const rDoors = (room as any).doors || { checked: false, qty: 2, coats: 2 };
    const rDoorFrames = (room as any).doorFrames || { checked: false, qty: 2, coats: 2 };

    if (rWalls.checked) {
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

    if (rCeilings.checked) {
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

    if (rBaseboards.checked) {
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

    if (rWindows.checked) {
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

    if (rDoors.checked) {
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

    if (rDoorFrames.checked) {
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

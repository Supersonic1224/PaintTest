export function getCleanProjectId(id: string): string {
  if (!id) return '1001';
  let clean = id
    .replace(/^project-/i, '')
    .replace(/^PR-/i, '')
    .replace(/^PR#/i, '')
    .replace(/^WO-/i, '')
    .replace(/^WO#/i, '')
    .replace(/^#/i, '');

  if (!clean || clean.toLowerCase() === 'unknown') {
    return '1001';
  }

  return clean;
}

export function getWorkOrderNumber(id: string, scopeCategory?: string): string {
  const clean = getCleanProjectId(id);

  let scopeSuffix = '';
  if (scopeCategory === 'interior') scopeSuffix = '-INT';
  else if (scopeCategory === 'exterior') scopeSuffix = '-EXT';
  else if (scopeCategory === 'deck') scopeSuffix = '-DCK';

  return `WO-${clean}${scopeSuffix}`;
}

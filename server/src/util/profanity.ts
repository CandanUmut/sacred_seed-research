const BAD_TERMS = [
  'badword1',
  'badword2',
  'butt',
  'poop',
];

const RE_TERM = BAD_TERMS.map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));

export function sanitizeName(name: string): string {
  const trimmed = name.trim().slice(0, 20) || 'Player';
  let safe = trimmed;
  for (const term of RE_TERM) {
    safe = safe.replace(term, '***');
  }
  if (!safe.match(/[a-z0-9]/i)) {
    return 'Player';
  }
  return safe;
}

export function filterChatMessage(message: string): string {
  let safe = message.slice(0, 240);
  for (const term of RE_TERM) {
    safe = safe.replace(term, '***');
  }
  return safe;
}

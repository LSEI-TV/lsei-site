// Prochaine étape d'un calendrier de saison (billard) : index, étape et repère « J-x ».
// Sert à l'en-tête des pages saison et à la mise en évidence de l'étape dans le calendrier.
export function seasonNext(calendar: { start?: string }[]) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const nextIdx = calendar.findIndex((e) => (e.start ?? '') >= todayIso);
  const nextEv = nextIdx >= 0 ? calendar[nextIdx] : null;
  const days = nextEv?.start ? Math.round((Date.parse(nextEv.start + 'T12:00:00Z') - Date.parse(todayIso + 'T12:00:00Z')) / 86400000) : 0;
  const nextJx = nextEv?.start ? (days > 0 ? `J-${days}` : 'En cours') : '';
  return { nextIdx, nextEv, nextJx };
}

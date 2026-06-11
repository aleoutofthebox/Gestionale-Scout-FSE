export const oggi = () => new Date().toISOString().slice(0, 10);

export const eur = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export const dataIT = (iso: string) => {
  const [a, m, g] = iso.split('-');
  return `${g}/${m}/${a}`;
};

export const parseImporto = (v: string | number) =>
  Math.round((parseFloat(String(v).replace(',', '.')) || 0) * 100) / 100;

export const genId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const stileCampo =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#1b2a4a] focus:outline-none focus:ring-1 focus:ring-[#1b2a4a]';

export const stileLabel =
  'mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500';

export const SCHEDE = [
  { id: 'movimenti', nome: 'Prima nota' },
  { id: 'soci', nome: 'Soci e quote' },
  { id: 'categorie', nome: 'Categorie' },
  { id: 'rendiconto', nome: 'Rendiconto e stampa' },
] as const;

export type SchedaId = typeof SCHEDE[number]['id'];

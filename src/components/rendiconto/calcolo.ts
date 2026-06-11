import { Movimento, Categorie, SaldiIniziali, DatiRendiconto } from '../../types';

export function calcolaRendiconto(
  movimenti: Movimento[],
  categorie: Categorie,
  saldiIniziali: SaldiIniziali
): DatiRendiconto {
  const perCategoria = (tipo: 'entrata' | 'uscita') =>
    categorie[tipo]
      .map((c) => ({
        categoria: c,
        totale: movimenti
          .filter((m) => m.tipo === tipo && m.categoria === c)
          .reduce((t, m) => t + m.importo, 0),
      }))
      .filter((r) => r.totale > 0);

  const orfani = (tipo: 'entrata' | 'uscita') => {
    const note = new Set(categorie[tipo]);
    const extra = movimenti.filter((m) => m.tipo === tipo && !note.has(m.categoria));
    if (extra.length === 0) return [];
    const mappa = new Map<string, number>();
    for (const m of extra) mappa.set(m.categoria, (mappa.get(m.categoria) || 0) + m.importo);
    return [...mappa.entries()].map(([categoria, totale]) => ({ categoria, totale }));
  };

  const entrate = [...perCategoria('entrata'), ...orfani('entrata')];
  const uscite = [...perCategoria('uscita'), ...orfani('uscita')];
  const totEntrate = entrate.reduce((t, r) => t + r.totale, 0);
  const totUscite = uscite.reduce((t, r) => t + r.totale, 0);

  let deltaCassa = 0, deltaBanca = 0;
  for (const m of movimenti) {
    const segno = m.tipo === 'entrata' ? 1 : -1;
    if (m.metodo === 'Cassa') deltaCassa += segno * m.importo;
    else deltaBanca += segno * m.importo;
  }

  const saldoIniziale = saldiIniziali.cassa + saldiIniziali.banca;
  const avanzo = totEntrate - totUscite;

  return {
    entrate,
    uscite,
    totEntrate,
    totUscite,
    avanzo,
    saldoIniziale,
    saldoFinale: saldoIniziale + avanzo,
    finaleCassa: saldiIniziali.cassa + deltaCassa,
    finaleBanca: saldiIniziali.banca + deltaBanca,
  };
}

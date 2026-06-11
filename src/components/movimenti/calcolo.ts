import { Movimento, MovimentoConProgressivo, SaldiIniziali } from '../../types';

export function righeConProgressivo(
  movimenti: Movimento[],
  saldiIniziali: SaldiIniziali
): MovimentoConProgressivo[] {
  const ordinati = [...movimenti].sort((a, b) =>
    a.data === b.data ? (a.creatoIl || 0) - (b.creatoIl || 0) : a.data.localeCompare(b.data)
  );
  let progressivo = saldiIniziali.cassa + saldiIniziali.banca;
  return ordinati.map((m) => {
    progressivo += m.tipo === 'entrata' ? m.importo : -m.importo;
    return { ...m, progressivo };
  });
}

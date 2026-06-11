import React, { useMemo } from 'react';
import { Movimento, Socio, SaldiIniziali } from '../../types';
import { eur, dataIT } from '../../utils';
import { righeConProgressivo } from './calcolo';

interface Props {
  movimenti: Movimento[];
  soci: Socio[];
  saldiIniziali: SaldiIniziali;
  onElimina: (id: string) => void;
}


export function RegistroMovimenti({ movimenti, soci, saldiIniziali, onElimina }: Props) {
  const righe = useMemo(() => righeConProgressivo(movimenti, saldiIniziali), [movimenti, saldiIniziali]);

  const nomeSocio = (id: string | null) => {
    if (!id) return null;
    const s = soci.find((x) => x.id === id);
    return s ? `${s.nome} ${s.cognome}` : null;
  };

  if (righe.length === 0)
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-400">
        Nessun movimento registrato. Inserisci la prima entrata o uscita dell'esercizio.
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="px-3 py-2.5 font-medium">Data</th>
            <th className="px-3 py-2.5 font-medium">Descrizione</th>
            <th className="px-3 py-2.5 font-medium">Categoria</th>
            <th className="px-3 py-2.5 font-medium">Metodo</th>
            <th className="px-3 py-2.5 text-right font-medium">Entrate</th>
            <th className="px-3 py-2.5 text-right font-medium">Uscite</th>
            <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
            <th className="px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-stone-100 bg-stone-50/50 italic text-stone-500">
            <td className="px-3 py-2">01/01</td>
            <td className="px-3 py-2" colSpan={5}>Saldo iniziale d'esercizio (cassa + banca)</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {eur(saldiIniziali.cassa + saldiIniziali.banca)}
            </td>
            <td></td>
          </tr>
          {righe.map((m) => (
            <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{dataIT(m.data)}</td>
              <td className="px-3 py-2">
                <div>{m.descrizione}</div>
                {(m.attivita || (m.socioId && nomeSocio(m.socioId))) && (
                  <div className="text-xs text-stone-400">
                    {[m.attivita, m.socioId && nomeSocio(m.socioId) ? `Socio: ${nomeSocio(m.socioId)}` : null]
                      .filter(Boolean).join(' · ')}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-stone-500">{m.categoria}</td>
              <td className="px-3 py-2 text-stone-500">{m.metodo}</td>
              <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                {m.tipo === 'entrata' ? eur(m.importo) : ''}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-red-800">
                {m.tipo === 'uscita' ? eur(m.importo) : ''}
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">{eur(m.progressivo)}</td>
              <td className="px-2 py-2 text-right">
                <button onClick={() => onElimina(m.id)} title="Elimina movimento"
                  className="rounded px-1.5 py-0.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-700">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

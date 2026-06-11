import React from 'react';
import { AppState } from '../../types';
import { eur, dataIT } from '../../utils';
import { righeConProgressivo } from '../movimenti/calcolo';
import { TestataStampa } from './TestataStampa';
import { FirmeStampa } from './FirmeStampa';

interface Props {
  state: AppState;
}

export function StampaRegistro({ state }: Props) {
  const { movimenti, saldiIniziali, intestazione } = state;
  const righe = righeConProgressivo(movimenti, saldiIniziali);
  return (
    <div className="p-8">
      <TestataStampa intestazione={intestazione} titolo="Registro dei movimenti di cassa (prima nota)" />
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-stone-400 text-left uppercase tracking-wide text-stone-600">
            <th className="px-2 py-1.5 font-medium">Data</th>
            <th className="px-2 py-1.5 font-medium">Descrizione</th>
            <th className="px-2 py-1.5 font-medium">Categoria</th>
            <th className="px-2 py-1.5 font-medium">Metodo</th>
            <th className="px-2 py-1.5 text-right font-medium">Entrate</th>
            <th className="px-2 py-1.5 text-right font-medium">Uscite</th>
            <th className="px-2 py-1.5 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-stone-200 italic text-stone-500">
            <td className="px-2 py-1.5">01/01</td>
            <td className="px-2 py-1.5" colSpan={5}>Saldo iniziale d'esercizio (cassa + banca)</td>
            <td className="px-2 py-1.5 text-right tabular-nums">
              {eur(saldiIniziali.cassa + saldiIniziali.banca)}
            </td>
          </tr>
          {righe.map((m) => (
            <tr key={m.id} className="border-b border-stone-200">
              <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{dataIT(m.data)}</td>
              <td className="px-2 py-1.5">{m.descrizione}{m.attivita ? ` (${m.attivita})` : ''}</td>
              <td className="px-2 py-1.5">{m.categoria}</td>
              <td className="px-2 py-1.5">{m.metodo}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {m.tipo === 'entrata' ? eur(m.importo) : ''}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {m.tipo === 'uscita' ? eur(m.importo) : ''}
              </td>
              <td className="px-2 py-1.5 text-right font-medium tabular-nums">{eur(m.progressivo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <FirmeStampa />
    </div>
  );
}

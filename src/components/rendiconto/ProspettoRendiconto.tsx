import React from 'react';
import { DatiRendiconto, SaldiIniziali, Intestazione } from '../../types';
import { eur } from '../../utils';

interface Props {
  rendiconto: DatiRendiconto;
  saldiIniziali: SaldiIniziali;
  intestazione: Intestazione;
  stampa?: boolean;
}

export function ProspettoRendiconto({ rendiconto: r, saldiIniziali, intestazione, stampa }: Props) {
  const cella = 'px-3 py-1.5';
  const sezione = stampa ? 'bg-stone-100' : 'bg-stone-50';

  return (
    <div className={stampa ? '' : 'rounded-lg border border-stone-200 bg-white'}>
      <table className="w-full text-sm">
        <tbody>
          <tr className={`${sezione} border-y border-stone-300 text-xs uppercase tracking-wide text-stone-600`}>
            <td className={`${cella} font-semibold`}>A) Entrate per cassa dell'esercizio</td>
            <td className={`${cella} text-right font-semibold`}>Importo</td>
          </tr>
          {r.entrate.length === 0 && (
            <tr><td className={`${cella} italic text-stone-400`} colSpan={2}>Nessuna entrata registrata</td></tr>
          )}
          {r.entrate.map((riga) => (
            <tr key={riga.categoria} className="border-b border-stone-100">
              <td className={cella}>{riga.categoria}</td>
              <td className={`${cella} text-right tabular-nums`}>{eur(riga.totale)}</td>
            </tr>
          ))}
          <tr className="border-b border-stone-300 font-semibold">
            <td className={cella}>Totale entrate (A)</td>
            <td className={`${cella} text-right tabular-nums text-emerald-800`}>{eur(r.totEntrate)}</td>
          </tr>

          <tr className={`${sezione} border-b border-stone-300 text-xs uppercase tracking-wide text-stone-600`}>
            <td className={`${cella} font-semibold`} colSpan={2}>B) Uscite per cassa dell'esercizio</td>
          </tr>
          {r.uscite.length === 0 && (
            <tr><td className={`${cella} italic text-stone-400`} colSpan={2}>Nessuna uscita registrata</td></tr>
          )}
          {r.uscite.map((riga) => (
            <tr key={riga.categoria} className="border-b border-stone-100">
              <td className={cella}>{riga.categoria}</td>
              <td className={`${cella} text-right tabular-nums`}>{eur(riga.totale)}</td>
            </tr>
          ))}
          <tr className="border-b border-stone-300 font-semibold">
            <td className={cella}>Totale uscite (B)</td>
            <td className={`${cella} text-right tabular-nums text-red-900`}>{eur(r.totUscite)}</td>
          </tr>

          <tr className="border-b border-stone-200 font-semibold">
            <td className={cella}>{r.avanzo >= 0 ? 'Avanzo' : 'Disavanzo'} di gestione dell'esercizio (A − B)</td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.avanzo)}</td>
          </tr>

          <tr className={`${sezione} border-b border-stone-300 text-xs uppercase tracking-wide text-stone-600`}>
            <td className={`${cella} font-semibold`} colSpan={2}>C) Situazione delle disponibilità liquide</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={cella}>
              Saldo iniziale al 1° gennaio {intestazione.esercizio}{' '}
              <span className="text-xs text-stone-400">
                (cassa {eur(saldiIniziali.cassa)} · banca {eur(saldiIniziali.banca)})
              </span>
            </td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.saldoIniziale)}</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={cella}>{r.avanzo >= 0 ? 'Avanzo' : 'Disavanzo'} di gestione dell'esercizio</td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.avanzo)}</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={`${cella} pl-6 text-stone-500`}>di cui: cassa contanti al 31 dicembre</td>
            <td className={`${cella} text-right tabular-nums text-stone-500`}>{eur(r.finaleCassa)}</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={`${cella} pl-6 text-stone-500`}>di cui: conto corrente al 31 dicembre</td>
            <td className={`${cella} text-right tabular-nums text-stone-500`}>{eur(r.finaleBanca)}</td>
          </tr>
          <tr className="border-t-2 border-[#1b2a4a] font-bold">
            <td className={cella}>Saldo finale al 31 dicembre {intestazione.esercizio}</td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.saldoFinale)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

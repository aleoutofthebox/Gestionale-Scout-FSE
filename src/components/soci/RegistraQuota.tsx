import React, { useState } from 'react';
import { Socio } from '../../types';
import { METODI } from '../../mocks';
import { oggi, parseImporto, stileCampo, stileLabel } from '../../utils';

interface Props {
  socio: Socio;
  quotaAnnuale: number;
  onConferma: (dati: { data: string; importo: number; metodo: string }) => Promise<void>;
  onAnnulla: () => void;
}

export function RegistraQuota({ socio, quotaAnnuale, onConferma, onAnnulla }: Props) {
  const [data, setData] = useState(oggi());
  const [importo, setImporto] = useState(quotaAnnuale > 0 ? String(quotaAnnuale).replace('.', ',') : '');
  const [metodo, setMetodo] = useState('Cassa');
  const [errore, setErrore] = useState('');
  const [inCorso, setInCorso] = useState(false);

  const conferma = async () => {
    const imp = parseImporto(importo);
    if (!data) return setErrore("Inserisci la data dell'incasso.");
    if (imp <= 0) return setErrore('Inserisci un importo valido maggiore di zero (es. 40 oppure 40,00).');
    setErrore('');
    setInCorso(true);
    await onConferma({ data, importo: imp, metodo });
    setInCorso(false);
  };

  return (
    <tr className="border-b border-stone-100 bg-blue-50/50">
      <td colSpan={6} className="px-3 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-sm font-medium text-[#1b2a4a]">
            Quota {socio.nome} {socio.cognome}:
          </div>
          <div>
            <label className={stileLabel}>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={stileCampo} />
          </div>
          <div className="w-28">
            <label className={stileLabel}>Importo</label>
            <input type="text" inputMode="decimal" placeholder="0,00" value={importo}
              onChange={(e) => setImporto(e.target.value)} className={stileCampo} />
          </div>
          <div>
            <label className={stileLabel}>Metodo</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={stileCampo}>
              {METODI.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={conferma} disabled={inCorso}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {inCorso ? 'Salvataggio…' : 'Conferma incasso'}
          </button>
          <button onClick={onAnnulla}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">
            Annulla
          </button>
        </div>
        {errore && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {errore}
          </div>
        )}
      </td>
    </tr>
  );
}

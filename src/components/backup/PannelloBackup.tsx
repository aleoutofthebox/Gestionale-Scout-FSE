import React, { useRef, useState } from 'react';
import { AppState, Azioni } from '../../types';
import { oggi } from '../../utils';

interface Props {
  state: AppState;
  azioni: Azioni;
}

export function PannelloBackup({ state, azioni }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const esporta = () => {
    const dati = {
      tipo: 'backup-contabilita-fse',
      versione: 2,
      esportatoIl: new Date().toISOString(),
      config: {
        intestazione: state.intestazione,
        saldiIniziali: state.saldiIniziali,
        categorie: state.categorie,
        quotaAnnuale: state.quotaAnnuale,
      },
      movimenti: state.movimenti,
      soci: state.soci,
    };
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-contabilita-fse-${oggi()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setEsito({ tipo: 'ok', testo: 'Backup esportato: conserva il file in un luogo sicuro.' });
  };

  const importa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dati = JSON.parse(reader.result as string);
        if (!dati || dati.tipo !== 'backup-contabilita-fse') throw new Error('formato');
        const conferma = window.confirm(
          "L'importazione SOSTITUISCE tutti i dati attuali (movimenti, soci, impostazioni) con quelli del backup. Procedere?"
        );
        if (!conferma) { input.value = ''; return; }
        setInCorso(true);
        const ok = await azioni.importaBackup(dati);
        setInCorso(false);
        setEsito(ok ? { tipo: 'ok', testo: 'Backup importato correttamente.' } : null);
      } catch {
        setEsito({ tipo: 'errore', testo: 'File non valido: seleziona un backup esportato da questa applicazione.' });
      }
      input.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Backup dei dati</h2>
      <p className="mt-1 text-xs text-stone-500">
        Esporta tutti i dati (movimenti, soci, impostazioni) in un file da conservare o da passare
        a un altro computer, dove potrà essere importato.
      </p>
      <div className="mt-3 space-y-2">
        <button onClick={esporta}
          className="w-full rounded-md border border-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-[#1b2a4a] hover:bg-stone-50">
          Esporta backup (file JSON)
        </button>
        <button onClick={() => inputRef.current?.click()} disabled={inCorso}
          className="w-full rounded-md border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60">
          {inCorso ? 'Importazione…' : 'Importa backup…'}
        </button>
        <input ref={inputRef} type="file" accept=".json,application/json" onChange={importa} className="hidden" />
      </div>
      {esito && (
        <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${
          esito.tipo === 'ok'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-red-300 bg-red-50 text-red-800'
        }`}>
          {esito.testo}
        </div>
      )}
      <p className="mt-3 text-xs text-stone-400">
        Attenzione: l'importazione sostituisce integralmente i dati presenti.
      </p>
    </div>
  );
}

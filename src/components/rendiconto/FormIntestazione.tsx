import React, { useState, useEffect } from 'react';
import { Intestazione, Azioni } from '../../types';
import { stileCampo, stileLabel } from '../../utils';

interface Props {
  intestazione: Intestazione;
  azioni: Azioni;
}

export function FormIntestazione({ intestazione, azioni }: Props) {
  const [form, setForm] = useState(intestazione);
  const [salvata, setSalvata] = useState(false);

  useEffect(() => {
    setForm({ gruppo: intestazione.gruppo, citta: intestazione.citta, esercizio: intestazione.esercizio });
  }, [intestazione.gruppo, intestazione.citta, intestazione.esercizio]);

  const salva = async () => {
    const ok = await azioni.salvaConfig({
      intestazione: { ...form, esercizio: parseInt(String(form.esercizio)) || intestazione.esercizio },
    });
    if (ok) {
      setSalvata(true);
      setTimeout(() => setSalvata(false), 2500);
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Intestazione dei documenti</h2>
      <p className="mt-1 text-xs text-stone-500">Compare in testa al rendiconto e al registro stampati.</p>
      <div className="mt-3 space-y-3">
        <div>
          <label className={stileLabel}>Nome del gruppo</label>
          <input type="text" value={form.gruppo}
            onChange={(e) => setForm({ ...form, gruppo: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Città</label>
          <input type="text" value={form.citta}
            onChange={(e) => setForm({ ...form, citta: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Esercizio (anno)</label>
          <input type="number" value={form.esercizio}
            onChange={(e) => setForm({ ...form, esercizio: parseInt(e.target.value) })} className={stileCampo} />
        </div>
        <button onClick={salva} className="w-full rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white">
          Salva intestazione
        </button>
        {salvata && <p className="text-xs font-medium text-emerald-700">✓ Intestazione salvata</p>}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Socio } from '../../types';
import { UNITA } from '../../mocks';
import { stileCampo, stileLabel } from '../../utils';

interface Props {
  esercizio: number;
  onAggiungi: (dati: Omit<Socio, 'id'>) => Promise<boolean>;
}

export function FormSocio({ esercizio, onAggiungi }: Props) {
  const [form, setForm] = useState({
    nome: '',
    cognome: '',
    unita: UNITA[0],
    annoIscrizione: esercizio,
  });
  const [errore, setErrore] = useState('');
  const [inCorso, setInCorso] = useState(false);

  const salva = async () => {
    if (!form.nome.trim() || !form.cognome.trim())
      return setErrore('Inserisci nome e cognome del socio.');
    setErrore('');
    setInCorso(true);
    const ok = await onAggiungi({
      nome: form.nome.trim(),
      cognome: form.cognome.trim(),
      unita: form.unita,
      annoIscrizione: parseInt(String(form.annoIscrizione)) || esercizio,
    });
    setInCorso(false);
    if (ok) setForm((f) => ({ ...f, nome: '', cognome: '' }));
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Nuovo socio</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={stileLabel}>Nome</label>
          <input type="text" value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Cognome</label>
          <input type="text" value={form.cognome}
            onChange={(e) => setForm({ ...form, cognome: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Unità</label>
          <select value={form.unita}
            onChange={(e) => setForm({ ...form, unita: e.target.value })} className={stileCampo}>
            {UNITA.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={stileLabel}>Anno di iscrizione</label>
          <input type="number" value={form.annoIscrizione}
            onChange={(e) => setForm({ ...form, annoIscrizione: parseInt(e.target.value) })}
            className={stileCampo} />
        </div>
      </div>
      {errore && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {errore}
        </div>
      )}
      <button onClick={salva} disabled={inCorso}
        className="mt-4 w-full rounded-md bg-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#27395f] disabled:opacity-60">
        {inCorso ? 'Salvataggio…' : 'Aggiungi socio'}
      </button>
    </div>
  );
}

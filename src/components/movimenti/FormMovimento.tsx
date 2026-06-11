import React, { useState } from 'react';
import { Categorie, Movimento } from '../../types';
import { METODI } from '../../mocks';
import { oggi, parseImporto, stileCampo, stileLabel } from '../../utils';

interface Props {
  categorie: Categorie;
  onAggiungi: (dati: Omit<Movimento, 'id' | 'creatoIl'>) => Promise<boolean>;
}

export function FormMovimento({ categorie, onAggiungi }: Props) {
  const [tipo, setTipo] = useState<'entrata' | 'uscita'>('entrata');
  const [form, setForm] = useState({
    data: oggi(),
    categoria: categorie.entrata[0],
    descrizione: '',
    importo: '',
    metodo: 'Cassa',
    attivita: '',
  });
  const [errore, setErrore] = useState('');
  const [inCorso, setInCorso] = useState(false);

  const cambiaTipo = (nuovo: 'entrata' | 'uscita') => {
    setTipo(nuovo);
    setForm((f) => ({ ...f, categoria: categorie[nuovo][0] }));
  };

  const salva = async () => {
    const importo = parseImporto(form.importo);
    if (!form.data) return setErrore('Inserisci la data del movimento.');
    if (!form.descrizione.trim()) return setErrore('Inserisci una descrizione del movimento.');
    if (importo <= 0) return setErrore('Inserisci un importo valido maggiore di zero (es. 25,50).');
    setErrore('');
    setInCorso(true);
    const ok = await onAggiungi({
      tipo,
      data: form.data,
      categoria: form.categoria,
      descrizione: form.descrizione.trim(),
      importo,
      metodo: form.metodo,
      attivita: form.attivita.trim(),
      socioId: null,
    });
    setInCorso(false);
    if (ok) setForm((f) => ({ ...f, descrizione: '', importo: '', attivita: '' }));
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Nuovo movimento</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => cambiaTipo('entrata')}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            tipo === 'entrata'
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
          }`}>
          Entrata
        </button>
        <button
          onClick={() => cambiaTipo('uscita')}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            tipo === 'uscita'
              ? 'border-red-800 bg-red-800 text-white'
              : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
          }`}>
          Uscita
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={stileLabel}>Data</label>
          <input type="date" value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Categoria</label>
          <select value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={stileCampo}>
            {categorie[tipo].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={stileLabel}>Descrizione</label>
          <input type="text" placeholder="Es. Acquisto tende per campo estivo" value={form.descrizione}
            onChange={(e) => setForm({ ...form, descrizione: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Importo (€)</label>
          <input type="text" inputMode="decimal" placeholder="0,00" value={form.importo}
            onChange={(e) => setForm({ ...form, importo: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Metodo di pagamento</label>
          <select value={form.metodo}
            onChange={(e) => setForm({ ...form, metodo: e.target.value })} className={stileCampo}>
            {METODI.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={stileLabel}>Attività / evento (facoltativo)</label>
          <input type="text" placeholder="Es. Campo estivo Fontainemore, Uscita di Riparto…" value={form.attivita}
            onChange={(e) => setForm({ ...form, attivita: e.target.value })} className={stileCampo} />
        </div>
      </div>

      {errore && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {errore}
        </div>
      )}

      <button onClick={salva} disabled={inCorso}
        className="mt-4 w-full rounded-md bg-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27395f] disabled:opacity-60">
        {inCorso ? 'Salvataggio…' : 'Registra movimento'}
      </button>
    </div>
  );
}

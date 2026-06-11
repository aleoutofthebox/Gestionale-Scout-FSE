import React, { useState } from 'react';
import { Categorie, Movimento } from '../../types';
import { CATEGORIE_BASE } from '../../mocks';
import { stileCampo } from '../../utils';

interface Props {
  tipo: 'entrata' | 'uscita';
  titolo: string;
  accento: string;
  categorie: Categorie;
  movimenti: Movimento[];
  onSalvaCategorie: (nuove: Categorie) => void;
}

export function ColonnaCategorie({ tipo, titolo, accento, categorie, movimenti, onSalvaCategorie }: Props) {
  const [nuova, setNuova] = useState('');
  const inUso = (nome: string) => movimenti.some((m) => m.categoria === nome);
  const predefinita = (nome: string) => CATEGORIE_BASE[tipo].includes(nome);

  const aggiungi = () => {
    const nome = nuova.trim();
    if (!nome || categorie[tipo].includes(nome)) return;
    onSalvaCategorie({ ...categorie, [tipo]: [...categorie[tipo], nome] });
    setNuova('');
  };

  const rimuovi = (nome: string) => {
    onSalvaCategorie({ ...categorie, [tipo]: categorie[tipo].filter((c) => c !== nome) });
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className={`font-serif text-lg ${accento}`}>{titolo}</h2>
      <ul className="mt-3 divide-y divide-stone-100">
        {categorie[tipo].map((c) => (
          <li key={c} className="flex items-center justify-between py-2 text-sm">
            <span>
              {c}
              {predefinita(c) && <span className="ml-2 text-xs text-stone-400">FSE</span>}
            </span>
            {!predefinita(c) && (
              inUso(c) ? (
                <span className="text-xs text-stone-400" title="Categoria utilizzata in prima nota">in uso</span>
              ) : (
                <button onClick={() => rimuovi(c)}
                  className="rounded px-1.5 py-0.5 text-stone-300 hover:bg-red-50 hover:text-red-700">✕</button>
              )
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input type="text" placeholder="Nuova categoria…" value={nuova}
          onChange={(e) => setNuova(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') aggiungi(); }}
          className={stileCampo} />
        <button onClick={aggiungi}
          className="shrink-0 rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white">
          Aggiungi
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { Categorie, Movimento, Azioni } from '../../types';
import { ColonnaCategorie } from './ColonnaCategorie';

interface Props {
  categorie: Categorie;
  movimenti: Movimento[];
  azioni: Azioni;
}

export function GestioneCategorie({ categorie, movimenti, azioni }: Props) {
  const salvaCategorie = (nuove: Categorie) => azioni.salvaConfig({ categorie: nuove });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ColonnaCategorie tipo="entrata" titolo="Categorie di entrata" accento="text-emerald-800"
        categorie={categorie} movimenti={movimenti} onSalvaCategorie={salvaCategorie} />
      <ColonnaCategorie tipo="uscita" titolo="Categorie di uscita" accento="text-red-900"
        categorie={categorie} movimenti={movimenti} onSalvaCategorie={salvaCategorie} />
      <p className="text-xs text-stone-400 lg:col-span-2">
        Le categorie contrassegnate "FSE" sono quelle predefinite del piano dei conti del gruppo e non sono eliminabili.
        Le categorie personalizzate possono essere rimosse solo se non utilizzate in prima nota.
      </p>
    </div>
  );
}

import React from 'react';
import { Intestazione } from '../../types';

interface Props {
  intestazione: Intestazione;
  titolo: string;
}

export function TestataStampa({ intestazione, titolo }: Props) {
  return (
    <div className="mb-6 border-b-2 border-[#1b2a4a] pb-4 text-center">
      <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
        Federazione dello Scautismo Europeo
      </div>
      <div className="mt-1 font-serif text-2xl font-semibold text-[#1b2a4a]">{intestazione.gruppo}</div>
      <div className="text-sm text-stone-600">{intestazione.citta}</div>
      <div className="mt-3 font-serif text-lg">{titolo}</div>
      <div className="text-sm text-stone-600">
        Esercizio finanziario 1° gennaio – 31 dicembre {intestazione.esercizio}
      </div>
    </div>
  );
}

import React from 'react';
import { eur } from '../utils';

interface Props {
  etichetta: string;
  valore: number;
  sotto?: string;
  tono?: 'neutro' | 'blu';
}

export function CardSaldo({ etichetta, valore, sotto, tono }: Props) {
  const toni = {
    neutro: 'border-stone-200 bg-white',
    blu: 'border-[#1b2a4a] bg-[#1b2a4a] text-white',
  };
  return (
    <div className={`rounded-lg border px-5 py-4 ${toni[tono || 'neutro']}`}>
      <div className={`text-xs uppercase tracking-widest ${tono === 'blu' ? 'text-blue-200' : 'text-stone-500'}`}>
        {etichetta}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{eur(valore)}</div>
      {sotto && (
        <div className={`mt-1 text-xs ${tono === 'blu' ? 'text-blue-200' : 'text-stone-400'}`}>{sotto}</div>
      )}
    </div>
  );
}

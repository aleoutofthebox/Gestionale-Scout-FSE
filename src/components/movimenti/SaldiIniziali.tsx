import React, { useState } from 'react';
import { SaldiIniziali as SaldiType } from '../../types';
import { eur, parseImporto, stileCampo, stileLabel } from '../../utils';

interface Props {
  saldi: SaldiType;
  onSalva: (parziale: { saldiIniziali: SaldiType }) => Promise<boolean>;
}

export function SaldiIniziali({ saldi, onSalva }: Props) {
  const [aperto, setAperto] = useState(false);
  const [cassa, setCassa] = useState(String(saldi.cassa));
  const [banca, setBanca] = useState(String(saldi.banca));
  const [inCorso, setInCorso] = useState(false);

  const conferma = async () => {
    setInCorso(true);
    const ok = await onSalva({ saldiIniziali: { cassa: parseImporto(cassa), banca: parseImporto(banca) } });
    setInCorso(false);
    if (ok) setAperto(false);
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-[#1b2a4a]">Saldi iniziali al 1° gennaio</h2>
        <button
          onClick={() => { setCassa(String(saldi.cassa)); setBanca(String(saldi.banca)); setAperto(!aperto); }}
          className="text-sm text-[#1b2a4a] underline underline-offset-2">
          {aperto ? 'Chiudi' : 'Modifica'}
        </button>
      </div>
      {!aperto ? (
        <p className="mt-2 text-sm text-stone-500">
          Cassa {eur(saldi.cassa)} · Banca {eur(saldi.banca)}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className={stileLabel}>Cassa contanti</label>
            <input type="text" inputMode="decimal" value={cassa}
              onChange={(e) => setCassa(e.target.value)} className={stileCampo} />
          </div>
          <div>
            <label className={stileLabel}>Conto corrente</label>
            <input type="text" inputMode="decimal" value={banca}
              onChange={(e) => setBanca(e.target.value)} className={stileCampo} />
          </div>
          <button onClick={conferma} disabled={inCorso}
            className="col-span-2 rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white disabled:opacity-60">
            {inCorso ? 'Salvataggio…' : 'Salva saldi iniziali'}
          </button>
        </div>
      )}
    </div>
  );
}

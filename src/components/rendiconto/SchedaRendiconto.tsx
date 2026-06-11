import React, { useMemo } from 'react';
import { AppState, Azioni } from '../../types';
import { calcolaRendiconto } from './calcolo';
import { FormIntestazione } from './FormIntestazione';
import { ProspettoRendiconto } from './ProspettoRendiconto';
import { PannelloBackup } from '../backup/PannelloBackup';

interface Props {
  state: AppState;
  azioni: Azioni;
  avviaStampa: (tipo: 'rendiconto' | 'registro') => void;
}

export function SchedaRendiconto({ state, azioni, avviaStampa }: Props) {
  const { movimenti, categorie, saldiIniziali, intestazione } = state;
  const rendiconto = useMemo(
    () => calcolaRendiconto(movimenti, categorie, saldiIniziali),
    [movimenti, categorie, saldiIniziali]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <FormIntestazione intestazione={intestazione} azioni={azioni} />

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-serif text-lg text-[#1b2a4a]">Stampa ed esportazione</h2>
          <p className="mt-1 text-xs text-stone-500">
            Si apre la finestra di stampa del browser: scegli la stampante oppure "Salva come PDF" per esportare il documento.
          </p>
          <div className="mt-3 space-y-2">
            <button onClick={() => avviaStampa('rendiconto')}
              className="w-full rounded-md bg-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#27395f]">
              Stampa / PDF — Rendiconto annuale
            </button>
            <button onClick={() => avviaStampa('registro')}
              className="w-full rounded-md border border-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-[#1b2a4a] hover:bg-stone-50">
              Stampa / PDF — Registro movimenti
            </button>
          </div>
        </div>

        <PannelloBackup state={state} azioni={azioni} />

        <div className="rounded-lg border border-stone-200 bg-white p-5 text-xs leading-relaxed text-stone-500">
          Il prospetto segue la logica del rendiconto per cassa previsto per gli enti del Terzo settore
          (art. 13, co. 2, D.Lgs. 117/2017 e Mod. D del DM 5 marzo 2020): entrate e uscite per natura,
          risultato di gestione e riconciliazione delle disponibilità liquide. Per i gruppi non iscritti
          al RUNTS resta una buona prassi di rendicontazione verso soci, famiglie e federazione.
        </div>
      </div>

      <div className="lg:col-span-3">
        <h2 className="mb-3 font-serif text-lg text-[#1b2a4a]">
          Rendiconto finanziario per cassa — Esercizio {intestazione.esercizio}
        </h2>
        <ProspettoRendiconto rendiconto={rendiconto} saldiIniziali={saldiIniziali} intestazione={intestazione} />
      </div>
    </div>
  );
}

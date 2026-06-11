import React from 'react';
import { AppState } from '../../types';
import { calcolaRendiconto } from '../rendiconto/calcolo';
import { TestataStampa } from './TestataStampa';
import { FirmeStampa } from './FirmeStampa';
import { ProspettoRendiconto } from '../rendiconto/ProspettoRendiconto';

interface Props {
  state: AppState;
}

export function StampaRendiconto({ state }: Props) {
  const { movimenti, categorie, saldiIniziali, intestazione } = state;
  const rendiconto = calcolaRendiconto(movimenti, categorie, saldiIniziali);
  return (
    <div className="p-8">
      <TestataStampa intestazione={intestazione} titolo="Rendiconto finanziario per cassa" />
      <ProspettoRendiconto rendiconto={rendiconto} saldiIniziali={saldiIniziali} intestazione={intestazione} stampa />
      <FirmeStampa />
    </div>
  );
}

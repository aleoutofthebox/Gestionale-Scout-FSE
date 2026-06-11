import { Categorie, Config } from '../types';

export const CATEGORIE_BASE: Categorie = {
  entrata: [
    'Saldo iniziale',
    'Affitto per feste',
    'Eventi di gruppo',
    'Uniformi',
    'Centro estivo',
    'Censimenti',
    'Gruppo preghiera della domenica',
    'Affitto tetto per pannelli',
    'Autofinanziamento',
    'Versamento contanti in banca',
    'Soldi delle unità',
  ],
  uscita: [
    'Carburante camion',
    'Carburante trattorino',
    'Gas',
    'Luce',
    'Acqua',
    'Manutenzione trattorino',
    'Manutenzione sede',
    'Manutenzione camion',
    'Assicurazione e bollo camion',
    'Assicurazione sede',
    'Assicurazione scoiattoli',
    'Censimenti quota associazione',
    'Uniformi',
    'Soldi per le unità',
    'Versamento contanti in banca',
    'Donazioni liberali',
    'Spese bancarie',
    'Spese per attività',
    'Tasse',
    'Eventi di gruppo',
  ],
};

export const METODI = ['Cassa', 'Bonifico', 'Altro'];

export const UNITA = ['Branco', 'Cerchio', 'Riparto', 'Clan', 'Fuoco', 'Capi / Direzione'];

export const CONFIG_DEFAULT: Config = {
  intestazione: {
    gruppo: 'Gruppo Scout FSE',
    citta: '',
    esercizio: new Date().getFullYear(),
  },
  saldiIniziali: { cassa: 0, banca: 0 },
  categorie: CATEGORIE_BASE,
  quotaAnnuale: 40,
};

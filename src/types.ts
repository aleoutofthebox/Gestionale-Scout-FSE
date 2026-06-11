export interface Intestazione {
  gruppo: string;
  citta: string;
  esercizio: number;
}

export interface SaldiIniziali {
  cassa: number;
  banca: number;
}

export interface Categorie {
  entrata: string[];
  uscita: string[];
}

export interface Config {
  intestazione: Intestazione;
  saldiIniziali: SaldiIniziali;
  categorie: Categorie;
  quotaAnnuale: number;
}

export interface Movimento {
  id: string;
  tipo: 'entrata' | 'uscita';
  data: string;
  categoria: string;
  descrizione: string;
  importo: number;
  metodo: string;
  attivita: string;
  socioId: string | null;
  creatoIl?: number;
}

export interface MovimentoConProgressivo extends Movimento {
  progressivo: number;
}

export interface Socio {
  id: string;
  nome: string;
  cognome: string;
  unita: string;
  annoIscrizione: number;
}

export type Modalita = 'condiviso' | 'locale' | 'memoria' | null;

export interface AppState extends Config {
  movimenti: Movimento[];
  soci: Socio[];
  caricamento: boolean;
  modalita: Modalita;
  errore: string | null;
  ultimaSincronizzazione: Date | null;
}

export interface Azioni {
  ricarica: () => Promise<void>;
  pulisciErrore: () => void;
  aggiungiMovimento: (dati: Omit<Movimento, 'id' | 'creatoIl'>) => Promise<boolean>;
  eliminaMovimento: (id: string) => Promise<boolean>;
  aggiungiSocio: (dati: Omit<Socio, 'id'>) => Promise<boolean>;
  eliminaSocio: (id: string) => Promise<boolean>;
  salvaConfig: (parziale: Partial<Config>) => Promise<boolean>;
  importaBackup: (dati: BackupDati) => Promise<boolean>;
}

export interface BackupDati {
  tipo: string;
  versione: number;
  esportatoIl: string;
  config: Config;
  movimenti: Movimento[];
  soci: Socio[];
}

export interface RigaRendiconto {
  categoria: string;
  totale: number;
}

export interface DatiRendiconto {
  entrate: RigaRendiconto[];
  uscite: RigaRendiconto[];
  totEntrate: number;
  totUscite: number;
  avanzo: number;
  saldoIniziale: number;
  saldoFinale: number;
  finaleCassa: number;
  finaleBanca: number;
}

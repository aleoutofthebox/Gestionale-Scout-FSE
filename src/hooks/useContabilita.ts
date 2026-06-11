import { useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, Azioni, Movimento, Socio, Config, BackupDati } from '../types';
import { CATEGORIE_BASE, CONFIG_DEFAULT } from '../mocks';
import { genId } from '../utils';
import { Archivio, rilevaModalita, modalitaRilevata } from '../storage';

function payloadDaConfig(config: Partial<Config> | null): Partial<AppState> {
  if (!config) return {};
  return {
    intestazione: { ...CONFIG_DEFAULT.intestazione, ...config.intestazione },
    saldiIniziali: { ...CONFIG_DEFAULT.saldiIniziali, ...config.saldiIniziali },
    categorie: config.categorie || CATEGORIE_BASE,
    quotaAnnuale: config.quotaAnnuale ?? CONFIG_DEFAULT.quotaAnnuale,
  };
}

const statoIniziale: AppState = {
  ...CONFIG_DEFAULT,
  movimenti: [],
  soci: [],
  caricamento: true,
  modalita: null,
  errore: null,
  ultimaSincronizzazione: null,
};

type Action =
  | { type: 'CARICATO'; payload: Partial<AppState> }
  | { type: 'ARCHIVIO_NON_DISPONIBILE' }
  | { type: 'ERRORE'; messaggio: string }
  | { type: 'PULISCI_ERRORE' }
  | { type: 'IMPOSTA_MOVIMENTI'; lista: Movimento[] }
  | { type: 'IMPOSTA_SOCI'; lista: Socio[] }
  | { type: 'IMPOSTA_CONFIG'; payload: Partial<Config> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CARICATO':
      return { ...state, ...action.payload, caricamento: false, errore: null, ultimaSincronizzazione: new Date() };
    case 'ARCHIVIO_NON_DISPONIBILE':
      return { ...state, caricamento: false, modalita: 'memoria' };
    case 'ERRORE':
      return { ...state, errore: action.messaggio };
    case 'PULISCI_ERRORE':
      return { ...state, errore: null };
    case 'IMPOSTA_MOVIMENTI':
      return { ...state, movimenti: action.lista };
    case 'IMPOSTA_SOCI':
      return { ...state, soci: action.lista };
    case 'IMPOSTA_CONFIG':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export function useContabilita(): [AppState, Azioni] {
  const [state, dispatch] = useReducer(reducer, statoIniziale);
  const occupatoRef = useRef(false);
  const movimentiRef = useRef(state.movimenti);
  const sociRef = useRef(state.soci);

  useEffect(() => { movimentiRef.current = state.movimenti; }, [state.movimenti]);
  useEffect(() => { sociRef.current = state.soci; }, [state.soci]);

  const configCorrente = useCallback(
    (): Config => ({
      intestazione: state.intestazione,
      saldiIniziali: state.saldiIniziali,
      categorie: state.categorie,
      quotaAnnuale: state.quotaAnnuale,
    }),
    [state.intestazione, state.saldiIniziali, state.categorie, state.quotaAnnuale]
  );

  const ricarica = useCallback(async (silenzioso = false) => {
    const modalita = await rilevaModalita();
    if (modalita === 'memoria') {
      dispatch({ type: 'ARCHIVIO_NON_DISPONIBILE' });
      return;
    }
    if (occupatoRef.current) return;
    occupatoRef.current = true;
    try {
      const [config, movimentiRaw, sociRaw] = await Promise.all([
        Archivio.leggi('config'),
        Archivio.leggi('movimenti'),
        Archivio.leggi('soci'),
      ]);
      let movimenti = movimentiRaw;
      let soci = sociRaw;
      if (!Array.isArray(movimenti)) {
        const vecchi = await Archivio.leggiTutti('mov.');
        movimenti = vecchi;
        if (vecchi.length) await Archivio.scriviConRetry('movimenti', vecchi);
      }
      if (!Array.isArray(soci)) {
        const vecchi = await Archivio.leggiTutti('socio.');
        soci = vecchi;
        if (vecchi.length) await Archivio.scriviConRetry('soci', vecchi);
      }
      dispatch({
        type: 'CARICATO',
        payload: { modalita, ...payloadDaConfig(config), movimenti, soci },
      });
    } catch {
      if (!silenzioso)
        dispatch({ type: 'ERRORE', messaggio: 'Impossibile caricare i dati dall\'archivio. Riprova.' });
    } finally {
      occupatoRef.current = false;
    }
  }, []);

  useEffect(() => {
    let intervallo: ReturnType<typeof setInterval> | null = null;
    (async () => {
      await ricarica();
      if (modalitaRilevata === 'condiviso') {
        intervallo = setInterval(() => ricarica(true), 25000);
      }
    })();
    return () => { if (intervallo) clearInterval(intervallo); };
  }, [ricarica]);

  const aggiornaLista = useCallback(async (
    chiave: string,
    azione: 'IMPOSTA_MOVIMENTI' | 'IMPOSTA_SOCI',
    trasforma: (lista: (Movimento | Socio)[]) => (Movimento | Socio)[],
    listaCorrente: () => (Movimento | Socio)[]
  ): Promise<boolean> => {
    const modalita = modalitaRilevata || 'memoria';
    if (modalita === 'memoria') {
      dispatch({ type: azione, lista: trasforma(listaCorrente()) as any });
      return true;
    }
    try {
      const remota = await Archivio.leggi(chiave);
      const base = Array.isArray(remota) ? remota : listaCorrente();
      const nuova = trasforma(base);
      await Archivio.scriviConRetry(chiave, nuova);
      dispatch({ type: azione, lista: nuova as any });
      return true;
    } catch {
      dispatch({ type: 'ERRORE', messaggio: 'Salvataggio non riuscito: la modifica non è stata registrata. Riprova.' });
      return false;
    }
  }, []);

  const azioni = useMemo<Azioni>(
    () => ({
      ricarica,
      pulisciErrore: () => dispatch({ type: 'PULISCI_ERRORE' }),

      aggiungiMovimento: (dati) => {
        const mov: Movimento = { ...dati, id: genId(), creatoIl: Date.now() };
        return aggiornaLista(
          'movimenti', 'IMPOSTA_MOVIMENTI',
          (l) => [...(l as Movimento[]).filter((x) => x.id !== mov.id), mov],
          () => movimentiRef.current
        ) as Promise<boolean>;
      },

      eliminaMovimento: (id) =>
        aggiornaLista(
          'movimenti', 'IMPOSTA_MOVIMENTI',
          (l) => (l as Movimento[]).filter((m) => m.id !== id),
          () => movimentiRef.current
        ) as Promise<boolean>,

      aggiungiSocio: (dati) => {
        const socio: Socio = { ...dati, id: genId() };
        return aggiornaLista(
          'soci', 'IMPOSTA_SOCI',
          (l) => [...(l as Socio[]).filter((x) => x.id !== socio.id), socio],
          () => sociRef.current
        ) as Promise<boolean>;
      },

      eliminaSocio: (id) =>
        aggiornaLista(
          'soci', 'IMPOSTA_SOCI',
          (l) => (l as Socio[]).filter((s) => s.id !== id),
          () => sociRef.current
        ) as Promise<boolean>,

      salvaConfig: async (parziale) => {
        const nuova = { ...configCorrente(), ...parziale };
        if ((modalitaRilevata || 'memoria') === 'memoria') {
          dispatch({ type: 'IMPOSTA_CONFIG', payload: parziale });
          return true;
        }
        try {
          await Archivio.scriviConRetry('config', nuova);
          dispatch({ type: 'IMPOSTA_CONFIG', payload: parziale });
          return true;
        } catch {
          dispatch({ type: 'ERRORE', messaggio: 'Salvataggio non riuscito: la modifica non è stata registrata. Riprova.' });
          return false;
        }
      },

      importaBackup: async (dati: BackupDati) => {
        const movimenti = (dati.movimenti || []).map((m) => ({ ...m, id: m.id || genId() }));
        const soci = (dati.soci || []).map((s) => ({ ...s, id: s.id || genId() }));
        if ((modalitaRilevata || 'memoria') === 'memoria') {
          dispatch({ type: 'CARICATO', payload: { modalita: 'memoria', ...payloadDaConfig(dati.config), movimenti, soci } });
          return true;
        }
        try {
          if (dati.config) await Archivio.scriviConRetry('config', dati.config);
          await Archivio.scriviConRetry('movimenti', movimenti);
          await Archivio.scriviConRetry('soci', soci);
          await ricarica();
          return true;
        } catch {
          dispatch({ type: 'ERRORE', messaggio: 'Importazione del backup non riuscita. Riprova.' });
          return false;
        }
      },
    }),
    [aggiornaLista, configCorrente, ricarica]
  );

  return [state, azioni];
}

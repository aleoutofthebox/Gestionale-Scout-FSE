import { useReducer, useState, useMemo, useEffect, useCallback, useRef } from "react";

// ============================================================
// GESTIONALE CONTABILITÀ FINANZIARIA — GRUPPO SCOUT FSE
// Versione corretta e irrobustita:
// - archivio a chiavi compatte (1 chiave per collezione) con retry
// - modalità di salvataggio verificata con scrittura di prova
// - validazione visibile su tutti i pulsanti di salvataggio
// - migrazione automatica dei dati dal vecchio schema
// ============================================================

const CATEGORIE_BASE = {
  entrata: [
    "Quote associative",
    "Contributi genitori per attività",
    "Donazioni / liberalità",
    "Rimborsi",
    "Sussidi federali",
    "Altre entrate",
  ],
  uscita: [
    "Materiale scout",
    "Spese attività",
    "Spese campo estivo",
    "Spese amministrative",
    "Spese assicurative",
    "Versamenti alla federazione",
    "Altre uscite",
  ],
};

const METODI = ["Cassa", "Bonifico", "Altro"];
const UNITA = ["Branco", "Cerchio", "Riparto", "Clan", "Fuoco", "Capi / Direzione"];

const oggi = () => new Date().toISOString().slice(0, 10);
const eur = (n) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const dataIT = (iso) => { const [a, m, g] = iso.split("-"); return `${g}/${m}/${a}`; };
const parseImporto = (v) => Math.round((parseFloat(String(v).replace(",", ".")) || 0) * 100) / 100;
const genId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const CONFIG_DEFAULT = {
  intestazione: {
    gruppo: "Gruppo Scout FSE",
    citta: "",
    esercizio: new Date().getFullYear(),
  },
  saldiIniziali: { cassa: 0, banca: 0 },
  categorie: CATEGORIE_BASE,
  quotaAnnuale: 40,
};

// ---------------- Archivio: condiviso (Claude) o locale (file HTML) ----------------
// Modalità "condiviso": archivio degli artifact Claude — dati comuni a tutti gli
//   utenti dell'applicazione, da qualsiasi dispositivo (lavoro a più mani).
// Modalità "locale": memoria persistente del browser — i dati restano salvati su
//   questo computer anche dopo la chiusura (versione HTML scaricata).
// Modalità "memoria": nessun archivio disponibile, dati persi alla chiusura.
// Chiavi: "config" (impostazioni), "movimenti" (elenco), "soci" (elenco)

const condivisoDisponibile = () =>
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

const localeDisponibile = () => {
  try {
    const t = "__fse_test__";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
};

// La modalità viene VERIFICATA con una scrittura di prova, non solo dichiarata:
// se l'archivio condiviso esiste ma non è scrivibile, si degrada con garbo.
let modalitaRilevata = null;

async function rilevaModalita() {
  if (modalitaRilevata) return modalitaRilevata;
  if (condivisoDisponibile()) {
    try {
      await window.storage.set("verifica", JSON.stringify({ t: Date.now() }), true);
      modalitaRilevata = "condiviso";
      return modalitaRilevata;
    } catch {
      /* l'archivio condiviso non è scrivibile: prova il locale */
    }
  }
  modalitaRilevata = localeDisponibile() ? "locale" : "memoria";
  return modalitaRilevata;
}

const LS_PREFISSO = "fse-contabilita.";

const ArchivioCondiviso = {
  async leggi(chiave) {
    try {
      const r = await window.storage.get(chiave, true);
      return r ? JSON.parse(r.value) : null;
    } catch {
      return null;
    }
  },
  async scrivi(chiave, valore) {
    const r = await window.storage.set(chiave, JSON.stringify(valore), true);
    if (!r) throw new Error("scrittura fallita");
  },
  async elimina(chiave) {
    try { await window.storage.delete(chiave, true); } catch { /* già assente */ }
  },
  async elenco(prefisso) {
    try {
      const r = await window.storage.list(prefisso, true);
      return r?.keys || [];
    } catch {
      return [];
    }
  },
};

const ArchivioLocale = {
  async leggi(chiave) {
    try {
      const v = window.localStorage.getItem(LS_PREFISSO + chiave);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  async scrivi(chiave, valore) {
    window.localStorage.setItem(LS_PREFISSO + chiave, JSON.stringify(valore));
  },
  async elimina(chiave) {
    try { window.localStorage.removeItem(LS_PREFISSO + chiave); } catch { /* già assente */ }
  },
  async elenco(prefisso) {
    const out = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(LS_PREFISSO + prefisso)) out.push(k.slice(LS_PREFISSO.length));
    }
    return out;
  },
};

const Archivio = {
  _backend() {
    const m = modalitaRilevata || "locale";
    return m === "condiviso" ? ArchivioCondiviso : ArchivioLocale;
  },
  leggi(chiave) { return this._backend().leggi(chiave); },
  scrivi(chiave, valore) { return this._backend().scrivi(chiave, valore); },
  elimina(chiave) { return this._backend().elimina(chiave); },
  elenco(prefisso) { return this._backend().elenco(prefisso); },
  async scriviConRetry(chiave, valore, tentativi = 2) {
    for (let i = 0; i < tentativi; i++) {
      try {
        await this.scrivi(chiave, valore);
        return;
      } catch (e) {
        if (i === tentativi - 1) throw e;
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  },
  async leggiTutti(prefisso) {
    const chiavi = await this.elenco(prefisso);
    const valori = await Promise.all(chiavi.map((k) => this.leggi(k)));
    return valori.filter(Boolean);
  },
};

function payloadDaConfig(config) {
  if (!config) return {};
  return {
    intestazione: { ...CONFIG_DEFAULT.intestazione, ...config.intestazione },
    saldiIniziali: { ...CONFIG_DEFAULT.saldiIniziali, ...config.saldiIniziali },
    categorie: config.categorie || CATEGORIE_BASE,
    quotaAnnuale: config.quotaAnnuale ?? CONFIG_DEFAULT.quotaAnnuale,
  };
}

// ---------------- Reducer (stato locale, specchio dell'archivio) ----------------

const statoIniziale = {
  ...CONFIG_DEFAULT,
  movimenti: [],
  soci: [],
  caricamento: true,
  modalita: null,
  errore: null,
  ultimaSincronizzazione: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "CARICATO":
      return { ...state, ...action.payload, caricamento: false, errore: null, ultimaSincronizzazione: new Date() };
    case "ARCHIVIO_NON_DISPONIBILE":
      return { ...state, caricamento: false, modalita: "memoria" };
    case "ERRORE":
      return { ...state, errore: action.messaggio };
    case "PULISCI_ERRORE":
      return { ...state, errore: null };
    case "IMPOSTA_MOVIMENTI":
      return { ...state, movimenti: action.lista };
    case "IMPOSTA_SOCI":
      return { ...state, soci: action.lista };
    case "IMPOSTA_CONFIG":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ---------------- Hook di sincronizzazione ----------------

function useContabilita() {
  const [state, dispatch] = useReducer(reducer, statoIniziale);
  const occupatoRef = useRef(false);
  const movimentiRef = useRef(state.movimenti);
  const sociRef = useRef(state.soci);

  useEffect(() => { movimentiRef.current = state.movimenti; }, [state.movimenti]);
  useEffect(() => { sociRef.current = state.soci; }, [state.soci]);

  const configCorrente = useCallback(
    () => ({
      intestazione: state.intestazione,
      saldiIniziali: state.saldiIniziali,
      categorie: state.categorie,
      quotaAnnuale: state.quotaAnnuale,
    }),
    [state.intestazione, state.saldiIniziali, state.categorie, state.quotaAnnuale]
  );

  const ricarica = useCallback(async (silenzioso = false) => {
    const modalita = await rilevaModalita();
    if (modalita === "memoria") {
      dispatch({ type: "ARCHIVIO_NON_DISPONIBILE" });
      return;
    }
    if (occupatoRef.current) return;
    occupatoRef.current = true;
    try {
      let [config, movimenti, soci] = await Promise.all([
        Archivio.leggi("config"),
        Archivio.leggi("movimenti"),
        Archivio.leggi("soci"),
      ]);
      // Migrazione automatica dal vecchio schema a voci singole (mov.<id> / socio.<id>)
      if (!Array.isArray(movimenti)) {
        const vecchi = await Archivio.leggiTutti("mov.");
        movimenti = vecchi;
        if (vecchi.length) await Archivio.scriviConRetry("movimenti", vecchi);
      }
      if (!Array.isArray(soci)) {
        const vecchi = await Archivio.leggiTutti("socio.");
        soci = vecchi;
        if (vecchi.length) await Archivio.scriviConRetry("soci", vecchi);
      }
      dispatch({
        type: "CARICATO",
        payload: { modalita, ...payloadDaConfig(config), movimenti, soci },
      });
    } catch (e) {
      if (!silenzioso) dispatch({ type: "ERRORE", messaggio: "Impossibile caricare i dati dall'archivio. Riprova." });
    } finally {
      occupatoRef.current = false;
    }
  }, []);

  // Caricamento iniziale + aggiornamento periodico (solo in modalità condivisa)
  useEffect(() => {
    let intervallo = null;
    (async () => {
      await ricarica();
      if (modalitaRilevata === "condiviso") {
        intervallo = setInterval(() => ricarica(true), 25000);
      }
    })();
    return () => { if (intervallo) clearInterval(intervallo); };
  }, [ricarica]);

  // Aggiorna una collezione con lettura-fusione-scrittura: le modifiche
  // di altri utenti già presenti nell'archivio non vengono perse.
  const aggiornaLista = useCallback(async (chiave, azione, trasforma, listaCorrente) => {
    const modalita = modalitaRilevata || "memoria";
    if (modalita === "memoria") {
      dispatch({ type: azione, lista: trasforma(listaCorrente()) });
      return true;
    }
    try {
      const remota = await Archivio.leggi(chiave);
      const base = Array.isArray(remota) ? remota : listaCorrente();
      const nuova = trasforma(base);
      await Archivio.scriviConRetry(chiave, nuova);
      dispatch({ type: azione, lista: nuova });
      return true;
    } catch (e) {
      dispatch({ type: "ERRORE", messaggio: "Salvataggio non riuscito: la modifica non è stata registrata. Riprova." });
      return false;
    }
  }, []);

  const azioni = useMemo(
    () => ({
      ricarica,
      pulisciErrore: () => dispatch({ type: "PULISCI_ERRORE" }),

      aggiungiMovimento: (dati) => {
        const mov = { ...dati, id: genId(), creatoIl: Date.now() };
        return aggiornaLista(
          "movimenti", "IMPOSTA_MOVIMENTI",
          (l) => [...l.filter((x) => x.id !== mov.id), mov],
          () => movimentiRef.current
        );
      },

      eliminaMovimento: (id) =>
        aggiornaLista(
          "movimenti", "IMPOSTA_MOVIMENTI",
          (l) => l.filter((m) => m.id !== id),
          () => movimentiRef.current
        ),

      aggiungiSocio: (dati) => {
        const socio = { ...dati, id: genId() };
        return aggiornaLista(
          "soci", "IMPOSTA_SOCI",
          (l) => [...l.filter((x) => x.id !== socio.id), socio],
          () => sociRef.current
        );
      },

      eliminaSocio: (id) =>
        aggiornaLista(
          "soci", "IMPOSTA_SOCI",
          (l) => l.filter((s) => s.id !== id),
          () => sociRef.current
        ),

      salvaConfig: async (parziale) => {
        const nuova = { ...configCorrente(), ...parziale };
        if ((modalitaRilevata || "memoria") === "memoria") {
          dispatch({ type: "IMPOSTA_CONFIG", payload: parziale });
          return true;
        }
        try {
          await Archivio.scriviConRetry("config", nuova);
          dispatch({ type: "IMPOSTA_CONFIG", payload: parziale });
          return true;
        } catch (e) {
          dispatch({ type: "ERRORE", messaggio: "Salvataggio non riuscito: la modifica non è stata registrata. Riprova." });
          return false;
        }
      },

      importaBackup: async (dati) => {
        const movimenti = (dati.movimenti || []).map((m) => ({ ...m, id: m.id || genId() }));
        const soci = (dati.soci || []).map((s) => ({ ...s, id: s.id || genId() }));
        if ((modalitaRilevata || "memoria") === "memoria") {
          dispatch({ type: "CARICATO", payload: { modalita: "memoria", ...payloadDaConfig(dati.config), movimenti, soci } });
          return true;
        }
        try {
          if (dati.config) await Archivio.scriviConRetry("config", dati.config);
          await Archivio.scriviConRetry("movimenti", movimenti);
          await Archivio.scriviConRetry("soci", soci);
          await ricarica();
          return true;
        } catch (e) {
          dispatch({ type: "ERRORE", messaggio: "Importazione del backup non riuscita. Riprova." });
          return false;
        }
      },
    }),
    [aggiornaLista, configCorrente, ricarica]
  );

  return [state, azioni];
}

// ---------------- UI di base ----------------

const stileCampo = "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#1b2a4a] focus:outline-none focus:ring-1 focus:ring-[#1b2a4a]";
const stileLabel = "mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500";

function CardSaldo({ etichetta, valore, sotto, tono }) {
  const toni = { neutro: "border-stone-200 bg-white", blu: "border-[#1b2a4a] bg-[#1b2a4a] text-white" };
  return (
    <div className={`rounded-lg border px-5 py-4 ${toni[tono] || toni.neutro}`}>
      <div className={`text-xs uppercase tracking-widest ${tono === "blu" ? "text-blue-200" : "text-stone-500"}`}>{etichetta}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{eur(valore)}</div>
      {sotto && <div className={`mt-1 text-xs ${tono === "blu" ? "text-blue-200" : "text-stone-400"}`}>{sotto}</div>}
    </div>
  );
}

// ---------------- Movimenti ----------------

function FormMovimento({ categorie, onAggiungi }) {
  const [tipo, setTipo] = useState("entrata");
  const [form, setForm] = useState({
    data: oggi(), categoria: categorie.entrata[0], descrizione: "", importo: "", metodo: "Cassa", attivita: "",
  });
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const cambiaTipo = (nuovo) => {
    setTipo(nuovo);
    setForm((f) => ({ ...f, categoria: categorie[nuovo][0] }));
  };

  const salva = async () => {
    const importo = parseImporto(form.importo);
    if (!form.data) return setErrore("Inserisci la data del movimento.");
    if (!form.descrizione.trim()) return setErrore("Inserisci una descrizione del movimento.");
    if (importo <= 0) return setErrore("Inserisci un importo valido maggiore di zero (es. 25,50).");
    setErrore("");
    setInCorso(true);
    const ok = await onAggiungi({
      tipo, data: form.data, categoria: form.categoria, descrizione: form.descrizione.trim(),
      importo, metodo: form.metodo, attivita: form.attivita.trim(), socioId: null,
    });
    setInCorso(false);
    if (ok) setForm((f) => ({ ...f, descrizione: "", importo: "", attivita: "" }));
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Nuovo movimento</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => cambiaTipo("entrata")}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${tipo === "entrata" ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"}`}>
          Entrata
        </button>
        <button onClick={() => cambiaTipo("uscita")}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${tipo === "uscita" ? "border-red-800 bg-red-800 text-white" : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"}`}>
          Uscita
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={stileLabel}>Data</label>
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Categoria</label>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={stileCampo}>
            {categorie[tipo].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={stileLabel}>Descrizione</label>
          <input type="text" placeholder="Es. Acquisto tende per campo estivo" value={form.descrizione}
            onChange={(e) => setForm({ ...form, descrizione: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Importo (€)</label>
          <input type="text" inputMode="decimal" placeholder="0,00" value={form.importo}
            onChange={(e) => setForm({ ...form, importo: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Metodo di pagamento</label>
          <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} className={stileCampo}>
            {METODI.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={stileLabel}>Attività / evento (facoltativo)</label>
          <input type="text" placeholder="Es. Campo estivo Fontainemore, Uscita di Riparto…" value={form.attivita}
            onChange={(e) => setForm({ ...form, attivita: e.target.value })} className={stileCampo} />
        </div>
      </div>

      {errore && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{errore}</div>}

      <button onClick={salva} disabled={inCorso}
        className="mt-4 w-full rounded-md bg-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27395f] disabled:opacity-60">
        {inCorso ? "Salvataggio…" : "Registra movimento"}
      </button>
    </div>
  );
}

function SaldiIniziali({ saldi, onSalva }) {
  const [aperto, setAperto] = useState(false);
  const [cassa, setCassa] = useState(saldi.cassa);
  const [banca, setBanca] = useState(saldi.banca);
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
        <button onClick={() => { setCassa(saldi.cassa); setBanca(saldi.banca); setAperto(!aperto); }}
          className="text-sm text-[#1b2a4a] underline underline-offset-2">
          {aperto ? "Chiudi" : "Modifica"}
        </button>
      </div>
      {!aperto ? (
        <p className="mt-2 text-sm text-stone-500">Cassa {eur(saldi.cassa)} · Banca {eur(saldi.banca)}</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className={stileLabel}>Cassa contanti</label>
            <input type="text" inputMode="decimal" value={cassa} onChange={(e) => setCassa(e.target.value)} className={stileCampo} />
          </div>
          <div>
            <label className={stileLabel}>Conto corrente</label>
            <input type="text" inputMode="decimal" value={banca} onChange={(e) => setBanca(e.target.value)} className={stileCampo} />
          </div>
          <button onClick={conferma} disabled={inCorso} className="col-span-2 rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white disabled:opacity-60">
            {inCorso ? "Salvataggio…" : "Salva saldi iniziali"}
          </button>
        </div>
      )}
    </div>
  );
}

function righeConProgressivo(movimenti, saldiIniziali) {
  const ordinati = [...movimenti].sort((a, b) =>
    a.data === b.data ? (a.creatoIl || 0) - (b.creatoIl || 0) : a.data.localeCompare(b.data)
  );
  let progressivo = saldiIniziali.cassa + saldiIniziali.banca;
  return ordinati.map((m) => {
    progressivo += m.tipo === "entrata" ? m.importo : -m.importo;
    return { ...m, progressivo };
  });
}

function RegistroMovimenti({ movimenti, soci, saldiIniziali, onElimina }) {
  const righe = useMemo(() => righeConProgressivo(movimenti, saldiIniziali), [movimenti, saldiIniziali]);

  const nomeSocio = (id) => {
    const s = soci.find((x) => x.id === id);
    return s ? `${s.nome} ${s.cognome}` : null;
  };

  if (righe.length === 0)
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-400">
        Nessun movimento registrato. Inserisci la prima entrata o uscita dell'esercizio.
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="px-3 py-2.5 font-medium">Data</th>
            <th className="px-3 py-2.5 font-medium">Descrizione</th>
            <th className="px-3 py-2.5 font-medium">Categoria</th>
            <th className="px-3 py-2.5 font-medium">Metodo</th>
            <th className="px-3 py-2.5 text-right font-medium">Entrate</th>
            <th className="px-3 py-2.5 text-right font-medium">Uscite</th>
            <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
            <th className="px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-stone-100 bg-stone-50/50 italic text-stone-500">
            <td className="px-3 py-2">01/01</td>
            <td className="px-3 py-2" colSpan={5}>Saldo iniziale d'esercizio (cassa + banca)</td>
            <td className="px-3 py-2 text-right tabular-nums">{eur(saldiIniziali.cassa + saldiIniziali.banca)}</td>
            <td></td>
          </tr>
          {righe.map((m) => (
            <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{dataIT(m.data)}</td>
              <td className="px-3 py-2">
                <div>{m.descrizione}</div>
                {(m.attivita || (m.socioId && nomeSocio(m.socioId))) && (
                  <div className="text-xs text-stone-400">
                    {[m.attivita, m.socioId && nomeSocio(m.socioId) ? `Socio: ${nomeSocio(m.socioId)}` : null].filter(Boolean).join(" · ")}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-stone-500">{m.categoria}</td>
              <td className="px-3 py-2 text-stone-500">{m.metodo}</td>
              <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{m.tipo === "entrata" ? eur(m.importo) : ""}</td>
              <td className="px-3 py-2 text-right tabular-nums text-red-800">{m.tipo === "uscita" ? eur(m.importo) : ""}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">{eur(m.progressivo)}</td>
              <td className="px-2 py-2 text-right">
                <button onClick={() => onElimina(m.id)} title="Elimina movimento"
                  className="rounded px-1.5 py-0.5 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-700">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Soci e quote ----------------

function FormSocio({ esercizio, onAggiungi }) {
  const [form, setForm] = useState({ nome: "", cognome: "", unita: UNITA[0], annoIscrizione: esercizio });
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const salva = async () => {
    if (!form.nome.trim() || !form.cognome.trim()) return setErrore("Inserisci nome e cognome del socio.");
    setErrore("");
    setInCorso(true);
    const ok = await onAggiungi({
      nome: form.nome.trim(), cognome: form.cognome.trim(),
      unita: form.unita, annoIscrizione: parseInt(form.annoIscrizione) || esercizio,
    });
    setInCorso(false);
    if (ok) setForm((f) => ({ ...f, nome: "", cognome: "" }));
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Nuovo socio</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={stileLabel}>Nome</label>
          <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Cognome</label>
          <input type="text" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Unità</label>
          <select value={form.unita} onChange={(e) => setForm({ ...form, unita: e.target.value })} className={stileCampo}>
            {UNITA.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={stileLabel}>Anno di iscrizione</label>
          <input type="number" value={form.annoIscrizione} onChange={(e) => setForm({ ...form, annoIscrizione: e.target.value })} className={stileCampo} />
        </div>
      </div>
      {errore && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">{errore}</div>}
      <button onClick={salva} disabled={inCorso}
        className="mt-4 w-full rounded-md bg-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#27395f] disabled:opacity-60">
        {inCorso ? "Salvataggio…" : "Aggiungi socio"}
      </button>
    </div>
  );
}

function RegistraQuota({ socio, quotaAnnuale, onConferma, onAnnulla }) {
  const [data, setData] = useState(oggi());
  const [importo, setImporto] = useState(quotaAnnuale > 0 ? String(quotaAnnuale).replace(".", ",") : "");
  const [metodo, setMetodo] = useState("Cassa");
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  const conferma = async () => {
    const imp = parseImporto(importo);
    if (!data) return setErrore("Inserisci la data dell'incasso.");
    if (imp <= 0) return setErrore("Inserisci un importo valido maggiore di zero (es. 40 oppure 40,00).");
    setErrore("");
    setInCorso(true);
    await onConferma({ data, importo: imp, metodo });
    setInCorso(false);
  };

  return (
    <tr className="border-b border-stone-100 bg-blue-50/50">
      <td colSpan={6} className="px-3 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-sm font-medium text-[#1b2a4a]">
            Quota {socio.nome} {socio.cognome}:
          </div>
          <div>
            <label className={stileLabel}>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={stileCampo} />
          </div>
          <div className="w-28">
            <label className={stileLabel}>Importo</label>
            <input type="text" inputMode="decimal" placeholder="0,00" value={importo}
              onChange={(e) => setImporto(e.target.value)} className={stileCampo} />
          </div>
          <div>
            <label className={stileLabel}>Metodo</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={stileCampo}>
              {METODI.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={conferma} disabled={inCorso}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {inCorso ? "Salvataggio…" : "Conferma incasso"}
          </button>
          <button onClick={onAnnulla} className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">
            Annulla
          </button>
        </div>
        {errore && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {errore}
          </div>
        )}
      </td>
    </tr>
  );
}

function GestioneSoci({ soci, movimenti, quotaAnnuale, esercizio, azioni }) {
  const [filtroUnita, setFiltroUnita] = useState("Tutte");
  const [quotaInCorso, setQuotaInCorso] = useState(null);
  const [nuovaQuota, setNuovaQuota] = useState(String(quotaAnnuale).replace(".", ","));
  const [quotaSalvata, setQuotaSalvata] = useState(false);

  useEffect(() => { setNuovaQuota(String(quotaAnnuale).replace(".", ",")); }, [quotaAnnuale]);

  const quotePagate = useMemo(() => {
    const mappa = new Map();
    for (const m of movimenti) {
      if (m.tipo === "entrata" && m.categoria === "Quote associative" && m.socioId)
        mappa.set(m.socioId, m);
    }
    return mappa;
  }, [movimenti]);

  const filtrati = useMemo(() => {
    const lista = filtroUnita === "Tutte" ? soci : soci.filter((s) => s.unita === filtroUnita);
    return [...lista].sort((a, b) =>
      a.unita === b.unita ? a.cognome.localeCompare(b.cognome) : UNITA.indexOf(a.unita) - UNITA.indexOf(b.unita)
    );
  }, [soci, filtroUnita]);

  const pagati = soci.filter((s) => quotePagate.has(s.id)).length;
  const incassato = [...quotePagate.values()].reduce((t, m) => t + m.importo, 0);

  const registraQuota = async (socio, { data, importo, metodo }) => {
    const ok = await azioni.aggiungiMovimento({
      tipo: "entrata", data, categoria: "Quote associative",
      descrizione: `Quota associativa ${esercizio} — ${socio.nome} ${socio.cognome}`,
      importo, metodo, attivita: "", socioId: socio.id,
    });
    if (ok) setQuotaInCorso(null);
  };

  const salvaQuotaAnnuale = async () => {
    const valore = parseImporto(nuovaQuota);
    if (valore <= 0) return;
    const ok = await azioni.salvaConfig({ quotaAnnuale: valore });
    if (ok) {
      setQuotaSalvata(true);
      setTimeout(() => setQuotaSalvata(false), 2500);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <FormSocio esercizio={esercizio} onAggiungi={azioni.aggiungiSocio} />

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-serif text-lg text-[#1b2a4a]">Quota annuale di riferimento</h2>
          <p className="mt-1 text-xs text-stone-500">Importo proposto al momento dell'incasso (modificabile caso per caso).</p>
          <div className="mt-3 flex gap-2">
            <input type="text" inputMode="decimal" value={nuovaQuota} onChange={(e) => setNuovaQuota(e.target.value)} className={stileCampo} />
            <button onClick={salvaQuotaAnnuale}
              disabled={parseImporto(nuovaQuota) <= 0}
              className="shrink-0 rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white disabled:opacity-50">
              Salva
            </button>
          </div>
          {parseImporto(nuovaQuota) <= 0 && nuovaQuota !== "" && (
            <p className="mt-2 text-xs text-amber-700">Inserisci un importo valido maggiore di zero (es. 40 oppure 40,00).</p>
          )}
          {quotaSalvata && <p className="mt-2 text-xs font-medium text-emerald-700">✓ Quota di riferimento salvata</p>}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-serif text-lg text-[#1b2a4a]">Situazione quote {esercizio}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Soci censiti</span><span className="font-medium tabular-nums">{soci.length}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Quote versate</span><span className="font-medium tabular-nums text-emerald-700">{pagati}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">In sospeso</span><span className="font-medium tabular-nums text-amber-700">{soci.length - pagati}</span></div>
            <div className="flex justify-between border-t border-stone-100 pt-2"><span className="text-stone-500">Totale incassato</span><span className="font-semibold tabular-nums">{eur(incassato)}</span></div>
          </div>
          {soci.length > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(pagati / soci.length) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg text-[#1b2a4a]">Anagrafica soci</h2>
          <select value={filtroUnita} onChange={(e) => setFiltroUnita(e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm">
            <option>Tutte</option>
            {UNITA.map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>

        {filtrati.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-400">
            Nessun socio censito. Aggiungi i soci per tracciare le quote associative.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-3 py-2.5 font-medium">Socio</th>
                  <th className="px-3 py-2.5 font-medium">Unità</th>
                  <th className="px-3 py-2.5 font-medium">Iscritto dal</th>
                  <th className="px-3 py-2.5 font-medium">Quota {esercizio}</th>
                  <th className="px-3 py-2.5 text-right font-medium"></th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((s) => {
                  const mov = quotePagate.get(s.id);
                  return (
                    <FragmentRiga key={s.id}>
                      <tr className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="px-3 py-2 font-medium">{s.cognome} {s.nome}</td>
                        <td className="px-3 py-2 text-stone-500">{s.unita}</td>
                        <td className="px-3 py-2 tabular-nums text-stone-500">{s.annoIscrizione}</td>
                        <td className="px-3 py-2">
                          {mov ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              ✓ Pagata · {eur(mov.importo)} il {dataIT(mov.data)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              In sospeso
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!mov && quotaInCorso !== s.id && (
                            <button onClick={() => setQuotaInCorso(s.id)}
                              className="rounded-md border border-emerald-700 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                              Registra quota
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => azioni.eliminaSocio(s.id)} title="Elimina socio"
                            className="rounded px-1.5 py-0.5 text-stone-300 hover:bg-red-50 hover:text-red-700">
                            ✕
                          </button>
                        </td>
                      </tr>
                      {quotaInCorso === s.id && (
                        <RegistraQuota socio={s} quotaAnnuale={quotaAnnuale}
                          onConferma={(dati) => registraQuota(s, dati)}
                          onAnnulla={() => setQuotaInCorso(null)} />
                      )}
                    </FragmentRiga>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-stone-400">
          La registrazione della quota genera automaticamente il movimento in prima nota (categoria "Quote associative").
          Eliminando il movimento dal registro, la quota torna in sospeso.
        </p>
      </div>
    </div>
  );
}

function FragmentRiga({ children }) { return <>{children}</>; }

// ---------------- Categorie ----------------
// NOTA: ColonnaCategorie è un componente di primo livello (non definito dentro
// GestioneCategorie) per evitare la perdita del focus a ogni carattere digitato.

function ColonnaCategorie({ tipo, titolo, accento, categorie, movimenti, onSalvaCategorie }) {
  const [nuova, setNuova] = useState("");
  const inUso = (nome) => movimenti.some((m) => m.categoria === nome);
  const predefinita = (nome) => CATEGORIE_BASE[tipo].includes(nome);

  const aggiungi = () => {
    const nome = nuova.trim();
    if (!nome || categorie[tipo].includes(nome)) return;
    onSalvaCategorie({ ...categorie, [tipo]: [...categorie[tipo], nome] });
    setNuova("");
  };

  const rimuovi = (nome) => {
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
          onKeyDown={(e) => { if (e.key === "Enter") aggiungi(); }}
          className={stileCampo} />
        <button onClick={aggiungi} className="shrink-0 rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white">
          Aggiungi
        </button>
      </div>
    </div>
  );
}

function GestioneCategorie({ categorie, movimenti, azioni }) {
  const salvaCategorie = (nuove) => azioni.salvaConfig({ categorie: nuove });

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

// ---------------- Rendiconto annuale ----------------

function calcolaRendiconto(movimenti, categorie, saldiIniziali) {
  const perCategoria = (tipo) =>
    categorie[tipo]
      .map((c) => ({
        categoria: c,
        totale: movimenti.filter((m) => m.tipo === tipo && m.categoria === c).reduce((t, m) => t + m.importo, 0),
      }))
      .filter((r) => r.totale > 0);

  const orfani = (tipo) => {
    const note = new Set(categorie[tipo]);
    const extra = movimenti.filter((m) => m.tipo === tipo && !note.has(m.categoria));
    if (extra.length === 0) return [];
    const mappa = new Map();
    for (const m of extra) mappa.set(m.categoria, (mappa.get(m.categoria) || 0) + m.importo);
    return [...mappa.entries()].map(([categoria, totale]) => ({ categoria, totale }));
  };

  const entrate = [...perCategoria("entrata"), ...orfani("entrata")];
  const uscite = [...perCategoria("uscita"), ...orfani("uscita")];
  const totEntrate = entrate.reduce((t, r) => t + r.totale, 0);
  const totUscite = uscite.reduce((t, r) => t + r.totale, 0);

  let deltaCassa = 0, deltaBanca = 0;
  for (const m of movimenti) {
    const segno = m.tipo === "entrata" ? 1 : -1;
    if (m.metodo === "Cassa") deltaCassa += segno * m.importo;
    else deltaBanca += segno * m.importo;
  }

  const saldoIniziale = saldiIniziali.cassa + saldiIniziali.banca;
  const avanzo = totEntrate - totUscite;

  return {
    entrate, uscite, totEntrate, totUscite, avanzo, saldoIniziale,
    saldoFinale: saldoIniziale + avanzo,
    finaleCassa: saldiIniziali.cassa + deltaCassa,
    finaleBanca: saldiIniziali.banca + deltaBanca,
  };
}

function ProspettoRendiconto({ rendiconto, saldiIniziali, intestazione, stampa }) {
  const r = rendiconto;
  const cella = "px-3 py-1.5";
  const sezione = stampa ? "bg-stone-100" : "bg-stone-50";

  return (
    <div className={stampa ? "" : "rounded-lg border border-stone-200 bg-white"}>
      <table className="w-full text-sm">
        <tbody>
          <tr className={`${sezione} border-y border-stone-300 text-xs uppercase tracking-wide text-stone-600`}>
            <td className={`${cella} font-semibold`}>A) Entrate per cassa dell'esercizio</td>
            <td className={`${cella} text-right font-semibold`}>Importo</td>
          </tr>
          {r.entrate.length === 0 && (
            <tr><td className={`${cella} italic text-stone-400`} colSpan={2}>Nessuna entrata registrata</td></tr>
          )}
          {r.entrate.map((riga) => (
            <tr key={riga.categoria} className="border-b border-stone-100">
              <td className={cella}>{riga.categoria}</td>
              <td className={`${cella} text-right tabular-nums`}>{eur(riga.totale)}</td>
            </tr>
          ))}
          <tr className="border-b border-stone-300 font-semibold">
            <td className={cella}>Totale entrate (A)</td>
            <td className={`${cella} text-right tabular-nums text-emerald-800`}>{eur(r.totEntrate)}</td>
          </tr>

          <tr className={`${sezione} border-b border-stone-300 text-xs uppercase tracking-wide text-stone-600`}>
            <td className={`${cella} font-semibold`} colSpan={2}>B) Uscite per cassa dell'esercizio</td>
          </tr>
          {r.uscite.length === 0 && (
            <tr><td className={`${cella} italic text-stone-400`} colSpan={2}>Nessuna uscita registrata</td></tr>
          )}
          {r.uscite.map((riga) => (
            <tr key={riga.categoria} className="border-b border-stone-100">
              <td className={cella}>{riga.categoria}</td>
              <td className={`${cella} text-right tabular-nums`}>{eur(riga.totale)}</td>
            </tr>
          ))}
          <tr className="border-b border-stone-300 font-semibold">
            <td className={cella}>Totale uscite (B)</td>
            <td className={`${cella} text-right tabular-nums text-red-900`}>{eur(r.totUscite)}</td>
          </tr>

          <tr className="border-b border-stone-200 font-semibold">
            <td className={cella}>{r.avanzo >= 0 ? "Avanzo" : "Disavanzo"} di gestione dell'esercizio (A − B)</td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.avanzo)}</td>
          </tr>

          <tr className={`${sezione} border-b border-stone-300 text-xs uppercase tracking-wide text-stone-600`}>
            <td className={`${cella} font-semibold`} colSpan={2}>C) Situazione delle disponibilità liquide</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={cella}>Saldo iniziale al 1° gennaio {intestazione.esercizio} <span className="text-xs text-stone-400">(cassa {eur(saldiIniziali.cassa)} · banca {eur(saldiIniziali.banca)})</span></td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.saldoIniziale)}</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={cella}>{r.avanzo >= 0 ? "Avanzo" : "Disavanzo"} di gestione dell'esercizio</td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.avanzo)}</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={`${cella} pl-6 text-stone-500`}>di cui: cassa contanti al 31 dicembre</td>
            <td className={`${cella} text-right tabular-nums text-stone-500`}>{eur(r.finaleCassa)}</td>
          </tr>
          <tr className="border-b border-stone-100">
            <td className={`${cella} pl-6 text-stone-500`}>di cui: conto corrente al 31 dicembre</td>
            <td className={`${cella} text-right tabular-nums text-stone-500`}>{eur(r.finaleBanca)}</td>
          </tr>
          <tr className="border-t-2 border-[#1b2a4a] font-bold">
            <td className={cella}>Saldo finale al 31 dicembre {intestazione.esercizio}</td>
            <td className={`${cella} text-right tabular-nums`}>{eur(r.saldoFinale)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FormIntestazione({ intestazione, azioni }) {
  const [form, setForm] = useState(intestazione);
  const [salvata, setSalvata] = useState(false);

  // Risincronizza solo quando i VALORI cambiano davvero (non a ogni aggiornamento
  // periodico), così non si perde il testo in corso di digitazione.
  useEffect(() => {
    setForm({ gruppo: intestazione.gruppo, citta: intestazione.citta, esercizio: intestazione.esercizio });
  }, [intestazione.gruppo, intestazione.citta, intestazione.esercizio]);

  const salva = async () => {
    const ok = await azioni.salvaConfig({
      intestazione: { ...form, esercizio: parseInt(form.esercizio) || intestazione.esercizio },
    });
    if (ok) {
      setSalvata(true);
      setTimeout(() => setSalvata(false), 2500);
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Intestazione dei documenti</h2>
      <p className="mt-1 text-xs text-stone-500">Compare in testa al rendiconto e al registro stampati.</p>
      <div className="mt-3 space-y-3">
        <div>
          <label className={stileLabel}>Nome del gruppo</label>
          <input type="text" value={form.gruppo} onChange={(e) => setForm({ ...form, gruppo: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Città</label>
          <input type="text" value={form.citta} onChange={(e) => setForm({ ...form, citta: e.target.value })} className={stileCampo} />
        </div>
        <div>
          <label className={stileLabel}>Esercizio (anno)</label>
          <input type="number" value={form.esercizio} onChange={(e) => setForm({ ...form, esercizio: e.target.value })} className={stileCampo} />
        </div>
        <button onClick={salva} className="w-full rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white">
          Salva intestazione
        </button>
        {salvata && <p className="text-xs font-medium text-emerald-700">✓ Intestazione salvata</p>}
      </div>
    </div>
  );
}

function TestataStampa({ intestazione, titolo }) {
  return (
    <div className="mb-6 border-b-2 border-[#1b2a4a] pb-4 text-center">
      <div className="text-xs uppercase tracking-[0.25em] text-stone-500">Federazione dello Scautismo Europeo</div>
      <div className="mt-1 font-serif text-2xl font-semibold text-[#1b2a4a]">{intestazione.gruppo}</div>
      <div className="text-sm text-stone-600">{intestazione.citta}</div>
      <div className="mt-3 font-serif text-lg">{titolo}</div>
      <div className="text-sm text-stone-600">Esercizio finanziario 1° gennaio – 31 dicembre {intestazione.esercizio}</div>
    </div>
  );
}

function FirmeStampa() {
  return (
    <div className="mt-12 grid grid-cols-2 gap-12 text-center text-sm">
      <div>
        <div className="mb-10 text-stone-600">Il Tesoriere</div>
        <div className="border-t border-stone-400 pt-1 text-xs text-stone-400">firma</div>
      </div>
      <div>
        <div className="mb-10 text-stone-600">Il Capo Gruppo</div>
        <div className="border-t border-stone-400 pt-1 text-xs text-stone-400">firma</div>
      </div>
    </div>
  );
}

function PannelloBackup({ state, azioni }) {
  const inputRef = useRef(null);
  const [esito, setEsito] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  const esporta = () => {
    const dati = {
      tipo: "backup-contabilita-fse",
      versione: 2,
      esportatoIl: new Date().toISOString(),
      config: {
        intestazione: state.intestazione,
        saldiIniziali: state.saldiIniziali,
        categorie: state.categorie,
        quotaAnnuale: state.quotaAnnuale,
      },
      movimenti: state.movimenti,
      soci: state.soci,
    };
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-contabilita-fse-${oggi()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setEsito({ tipo: "ok", testo: "Backup esportato: conserva il file in un luogo sicuro." });
  };

  const importa = (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dati = JSON.parse(reader.result);
        if (!dati || dati.tipo !== "backup-contabilita-fse") throw new Error("formato");
        const conferma = window.confirm(
          "L'importazione SOSTITUISCE tutti i dati attuali (movimenti, soci, impostazioni) con quelli del backup. Procedere?"
        );
        if (!conferma) { input.value = ""; return; }
        setInCorso(true);
        const ok = await azioni.importaBackup(dati);
        setInCorso(false);
        setEsito(ok ? { tipo: "ok", testo: "Backup importato correttamente." } : null);
      } catch {
        setEsito({ tipo: "errore", testo: "File non valido: seleziona un backup esportato da questa applicazione." });
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="font-serif text-lg text-[#1b2a4a]">Backup dei dati</h2>
      <p className="mt-1 text-xs text-stone-500">
        Esporta tutti i dati (movimenti, soci, impostazioni) in un file da conservare o da passare
        a un altro computer, dove potrà essere importato.
      </p>
      <div className="mt-3 space-y-2">
        <button onClick={esporta}
          className="w-full rounded-md border border-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-[#1b2a4a] hover:bg-stone-50">
          Esporta backup (file JSON)
        </button>
        <button onClick={() => inputRef.current && inputRef.current.click()} disabled={inCorso}
          className="w-full rounded-md border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60">
          {inCorso ? "Importazione…" : "Importa backup…"}
        </button>
        <input ref={inputRef} type="file" accept=".json,application/json" onChange={importa} className="hidden" />
      </div>
      {esito && (
        <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${
          esito.tipo === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          {esito.testo}
        </div>
      )}
      <p className="mt-3 text-xs text-stone-400">
        Attenzione: l'importazione sostituisce integralmente i dati presenti.
      </p>
    </div>
  );
}

function SchedaRendiconto({ state, azioni, avviaStampa }) {
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
            <button onClick={() => avviaStampa("rendiconto")}
              className="w-full rounded-md bg-[#1b2a4a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#27395f]">
              Stampa / PDF — Rendiconto annuale
            </button>
            <button onClick={() => avviaStampa("registro")}
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

// ---------------- Documenti di stampa ----------------

function StampaRendiconto({ state }) {
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

function StampaRegistro({ state }) {
  const { movimenti, saldiIniziali, intestazione } = state;
  const righe = righeConProgressivo(movimenti, saldiIniziali);
  return (
    <div className="p-8">
      <TestataStampa intestazione={intestazione} titolo="Registro dei movimenti di cassa (prima nota)" />
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-stone-400 text-left uppercase tracking-wide text-stone-600">
            <th className="px-2 py-1.5 font-medium">Data</th>
            <th className="px-2 py-1.5 font-medium">Descrizione</th>
            <th className="px-2 py-1.5 font-medium">Categoria</th>
            <th className="px-2 py-1.5 font-medium">Metodo</th>
            <th className="px-2 py-1.5 text-right font-medium">Entrate</th>
            <th className="px-2 py-1.5 text-right font-medium">Uscite</th>
            <th className="px-2 py-1.5 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-stone-200 italic text-stone-500">
            <td className="px-2 py-1.5">01/01</td>
            <td className="px-2 py-1.5" colSpan={5}>Saldo iniziale d'esercizio (cassa + banca)</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{eur(saldiIniziali.cassa + saldiIniziali.banca)}</td>
          </tr>
          {righe.map((m) => (
            <tr key={m.id} className="border-b border-stone-200">
              <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{dataIT(m.data)}</td>
              <td className="px-2 py-1.5">{m.descrizione}{m.attivita ? ` (${m.attivita})` : ""}</td>
              <td className="px-2 py-1.5">{m.categoria}</td>
              <td className="px-2 py-1.5">{m.metodo}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{m.tipo === "entrata" ? eur(m.importo) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{m.tipo === "uscita" ? eur(m.importo) : ""}</td>
              <td className="px-2 py-1.5 text-right font-medium tabular-nums">{eur(m.progressivo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <FirmeStampa />
    </div>
  );
}

// ---------------- App ----------------

const SCHEDE = [
  { id: "movimenti", nome: "Prima nota" },
  { id: "soci", nome: "Soci e quote" },
  { id: "categorie", nome: "Categorie" },
  { id: "rendiconto", nome: "Rendiconto e stampa" },
];

export default function App() {
  const [state, azioni] = useContabilita();
  const { movimenti, saldiIniziali, intestazione, categorie, soci, quotaAnnuale } = state;
  const [scheda, setScheda] = useState("movimenti");
  const [stampa, setStampa] = useState(null);
  const [aggiornamentoManuale, setAggiornamentoManuale] = useState(false);

  useEffect(() => {
    if (!stampa) return;
    const t = setTimeout(() => {
      window.print();
      setStampa(null);
    }, 150);
    return () => clearTimeout(t);
  }, [stampa]);

  const totali = useMemo(() => {
    let entrate = 0, uscite = 0, deltaCassa = 0, deltaBanca = 0;
    for (const m of movimenti) {
      const segno = m.tipo === "entrata" ? 1 : -1;
      if (m.tipo === "entrata") entrate += m.importo; else uscite += m.importo;
      if (m.metodo === "Cassa") deltaCassa += segno * m.importo;
      else deltaBanca += segno * m.importo;
    }
    return {
      entrate, uscite,
      saldoCassa: saldiIniziali.cassa + deltaCassa,
      saldoBanca: saldiIniziali.banca + deltaBanca,
    };
  }, [movimenti, saldiIniziali]);

  const saldoTotale = totali.saldoCassa + totali.saldoBanca;
  const avanzo = totali.entrate - totali.uscite;

  if (state.caricamento) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#1b2a4a]"></div>
          <div className="mt-3 text-sm text-stone-500">Caricamento dell'archivio del gruppo…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee] font-sans text-stone-800 print:bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@500;600&display=swap');
        .font-serif { font-family: 'Source Serif 4', Georgia, serif; }
        .vista-stampa { display: none; }
        @media print {
          .app-interattiva { display: none !important; }
          .vista-stampa { display: block !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="vista-stampa">
        {stampa === "rendiconto" && <StampaRendiconto state={state} />}
        {stampa === "registro" && <StampaRegistro state={state} />}
      </div>

      <div className="app-interattiva">
        <header className="border-b-4 border-[#1b2a4a] bg-white">
          <div className="mx-auto max-w-5xl px-5 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-400">
                  Registro di contabilità finanziaria · Esercizio {intestazione.esercizio}
                </div>
                <h1 className="mt-1 font-serif text-2xl font-semibold text-[#1b2a4a]">{intestazione.gruppo}</h1>
                <div className="text-sm text-stone-500">
                  {intestazione.citta ? `${intestazione.citta} — ` : ""}Federazione dello Scautismo Europeo
                </div>
              </div>
              {state.modalita === "condiviso" && (
                <button
                  onClick={async () => {
                    setAggiornamentoManuale(true);
                    await azioni.ricarica();
                    setAggiornamentoManuale(false);
                  }}
                  disabled={aggiornamentoManuale}
                  className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
                  title="Ricarica i dati dall'archivio per vedere le modifiche degli altri utenti">
                  {aggiornamentoManuale ? "Aggiornamento…" : "↻ Aggiorna dati"}
                </button>
              )}
            </div>

            <nav className="mt-4 flex flex-wrap gap-1">
              {SCHEDE.map((t) => (
                <button key={t.id} onClick={() => setScheda(t.id)}
                  className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                    scheda === t.id
                      ? "border border-b-0 border-stone-200 bg-[#f5f3ee] text-[#1b2a4a]"
                      : "text-stone-500 hover:text-[#1b2a4a]"
                  }`}>
                  {t.nome}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">
          {state.modalita === "memoria" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠ Nessun archivio disponibile in questo ambiente: l'applicazione funziona in sola memoria
              e i dati andranno persi alla chiusura. Usa "Esporta backup" per salvarli su file.
            </div>
          )}
          {state.modalita === "locale" && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
              💾 I dati vengono salvati automaticamente in questo browser, su questo computer, e li ritroverai
              alla riapertura del file. Per passarli a un'altra persona usa Esporta/Importa backup nella scheda
              "Rendiconto e stampa"; per lavorare in due contemporaneamente serve la versione condivisa su Claude.
            </div>
          )}
          {state.errore && (
            <div className="flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>⚠ {state.errore}</span>
              <button onClick={azioni.pulisciErrore} className="ml-3 text-red-800 underline underline-offset-2">Chiudi</button>
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CardSaldo etichetta="Saldo cassa" valore={totali.saldoCassa} sotto="Contanti" />
            <CardSaldo etichetta="Saldo banca" valore={totali.saldoBanca} sotto="Bonifico e altro" />
            <CardSaldo etichetta="Avanzo / disavanzo" valore={avanzo}
              sotto={`Entrate ${eur(totali.entrate)} · Uscite ${eur(totali.uscite)}`} />
            <CardSaldo etichetta="Saldo totale" valore={saldoTotale} tono="blu" sotto="Cassa + banca" />
          </section>

          {scheda === "movimenti" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="space-y-6 lg:col-span-2">
                <FormMovimento categorie={categorie} onAggiungi={azioni.aggiungiMovimento} />
                <SaldiIniziali saldi={saldiIniziali} onSalva={azioni.salvaConfig} />
              </div>
              <div className="lg:col-span-3">
                <h2 className="mb-3 font-serif text-lg text-[#1b2a4a]">Registro movimenti (prima nota)</h2>
                <RegistroMovimenti movimenti={movimenti} soci={soci} saldiIniziali={saldiIniziali}
                  onElimina={azioni.eliminaMovimento} />
              </div>
            </div>
          )}

          {scheda === "soci" && (
            <GestioneSoci soci={soci} movimenti={movimenti} quotaAnnuale={quotaAnnuale}
              esercizio={intestazione.esercizio} azioni={azioni} />
          )}

          {scheda === "categorie" && (
            <GestioneCategorie categorie={categorie} movimenti={movimenti} azioni={azioni} />
          )}

          {scheda === "rendiconto" && (
            <SchedaRendiconto state={state} azioni={azioni} avviaStampa={setStampa} />
          )}

          <footer className="pb-6 pt-2 text-center text-xs text-stone-400">
            {state.modalita === "condiviso"
              ? "I dati sono salvati automaticamente nell'archivio condiviso del gruppo"
              : state.modalita === "locale"
              ? "I dati sono salvati automaticamente su questo computer"
              : "Modalità memoria: i dati non vengono salvati alla chiusura"}
            {state.ultimaSincronizzazione &&
              ` · Ultimo aggiornamento: ${state.ultimaSincronizzazione.toLocaleTimeString("it-IT")}`}
          </footer>
        </main>
      </div>
    </div>
  );
}

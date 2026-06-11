declare global {
  interface Window {
    storage?: {
      get: (key: string, shared: boolean) => Promise<{ value: string } | null>;
      set: (key: string, value: string, shared: boolean) => Promise<boolean>;
      delete: (key: string, shared: boolean) => Promise<void>;
      list: (prefix: string, shared: boolean) => Promise<{ keys: string[] } | null>;
    };
  }
}

const condivisoDisponibile = () =>
  typeof window !== 'undefined' &&
  !!window.storage &&
  typeof window.storage.get === 'function';

const localeDisponibile = () => {
  try {
    const t = '__fse_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
};

export let modalitaRilevata: 'condiviso' | 'locale' | 'memoria' | null = null;

export async function rilevaModalita(): Promise<'condiviso' | 'locale' | 'memoria'> {
  if (modalitaRilevata) return modalitaRilevata;
  if (condivisoDisponibile()) {
    try {
      await window.storage!.set('verifica', JSON.stringify({ t: Date.now() }), true);
      modalitaRilevata = 'condiviso';
      return modalitaRilevata;
    } catch {
      // non scrivibile, degrada
    }
  }
  modalitaRilevata = localeDisponibile() ? 'locale' : 'memoria';
  return modalitaRilevata;
}

const LS_PREFISSO = 'fse-contabilita.';

const ArchivioCondiviso = {
  async leggi(chiave: string) {
    try {
      const r = await window.storage!.get(chiave, true);
      return r ? JSON.parse(r.value) : null;
    } catch {
      return null;
    }
  },
  async scrivi(chiave: string, valore: unknown) {
    const r = await window.storage!.set(chiave, JSON.stringify(valore), true);
    if (!r) throw new Error('scrittura fallita');
  },
  async elimina(chiave: string) {
    try { await window.storage!.delete(chiave, true); } catch { /* già assente */ }
  },
  async elenco(prefisso: string): Promise<string[]> {
    try {
      const r = await window.storage!.list(prefisso, true);
      return r?.keys || [];
    } catch {
      return [];
    }
  },
};

const ArchivioLocale = {
  async leggi(chiave: string) {
    try {
      const v = window.localStorage.getItem(LS_PREFISSO + chiave);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  async scrivi(chiave: string, valore: unknown) {
    window.localStorage.setItem(LS_PREFISSO + chiave, JSON.stringify(valore));
  },
  async elimina(chiave: string) {
    try { window.localStorage.removeItem(LS_PREFISSO + chiave); } catch { /* già assente */ }
  },
  async elenco(prefisso: string): Promise<string[]> {
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(LS_PREFISSO + prefisso)) out.push(k.slice(LS_PREFISSO.length));
    }
    return out;
  },
};

export const Archivio = {
  _backend() {
    const m = modalitaRilevata || 'locale';
    return m === 'condiviso' ? ArchivioCondiviso : ArchivioLocale;
  },
  leggi(chiave: string) { return this._backend().leggi(chiave); },
  scrivi(chiave: string, valore: unknown) { return this._backend().scrivi(chiave, valore); },
  elimina(chiave: string) { return this._backend().elimina(chiave); },
  elenco(prefisso: string) { return this._backend().elenco(prefisso); },
  async scriviConRetry(chiave: string, valore: unknown, tentativi = 2) {
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
  async leggiTutti(prefisso: string) {
    const chiavi = await this.elenco(prefisso);
    const valori = await Promise.all(chiavi.map((k) => this.leggi(k)));
    return valori.filter(Boolean);
  },
};

import React, { useState, useMemo, useEffect } from 'react';
import { useContabilita } from './hooks/useContabilita';
import { SCHEDE, SchedaId } from './constants';
import { eur } from './utils';
import { CardSaldo } from './components/CardSaldo';
import { FormMovimento } from './components/movimenti/FormMovimento';
import { SaldiIniziali } from './components/movimenti/SaldiIniziali';
import { RegistroMovimenti } from './components/movimenti/RegistroMovimenti';
import { GestioneSoci } from './components/soci/GestioneSoci';
import { GestioneCategorie } from './components/categorie/GestioneCategorie';
import { SchedaRendiconto } from './components/rendiconto/SchedaRendiconto';
import { StampaRendiconto } from './components/stampa/StampaRendiconto';
import { StampaRegistro } from './components/stampa/StampaRegistro';

function App() {
  const [state, azioni] = useContabilita();
  const { movimenti, saldiIniziali, intestazione, categorie, soci, quotaAnnuale } = state;
  const [scheda, setScheda] = useState<SchedaId>('movimenti');
  const [stampa, setStampa] = useState<'rendiconto' | 'registro' | null>(null);
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
      const segno = m.tipo === 'entrata' ? 1 : -1;
      if (m.tipo === 'entrata') entrate += m.importo; else uscite += m.importo;
      if (m.metodo === 'Cassa') deltaCassa += segno * m.importo;
      else deltaBanca += segno * m.importo;
    }
    return {
      entrate,
      uscite,
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
        {stampa === 'rendiconto' && <StampaRendiconto state={state} />}
        {stampa === 'registro' && <StampaRegistro state={state} />}
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
                  {intestazione.citta ? `${intestazione.citta} — ` : ''}Federazione dello Scautismo Europeo
                </div>
              </div>
              {state.modalita === 'condiviso' && (
                <button
                  onClick={async () => {
                    setAggiornamentoManuale(true);
                    await azioni.ricarica();
                    setAggiornamentoManuale(false);
                  }}
                  disabled={aggiornamentoManuale}
                  className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
                  title="Ricarica i dati dall'archivio per vedere le modifiche degli altri utenti">
                  {aggiornamentoManuale ? 'Aggiornamento…' : '↻ Aggiorna dati'}
                </button>
              )}
            </div>

            <nav className="mt-4 flex flex-wrap gap-1">
              {SCHEDE.map((t) => (
                <button key={t.id} onClick={() => setScheda(t.id)}
                  className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                    scheda === t.id
                      ? 'border border-b-0 border-stone-200 bg-[#f5f3ee] text-[#1b2a4a]'
                      : 'text-stone-500 hover:text-[#1b2a4a]'
                  }`}>
                  {t.nome}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">
          {state.modalita === 'memoria' && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠ Nessun archivio disponibile in questo ambiente: l'applicazione funziona in sola memoria
              e i dati andranno persi alla chiusura. Usa "Esporta backup" per salvarli su file.
            </div>
          )}
          {state.errore && (
            <div className="flex items-center justify-between rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>⚠ {state.errore}</span>
              <button onClick={azioni.pulisciErrore} className="ml-3 text-red-800 underline underline-offset-2">
                Chiudi
              </button>
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <CardSaldo etichetta="Saldo cassa" valore={totali.saldoCassa} sotto="Contanti" />
            <CardSaldo etichetta="Saldo banca" valore={totali.saldoBanca} sotto="Bonifico e altro" />
            <CardSaldo etichetta="Avanzo / disavanzo" valore={avanzo}
              sotto={`Entrate ${eur(totali.entrate)} · Uscite ${eur(totali.uscite)}`} />
            <CardSaldo etichetta="Saldo totale" valore={saldoTotale} tono="blu" sotto="Cassa + banca" />
          </section>

          {scheda === 'movimenti' && (
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

          {scheda === 'soci' && (
            <GestioneSoci soci={soci} movimenti={movimenti} quotaAnnuale={quotaAnnuale}
              esercizio={intestazione.esercizio} azioni={azioni} />
          )}

          {scheda === 'categorie' && (
            <GestioneCategorie categorie={categorie} movimenti={movimenti} azioni={azioni} />
          )}

          {scheda === 'rendiconto' && (
            <SchedaRendiconto state={state} azioni={azioni} avviaStampa={setStampa} />
          )}

          <footer className="pb-6 pt-2 text-center text-xs text-stone-400">
            {state.modalita === 'condiviso'
              ? 'I dati sono salvati automaticamente nell\'archivio condiviso del gruppo'
              : state.modalita === 'locale'
              ? 'I dati sono salvati automaticamente su questo computer'
              : 'Modalità memoria: i dati non vengono salvati alla chiusura'}
            {state.ultimaSincronizzazione &&
              ` · Ultimo aggiornamento: ${state.ultimaSincronizzazione.toLocaleTimeString('it-IT')}`}
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;

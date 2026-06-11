import React, { useState, useMemo, useEffect } from 'react';
import { Socio, Movimento, Azioni } from '../../types';
import { UNITA } from '../../mocks';
import { eur, dataIT, parseImporto, stileCampo } from '../../utils';
import { FormSocio } from './FormSocio';
import { RegistraQuota } from './RegistraQuota';

interface Props {
  soci: Socio[];
  movimenti: Movimento[];
  quotaAnnuale: number;
  esercizio: number;
  azioni: Azioni;
}

export function GestioneSoci({ soci, movimenti, quotaAnnuale, esercizio, azioni }: Props) {
  const [filtroUnita, setFiltroUnita] = useState('Tutte');
  const [quotaInCorso, setQuotaInCorso] = useState<string | null>(null);
  const [nuovaQuota, setNuovaQuota] = useState(String(quotaAnnuale).replace('.', ','));
  const [quotaSalvata, setQuotaSalvata] = useState(false);

  useEffect(() => { setNuovaQuota(String(quotaAnnuale).replace('.', ',')); }, [quotaAnnuale]);

  const quotePagate = useMemo(() => {
    const mappa = new Map<string, Movimento>();
    for (const m of movimenti) {
      if (m.tipo === 'entrata' && m.categoria === 'Quote associative' && m.socioId)
        mappa.set(m.socioId, m);
    }
    return mappa;
  }, [movimenti]);

  const filtrati = useMemo(() => {
    const lista = filtroUnita === 'Tutte' ? soci : soci.filter((s) => s.unita === filtroUnita);
    return [...lista].sort((a, b) =>
      a.unita === b.unita
        ? a.cognome.localeCompare(b.cognome)
        : UNITA.indexOf(a.unita) - UNITA.indexOf(b.unita)
    );
  }, [soci, filtroUnita]);

  const pagati = soci.filter((s) => quotePagate.has(s.id)).length;
  const incassato = [...quotePagate.values()].reduce((t, m) => t + m.importo, 0);

  const registraQuota = async (socio: Socio, { data, importo, metodo }: { data: string; importo: number; metodo: string }) => {
    const ok = await azioni.aggiungiMovimento({
      tipo: 'entrata',
      data,
      categoria: 'Quote associative',
      descrizione: `Quota associativa ${esercizio} — ${socio.nome} ${socio.cognome}`,
      importo,
      metodo,
      attivita: '',
      socioId: socio.id,
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
          <p className="mt-1 text-xs text-stone-500">
            Importo proposto al momento dell'incasso (modificabile caso per caso).
          </p>
          <div className="mt-3 flex gap-2">
            <input type="text" inputMode="decimal" value={nuovaQuota}
              onChange={(e) => setNuovaQuota(e.target.value)} className={stileCampo} />
            <button onClick={salvaQuotaAnnuale} disabled={parseImporto(nuovaQuota) <= 0}
              className="shrink-0 rounded-md bg-[#1b2a4a] px-4 py-2 text-sm text-white disabled:opacity-50">
              Salva
            </button>
          </div>
          {parseImporto(nuovaQuota) <= 0 && nuovaQuota !== '' && (
            <p className="mt-2 text-xs text-amber-700">
              Inserisci un importo valido maggiore di zero (es. 40 oppure 40,00).
            </p>
          )}
          {quotaSalvata && (
            <p className="mt-2 text-xs font-medium text-emerald-700">✓ Quota di riferimento salvata</p>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-serif text-lg text-[#1b2a4a]">Situazione quote {esercizio}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Soci censiti</span>
              <span className="font-medium tabular-nums">{soci.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Quote versate</span>
              <span className="font-medium tabular-nums text-emerald-700">{pagati}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">In sospeso</span>
              <span className="font-medium tabular-nums text-amber-700">{soci.length - pagati}</span>
            </div>
            <div className="flex justify-between border-t border-stone-100 pt-2">
              <span className="text-stone-500">Totale incassato</span>
              <span className="font-semibold tabular-nums">{eur(incassato)}</span>
            </div>
          </div>
          {soci.length > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${(pagati / soci.length) * 100}%` }}
              />
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
                    <React.Fragment key={s.id}>
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
                        <RegistraQuota
                          socio={s}
                          quotaAnnuale={quotaAnnuale}
                          onConferma={(dati) => registraQuota(s, dati)}
                          onAnnulla={() => setQuotaInCorso(null)}
                        />
                      )}
                    </React.Fragment>
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

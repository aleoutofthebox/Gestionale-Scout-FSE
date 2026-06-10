# Gestionale Contabilità — Gruppo Scout FSE

Applicazione web di contabilità finanziaria (entrate/uscite per cassa) per un Gruppo Scout FSE.
Funziona interamente nel browser: **nessun server, nessun database, nessuna installazione**.

## Funzionalità

- **Prima nota**: registrazione di entrate e uscite (data, categoria, descrizione, importo, metodo di pagamento, attività/evento) con saldo progressivo, saldo cassa e saldo banca in tempo reale
- **Soci e quote**: anagrafica soci per unità (Branco, Cerchio, Riparto, Clan, Fuoco, Capi) con tracciamento della quota annuale; l'incasso della quota genera automaticamente il movimento in prima nota
- **Categorie**: piano dei conti FSE predefinito + categorie personalizzabili
- **Rendiconto annuale per cassa**: prospetto A/B/C coerente con la logica del Mod. D (art. 13, co. 2, D.Lgs. 117/2017) con avanzo/disavanzo e riconciliazione delle disponibilità liquide
- **Stampa/PDF**: rendiconto e registro movimenti con intestazione personalizzabile e righe firma
- **Backup**: esportazione e importazione di tutti i dati in file JSON

## Salvataggio dei dati

I dati si salvano **automaticamente nel browser** (localStorage) e restano disponibili
alla riapertura **sullo stesso browser e sullo stesso computer**.

Importante:
- browser diversi o computer diversi hanno archivi separati;
- cancellando i dati di navigazione del sito si perde l'archivio;
- per passare i dati a un'altra persona o fare una copia di sicurezza, usare
  **Esporta/Importa backup** nella scheda "Rendiconto e stampa".

## Pubblicazione su GitHub Pages

1. Creare un repository su GitHub (es. `gestionale-scout-fse`)
2. Caricare i file `index.html` e `README.md` nel ramo `main`
3. Andare su **Settings → Pages**
4. In **Source** scegliere **Deploy from a branch**, ramo `main`, cartella `/ (root)`, e salvare
5. Dopo 1–2 minuti il sito sarà online all'indirizzo
   `https://TUO-UTENTE.github.io/gestionale-scout-fse/`

Nota: con il piano gratuito di GitHub, Pages richiede un repository **pubblico**
(il codice sarà visibile a chiunque; i dati contabili invece NON sono nel repository,
restano solo nel browser di chi usa l'app).

## Uso in locale senza GitHub

È sufficiente scaricare `index.html` e aprirlo con doppio clic in un browser
(serve la connessione internet al primo avvio per caricare le librerie).

## Requisiti tecnici

Nessuna build: il file usa React 18, Babel standalone e Tailwind CSS da CDN.
Tutto il codice dell'applicazione è contenuto in `index.html`.

## Licenza

Uso libero per gruppi scout e associazioni senza scopo di lucro.

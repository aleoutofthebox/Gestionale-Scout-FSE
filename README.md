# Gestionale Contabilità — Gruppo Scout FSE

Applicazione web di contabilità finanziaria (entrate/uscite per cassa) per un Gruppo Scout FSE.
Funziona interamente nel browser: **nessun server, nessun database**.

## Funzionalità

- **Prima nota** — registrazione di entrate e uscite (data, categoria, descrizione, importo, metodo di pagamento,
  attività/evento) con saldo progressivo, saldo cassa e saldo banca in tempo reale
- **Soci e quote** — anagrafica soci per unità (Branco, Cerchio, Riparto, Clan, Fuoco, Capi) con tracciamento della
  quota annuale; l'incasso della quota genera automaticamente il movimento in prima nota
- **Categorie** — piano dei conti FSE predefinito + categorie personalizzabili
- **Rendiconto annuale per cassa** — prospetto A/B/C coerente con la logica del Mod. D (art. 13, co. 2, D.Lgs. 117/2017)
  con avanzo/disavanzo e riconciliazione delle disponibilità liquide
- **Stampa / PDF** — rendiconto e registro movimenti con intestazione personalizzabile e righe firma
- **Backup** — esportazione e importazione di tutti i dati in file JSON

---

## Guida per iniziare (da zero)

Questa sezione spiega come mettere in funzione il progetto su un computer nuovo,
anche senza esperienza di programmazione.

### 1. Installa un editor di codice

Scarica e installa **WebStorm** (a pagamento, consigliato) oppure **Visual Studio Code** (gratuito):

- WebStorm: https://www.jetbrains.com/webstorm/
- Visual Studio Code: https://code.visualstudio.com/

### 2. Installa nvm (gestore delle versioni di Node.js)

**nvm** permette di installare e gestire Node.js senza interferire con il resto del sistema.

**Mac / Linux** — apri il Terminale e incolla questo comando:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Chiudi il Terminale e riaprilo (serve per rendere effettivo il comando `nvm`).

**Windows** — scarica e installa **nvm-windows**:
https://github.com/coreybutler/nvm-windows/releases

> **Cos'è il Terminale?**
> Su Mac si trova in Applicazioni → Utility → Terminale.
> Su Windows si chiama "Prompt dei comandi" o "PowerShell" e si cerca nel menu Start.

### 3. Installa Node.js

Node.js è l'ambiente che permette di far girare gli strumenti di sviluppo sul tuo computer.

Nel Terminale, digita:

```bash
nvm install 22
nvm use 22
```

Verifica che tutto sia andato a buon fine con:

```bash
node --version
```

Dovresti vedere un numero che inizia con `v22.`.

### 4. Scarica il progetto

Se hai **Git** installato, dal Terminale:

```bash
git clone https://github.com/TUO-UTENTE/gestionale-scout-fse.git
cd gestionale-scout-fse
```

In alternativa, dalla pagina GitHub del progetto clicca **Code → Download ZIP**, decomprimi il file
e apri la cartella con il tuo editor.

### 5. Installa le dipendenze

Entra nella cartella del progetto dal Terminale (se non l'hai già fatto) e digita:

```bash
npm install
```

Questo comando scarica tutte le librerie necessarie. Ci vorrà qualche minuto la prima volta.

### 6. Avvia l'applicazione

```bash
npm run dev
```

Il Terminale mostrerà un indirizzo, tipicamente `http://localhost:5173`.
Aprilo nel browser: vedrai l'applicazione funzionante.

Ogni modifica salvata nell'editor si riflette **in tempo reale** nel browser, senza dover ricaricare la pagina.

Per fermare il server premi `Ctrl + C` nel Terminale.

---

## Salvataggio dei dati

L'app rileva automaticamente la modalità di archiviazione disponibile:

| Modalità      | Quando si attiva                                          | Persistenza                                                |
|---------------|-----------------------------------------------------------|------------------------------------------------------------|
| **Condivisa** | App aperta come artifact in Claude (API `window.storage`) | Condivisa tra tutti gli utenti, sincronizzazione ogni 25 s |
| **Locale**    | Browser con localStorage disponibile                      | Sul browser/computer corrente                              |
| **Memoria**   | Nessun archivio disponibile                               | Solo per la sessione corrente                              |

In modalità locale, i dati sono legati al browser e al computer in uso: browser diversi o cancellazione dei dati di
navigazione azzerano l'archivio. Per trasferire i dati o fare una copia di sicurezza usare **Esporta/Importa backup**
nella scheda "Rendiconto e stampa".

## Struttura del progetto

```
src/
├── types.ts                        — interfacce TypeScript
├── constants.ts                    — costanti UI (schede di navigazione)
├── utils.ts                        — funzioni di utilità (formattazione, parsing)
├── storage.ts                      — livello di persistenza (condiviso / localStorage)
├── mocks/
│   └── index.ts                    — dati di default (categorie, config, metodi, unità)
├── hooks/
│   └── useContabilita.ts           — stato globale e azioni (reducer + sync archivio)
├── components/
│   ├── CardSaldo.tsx
│   ├── movimenti/                  — FormMovimento, SaldiIniziali, RegistroMovimenti
│   ├── soci/                       — FormSocio, RegistraQuota, GestioneSoci
│   ├── categorie/                  — ColonnaCategorie, GestioneCategorie
│   ├── rendiconto/                 — calcolo, ProspettoRendiconto, FormIntestazione, SchedaRendiconto
│   ├── stampa/                     — TestataStampa, FirmeStampa, StampaRendiconto, StampaRegistro
│   └── backup/                     — PannelloBackup
└── App.tsx
```

## Comandi utili

```bash
npm run dev      # avvia il server di sviluppo su http://localhost:5173
npm run build    # type-check + build di produzione nella cartella dist/
npm run preview  # anteprima della build locale
npm run lint     # controlla il codice con ESLint
npm run format   # formatta automaticamente il codice con Prettier
```

## Pubblicazione su GitHub Pages

1. Eseguire la build: `npm run build`
2. Caricare il contenuto della cartella `dist/` nel ramo `gh-pages` (o usare il pacchetto `gh-pages`)
3. In **Settings → Pages** del repository scegliere il ramo `gh-pages`, cartella `/ (root)`, e salvare
4. Dopo 1–2 minuti il sito sarà online su `https://TUO-UTENTE.github.io/gestionale-scout-fse/`

> Con il piano gratuito di GitHub, Pages richiede un repository **pubblico**. I dati contabili non sono nel repository:
> restano solo nel browser di chi usa l'app.

## Requisiti tecnici

- Node.js 22+
- React 19, TypeScript 6, Vite 8, Tailwind CSS 3
- ESLint 10 (flat config) + Prettier 3
- Nessun backend — tutto il codice gira nel browser

## Licenza

Uso libero per gruppi scout e associazioni senza scopo di lucro.

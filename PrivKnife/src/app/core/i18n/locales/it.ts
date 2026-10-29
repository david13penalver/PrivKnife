import { TranslationSchema } from './en';

export const it: TranslationSchema = {
  common: {
    brandName: 'PrivKnife',
    tagline: 'Cassetta degli Attrezzi Privata nel Browser',
    privacyBadge: '🛡️ 100% nel Browser • Non Lascia Mai il Tuo Dispositivo',
    inBrowserBadge: '100% nel Browser',
    zeroServerNotice: 'Zero Ingestione Server • Zero Telemetria',
    themeLight: '☀️ Chiaro',
    themeDark: '🌙 Scuro',
    switchToLight: 'Passa alla modalità chiara',
    switchToDark: 'Passa alla modalità scura',
    selectLanguage: 'Seleziona lingua',
    download: 'Scarica',
    copy: 'Copia',
    copied: '✓ Copiato!',
    reset: 'Ripristina',
    clear: 'Cancella',
    cancel: 'Annulla',
    close: 'Chiudi',
    done: 'Fatto',
    loading: 'Caricamento...',
    processing: 'Elaborazione in corso...',
    error: 'Errore',
    dropFilesPrompt: 'Trascina i tuoi file qui, o sfoglia',
    offlineGuarantee: 'Elaborato al 100% in locale senza upload su server',
    preview: 'Anteprima',
    settings: 'Impostazioni',
    options: 'Opzioni',
    save: 'Salva',
    undo: 'Annulla',
    readyToUse: 'Pronto all\'Uso',
    roadmap: 'In Sviluppo',
    comingSoon: 'Prossimamente',
    openTool: 'Apri Strumento',
    clearFilters: 'Cancella Filtri',
    guaranteedClientSide: 'Garantito Lato Client',
    verifiableOpenSource: 'Verificabile & Open Source',
  },
  header: {
    title: 'PrivKnife',
    tagline: 'Cassetta degli Attrezzi Privata nel Browser',
    languageSelectAria: 'Seleziona la lingua dell\'applicazione',
  },
  home: {
    heroTitle: 'Strumenti Quotidiani Consolidati.',
    heroSubtitle: 'Nessun Server di Backend. Zero Telemetria. 100% Lato Client.',
    heroBadge: '🛡️ 100% nel Browser • Zero Ingestione Server • Zero Telemetria',
    heroHeadingStart: 'Il Coltellino Svizzero',
    heroHeadingHighlight: 'Privato nel Browser',
    heroDescription:
      'Una suite consolidata di strumenti web quotidiani e veloci in esecuzione interamente nel tuo browser. Nessun caricamento su cloud. Nessuna telemetria. Nessun cookie.',
    ribbonTools: '🇨🇭 59+ Strumenti per Tutti i Giorni',
    ribbonZeroBytes: '🔒 0 Byte Lasciano il Dispositivo',
    ribbonWasm: '⚡ WebAssembly Lato Client',
    ribbonOpenSource: '📜 Open Source con Licenza MIT',
    searchPlaceholder: 'Cerca tra 59+ strumenti privati (PDF, immagini, 3D, crypto, dev)...',
    allTools: 'Tutti gli Strumenti',
    toolsCount: '{count} strumenti disponibili',
    noResultsTitle: 'Nessuno strumento corrispondente trovato',
    noResultsHint: 'Prova con una ricerca diversa o seleziona una categoria qui sopra.',
    launchTool: 'Avvia Strumento',
    privacyByArchTitle: 'Privacy per Architettura, Non per Politica',
    privacyByArchDesc:
      'La maggior parte degli strumenti web ti chiede di fidarti dei termini legali mentre caricano i tuoi documenti privati su server remoti. PrivKnife è fondamentalmente diverso.',
    categories: {
      all: 'Tutti gli Strumenti',
      privacy: 'Privacy & Sicurezza',
      documents: 'Documenti & PDF',
      media: 'Grafica & Media',
      audioVideo: 'Audio & Video',
      dev: 'Strumenti per Sviluppatori',
      '3d': 'Stampa 3D & CAD',
    },
    pillars: {
      zeroServerTitle: 'Zero Ingestione Server',
      zeroServerDesc:
        'PrivKnife non ha server di elaborazione né storage remoto. Tutte le manipolazioni di file e i rendering avvengono sul tuo computer locale tramite WebAssembly e Web Worker.',
      privacyTitle: 'Zero Telemetria & Tracciamento',
      privacyDesc:
        'Nessun Google Analytics, nessun pixel di tracciamento, nessun beacon di telemetria e zero cookie pubblicitari. Operi nel completo anonimato digitale.',
      threadTitle: 'Prestazioni Locali Fulminee',
      threadDesc:
        'Zero latenza di caricamento in rete. Elabora documenti di grandi dimensioni o centinaia di foto direttamente sulla tua CPU/GPU a velocità nativa.',
    },
    verifiableTitle: 'Verificabile & Open Source',
    verifiableDesc:
      'Apri gli Strumenti per Sviluppatori del browser (F12) → scheda Rete per verificare 0 richieste in uscita, o ispeziona il nostro codice sorgente su GitHub.',
    githubRepo: 'Repository GitHub',
    uiKitDesignSystem: 'Sistema di Design & UI Kit',
  },
  footer: {
    mission:
      'PrivKnife opera interamente nel tuo browser web senza alcuna ingestione di dati su server e senza tracciamento analitico.',
    privacyNotice: 'Privacy per Architettura, Non per Politica.',
    copyright: '© 2026 PrivKnife. Open Source con Licenza MIT.',
    zeroStorage: 'Zero Archiviazione Server • Zero Telemetria • Zero Cookie',
    privacyLink: 'Privacy',
    termsLink: 'Termini',
    uiKitLink: 'Kit UI',
    githubLink: 'GitHub',
    contactLink: 'Contatto & Segnalazioni',
  },
  tools: {
    exifStripper: {
      name: 'Rimozione Metadati EXIF & Privacy',
      description: 'Rimuovi coordinate GPS, modelli di fotocamera e metadati privati dalle foto prima di condividerle online.',
    },
    cryptoHash: {
      name: 'Generatore Batch di Hash Crittografici & UUID',
      description: 'Genera hash SHA-256, SHA-512, MD5 e UUIDv4 in modo sicuro nel browser tramite Web Crypto.',
    },
    csvConverter: {
      name: 'Convertitore CSV & Excel in JSON, SQL & Markdown',
      description: 'Analizza, filtra e converti fogli di calcolo CSV ed Excel in JSON, script SQL e tabelle Markdown.',
    },
    colorPalette: {
      name: 'Estrattore di Palette Colori & Controllo Contrasto',
      description: 'Estrai palette dominanti dalle immagini con rapporti di contrasto WCAG AA/AAA e codici HEX/RGB/HSL.',
    },
    meshGradient: {
      name: 'Generatore di Sfumature Mesh CSS & Glassmorphism',
      description: 'Crea sfumature mesh fluide a più punti e codice CSS/Tailwind con anteprima in tempo reale.',
    },
    calendarLinker: {
      name: 'Generatore di Link Calendario Universali & File .ics',
      description: 'Crea link di aggiunta al calendario per Google, Outlook e Yahoo, oltre a file standard .ics RFC 5545.',
    },
    emailSignature: {
      name: 'Generatore Gratuito di Firme Email HTML',
      description: 'Disegna firme email HTML responsive e conformi agli standard per Gmail, Outlook, Apple Mail e Thunderbird.',
    },
    robotsSitemap: {
      name: 'Generatore di Robots.txt & Sitemap XML',
      description: 'Configura direttive per motori di ricerca, blocca i bot di IA e genera sitemap XML valide offline.',
    },
    pdfMerger: {
      name: 'Unione, Divisione & Organizzatore Pagine PDF',
      description: 'Unisci più file PDF, riorganizza, ruota o dividi le pagine direttamente nel browser senza limiti.',
    },
    pdfRedaction: {
      name: 'Oscuramento & Anonimizzazione di PDF',
      description: 'Cancella definitivamente dati sensibili, codici e nomi rimuovendo i metadati confidenziali.',
    },
    invoiceMaker: {
      name: 'Creazione Immediata di Fatture & Ricevute Lato Client',
      description: 'Compila fatture PDF vettoriali e ricevute stampabili offline con calcoli automatici e bozze locali.',
    },
    gridPaper: {
      name: 'Generatore di Carta Millimetrata & a Puntini Stampabile',
      description: 'Genera carta millimetrata, a puntini, isometrica, esagonale e a righe vettoriale ad alta precisione.',
    },
    barcodeLabels: {
      name: 'Generatore di Fogli di Etichette & Codici a Barre Avery',
      description: 'Genera fogli di etichette adesive stampabili Avery con codici a barre Code 128, EAN, UPC e QR code.',
    },
    tableTentMaker: {
      name: 'Creazione di Cavalieri da Tavolo & Segnaposto Pieghevoli',
      description: 'Genera cavalieri triangolari bifacciali stampabili in PDF con codici QR per menu ed eventi.',
    },
    markdownCheatsheet: {
      name: 'Da Markdown a Scheda PDF Accademica & Tecnica',
      description: 'Converti appunti Markdown in schede di riferimento multi-colonna pronte per la stampa con evidenziazione.',
    },
    batchCompressor: {
      name: 'Compressore Batch di Immagini & Convertitore WebP',
      description: 'Comprimi centinaia di foto senza perdita e converti PNG, JPG e AVIF in WebP con download in archivio ZIP.',
    },
    faviconGenerator: {
      name: 'Suite Completa di Favicon & Icone per App',
      description: 'Genera pacchetti completi di favicon, icone Apple Touch, icone PWA Android e webmanifest offline.',
    },
    ogCardMaker: {
      name: 'Generatore di Anteprime Social (Open Graph)',
      description: 'Progetta schede di anteprima 1200×630 ad alto CTR per Twitter, Facebook e LinkedIn in pochi istanti.',
    },
    screenshotMockup: {
      name: 'Studio di Mockup per Screenshot di Applicazioni',
      description: 'Incornicia screenshot di app in eleganti cornici 3D realistiche con ombre e sfondi personalizzabili.',
    },
    subtitlesShifter: {
      name: 'Sincronizzazione Temporale Sottotitoli & SRT/VTT',
      description: 'Correggi sottotitoli fuori sincrono, applica scostamenti in millisecondi e converti tra SRT e WebVTT.',
    },
    bpmTapDetector: {
      name: 'Rilevatore di BPM Audio, Tonalità & Tap Tempo',
      description: 'Rileva tempo musicale, tonalità e intonazione in tempo reale. Carica audio o batti a tempo con metronomo.',
    },
    soundwaveArt: {
      name: 'Creatore di Arte con Onde Sonore & Codici Spotify',
      description: 'Trasforma le tue canzoni preferite in opere d\'arte con onde sonore, codici Spotify ed export vettoriale.',
    },
    videoGifTrimmer: {
      name: 'Convertitore da Video a GIF & Taglio Clip',
      description: 'Ritaglia video MP4 e WebM trasformandoli in GIF animate o brevi clip direttamente nel tuo browser.',
    },
    qrStandKeychain: {
      name: 'Generatore 3D di Supporti QR & Portachiavi',
      description: 'Genera file 3MF e STL bicolore stampabili in 3D di espositori QR e portachiavi da tavolo con codici incisi.',
    },
    cookieCutter: {
      name: 'Creatore 3D di Formine per Biscotti & Timbri',
      description: 'Trasforma sagome 2D in formine e timbri per biscotti stampabili in 3D con bordi rinforzati.',
    },
    deskWedge: {
      name: 'Targhe da Scrivania & Segnaposto 3D Parametrici',
      description: 'Crea targhe da tavolo personalizzate bicolore per stampa 3D con testo personalizzabile e smussi.',
    },
    backgroundRemover: {
      name: 'Studio di Rimozione Automatica dello Sfondo',
      description: 'Rimuovi lo sfondo da ritratti, prodotti e grafiche tramite IA eseguita al 100% in locale nel browser.',
    },
    dnsChecker: {
      name: 'Controllo Propagazione DNS Mondiale & WHOIS',
      description: 'Verifica record DNS mondiali (A, AAAA, MX, CNAME, TXT) e dati WHOIS tramite DNS-over-HTTPS diretto.',
    },
    webVitals: {
      name: 'Verifica Prestazioni del Sito & Core Web Vitals',
      description: 'Analizza velocità, accessibilità e Core Web Vitals (LCP, INP, CLS) con diagnosi pratiche per sviluppatori.',
    },
    parametricLampDesigner: {
      name: 'Designer Parametrico 3D di Lampade e Paralumi',
      description: 'Progetta paralumi personalizzati a spirale, scanalati e Voronoi con attacchi standard E27, E14 o IKEA e modalità vaso.',
    },
    lithophaneMaker: {
      name: 'Creatore di Litofanie 3D Curvature e Piane',
      description: 'Trasforma fotografie in litofanie 3D stampabili curve, piatte o cilindriche con simulazione di retroilluminazione.',
    },
    gridfinityBinGenerator: {
      name: 'Generatore di Vaschette Modulari Gridfinity per Cassetti',
      description: 'Genera contenitori organizer Gridfinity parametrici con scomparti su misura, bordi rinforzati e alloggiamenti per magneti.',
    },
    electronicsBoxEnclosure: {
      name: 'Scatola Elettronica Parametrica e Custodia a Scatto',
      description: 'Crea custodie a incastro o avvitate per Arduino, ESP32, Raspberry Pi e PCB personalizzati con passacavi dedicati.',
    },
    underDeskClampGenerator: {
      name: 'Morsetto Sottoscrivania e Passacavi Parametrico',
      description: 'Progetta morsetti a vite, ganci per cuffie e canaline passacavi con filettatura trapezoidale ACME per stampa 3D.',
    },
    skadisPegboardMaker: {
      name: 'Supporti e Ganci per Pannelli Forati IKEA Skådis',
      description: 'Realizza ganci universali, mensole e alloggiamenti attrezzi progettati specificamente per pannelli forati IKEA Skådis.',
    },
    geometricPlantPot: {
      name: 'Vaso Geometrico e Fioriera ad Auto-Irrigazione',
      description: 'Crea vasi sfaccettati, Voronoi e a spirale per piante grasse con serbatoio di irrigazione e griglia di drenaggio.',
    },
    brailleAdaSignGenerator: {
      name: 'Generatore di Segnaletica Tattile in Braille e Norma ADA',
      description: 'Genera targhe per porte conformi alle normative ADA con puntini Braille Grado 2 e scritte in rilievo tattile.',
    },
    keycapSwitchTesterMaker: {
      name: 'Copritasti Meccanici e Piastra Tester per Switch',
      description: 'Disegna copritasti con stelo Cherry MX e piastre di prova del suono degli switch con griglie personalizzabili.',
    },
    cappuccinoStencilMaker: {
      name: 'Stampino per Cappuccino e Sagoma Aerografo 3D',
      description: 'Converti loghi e sagome vettoriali SVG in stampini alimentari per caffè con ponti di giunzione automatici.',
    },
    petIdTagGenerator: {
      name: 'Generatore di Medagliette e Passanti per Collari Animali',
      description: 'Crea medagliette silenziose da infilare o da appendere per cani e gatti con nome, recapito e microchip in rilievo.',
    },
    hswInsertAdapter: {
      name: 'Inserti e Adattatori per Honeycomb Storage Wall (HSW)',
      description: 'Progetta inserti esagonali a scatto, alloggiamenti per dadi M3/M4/M5 e supporti utensili per pareti HSW.',
    },
    passportBiometricPhoto: {
      name: 'Creatore di Fototessere Biometriche per Passaporto e Visto',
      description: 'Ritaglia ritratti secondo le misure 2×2 pollici, 35×45 mm e requisiti biometrici su fogli stampabili 4×6 / A4.',
    },
    heicAvifConverter: {
      name: 'Convertitore Batch da HEIC e AVIF a JPG / PNG',
      description: 'Converti in blocco le foto HEIC/HEIF di iPhone e le immagini AVIF in formato JPG o PNG ad alta qualità nel browser.',
    },
    pdfSignerStamper: {
      name: 'Firma Digitale, Timbro Data e Sigla per Contratti PDF',
      description: 'Disegna firme, inserisci timbri con data e sigle su contratti PDF senza caricare documenti legali su server esterni.',
    },
    facePlateBlur: {
      name: 'Oscuramento e Sfocatura di Volti e Targhe per la Privacy',
      description: 'Rileva e censura automaticamente volti e targhe automobilistiche con sfocatura gaussiana, pixelatura o barre nere.',
    },
    localOcrTextExtractor: {
      name: 'Estrattore OCR Locale da Immagini e PDF a Testo / Word',
      description: 'Estrai testo modificabile da scontrini, schermate e PDF scansionati tramite intelligenza artificiale locale senza server.',
    },
    fileEncryptorVault: {
      name: 'Cifratore di File e Cassaforte Privata Zero-Knowledge',
      description: 'Cifra qualsiasi file o cartella con algoritmo militare AES-256-GCM e derivazione chiave Argon2id / PBKDF2.',
    },
    piiScrubberAnonymizer: {
      name: 'Anonimizzatore e Bonifica Dati Personali PII per Log e CSV',
      description: 'Individua e cancella codici fiscali, email, carte di credito, indirizzi IP e numeri di telefono prima della condivisione.',
    },
    bankStatementConverter: {
      name: 'Convertitore di Estratti Conto CSV / OFX in Excel e QIF',
      description: 'Normalizza le colonne delle transazioni e trasforma file bancari disordinati OFX/QFX/CSV in fogli Excel ordinati.',
    },
    audioTrimmerBooster: {
      name: 'Taglierina Audio, Booster di Volume e Suonerie',
      description: 'Taglia tracce MP3, WAV e AAC, applica dissolvenze audio e aumenta il volume di registrazioni basse offline.',
    },
    videoCompressorResizer: {
      name: 'Compressore Video e Ridimensionatore per Social Network',
      description: 'Comprimi video MP4 e WebM entro i limiti di 10MB / 25MB di Discord e ritaglia per TikTok, Reels e Shorts.',
    },
    nutritionLabelMaker: {
      name: 'Etichette con Valori Nutrizionali FDA e UE per Imballaggi',
      description: 'Genera tabelle nutrizionali vettoriali conformi alle normative FDA ed europee pronte per il packaging commerciale.',
    },
    svgOptimizerCleaner: {
      name: 'Ottimizzatore SVG, Pulizia Tracciati ed Export React / Vue',
      description: 'Rimuovi metadati superflui da file SVG, semplifica le curve ed esporta componenti puliti per React e Vue.',
    },
    diffChecker: {
      name: 'Confronto File di Codice e Contratti Fianco a Fianco (Diff)',
      description: 'Confronta versioni di codice o contratti legali con evidenziazione dei caratteri ed esportazione di file di patch.',
    },
    fontSubsetterConverter: {
      name: 'Riduttore di Caratteri Web e Convertitore TTF in WOFF2',
      description: 'Riduci del 90% il peso dei font eliminando i glifi inutilizzati e converti in formato compresso per il web WOFF2.',
    },
    seamlessTextureGenerator: {
      name: 'Generatore di Texture e Motivi Ripetibili Senza Giunzioni',
      description: 'Trasforma immagini e trame di gioco in pattern continui con fusione di Poisson e mappa delle normali.',
    },
    floorPlanFurnitureScaler: {
      name: 'Scalatore Interattivo 2D di Planimetrie e Arredamento',
      description: 'Calibra le scale metriche da planimetrie e posiziona mobili standard per verificare gli spazi liberi offline.',
    },
    emergencyRecoveryKit: {
      name: 'Foglio Stampabile di Emergenza per Password e Chiavi Crypto',
      description: 'Genera moduli cartacei sicuri per conservare offline master password, codici 2FA e frasi di recupero seed.',
    },
    csvVectorChartBuilder: {
      name: 'Generatore di Grafici Vettoriali e Infografiche da CSV',
      description: 'Trasforma dati tabulari in diagrammi a barre, grafici a linee e infografiche vettoriali SVG e PNG ad alta risoluzione.',
    },
  },
};

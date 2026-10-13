import { TranslationSchema } from './en';

export const de: TranslationSchema = {
  common: {
    brandName: 'PrivKnife',
    tagline: 'Private Werkzeugkiste im Browser',
    privacyBadge: '🛡️ 100% im Browser • Verlässt Nie Ihr Gerät',
    inBrowserBadge: '100% im Browser',
    zeroServerNotice: 'Null Server-Erfassung • Null Telemetrie',
    themeLight: '☀️ Hell',
    themeDark: '🌙 Dunkel',
    switchToLight: 'Zu hellem Modus wechseln',
    switchToDark: 'Zu dunklem Modus wechseln',
    selectLanguage: 'Sprache wählen',
    download: 'Herunterladen',
    copy: 'Kopieren',
    copied: '✓ Kopiert!',
    reset: 'Zurücksetzen',
    clear: 'Löschen',
    cancel: 'Abbrechen',
    close: 'Schließen',
    done: 'Fertig',
    loading: 'Wird geladen...',
    processing: 'Wird verarbeitet...',
    error: 'Fehler',
    dropFilesPrompt: 'Dateien hier ablegen oder durchsuchen',
    offlineGuarantee: '100% lokal verarbeitet ohne Server-Upload',
    preview: 'Vorschau',
    settings: 'Einstellungen',
    options: 'Optionen',
    save: 'Speichern',
    undo: 'Rückgängig',
    readyToUse: 'Einsatzbereit',
    roadmap: 'In Entwicklung',
    comingSoon: 'Demnächst',
    openTool: 'Werkzeug Öffnen',
    clearFilters: 'Filter Zurücksetzen',
    guaranteedClientSide: 'Garantiert Client-Seitig',
    verifiableOpenSource: 'Verifizierbar & Open Source',
  },
  header: {
    title: 'PrivKnife',
    tagline: 'Private Werkzeugkiste im Browser',
    languageSelectAria: 'Anwendungssprache auswählen',
  },
  home: {
    heroTitle: 'Konsolidierte Alltagswerkzeuge.',
    heroSubtitle: 'Keine Backend-Server. Null Telemetrie. 100% Client-Seitig.',
    heroBadge: '🛡️ 100% im Browser • Null Server-Erfassung • Null Telemetrie',
    heroHeadingStart: 'Das Private Schweizer',
    heroHeadingHighlight: 'Taschenmesser im Browser',
    heroDescription:
      'Eine konsolidierte Suite schneller alltäglicher Web-Tools, die vollständig in Ihrem Browser laufen. Keine Cloud-Uploads. Keine Telemetrie. Keine Cookies.',
    ribbonTools: '🇨🇭 Über 29 Alltagswerkzeuge',
    ribbonZeroBytes: '🔒 0 Bytes Verlassen das Gerät',
    ribbonWasm: '⚡ Client-Seitiges WebAssembly',
    ribbonOpenSource: '📜 Open Source unter MIT-Lizenz',
    searchPlaceholder: 'Über 29 private Tools durchsuchen (PDF, Bilder, 3D, Krypto, Dev)...',
    allTools: 'Alle Werkzeuge',
    toolsCount: '{count} Werkzeuge verfügbar',
    noResultsTitle: 'Keine passenden Werkzeuge gefunden',
    noResultsHint: 'Versuchen Sie einen anderen Suchbegriff oder wählen Sie oben eine Kategorie.',
    launchTool: 'Werkzeug Starten',
    privacyByArchTitle: 'Datenschutz durch Architektur, Nicht durch Richtlinien',
    privacyByArchDesc:
      'Die meisten Web-Tools verlangen Vertrauen in Nutzungsbedingungen, während sie Ihre privaten Dokumente heimlich in die Cloud laden. PrivKnife ist grundlegend anders.',
    categories: {
      all: 'Alle Werkzeuge',
      privacy: 'Datenschutz & Sicherheit',
      documents: 'Dokumente & PDF',
      media: 'Medien & Grafiken',
      audioVideo: 'Audio & Video',
      dev: 'Entwickler-Tools',
      '3d': '3D-Druck & CAD',
    },
    pillars: {
      zeroServerTitle: 'Null Server-Erfassung',
      zeroServerDesc:
        'PrivKnife besitzt weder Verarbeitungs-Server noch Remote-Speicher. Alle Dateimanipulationen und Renderings laufen lokal auf Ihrem Gerät über WebAssembly und Web Worker.',
      privacyTitle: 'Null Telemetrie & Tracking',
      privacyDesc:
        'Kein Google Analytics, keine Tracking-Pixel, keine Telemetrie-Beacons und null Werbe-Cookies. Sie agieren in vollständiger digitaler Anonymität.',
      threadTitle: 'Blitzschnelle Lokale Leistung',
      threadDesc:
        'Null Netzwerk-Upload-Latenz. Verarbeiten Sie gigabytegroße Dokumente oder Hunderte Fotos direkt auf Ihrer CPU/GPU mit nativer Geschwindigkeit.',
    },
    verifiableTitle: 'Verifizierbar & Open Source',
    verifiableDesc:
      'Öffnen Sie die Browser-Entwicklertools (F12) → Reiter Netzwerk, um 0 ausgehende Anfragen zu prüfen, oder inspizieren Sie unseren Quellcode auf GitHub.',
    githubRepo: 'GitHub-Repository',
    uiKitDesignSystem: 'Design-System & UI-Kit',
  },
  footer: {
    mission:
      'PrivKnife läuft vollständig in Ihrem Webbrowser – ohne Server-Datenerfassung und ohne analytisches Tracking.',
    privacyNotice: 'Datenschutz durch Architektur, Nicht durch Richtlinien.',
    copyright: '© 2026 PrivKnife. Open Source unter MIT-Lizenz.',
    zeroStorage: 'Null Server-Speicherung • Null Telemetrie • Null Cookies',
    privacyLink: 'Datenschutz',
    termsLink: 'Nutzungsbedingungen',
    uiKitLink: 'UI-Kit',
    githubLink: 'GitHub',
    contactLink: 'Kontakt & Fehlermeldungen',
  },
  tools: {
    exifStripper: {
      name: 'EXIF- & Privatsphäre-Metadaten-Entferner',
      description: 'Entfernen Sie GPS-Koordinaten, Kameramodelle und private Metadaten aus Fotos, bevor Sie sie online teilen.',
    },
    cryptoHash: {
      name: 'Kryptografischer Hash- & UUID-Stapelgenerator',
      description: 'Generieren Sie SHA-256-, SHA-512-, MD5- und UUIDv4-Hashes sicher im Browser mit Web Crypto.',
    },
    csvConverter: {
      name: 'CSV- & Excel-zu-JSON-, SQL- & Markdown-Konverter',
      description: 'Analysieren, filtern und konvertieren Sie Tabellenkalkulationen in JSON, SQL-INSERTs und Markdown-Tabellen.',
    },
    colorPalette: {
      name: 'Farbpaletten-Extraktor & Kontrastprüfer',
      description: 'Extrahieren Sie dominante Farbpaletten aus Bildern mit WCAG AA/AAA-Kontrastprüfungen und HEX/RGB-Werten.',
    },
    meshGradient: {
      name: 'CSS-Mesh-Verlauf- & Glassmorphismus-Generator',
      description: 'Erstellen Sie fließende Mesh-Farbverläufe und kopieren Sie fertigen CSS- oder Tailwind-Code mit Echtzeitvorschau.',
    },
    calendarLinker: {
      name: 'Universeller Kalender-Link- & .ics-Dateigenerator',
      description: 'Erstellen Sie universelle Kalender-Links für Google, Outlook und Yahoo sowie standardkonforme RFC 5545 .ics-Dateien.',
    },
    emailSignature: {
      name: 'Kostenloser HTML-E-Mail-Signatur-Generator',
      description: 'Gestalten Sie responsive, kompatible HTML-Signaturen für Gmail, Outlook, Apple Mail und Thunderbird.',
    },
    robotsSitemap: {
      name: 'Robots.txt- & XML-Sitemap-Generator',
      description: 'Konfigurieren Sie Suchmaschinenanweisungen, blockieren Sie KI-Scraper und erstellen Sie XML-Sitemaps lokal.',
    },
    pdfMerger: {
      name: 'PDF-Zusammenfüger, Trenner & Seitensortierer',
      description: 'Kombinieren Sie mehrere PDF-Dateien, sortieren, drehen oder trennen Sie Seiten direkt im Browser ohne Limits.',
    },
    pdfRedaction: {
      name: 'PDF-Schwärzung & Anonymisierung',
      description: 'Schwärzen Sie vertrauliche Daten, Nummern und Namen dauerhaft und bereinigen Sie sensible Metadaten.',
    },
    invoiceMaker: {
      name: 'Sofortiger Rechnungs- & Quittungsersteller',
      description: 'Erstellen Sie saubere Vektor-PDF-Rechnungen und druckbare Quittungen offline mit Berechnungen und lokalen Entwürfen.',
    },
    gridPaper: {
      name: 'Individueller Millimeter- & Punktraster-Papier-Generator',
      description: 'Generieren Sie hochpräzises Vektor-Karopapier, Punktraster-, Isometrie- und Notenlinienpapier zum Drucken.',
    },
    barcodeLabels: {
      name: 'Avery-Barcode- & Etikettenbogen-Generator',
      description: 'Erstellen Sie druckbare Avery-Etikettenbögen mit Code 128-, EAN-, UPC-Barcodes und QR-Codes.',
    },
    tableTentMaker: {
      name: 'Faltbarer Tischaufsteller- & Thekenschild-Ersteller',
      description: 'Erstellen Sie druckfertige zweiseitige PDF-Tischaufsteller mit QR-Codes für Menüs, Events und WLAN.',
    },
    markdownCheatsheet: {
      name: 'Markdown-zu-Akademischem- & Tech-PDF-Spickzettel',
      description: 'Wandeln Sie Markdown-Notizen in mehrspaltige, druckfertige Referenzblätter mit Syntax-Highlighting um.',
    },
    batchCompressor: {
      name: 'Stapel-Bildkomprimierer & WebP-Konverter',
      description: 'Komprimieren Sie Hunderte Fotos verlustfrei und konvertieren Sie PNG, JPG und AVIF in WebP mit ZIP-Download.',
    },
    faviconGenerator: {
      name: 'Komplette Favicon- & App-Icon-Suite',
      description: 'Generieren Sie vollständige Favicon-Pakete, Apple Touch Icons, Android PWA-Icons und Webmanifest offline.',
    },
    ogCardMaker: {
      name: 'Social-Share-Vorschaukarten-Ersteller (Open Graph)',
      description: 'Gestalten Sie 1200×630 Vorschaubilder für Twitter, Facebook und LinkedIn mit Vorlagen und Live-Vorschau.',
    },
    screenshotMockup: {
      name: 'App-Screenshot-Mockup-Studio',
      description: 'Präsentieren Sie App-Screenshots in realistischen 3D-Geräterahmen mit anpassbaren Schatten und Hintergründen.',
    },
    subtitlesShifter: {
      name: 'Untertitel-Zeitverschieber & SRT/VTT-Konverter',
      description: 'Synchronisieren Sie asynchrone Film-Untertitel, wenden Sie Millisekunden-Offsets an und konvertieren Sie Formate.',
    },
    bpmTapDetector: {
      name: 'Audio-BPM-, Tonart- & Tap-Tempo-Detektor',
      description: 'Erkennen Sie Tempo, Tonart und Tonhöhe in Echtzeit. Laden Sie Audiodateien hoch oder tippen Sie im Takt mit.',
    },
    soundwaveArt: {
      name: 'Spotify-Code- & Schallwellen-Kunst-Ersteller',
      description: 'Verwandeln Sie Lieblingslieder in Schallwellen-Wandkunst mit scannbaren Spotify-Codes und Vektorexport.',
    },
    videoGifTrimmer: {
      name: 'Video-zu-GIF- & Clip-Schneider',
      description: 'Schneiden Sie MP4- und WebM-Videos in animierte GIFs oder kurze Clips direkt und offline im Browser.',
    },
    qrStandKeychain: {
      name: '3D-QR-Aufsteller- & Schlüsselanhänger-Generator',
      description: 'Erstellen Sie zweifarbige 3D-druckbare QR-Aufsteller und Schlüsselanhänger als .stl- und .3mf-Dateien.',
    },
    cookieCutter: {
      name: 'Individueller Ausstechformen- & Stempel-3D-Ersteller',
      description: 'Wandeln Sie 2D-Silhouetten in 3D-druckbare Plätzchen-Ausstechformen und passende Stempel mit verstärkten Wänden um.',
    },
    deskWedge: {
      name: 'Parametrischer Schreibtisch-Namensschild-Ersteller',
      description: 'Entwerfen Sie zweifarbige 3D-druckbare Namensschilder mit anpassbareem Text, Winkeln und Fasen.',
    },
    backgroundRemover: {
      name: 'Automatisches Hintergrund-Entferner-Studio',
      description: 'Entfernen Sie Hintergründe von Porträts und Produkten mit lokaler KI direkt und privat in Ihrem Browser.',
    },
    dnsChecker: {
      name: 'Weltweiter DNS-Propagierungs- & WHOIS-Prüfer',
      description: 'Überprüfen Sie weltweite DNS-Einträge (A, AAAA, MX, CNAME, TXT) und WHOIS-Daten via direktem Browser-DoH.',
    },
    webVitals: {
      name: 'Website-Geschwindigkeits- & Core-Web-Vitals-Prüfer',
      description: 'Überprüfen Sie Leistung, Barrierefreiheit und Core Web Vitals (LCP, INP, CLS) mit praktischen Optimierungstipps.',
    },
  },
};

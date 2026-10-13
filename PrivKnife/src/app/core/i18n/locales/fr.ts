import { TranslationSchema } from './en';

export const fr: TranslationSchema = {
  common: {
    brandName: 'PrivKnife',
    tagline: 'Boîte à Outils Privée dans le Navigateur',
    privacyBadge: '🛡️ 100% dans le Navigateur • Ne Quitte Jamais Votre Appareil',
    inBrowserBadge: '100% dans le Navigateur',
    zeroServerNotice: 'Zéro Ingestion Serveur • Zéro Télémétrie',
    themeLight: '☀️ Clair',
    themeDark: '🌙 Sombre',
    switchToLight: 'Passer en mode clair',
    switchToDark: 'Passer en mode sombre',
    selectLanguage: 'Sélectionner la langue',
    download: 'Télécharger',
    copy: 'Copier',
    copied: '✓ Copié !',
    reset: 'Réinitialiser',
    clear: 'Effacer',
    cancel: 'Annuler',
    close: 'Fermer',
    done: 'Terminé',
    loading: 'Chargement...',
    processing: 'Traitement en cours...',
    error: 'Erreur',
    dropFilesPrompt: 'Déposez vos fichiers ici, ou parcourez',
    offlineGuarantee: 'Traité à 100% localement sans téléversement serveur',
    preview: 'Aperçu',
    settings: 'Paramètres',
    options: 'Options',
    save: 'Enregistrer',
    undo: 'Annuler',
    readyToUse: 'Prêt à l\'emploi',
    roadmap: 'En cours',
    comingSoon: 'Bientôt disponible',
    openTool: 'Ouvrir l\'outil',
    clearFilters: 'Effacer les filtres',
    guaranteedClientSide: 'Garanti Côté Client',
    verifiableOpenSource: 'Vérifiable & Open Source',
  },
  header: {
    title: 'PrivKnife',
    tagline: 'Boîte à Outils Privée dans le Navigateur',
    languageSelectAria: 'Sélectionner la langue de l\'application',
  },
  home: {
    heroTitle: 'Outils Quotidiens Consolidés.',
    heroSubtitle: 'Zéro Serveur Backend. Zéro Télémétrie. 100% Côté Client.',
    heroBadge: '🛡️ 100% dans le Navigateur • Zéro Ingestion Serveur • Zéro Télémétrie',
    heroHeadingStart: 'Le Couteau Suisse',
    heroHeadingHighlight: 'Privé dans le Navigateur',
    heroDescription:
      'Une suite consolidée d\'outils web rapides du quotidien s\'exécutant entièrement dans votre navigateur. Aucun envoi dans le cloud. Aucune télémétrie. Aucun cookie.',
    ribbonTools: '🇨🇭 Plus de 29 Outils Quotidiens',
    ribbonZeroBytes: '🔒 0 Octet Ne Quitte l\'Appareil',
    ribbonWasm: '⚡ WebAssembly Côté Client',
    ribbonOpenSource: '📜 Open Source sous Licence MIT',
    searchPlaceholder: 'Rechercher parmi plus de 29 outils privés (PDF, images, 3D, crypto, dev)...',
    allTools: 'Tous les Outils',
    toolsCount: '{count} outils disponibles',
    noResultsTitle: 'Aucun outil correspondant trouvé',
    noResultsHint: 'Essayez une autre recherche ou sélectionnez une catégorie ci-dessus.',
    launchTool: 'Lancer l\'outil',
    privacyByArchTitle: 'Confidentialité par Conception, Pas par Déclaration',
    privacyByArchDesc:
      'La plupart des outils web vous demandent de faire confiance à leurs conditions tout en téléversant vos fichiers sur le cloud. PrivKnife est fondamentalement différent.',
    categories: {
      all: 'Tous les Outils',
      privacy: 'Confidentialité & Sécurité',
      documents: 'Documents & PDF',
      media: 'Médias & Graphiques',
      audioVideo: 'Audio & Vidéo',
      dev: 'Outils Développeur',
      '3d': 'Impression 3D & CAO',
    },
    pillars: {
      zeroServerTitle: 'Zéro Ingestion Serveur',
      zeroServerDesc:
        'PrivKnife ne dispose d\'aucun serveur de traitement ni stockage distant. Toutes les opérations de fichiers et le rendu s\'exécutent sur votre machine locale via WebAssembly et Web Workers.',
      privacyTitle: 'Zéro Télémétrie & Traçage',
      privacyDesc:
        'Aucun Google Analytics, aucun pixel traceur, aucune balise de télémétrie et aucun cookie publicitaire. Vous naviguez dans un anonymat numérique absolu.',
      threadTitle: 'Performances Locales Foudroyantes',
      threadDesc:
        'Aucune latence de téléversement réseau. Traitez des documents volumineux ou des centaines de photos directement sur votre processeur/carte graphique à vitesse native.',
    },
    verifiableTitle: 'Vérifiable & Open Source',
    verifiableDesc:
      'Ouvrez les Outils de Développement de votre navigateur (F12) → onglet Réseau pour vérifier 0 requête sortante, ou inspectez notre code source sur GitHub.',
    githubRepo: 'Dépôt GitHub',
    uiKitDesignSystem: 'Système de Design & Kit UI',
  },
  footer: {
    mission:
      'PrivKnife s\'exécute entièrement dans votre navigateur web sans ingestion de données sur serveur et sans suivi analytique.',
    privacyNotice: 'Confidentialité par Conception, Pas par Déclaration.',
    copyright: '© 2026 PrivKnife. Open Source sous Licence MIT.',
    zeroStorage: 'Zéro Stockage Serveur • Zéro Télémétrie • Zéro Cookie',
    privacyLink: 'Confidentialité',
    termsLink: 'Conditions',
    uiKitLink: 'Kit UI',
    githubLink: 'GitHub',
    contactLink: 'Contact & Signalements',
  },
  tools: {
    exifStripper: {
      name: 'Suppresseur de Métadonnées EXIF & Vie Privée',
      description: 'Supprimez les coordonnées GPS, modèles d\'appareil et métadonnées privées de vos photos avant de les partager.',
    },
    cryptoHash: {
      name: 'Générateur de Hachages Cryptographiques & UUID en Lot',
      description: 'Générez des hachages SHA-256, SHA-512, MD5 et des UUIDv4 de manière sécurisée dans votre navigateur via Web Crypto.',
    },
    csvConverter: {
      name: 'Convertisseur CSV & Excel vers JSON, SQL & Markdown',
      description: 'Analysez, filtrez et convertissez des feuilles de calcul en JSON, scripts INSERT SQL et tableaux Markdown.',
    },
    colorPalette: {
      name: 'Extracteur de Palette de Couleurs & Testeur de Contraste',
      description: 'Extrayez les palettes dominantes d\'images avec ratios de contraste WCAG AA/AAA et codes HEX/RGB/HSL.',
    },
    meshGradient: {
      name: 'Générateur de Dégradés Mesh CSS & Glassmorphisme',
      description: 'Générez des dégradés mesh fluides multipoints et du code CSS/Tailwind avec aperçu en direct.',
    },
    calendarLinker: {
      name: 'Générateur de Liens Calendrier Universels & Fichiers .ics',
      description: 'Créez des liens d\'ajout au calendrier pour Google, Outlook et Yahoo, ainsi que des fichiers .ics standard RFC 5545.',
    },
    emailSignature: {
      name: 'Générateur de Signature d\'Email HTML Gratuit',
      description: 'Concevez des signatures d\'email HTML responsives et compatibles pour Gmail, Outlook, Apple Mail et Thunderbird.',
    },
    robotsSitemap: {
      name: 'Générateur de Robots.txt & Sitemap XML',
      description: 'Configurez les directives pour moteurs de recherche, bloquez les robots d\'IA et générez des sitemaps XML valides.',
    },
    pdfMerger: {
      name: 'Fusionneur, Découpeur & Organiseur de Pages PDF',
      description: 'Combinez plusieurs fichiers PDF, réorganisez, pivotez ou extrayez des pages sans aucune limite de taille.',
    },
    pdfRedaction: {
      name: 'Caviardage & Anonymisation de PDF',
      description: 'Masquez définitivement les données sensibles, numéros et noms tout en supprimant les métadonnées confidentielles.',
    },
    invoiceMaker: {
      name: 'Créateur Instantané de Factures & Reçus Côté Client',
      description: 'Rédigez des factures PDF vectorielles et reçus imprimables hors ligne avec calculs automatiques et brouillons locaux.',
    },
    gridPaper: {
      name: 'Générateur Personnalisé de Papier Millimétré & Pointillé',
      description: 'Générez du papier vectoriel haute précision : quadrillé, pointillé, isométrique, hexagonal ou ligné.',
    },
    barcodeLabels: {
      name: 'Générateur de Planches d\'Étiquettes & Codes-Barres Avery',
      description: 'Générez des planches d\'étiquettes imprimables Avery avec codes-barres Code 128, EAN, UPC et codes QR.',
    },
    tableTentMaker: {
      name: 'Créateur de Chevalets de Table Pliables & Cartes Comptoir',
      description: 'Générez des chevalets de table PDF pliables recto-verso avec codes QR pour menus, événements et Wi-Fi.',
    },
    markdownCheatsheet: {
      name: 'Aide-Mémoire Markdown vers PDF Académique & Technique',
      description: 'Convertissez des notes Markdown en fiches de référence denses et prêtes à imprimer avec coloration syntaxique.',
    },
    batchCompressor: {
      name: 'Compresseur d\'Images en Lot & Convertisseur WebP',
      description: 'Compressez des centaines de photos sans perte et convertissez PNG, JPG et AVIF en WebP avec téléchargement ZIP.',
    },
    faviconGenerator: {
      name: 'Suite Complète de Favicons & Icônes d\'Application',
      description: 'Générez le pack complet de favicons, icônes Apple Touch, icônes PWA Android et manifeste web hors ligne.',
    },
    ogCardMaker: {
      name: 'Créateur de Cartes de Partage Social (Open Graph)',
      description: 'Concevez des cartes d\'aperçu 1200×630 pour Twitter, Facebook et LinkedIn avec modèles et rendu en direct.',
    },
    screenshotMockup: {
      name: 'Studio de Mockups de Captures d\'Écran d\'Applications',
      description: 'Encadrez vos captures d\'écran d\'apps dans des cadres d\'appareils 3D réalistes avec ombres et reflets.',
    },
    subtitlesShifter: {
      name: 'Décaleur Temporel de Sous-Titres & Convertisseur SRT/VTT',
      description: 'Ressynchronisez les sous-titres décalés, appliquez des décalages en millisecondes et convertissez entre SRT et WebVTT.',
    },
    bpmTapDetector: {
      name: 'Détecteur de BPM Audio, Tonalité & Pitch Tap',
      description: 'Détectez le tempo, la clé musicale et le pitch en temps réel. Analysez vos fichiers audio ou tapez en rythme.',
    },
    soundwaveArt: {
      name: 'Créateur d\'Art Ondes Sonores & Codes Spotify',
      description: 'Transformez vos musiques préférées en art d\'ondes sonores mural avec codes Spotify et export vectoriel.',
    },
    videoGifTrimmer: {
      name: 'Convertisseur Vidéo vers GIF & Découpeur de Clips',
      description: 'Découpez des vidéos MP4/WebM en GIFs animés ou clips légers directement et hors ligne dans votre navigateur.',
    },
    qrStandKeychain: {
      name: 'Générateur de Supports QR & Porte-Clés 3D',
      description: 'Générez des supports QR et porte-clés bicolores imprimables en 3D exportés en formats .stl et .3mf.',
    },
    cookieCutter: {
      name: 'Créateur d\'Emporte-Pièces & Tampons 3D Personnalisés',
      description: 'Transformez des silhouettes 2D en emporte-pièces et tampons imprimables en 3D avec parois renforcées.',
    },
    deskWedge: {
      name: 'Créateur Paramétrique de Plaques de Bureau & Chevalets 3D',
      description: 'Concevez des plaques de bureau bicolores personnalisées pour l\'impression 3D avec texte en relief et chanfreins.',
    },
    backgroundRemover: {
      name: 'Studio de Suppression Automatisée d\'Arrière-Plan',
      description: 'Supprimez l\'arrière-plan de portraits, produits et graphismes grâce à une IA tournant 100% dans votre navigateur.',
    },
    dnsChecker: {
      name: 'Vérificateur Mondial de Propagation DNS & WHOIS',
      description: 'Consultez les enregistrements DNS mondiaux (A, AAAA, MX, CNAME, TXT) et WHOIS via DNS-over-HTTPS direct.',
    },
    webVitals: {
      name: 'Vérificateur de Performance Web & Core Web Vitals',
      description: 'Auditez la vitesse, l\'accessibilité et les Core Web Vitals (LCP, INP, CLS) avec diagnostics pour développeurs.',
    },
  },
};

import { TranslationSchema } from './en';

export const es: TranslationSchema = {
  common: {
    brandName: 'PrivKnife',
    tagline: 'Caja de Herramientas Privada en el Navegador',
    privacyBadge: '🛡️ 100% en el Navegador • Nunca Sale de tu Dispositivo',
    inBrowserBadge: '100% en el Navegador',
    zeroServerNotice: 'Cero Ingesta de Servidor • Cero Telemetría',
    themeLight: '☀️ Claro',
    themeDark: '🌙 Oscuro',
    switchToLight: 'Cambiar a modo claro',
    switchToDark: 'Cambiar a modo oscuro',
    selectLanguage: 'Seleccionar idioma',
    download: 'Descargar',
    copy: 'Copiar',
    copied: '✓ ¡Copiado!',
    reset: 'Restablecer',
    clear: 'Limpiar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    done: 'Listo',
    loading: 'Cargando...',
    processing: 'Procesando...',
    error: 'Error',
    dropFilesPrompt: 'Arrastra tus archivos aquí o haz clic para examinar',
    offlineGuarantee: 'Procesado 100% localmente sin subidas al servidor',
    preview: 'Vista Previa',
    settings: 'Configuración',
    options: 'Opciones',
    save: 'Guardar',
    undo: 'Deshacer',
    readyToUse: 'Listo para Usar',
    roadmap: 'En Desarrollo',
    comingSoon: 'Próximamente',
    openTool: 'Abrir Herramienta',
    clearFilters: 'Limpiar Filtros',
    guaranteedClientSide: 'Garantizado en el Cliente',
    verifiableOpenSource: 'Verificable y Código Abierto',
  },
  header: {
    title: 'PrivKnife',
    tagline: 'Caja de Herramientas Privada en el Navegador',
    languageSelectAria: 'Seleccionar idioma de la aplicación',
  },
  home: {
    heroTitle: 'Herramientas Cotidianas Consolidadas.',
    heroSubtitle: 'Sin Servidores de Backend. Cero Telemetría. 100% del Lado del Cliente.',
    heroBadge: '🛡️ 100% en el Navegador • Cero Ingestión en Servidor • Cero Telemetría',
    heroHeadingStart: 'La Navaja Suiza',
    heroHeadingHighlight: 'Privada en el Navegador',
    heroDescription:
      'Una suite consolidada de herramientas web cotidianas y rápidas que se ejecutan íntegramente en tu navegador. Sin subidas a la nube. Sin telemetría. Sin cookies.',
    ribbonTools: '🇨🇭 Más de 29 Herramientas Cotidianas',
    ribbonZeroBytes: '🔒 0 Bytes Salen del Dispositivo',
    ribbonWasm: '⚡ WebAssembly en el Cliente',
    ribbonOpenSource: '📜 Código Abierto MIT',
    searchPlaceholder: 'Buscar entre más de 29 herramientas privadas (PDF, imágenes, 3D, crypto, dev)...',
    allTools: 'Todas las Herramientas',
    toolsCount: '{count} herramientas disponibles',
    noResultsTitle: 'No se encontraron herramientas coincidentes',
    noResultsHint: 'Intenta con una búsqueda diferente o selecciona una categoría superior.',
    launchTool: 'Abrir Herramienta',
    privacyByArchTitle: 'Privacidad por Arquitectura, No por Política',
    privacyByArchDesc:
      'La mayoría de las herramientas web te piden que confíes en sus términos legales mientras suben tus documentos privados a la nube. PrivKnife es fundamentalmente diferente.',
    categories: {
      all: 'Todas las Herramientas',
      privacy: 'Privacidad y Seguridad',
      documents: 'Documentos y PDF',
      media: 'Gráficos y Medios',
      audioVideo: 'Audio y Video',
      dev: 'Utilidades para Desarrolladores',
      '3d': 'Impresión 3D y CAD',
    },
    pillars: {
      zeroServerTitle: 'Cero Ingesta de Servidor',
      zeroServerDesc:
        'PrivKnife no tiene servidores de procesamiento ni almacenamiento remoto. Toda manipulación de archivos y renderizado se realiza localmente mediante WebAssembly y Web Workers.',
      privacyTitle: 'Cero Telemetría y Rastreo',
      privacyDesc:
        'Sin Google Analytics, sin píxeles de seguimiento, sin balizas de telemetría y cero cookies publicitarias. Operas con anonimato digital total.',
      threadTitle: 'Rendimiento Local Ultrarrápido',
      threadDesc:
        'Cero latencia de subida por red. Procesa documentos masivos o cientos de fotos directamente en tu dispositivo a velocidad nativa.',
    },
    verifiableTitle: 'Verificable y Código Abierto',
    verifiableDesc:
      'Abre las herramientas de desarrollador (F12) → pestaña Red para verificar 0 peticiones salientes, o inspecciona nuestro código fuente en GitHub.',
    githubRepo: 'Repositorio de GitHub',
    uiKitDesignSystem: 'Sistema de Diseño & Kit de UI',
  },
  footer: {
    mission:
      'PrivKnife se ejecuta completamente en tu navegador web, sin ingesta de datos en servidores ni seguimiento analítico.',
    privacyNotice: 'Privacidad por Arquitectura, No por Política.',
    copyright: '© 2026 PrivKnife. Código abierto bajo Licencia MIT.',
    zeroStorage: 'Cero Almacenamiento en Servidor • Cero Telemetría • Cero Cookies',
    privacyLink: 'Privacidad',
    termsLink: 'Términos',
    uiKitLink: 'Kit de UI',
    githubLink: 'GitHub',
    contactLink: 'Contacto & Problemas',
  },
  tools: {
    exifStripper: {
      name: 'Eliminador de Metadatos EXIF y Privacidad',
      description: 'Elimina coordenadas GPS, marcas de cámara y metadatos privados de tus fotos antes de compartirlas en línea.',
    },
    cryptoHash: {
      name: 'Generador de Hashes Criptográficos y UUID en Lote',
      description: 'Genera hashes SHA-256, SHA-512, MD5 y UUIDv4 de forma segura en el navegador mediante Web Crypto.',
    },
    csvConverter: {
      name: 'Conversor de CSV y Excel a JSON, SQL y Markdown',
      description: 'Analiza, filtra y convierte hojas de cálculo CSV y Excel en JSON, sentencias SQL y tablas Markdown.',
    },
    colorPalette: {
      name: 'Extractor de Paletas de Color y Verificador de Contraste',
      description: 'Extrae paletas dominantes de imágenes con ratios de contraste WCAG AA/AAA y valores HEX, RGB y HSL.',
    },
    meshGradient: {
      name: 'Creador de Gradientes Mesh y Código Glassmorphism',
      description: 'Genera gradientes fluidos multipunto y código CSS/Tailwind con efecto de vidrio esmerilado en tiempo real.',
    },
    calendarLinker: {
      name: 'Generador Universal de Enlaces de Calendario y .ics',
      description: 'Crea enlaces universales para Google, Outlook y Yahoo, además de archivos estándar RFC 5545 .ics.',
    },
    emailSignature: {
      name: 'Generador Gratuito de Firmas de Correo HTML',
      description: 'Diseña firmas de correo electrónico HTML responsivas y compatibles con Gmail, Outlook, Apple Mail y Thunderbird.',
    },
    robotsSitemap: {
      name: 'Constructor de Robots.txt y Sitemap XML',
      description: 'Configura directivas de indexación, bloquea scrapers de IA y genera mapas de sitio XML válidos en el navegador.',
    },
    pdfMerger: {
      name: 'Unir, Dividir y Organizar Páginas PDF',
      description: 'Combina múltiples PDFs, reordena, rota o divide páginas directamente en tu navegador sin límites de tamaño.',
    },
    pdfRedaction: {
      name: 'Censura y Anonimizador de Documentos PDF',
      description: 'Tacha u oculta de forma permanente datos sensibles, números de identificación y nombres eliminando metadatos.',
    },
    invoiceMaker: {
      name: 'Creador Instantáneo de Facturas y Recibos en PDF',
      description: 'Diseña facturas vectoriales y recibos imprimibles en PDF sin conexión, con cálculos automáticos y borradores locales.',
    },
    gridPaper: {
      name: 'Generador de Papel Milimetrado, Puntos y Cuadrícula',
      description: 'Genera papel vectorizado de alta precisión con cuadrícula, puntos, isométrica o líneas para notas y dibujo técnico.',
    },
    barcodeLabels: {
      name: 'Generador de Hojas de Etiquetas y Códigos de Barras Avery',
      description: 'Crea hojas imprimibles de etiquetas adhesivas Avery con códigos de barras Code 128, EAN, UPC y códigos QR.',
    },
    tableTentMaker: {
      name: 'Creador de Carteles Plegables de Mesa y Mostrador',
      description: 'Genera carteles de mesa invertidos de doble cara en PDF con códigos QR para menús, eventos y contraseñas WiFi.',
    },
    markdownCheatsheet: {
      name: 'Conversor de Markdown a Hoja de Referencia PDF',
      description: 'Convierte notas Markdown en hojas de referencia impresas multicolumna de alta densidad con resaltado de código.',
    },
    batchCompressor: {
      name: 'Compresor de Imágenes en Lote y Conversor a WebP',
      description: 'Comprime cientos de fotos sin pérdidas visuales y convierte PNG, JPG y AVIF a WebP con descarga en ZIP.',
    },
    faviconGenerator: {
      name: 'Suite Generadora de Faviconos e Iconos de App',
      description: 'Genera paquetes completos de faviconos, Apple Touch Icons, iconos PWA para Android y el archivo webmanifest.',
    },
    ogCardMaker: {
      name: 'Creador de Tarjetas Open Graph para Redes Sociales',
      description: 'Diseña tarjetas de vista previa de 1200×630 para Twitter, Facebook y LinkedIn con plantillas y vista en directo.',
    },
    screenshotMockup: {
      name: 'Estudio de Maquetas y Capturas de Pantalla',
      description: 'Enmarca capturas de pantalla de aplicaciones móviles y de escritorio en marcos de dispositivos 3D realistas.',
    },
    subtitlesShifter: {
      name: 'Sincronizador de Subtítulos y Conversor SRT/VTT',
      description: 'Corrige desfases de tiempo en subtítulos, aplica ajustes en milisegundos, convierte FPS y cambia entre SRT y WebVTT.',
    },
    bpmTapDetector: {
      name: 'Detector de Tempo BPM, Tonalidad y Afinación',
      description: 'Detecta el tempo, la clave musical y el tono en tiempo real. Analiza pistas locales o marca el pulso con metrónomo.',
    },
    soundwaveArt: {
      name: 'Creador de Arte de Ondas de Sonido y Código Spotify',
      description: 'Convierte canciones en cuadros artísticos personalizados con ondas sonoras y códigos escaneables de Spotify.',
    },
    videoGifTrimmer: {
      name: 'Recortador de Video y Creador de GIF Animados',
      description: 'Recorta videos MP4 y WebM para crear GIFs animados o clips ligeros totalmente fuera de línea en el navegador.',
    },
    qrStandKeychain: {
      name: 'Generador 3D de Soportes QR y Llaveros Imprimibles',
      description: 'Genera soportes y llaveros QR bicolor imprimibles en 3D con códigos en relieve exportados en .stl y .3mf.',
    },
    cookieCutter: {
      name: 'Diseñador 3D de Cortadores de Galletas y Sellos',
      description: 'Convierte siluetas y dibujos en cortadores de masa y sellos imprimibles en 3D con bordes biselados reforzados.',
    },
    deskWedge: {
      name: 'Diseñador Paramétrico de Placas y Cuñas de Escritorio 3D',
      description: 'Crea placas con nombre bicolor imprimibles en 3D con ángulos personalizables, biseles y tipografías extruidas.',
    },
    backgroundRemover: {
      name: 'Estudio Automatizado de Eliminación de Fondos',
      description: 'Elimina fondos de fotos de retratos, productos y gráficos con IA ejecutándose 100% de forma local en tu navegador.',
    },
    dnsChecker: {
      name: 'Verificador Global de Propagación DNS y WHOIS',
      description: 'Consulta registros DNS mundiales (A, AAAA, MX, CNAME, TXT) e información WHOIS mediante DNS-over-HTTPS directo.',
    },
    webVitals: {
      name: 'Analizador de Rendimiento Web y Core Web Vitals',
      description: 'Audita velocidad, accesibilidad y métricas Core Web Vitals (LCP, INP, CLS) con diagnósticos y consejos prácticos.',
    },
  },
};

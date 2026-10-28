# Spec 91: Multi-Language Internationalization (i18n) for Batch 2 (Tools 31–60)

- **Spec ID**: `91`
- **Feature Name**: `Multi-Language Internationalization (i18n) for Batch 2 (Tools 31–60)`
- **Category**: `Platform / i18n`
- **Scope**: Expand PrivKnife's client-side internationalization system to cover all Batch 2 tools (Tools 31 through 60) across all 8 supported locales (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`), modernize global catalog counts (29+ &rarr; 59+ tools), and wire `i18nKey` bindings into the home showcase catalog.
- **Predecessor Spec**: [`specs/30 - Multi-Language Internationalization (i18n)`](file:///home/deivision/Projects/Programming/PrivKnife/specs/30%20-%20Multi-Language%20Internationalization%20(i18n)/spec.md)
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Problem Statement

### 1.1. Context
PrivKnife's foundational internationalization infrastructure was created under **Spec 30**, establishing a 100% client-side, signal-reactive translation engine (`I18nService`, `TranslatePipe`, `.c-lang-selector`) with zero backend dependencies and zero telemetry. It currently supports 8 languages:
- 🇺🇸 English (`en`)
- 🇪🇸 Spanish (`es`)
- 🇫🇷 French (`fr`)
- 🇮🇹 Italian (`it`)
- 🇩🇪 German (`de`)
- 🇨🇳 Simplified Chinese (`zh`)
- 🇯🇵 Japanese (`ja`)
- 🇸🇦 Arabic (`ar`, RTL)

### 1.2. The Gap
When Batch 2 (Tools 31 to 60) was implemented, 30 new everyday tools (3D parametric generators, media converters, document tools, security vaults, and developer utilities) were added to the application routes and catalog. However:
1. The locale dictionary files (`en.ts`, `es.ts`, `fr.ts`, `it.ts`, `de.ts`, `zh.ts`, `ja.ts`, `ar.ts`) in `src/app/core/i18n/locales/` only define translation keys for the initial 29 tools.
2. The `CATALOG_TOOLS` array in `src/app/pages/home/home.ts` contains `i18nKey` mappings for Tools 1–29, but Tools 31–60 lack `i18nKey` bindings, causing them to render only in English regardless of the user's active locale.
3. The home page banner and search placeholder hardcode `"29+ Everyday Tools"` and `"Search 29+ private tools..."` instead of reflecting the actual suite of **59 functional tools** (Tools 1–29 and 31–60).

### 1.3. Objectives
1. **Extend Dictionary Schema**: Add 30 strongly-typed tool entries (`tools.<i18nKey>.name` and `tools.<i18nKey>.description`) across all 8 language dictionaries.
2. **Modernize Platform Strings**: Update `home.ribbonTools` and `home.searchPlaceholder` in all 8 locales to reflect `"59+ Everyday Tools"`.
3. **Bind Catalog Tools**: Assign `i18nKey` to tools 31–60 in `CATALOG_TOOLS` in `src/app/pages/home/home.ts`.
4. **Multilingual Search**: Ensure live catalog search in `home.ts` matches translated tool titles and descriptions in any active language.
5. **Zero-Exfiltration & Privacy**: Maintain 100% in-browser translation with zero external network requests.

---

## 2. Tool Inventory & i18n Key Mapping (Tools 31–60)

Below is the definitive mapping between tool slugs, catalog IDs, and camelCase `i18nKey` identifiers:

| Tool # | Slug / Route | Catalog ID | `i18nKey` | Category |
|:---:|---|---|---|---|
| **31** | `/tools/parametric-lamp-designer` | `parametric-lamp-designer` | `parametricLampDesigner` | `3d` |
| **32** | `/tools/lithophane-maker` | `lithophane-maker` | `lithophaneMaker` | `3d` |
| **33** | `/tools/gridfinity-bin-generator` | `gridfinity-bin-generator` | `gridfinityBinGenerator` | `3d` |
| **34** | `/tools/electronics-box-enclosure` | `electronics-box-enclosure` | `electronicsBoxEnclosure` | `3d` |
| **35** | `/tools/under-desk-clamp-generator` | `under-desk-clamp-generator` | `underDeskClampGenerator` | `3d` |
| **36** | `/tools/skadis-pegboard-maker` | `skadis-pegboard-maker` | `skadisPegboardMaker` | `3d` |
| **37** | `/tools/geometric-plant-pot` | `geometric-plant-pot` | `geometricPlantPot` | `3d` |
| **38** | `/tools/braille-ada-sign-generator` | `braille-ada-sign-generator` | `brailleAdaSignGenerator` | `3d` |
| **39** | `/tools/keycap-switch-tester-maker` | `keycap-switch-tester-maker` | `keycapSwitchTesterMaker` | `3d` |
| **40** | `/tools/cappuccino-stencil-maker` | `cappuccino-stencil-maker` | `cappuccinoStencilMaker` | `3d` |
| **41** | `/tools/pet-id-tag-generator` | `pet-id-tag-generator` | `petIdTagGenerator` | `3d` |
| **42** | `/tools/hsw-insert-adapter` | `hsw-insert-adapter` | `hswInsertAdapter` | `3d` |
| **43** | `/tools/passport-biometric-photo` | `passport-biometric-photo` | `passportBiometricPhoto` | `media` |
| **44** | `/tools/heic-avif-converter` | `heic-avif-converter` | `heicAvifConverter` | `media` |
| **45** | `/tools/pdf-signer-stamper` | `pdf-signer-stamper` | `pdfSignerStamper` | `documents` |
| **46** | `/tools/face-plate-blur` | `face-plate-blur` | `facePlateBlur` | `privacy` |
| **47** | `/tools/local-ocr-text-extractor` | `local-ocr-text-extractor` | `localOcrTextExtractor` | `documents` |
| **48** | `/tools/file-encryptor-vault` | `file-encryptor-vault` | `fileEncryptorVault` | `privacy` |
| **49** | `/tools/pii-scrubber-anonymizer` | `pii-scrubber-anonymizer` | `piiScrubberAnonymizer` | `privacy` |
| **50** | `/tools/bank-statement-converter` | `bank-statement-converter` | `bankStatementConverter` | `dev` |
| **51** | `/tools/audio-trimmer-booster` | `audio-trimmer-booster` | `audioTrimmerBooster` | `audio-video` |
| **52** | `/tools/video-compressor-resizer` | `video-compressor-resizer` | `videoCompressorResizer` | `audio-video` |
| **53** | `/tools/nutrition-label-maker` | `nutrition-label-maker` | `nutritionLabelMaker` | `documents` |
| **54** | `/tools/svg-optimizer-cleaner` | `svg-optimizer-cleaner` | `svgOptimizerCleaner` | `dev` |
| **55** | `/tools/diff-checker` | `diff-checker` | `diffChecker` | `dev` |
| **56** | `/tools/font-subsetter-converter` | `font-subsetter-converter` | `fontSubsetterConverter` | `dev` |
| **57** | `/tools/seamless-texture-generator` | `seamless-texture-generator` | `seamlessTextureGenerator` | `media` |
| **58** | `/tools/floor-plan-furniture-scaler` | `floor-plan-furniture-scaler` | `floorPlanFurnitureScaler` | `documents` |
| **59** | `/tools/emergency-recovery-kit` | `emergency-recovery-kit` | `emergencyRecoveryKit` | `privacy` |
| **60** | `/tools/csv-vector-chart-builder` | `csv-vector-chart-builder` | `csvVectorChartBuilder` | `dev` |

---

## 3. Multilingual Dictionaries (All 8 Locales)

### 3.1. English (`en.ts`) Modernization
```typescript
// Home ribbon & search updates
ribbonTools: '🇨🇭 59+ Everyday Tools',
searchPlaceholder: 'Search 59+ private tools (PDF, images, 3D, crypto, dev)...',

// Tools 31-60 entries under tools:
parametricLampDesigner: {
  name: '3D Parametric Lamp & Lampshade Designer',
  description: 'Design bespoke spiral, ribbed, fluted, and Voronoi lampshades with standard E27, E14, or IKEA socket adapters and vase mode support.',
},
lithophaneMaker: {
  name: 'Curved & Flat 3D Lithophane Maker',
  description: 'Turn photographs into high-resolution curved, flat, cylindrical, or nightlight 3D-printable lithophanes with real-time backlight simulation.',
},
gridfinityBinGenerator: {
  name: 'Gridfinity & Modular Drawer Bin Generator',
  description: 'Generate parametric Gridfinity organizer bins with custom compartments, lip types, and magnet base holes.',
},
electronicsBoxEnclosure: {
  name: 'Parametric Electronics Box & Snap-Fit Enclosure',
  description: 'Create snap-fit or screwed enclosures for Arduino, ESP32, Raspberry Pi, and custom PCBs with cable cutouts.',
},
underDeskClampGenerator: {
  name: 'Under-Desk Clamp & Cable Management Generator',
  description: 'Design custom screw clamps, headphone hooks, and cable channels with ACME lead-screw threads.',
},
skadisPegboardMaker: {
  name: 'IKEA Skådis & Pegboard Hook / Holder Maker',
  description: 'Generate custom tool holders, universal hooks, and shelves specifically engineered for IKEA Skådis pegboards.',
},
geometricPlantPot: {
  name: 'Geometric Plant Pot & Self-Watering Planter',
  description: 'Create faceted, Voronoi, and spiral succulent planters with sub-irrigation reservoirs and drainage grids.',
},
brailleAdaSignGenerator: {
  name: 'Braille & ADA Tactile Door Sign Generator',
  description: 'Generate compliant ADA room and door signs with California Grade 2 Braille dots and raised tactile lettering.',
},
keycapSwitchTesterMaker: {
  name: 'Custom Mechanical Keycap & Switch Tester Maker',
  description: 'Design custom Cherry MX stem keycaps and multi-switch sound test plates with customizable layout grids.',
},
cappuccinoStencilMaker: {
  name: 'Cappuccino Stencil & Airbrush Template Maker',
  description: 'Turn SVG logos and silhouettes into food-safe coffee art stencils with automated island bridge connections.',
},
petIdTagGenerator: {
  name: 'Pet ID Tag & Collar Slide-On Generator',
  description: 'Design silent slide-on or hanging dog and cat ID tags with embossed names, phone numbers, and emergency microchip info.',
},
hswInsertAdapter: {
  name: 'Honeycomb Storage Wall (HSW) Insert & Adapter',
  description: 'Create snap-in hexagonal inserts, M3/M4/M5 nut holders, and custom tool adapters for Honeycomb Storage Walls.',
},
passportBiometricPhoto: {
  name: 'Passport, Visa & ID Biometric Photo Maker',
  description: 'Crop and scale portrait photos to strict 2×2 inch, 35×45 mm, and international biometric visa specs on printable 4×6 / A4 sheets.',
},
heicAvifConverter: {
  name: 'HEIC & AVIF to JPG / PNG Batch Converter',
  description: 'Batch convert Apple iPhone HEIC/HEIF photos and next-gen AVIF images to standard high-quality JPG or PNG files in-browser.',
},
pdfSignerStamper: {
  name: 'Client-Side PDF Signer, Date Stamper & Initials',
  description: 'Draw or upload signatures, add audit date stamps and initials onto PDF contracts without uploading confidential legal files to cloud servers.',
},
facePlateBlur: {
  name: 'Face & License Plate Privacy Blur Tool',
  description: 'Automatically detect and censor faces and vehicle license plates with Gaussian blur, pixelation, or black privacy bars.',
},
localOcrTextExtractor: {
  name: 'Local OCR Image & Scanned PDF to Text / Word',
  description: 'Extract editable text from scanned receipts, screenshots, and multi-page PDFs using local machine learning without server ingestion.',
},
fileEncryptorVault: {
  name: 'Zero-Knowledge File Encryptor & Vault',
  description: 'Encrypt any file or folder with military-grade AES-256-GCM and Argon2id / PBKDF2 key derivation into self-decrypting packages.',
},
piiScrubberAnonymizer: {
  name: 'PII Log & CSV Scrubber / Data Anonymizer',
  description: 'Detect and redact SSNs, emails, credit cards, IP addresses, and phone numbers from logs, CSVs, and customer data before sharing.',
},
bankStatementConverter: {
  name: 'Bank Statement CSV / OFX to Excel & QIF Converter',
  description: 'Clean up ugly bank exports, normalize transaction columns, and convert messy OFX/QFX/CSV files into clean Excel spreadsheets.',
},
audioTrimmerBooster: {
  name: 'Audio Trimmer, Volume Booster & Ringtone Maker',
  description: 'Trim MP3, WAV, and AAC audio tracks, apply gentle fade-in/fade-out envelopes, and safely boost quiet recordings offline.',
},
videoCompressorResizer: {
  name: 'Client-Side Video Compressor & Social Resizer',
  description: 'Compress large MP4 and WebM videos below Discord 10MB / 25MB limits and crop for TikTok, Instagram Reels, and YouTube Shorts.',
},
nutritionLabelMaker: {
  name: 'FDA & EU Nutrition Facts & Supplement Label Maker',
  description: 'Generate vector FDA Nutrition Facts panels, EU Food Regulation tables, and Supplement Facts labels ready for commercial packaging.',
},
svgOptimizerCleaner: {
  name: 'SVG Optimizer, Path Cleaner & React / Vue Exporter',
  description: 'Strip bloated metadata from vector SVGs, simplify bezier curves, and export optimized JSX, React, and Vue icon components.',
},
diffChecker: {
  name: 'Side-by-Side Code & Contract Diff Checker',
  description: 'Compare code files, legal contracts, or markdown texts side-by-side with character-level inline highlighting and unified patch export.',
},
fontSubsetterConverter: {
  name: 'Web Font Subsetter & TTF / OTF to WOFF2 Converter',
  description: 'Reduce font file sizes by 90% by stripping unused glyphs and converting heavy TTF/OTF fonts into high-compression WOFF2 web fonts.',
},
seamlessTextureGenerator: {
  name: 'Seamless Tileable Texture & Pattern Generator',
  description: 'Convert photos and game textures into seamless repeating tiles with Poisson blending, mirrored seams, and normal map generation.',
},
floorPlanFurnitureScaler: {
  name: 'Interactive 2D Floor Plan & Room Furniture Scaler',
  description: 'Calibrate scale from architectural blueprint images and drag standard furniture items to verify room clearances offline.',
},
emergencyRecoveryKit: {
  name: 'Printable Emergency Recovery & Password Kit Sheet',
  description: 'Generate high-security offline paper recovery sheets for password managers, 2FA backup codes, and crypto seed phrases.',
},
csvVectorChartBuilder: {
  name: 'CSV / Paste to Vector Chart & Infographic Builder',
  description: 'Transform spreadsheet data into publication-ready SVG bar charts, line plots, and infographics with instant SVG and PNG export.',
},
```

---

### 3.2. Spanish (`es.ts`)
```typescript
ribbonTools: '🇨🇭 59+ Herramientas Cotidianas',
searchPlaceholder: 'Buscar en 59+ herramientas privadas (PDF, imágenes, 3D, cripto, dev)...',

parametricLampDesigner: {
  name: 'Diseñador Paramétrico 3D de Lámparas y Pantallas',
  description: 'Diseñe pantallas de lámpara espirales, acanaladas, estriadas y Voronoi con adaptadores E27, E14 o IKEA y soporte de modo jarrón.',
},
lithophaneMaker: {
  name: 'Creador de Litofanías 3D Curvas y Planas',
  description: 'Convierta fotografías en litofanías imprimibles en 3D curvas, planas, cilíndricas o para lámparas de noche con simulación de retroiluminación.',
},
gridfinityBinGenerator: {
  name: 'Generador de Cajas Modulares Gridfinity para Cajones',
  description: 'Genere cajas organizadoras Gridfinity paramétricas con compartimentos personalizados, tipos de borde y orificios para imanes.',
},
electronicsBoxEnclosure: {
  name: 'Caja Paramétrica de Electrónica y Carcasa a Presión',
  description: 'Cree carcasas a presión o atornilladas para Arduino, ESP32, Raspberry Pi y PCB personalizadas con ranuras para cables.',
},
underDeskClampGenerator: {
  name: 'Generador de Abrazaderas y Pasacables Bajo Escritorio',
  description: 'Diseñe abrazaderas de tornillo, ganchos para auriculares y canales para cables con rosca ACME de avance rápido.',
},
skadisPegboardMaker: {
  name: 'Creador de Ganchos y Soportes para Tableros IKEA Skådis',
  description: 'Genere soportes para herramientas, ganchos universales y estantes diseñados a medida para tableros perforados IKEA Skådis.',
},
geometricPlantPot: {
  name: 'Maceta Geométrica y Jardinera con Autorriego',
  description: 'Cree macetas facetadas, Voronoi y en espiral para suculentas con depósito de autorriego y rejilla de drenaje.',
},
brailleAdaSignGenerator: {
  name: 'Generador de Señalización Táctil en Braille y Norma ADA',
  description: 'Genere placas para puertas y habitaciones conformes con la norma ADA con puntos Braille Grado 2 y texto en relieve táctil.',
},
keycapSwitchTesterMaker: {
  name: 'Creador de Teclas Mecánicas Personalizadas y Probador de Interruptores',
  description: 'Diseñe teclas con vástago Cherry MX y placas de prueba de sonido de interruptores con cuadrículas personalizables.',
},
cappuccinoStencilMaker: {
  name: 'Plantilla para Capuchino y Aerografía 3D',
  description: 'Transforme logotipos y siluetas SVG en plantillas de café aptas para alimentos con puentes automáticos entre islas.',
},
petIdTagGenerator: {
  name: 'Generador de Placas y Pasadores de Identificación para Mascotas',
  description: 'Diseñe placas silenciosas deslizantes o colgantes para perros y gatos con nombres, teléfonos y microchip en relieve.',
},
hswInsertAdapter: {
  name: 'Insertos y Adaptadores para Honeycomb Storage Wall (HSW)',
  description: 'Cree insertos hexagonales a presión, tuercas M3/M4/M5 y adaptadores de herramientas para paredes Honeycomb Storage Wall.',
},
passportBiometricPhoto: {
  name: 'Creador de Fotos Biométricas para Pasaporte, Visa y DNI',
  description: 'Recorte y ajuste retratos a medidas estrictas de 2×2 pulgadas, 35×45 mm y normas internacionales en hojas 4×6 / A4 para imprimir.',
},
heicAvifConverter: {
  name: 'Conversor por Lotes de HEIC y AVIF a JPG / PNG',
  description: 'Convierta fotos HEIC/HEIF de iPhone y archivos AVIF a JPG o PNG de alta calidad sin salir del navegador.',
},
pdfSignerStamper: {
  name: 'Firma, Sello de Fecha e Iniciales de PDF en el Cliente',
  description: 'Dibuje o cargue firmas, añada sellos de fecha e iniciales en contratos PDF sin subir archivos legales a servidores en la nube.',
},
facePlateBlur: {
  name: 'Herramienta de Desenfoque y Censura de Rostros y Matrículas',
  description: 'Detecte y censure automáticamente rostros y matrículas de vehículos con desenfoque gaussiano, pixelado o barras negras.',
},
localOcrTextExtractor: {
  name: 'Extractor OCR Local de Imagen y PDF Escaneado a Texto / Word',
  description: 'Extraiga texto editable de recibos, capturas y PDF escaneados mediante aprendizaje automático local sin servidores.',
},
fileEncryptorVault: {
  name: 'Cifrador de Archivos y Caja Fuerte Zero-Knowledge',
  description: 'Cifre cualquier archivo o carpeta con AES-256-GCM militar y derivación Argon2id / PBKDF2 en paquetes auto-descifrables.',
},
piiScrubberAnonymizer: {
  name: 'Depurador de Datos PII en Registros y CSV / Anonimizador',
  description: 'Detecte y censure números de seguridad social, correos, tarjetas, IP y teléfonos en registros y CSV antes de compartirlos.',
},
bankStatementConverter: {
  name: 'Conversor de Extractos Bancarios CSV / OFX a Excel y QIF',
  description: 'Limpie extractos bancarios, normalice columnas de transacciones y convierta archivos OFX/QFX/CSV en hojas Excel impecables.',
},
audioTrimmerBooster: {
  name: 'Recortador de Audio, Amplificador de Volumen y Creador de Tonos',
  description: 'Recorte pistas MP3, WAV y AAC, aplique fundidos suaves y aumente con seguridad el volumen de grabaciones en modo local.',
},
videoCompressorResizer: {
  name: 'Compresor y Redimensionador de Video para Redes Sociales',
  description: 'Comprima videos MP4 y WebM por debajo de los límites de 10MB / 25MB de Discord y recorte para TikTok, Reels y Shorts.',
},
nutritionLabelMaker: {
  name: 'Creador de Tablas Nutricionales FDA y UE para Envases',
  description: 'Genere paneles nutricionales vectoriales conformes con la FDA y normativas europeas listos para empaques comerciales.',
},
svgOptimizerCleaner: {
  name: 'Optimizador de SVG, Limpiador de Rutas y Exportador a React / Vue',
  description: 'Elimine metadatos innecesarios de archivos SVG, simplifique curvas y exporte componentes limpios para JSX, React y Vue.',
},
diffChecker: {
  name: 'Comparador de Código y Contratos Paralelo (Diff Checker)',
  description: 'Compare archivos de código, contratos o textos Markdown en paralelo con resaltado a nivel de carácter y exportación de parches.',
},
fontSubsetterConverter: {
  name: 'Subconjuntos de Fuentes Web y Conversor TTF / OTF a WOFF2',
  description: 'Reduzca el tamaño de fuentes un 90% eliminando glifos no utilizados y convirtiendo tipografías a formato WOFF2 comprimido.',
},
seamlessTextureGenerator: {
  name: 'Generador de Texturas y Patrones Continuos Sin Costuras',
  description: 'Convierta fotos y texturas de videojuegos en mosaicos continuos con mezcla de Poisson, bordes simétricos y mapa de normales.',
},
floorPlanFurnitureScaler: {
  name: 'Escalador Interactivo 2D de Planos y Muebles',
  description: 'Calibre escalas a partir de planos arquitectónicos y arrastre mobiliario estándar para verificar espacios libres offline.',
},
emergencyRecoveryKit: {
  name: 'Kit de Emergencia Imprimible de Claves y Recuperación',
  description: 'Genere hojas físicas de alta seguridad para contraseñas maestras, códigos de respaldo 2FA y semillas de billeteras cripto.',
},
csvVectorChartBuilder: {
  name: 'Generador de Gráficos Vectoriales e Infografías desde CSV',
  description: 'Transforme hojas de cálculo en gráficos de barras, líneas e infografías SVG vectoriales con descarga directa en SVG y PNG.',
},
```

---

### 3.3. French (`fr.ts`)
```typescript
ribbonTools: '🇨🇭 59+ Outils Quotidiens',
searchPlaceholder: 'Rechercher parmi 59+ outils privés (PDF, images, 3D, crypto, dev)...',

parametricLampDesigner: {
  name: 'Concepteur Paramétrique 3D de Lampes et Abat-jour',
  description: 'Créez des abat-jour personnalisés en spirale, cannelés et Voronoi avec adaptateurs E27, E14 ou IKEA et mode vase.',
},
lithophaneMaker: {
  name: 'Générateur de Lithophanies 3D Courbes et Planes',
  description: 'Transformez vos photos en lithophanies 3D imprimables courbes, planes ou cylindriques avec simulation de rétroéclairage.',
},
gridfinityBinGenerator: {
  name: 'Générateur de Boîtes Modulaires Gridfinity pour Tiroirs',
  description: 'Générez des bacs de rangement paramétriques Gridfinity avec compartiments sur mesure et logements pour aimants.',
},
electronicsBoxEnclosure: {
  name: 'Boîtier Électronique Paramétrique à Clipser',
  description: 'Concevez des boîtiers clipsables ou vissés pour Arduino, ESP32, Raspberry Pi et PCB avec découpes pour câbles.',
},
underDeskClampGenerator: {
  name: 'Générateur de Serre-Joints et Passe-Câbles Sous Bureau',
  description: 'Créez des pinces à vis, supports de casque et goulottes passe-câbles avec filetage ACME pour imprimantes 3D.',
},
skadisPegboardMaker: {
  name: 'Créateur de Crochets et Supports pour Panneaux IKEA Skådis',
  description: 'Concevez des porte-outils, crochets universels et étagères adaptés aux panneaux perforés IKEA Skådis.',
},
geometricPlantPot: {
  name: 'Cache-Pot Géométrique et Pot à Arrosage Automatique',
  description: 'Créez des pots facettés, Voronoi et en spirale pour plantes grasses avec réservoir d’irrigation et grille de drainage.',
},
brailleAdaSignGenerator: {
  name: 'Générateur de Panneaux Braille et Signalétique Tactile ADA',
  description: 'Générez des panneaux de porte conformes aux normes ADA avec points Braille Grade 2 et lettrage en relief tactile.',
},
keycapSwitchTesterMaker: {
  name: 'Créateur de Touches de Clavier et Testeur de Switchs',
  description: 'Concevez des touches de clavier avec tige Cherry MX et des plaques de test sonore pour commutateurs mécaniques.',
},
cappuccinoStencilMaker: {
  name: 'Pochoir pour Cappuccino et Gabarit d’Aérographe 3D',
  description: 'Convertissez vos logos SVG en pochoirs alimentaires pour café avec ponts d’îlots générés automatiquement.',
},
petIdTagGenerator: {
  name: 'Générateur de Médailles et Passants de Collier pour Animaux',
  description: 'Créez des médailles silencieuses ou à boucle pour chiens et chats avec noms et numéros en relief double couleur.',
},
hswInsertAdapter: {
  name: 'Inserts et Adaptateurs pour Honeycomb Storage Wall (HSW)',
  description: 'Concevez des inserts hexagonaux clipsables, logements d’écrous M3/M4/M5 et fixations d’outils pour murs HSW.',
},
passportBiometricPhoto: {
  name: 'Créateur de Photos d’Identité et Passeport Biométriques',
  description: 'Recadrez vos portraits aux formats 2×2 pouces, 35×45 mm et normes internationales sur planches 4×6 / A4 à imprimer.',
},
heicAvifConverter: {
  name: 'Convertisseur par Lots HEIC et AVIF vers JPG / PNG',
  description: 'Convertissez instantanément vos photos Apple HEIC et fichiers AVIF en JPG ou PNG haute qualité dans le navigateur.',
},
pdfSignerStamper: {
  name: 'Signature, Tampon de Date et Paraphe de PDF Local',
  description: 'Signez, datez et paraphez vos contrats PDF directement dans votre navigateur sans téléverser vos documents légaux.',
},
facePlateBlur: {
  name: 'Floutage et Censure de Visages et Plaques d’Immatriculation',
  description: 'Détectez et masquez automatiquement les visages et les plaques d’immatriculation par flou gaussien ou pixellisation.',
},
localOcrTextExtractor: {
  name: 'Extracteur OCR Local d’Image et PDF vers Texte / Word',
  description: 'Extrayez le texte modifiable de factures, captures et PDF scannés grâce à l’IA locale sans aucun transfert de données.',
},
fileEncryptorVault: {
  name: 'Chiffreur de Fichiers et Coffre-Fort Zéro Connaissance',
  description: 'Chiffrez tout fichier ou dossier en AES-256-GCM militaire avec dérivation Argon2id / PBKDF2 sans serveur.',
},
piiScrubberAnonymizer: {
  name: 'Nettoyeur de Données PII et Anonymiseur de Logs et CSV',
  description: 'Supprimez automatiquement numéros de sécurité sociale, e-mails, cartes et téléphones de vos fichiers et journaux.',
},
bankStatementConverter: {
  name: 'Convertisseur de Relevés Bancaires CSV / OFX vers Excel et QIF',
  description: 'Harmonisez les colonnes de transactions et transformez vos fichiers bancaires OFX/QFX/CSV en tableaux Excel propres.',
},
audioTrimmerBooster: {
  name: 'Découpeur Audio, Amplificateur de Volume et Sonneries',
  description: 'Découpez vos fichiers MP3, WAV et AAC, appliquez des fondus sonores et augmentez le volume d’enregistrements faibles.',
},
videoCompressorResizer: {
  name: 'Compresseur Vidéo et Recadreur Réseaux Sociaux',
  description: 'Compressez vos vidéos MP4 et WebM sous les limites Discord de 10Mo / 25Mo et recadrez pour TikTok, Reels et Shorts.',
},
nutritionLabelMaker: {
  name: 'Créateur de Tableaux Nutritionnels FDA et UE pour Emballages',
  description: 'Concevez des étiquettes de valeurs nutritionnelles conformes aux normes FDA et européennes pour l’emballage commercial.',
},
svgOptimizerCleaner: {
  name: 'Optimiseur SVG, Nettoyeur de Tracés et Export React / Vue',
  description: 'Allégez vos fichiers vectoriels SVG, simplifiez les courbes et exportez des composants prêts pour React et Vue.',
},
diffChecker: {
  name: 'Comparateur de Code et de Contrats Côte à Côte (Diff)',
  description: 'Comparez deux versions de code source, contrats ou textes avec surlignage des caractères et export de correctifs.',
},
fontSubsetterConverter: {
  name: 'Créateur de Sous-Ensembles de Polices et Conversion WOFF2',
  description: 'Réduisez le poids de vos polices de 90% en supprimant les glyphes inutilisés et convertissez en format WOFF2.',
},
seamlessTextureGenerator: {
  name: 'Générateur de Textures et Motifs Répétables Sans Raccord',
  description: 'Créez des textures 3D et motifs continus sans jointures visibles avec fusion de Poisson et carte de normales.',
},
floorPlanFurnitureScaler: {
  name: 'Mise à l’Échelle Interactive 2D de Plans et Meubles',
  description: 'Calibrez l’échelle de plans d’architecte et positionnez du mobilier standard pour vérifier les dégagements hors ligne.',
},
emergencyRecoveryKit: {
  name: 'Fiche Imprimable de Récupération d’Urgence et Mots de Passe',
  description: 'Générez des fiches physiques sécurisées pour mots de passe maîtres, clés 2FA et phrases de récupération crypto.',
},
csvVectorChartBuilder: {
  name: 'Générateur de Graphiques Vectoriels et Infographies CSV',
  description: 'Transformez vos données tabulaires en graphiques à barres, courbes et infographies vectorielles SVG et PNG.',
},
```

---

### 3.4. German (`de.ts`)
```typescript
ribbonTools: '🇨🇭 59+ Werkzeuge für Jeden Tag',
searchPlaceholder: 'Suche in 59+ privaten Werkzeugen (PDF, Bilder, 3D, Krypto, Dev)...',

parametricLampDesigner: {
  name: '3D Parametrischer Lampen- & Lampenschirm-Designer',
  description: 'Erstellen Sie individuelle spiral-, rippen- und Voronoi-förmige Lampenschirme mit E27-, E14- oder IKEA-Fassungen.',
},
lithophaneMaker: {
  name: '3D-Lithophan-Ersteller für Gekrümmte & Flache Reliefs',
  description: 'Verwandeln Sie Fotos in hochauflösende flache, gebogene oder zylindrische 3D-Lithophane mit Echtzeit-Hintergrundlicht.',
},
gridfinityBinGenerator: {
  name: 'Gridfinity & Modulare Schubladen-Einsatzboxen',
  description: 'Erzeugen Sie parametrische Gridfinity-Ordnungsboxen mit individuellen Fächern, Randprofilen und Magnetlöchern.',
},
electronicsBoxEnclosure: {
  name: 'Parametrisches Elektronikgehäuse mit Schnappverschluss',
  description: 'Entwerfen Sie Schnapp- oder Schraubgehäuse für Arduino, ESP32, Raspberry Pi und Leiterplatten mit Kabeldurchführungen.',
},
underDeskClampGenerator: {
  name: 'Untertisch-Klemmen- & Kabelmanagement-Generator',
  description: 'Konstruieren Sie Schraubzwingen, Kopfhörerhaken und Kabelführungen mit leichtgängigen ACME-Trapezgewinden.',
},
skadisPegboardMaker: {
  name: 'IKEA Skådis Lochwand-Haken & Halterungen-Ersteller',
  description: 'Erstellen Sie passgenaue Werkzeughalter, Universalhaken und Ablagen speziell für IKEA Skådis Lochplatten.',
},
geometricPlantPot: {
  name: 'Geometrischer Blumentopf & Selbstbewässernder Übertopf',
  description: 'Gestalten Sie facettierte, Voronoi- und Spiral-Pflanzkübel für Sukkulenten mit Bewässerungsreservoir und Drainagegitter.',
},
brailleAdaSignGenerator: {
  name: 'Braille- & Taktiler ADA-Türschild-Generator',
  description: 'Erstellen Sie barrierefreie ADA-Schilder mit California Grade 2 Blindenschrift-Punkten und erhabenem Tasttext.',
},
keycapSwitchTesterMaker: {
  name: 'Mechanische Tastenkappen & Schalter-Tester-Designer',
  description: 'Entwerfen Sie Tastenkappen mit Cherry MX-Kreuzaufnahme und Schaltertest-Platten mit anpassbarem Tastenfeld.',
},
cappuccinoStencilMaker: {
  name: 'Cappuccino-Schablonen- & Airbrush-Vorlagen-Ersteller',
  description: 'Konvertieren Sie SVG-Logos in lebensmittelechte Kaffeeschablonen mit automatisch generierten Haltestegen.',
},
petIdTagGenerator: {
  name: 'Haustier-Erkennungsmarken & Halsband-Schieber-Generator',
  description: 'Gestalten Sie geräuschlose Schiebe- oder Hängemarken für Hunde und Katzen mit erhabenem Namen und Notfallkontakt.',
},
hswInsertAdapter: {
  name: 'Honeycomb Storage Wall (HSW) Einsätze & Adapter',
  description: 'Erstellen Sie sechseckige Schnappeinsätze, M3/M4/M5-Mutternhalter und Werkzeughalter für Honeycomb Storage Walls.',
},
passportBiometricPhoto: {
  name: 'Biometrischer Passfoto-, Visum- & Ausweis-Generator',
  description: 'Schneiden Sie Porträts exakt auf 2×2 Zoll, 35×45 mm und internationale biometrische Vorgaben auf 4×6 / A4-Druckbögen zu.',
},
heicAvifConverter: {
  name: 'HEIC- & AVIF-Stapelkonverter zu JPG / PNG',
  description: 'Konvertieren Sie Apple iPhone HEIC-Fotos und moderne AVIF-Bilder direkt im Browser verlustarm in JPG oder PNG.',
},
pdfSignerStamper: {
  name: 'Lokaler PDF-Signierer, Datumsstempel & Initialen',
  description: 'Unterschreiben, stempeln und paraphieren Sie PDF-Verträge lokal im Browser, ohne vertrauliche Dokumente hochzuladen.',
},
facePlateBlur: {
  name: 'Gesichter- & Kennzeichen-Verpixelungs-Werkzeug',
  description: 'Zensieren Sie Gesichter und Autokennzeichen auf Fotos automatisch mit Gaußschem Weichzeichner oder Mosaikpixeln.',
},
localOcrTextExtractor: {
  name: 'Lokale OCR-Texterkennung für Bilder & Gescannte PDFs',
  description: 'Extrahieren Sie editierbaren Text aus Belegen, Screenshots und PDFs mittels lokaler KI ohne Server-Upload.',
},
fileEncryptorVault: {
  name: 'Zero-Knowledge-Dateiverschlüsselung & Datensafe',
  description: 'Verschlüsseln Sie Dateien mit militärischem AES-256-GCM und Argon2id / PBKDF2 in selbstentschlüsselnde Container.',
},
piiScrubberAnonymizer: {
  name: 'PII-Datenschutz-Bereiniger für Logdateien & CSV-Dateien',
  description: 'Entfernen Sie sensible Sozialversicherungsnummern, E-Mails, Kreditkarten, IP-Adressen und Telefonnummern.',
},
bankStatementConverter: {
  name: 'Kontoauszug-Konverter von CSV / OFX zu Excel & QIF',
  description: 'Bereinigen Sie Bankexporte, vereinheitlichen Sie Buchungsspalten und wandeln Sie OFX/QFX-Dateien in sauberes Excel um.',
},
audioTrimmerBooster: {
  name: 'Audio-Cutter, Lautstärke-Booster & Klingelton-Ersteller',
  description: 'Schneiden Sie MP3-, WAV- und AAC-Titel, fügen Sie weiche Blenden ein und heben Sie leise Aufnahmen sicher an.',
},
videoCompressorResizer: {
  name: 'Client-Videokompressor & Social-Media-Zuschneider',
  description: 'Komprimieren Sie MP4- und WebM-Videos unter 10MB / 25MB für Discord und schneiden Sie für TikTok, Reels und Shorts zu.',
},
nutritionLabelMaker: {
  name: 'FDA- & EU-Nährwerttabellen-Generator für Verpackungen',
  description: 'Erstellen Sie druckfertige Vektor-Nährwertangaben nach FDA- und EU-Richtlinien für Lebensmittelverpackungen.',
},
svgOptimizerCleaner: {
  name: 'SVG-Optimierer, Pfad-Bereiniger & React / Vue-Exporter',
  description: 'Entfernen Sie unnötigen Ballast aus SVG-Vektoren, glätten Sie Pfade und exportieren Sie optimierten React- und Vue-Code.',
},
diffChecker: {
  name: 'Code- & Vertragsvergleicher Gegenüberstellung (Diff)',
  description: 'Vergleichen Sie Quellcode, Verträge oder Markdown-Texte zweispaltig mit zeichengenauem Inline-Farbabgleich.',
},
fontSubsetterConverter: {
  name: 'Webfont-Verschlanker & TTF / OTF zu WOFF2-Konverter',
  description: 'Sparen Sie 90% Dateigröße durch Entfernen ungenutzter Glyphen und konvertieren Sie Schriften in kompaktes WOFF2.',
},
seamlessTextureGenerator: {
  name: 'Nahtlose Kachelbare Texturen & Muster-Generator',
  description: 'Wandeln Sie Fotos in nahtlos wiederholbare Texturen mit Poisson-Synthese und automatischer Normal-Map um.',
},
floorPlanFurnitureScaler: {
  name: 'Interaktiver 2D-Grundriss- & Möbel-Skalierer',
  description: 'Kalibrieren Sie Maßstäbe aus Bauplänen und platzieren Sie Standardmöbel zur kollisionsfreien Raumplanung.',
},
emergencyRecoveryKit: {
  name: 'Druckbares Notfall-Wiederherstellungs- & Passwortblatt',
  description: 'Erstellen Sie hochsichere Offline-Papierbögen für Master-Passwörter, 2FA-Backup-Codes und Krypto-Seed-Phrasen.',
},
csvVectorChartBuilder: {
  name: 'CSV-Vektordiagramm- & Infografik-Generator',
  description: 'Verwandeln Sie Tabellenkalkulationsdaten in gestochen scharfe SVG-Balkendiagramme, Liniengrafiken und Infografiken.',
},
```

---

### 3.5. Italian (`it.ts`)
```typescript
ribbonTools: '🇨🇭 59+ Strumenti per Tutti i Giorni',
searchPlaceholder: 'Cerca tra 59+ strumenti privati (PDF, immagini, 3D, crypto, dev)...',

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
```

---

### 3.6. Simplified Chinese (`zh.ts`)
```typescript
ribbonTools: '🇨🇭 59+ 款日常实用工具',
searchPlaceholder: '搜索 59+ 款本地隐私工具 (PDF, 图片, 3D打印, 加密, 开发者)...',

parametricLampDesigner: {
  name: '3D 参数化台灯与灯罩设计器',
  description: '设计独特的螺旋、凹槽、波纹及 Voronoi 蜂窝多孔灯罩，支持标准 E27、E14 或宜家灯座适配器及花瓶模式。',
},
lithophaneMaker: {
  name: '弧面与平面 3D 照片透光浮雕制作器',
  description: '将数码照片转换为高精度弧面、平面、圆柱或小夜灯 3D 打印浮雕，配备实时背光穿透模拟。',
},
gridfinityBinGenerator: {
  name: 'Gridfinity 抽屉收纳盒与模块化零件箱生成器',
  description: '参数化生成符合 Gridfinity 规范的收纳盒，可定制分隔槽、堆叠边缘及底部磁铁孔位。',
},
electronicsBoxEnclosure: {
  name: '参数化电子外壳与卡扣盒生成器',
  description: '为 Arduino、ESP32、树莓派及定制 PCB 快速设计卡扣式或螺丝固定式外壳与线缆开孔。',
},
underDeskClampGenerator: {
  name: '桌下夹具与耳机理线架 3D 生成器',
  description: '设计定制螺纹桌夹、耳机挂钩与走线槽，内置高强度 ACME 梯形螺纹旋钮结构。',
},
skadisPegboardMaker: {
  name: '宜家斯考迪斯 (Skådis) 洞洞板挂钩与支架制作器',
  description: '为宜家 Skådis 洞洞板量身定制工具架、通用挂钩、置物架及分类收纳插槽。',
},
geometricPlantPot: {
  name: '多面体几何花盆与自动吸水绿植盆制作器',
  description: '设计多面体折纸风、Voronoi 多孔及螺旋多肉花盆，支持底部储水自吸灌溉与防烂根滤网。',
},
brailleAdaSignGenerator: {
  name: '盲文与 ADA 无障碍触感门牌标识生成器',
  description: '生成符合无障碍规范的房间门牌与提示牌，带有加州二级盲文凸点与触感浮雕英文字母。',
},
keycapSwitchTesterMaker: {
  name: '客制化机械键盘键帽与轴体试轴器制作器',
  description: '设计定制 Cherry MX 轴心键帽，以及多孔位机械轴试音底座与个性化配列试轴板。',
},
cappuccinoStencilMaker: {
  name: '卡布奇诺咖啡拉花模版与喷绘遮板制作器',
  description: '将矢量 SVG 标志与剪影转换为食品级 3D 咖啡拉花模版，自动连接孤岛断连连桥。',
},
petIdTagGenerator: {
  name: '宠物防走丢身份牌与项圈穿入式铭牌制作器',
  description: '设计静音穿入式或悬挂式猫狗身份吊牌，带有浮雕姓名、紧急电话与芯片信息。',
},
hswInsertAdapter: {
  name: '蜂窝储物墙 (HSW) 卡扣插件与工具转接件生成器',
  description: '生成适用于 Honeycomb Storage Wall 的六角卡扣件、M3/M4/M5 螺母固定件及工具适配件。',
},
passportBiometricPhoto: {
  name: '证件照、护照与签证生物识别照制作器',
  description: '严格按 2×2 英寸、35×45 毫米及国际签证标准裁切人像，生成 4×6 / A4 打印排版纸。',
},
heicAvifConverter: {
  name: '苹果 HEIC 与 AVIF 批量转换为 JPG / PNG 工具',
  description: '在浏览器本地批量将苹果手机 HEIC 照片及新一代 AVIF 格式秒转为高清 JPG 或 PNG。',
},
pdfSignerStamper: {
  name: '客户端本地 PDF 签名、日期图章与合同批注工具',
  description: '手绘或上传签名，添加防篡改日期印章与姓名缩写，绝不将涉密法律合同上传至云端。',
},
facePlateBlur: {
  name: '照片人脸与车牌隐私智能打码遮挡工具',
  description: '本地 AI 自动检测人脸与车辆号牌，应用高斯模糊、马赛克像素化或黑色隐私遮挡条。',
},
localOcrTextExtractor: {
  name: '本地离线图片与扫描件 PDF 文字识别 (OCR) 工具',
  description: '利用本地机器学习从发票小票、截图与多页 PDF 中提取可编辑文本，无服务器数据泄露。',
},
fileEncryptorVault: {
  name: '零知识客户端文件加密器与隐私保险库',
  description: '使用军工级 AES-256-GCM 与 Argon2id / PBKDF2 算法对任何文件加密打包为自解密包。',
},
piiScrubberAnonymizer: {
  name: '日志与 CSV 个人隐私信息 (PII) 自动脱敏清洗器',
  description: '在共享前自动检测并脱敏日志和表格中的身份证号、邮箱、银行卡号、IP 与手机号。',
},
bankStatementConverter: {
  name: '银行流水账单 CSV / OFX 转换为 Excel 与 QIF 工具',
  description: '规范整理杂乱的银行导出流水，匹配标准交易列并转为清晰规范的 Excel 财务表格。',
},
audioTrimmerBooster: {
  name: '本地音频剪辑器、音量放大器与手机铃声制作器',
  description: '精准剪裁 MP3、WAV、AAC 音频片段，设置淡入淡出曲线并无失真放大微弱录音。',
},
videoCompressorResizer: {
  name: '浏览器本地视频压缩器与社交媒体画幅裁剪工具',
  description: '将超大 MP4 和 WebM 视频压缩到 Discord 10MB/25MB 限制内，并自由裁剪适配竖屏短视频。',
},
nutritionLabelMaker: {
  name: '美国 FDA 与欧盟规范食品营养成分标签制作器',
  description: '生成符合美国 FDA CFR 101.9 及欧盟法规的矢量营养成分表，直接用于商品包装印刷。',
},
svgOptimizerCleaner: {
  name: 'SVG 矢量代码精简优化器与 React / Vue 组件导出工具',
  description: '剔除矢量图中的冗余元数据，简化贝塞尔曲线，一键导出干净的 JSX 和 Vue 图标组件。',
},
diffChecker: {
  name: '双栏代码与法律合同文本差异对比器 (Diff)',
  description: '双栏并排对比源代码、法律合同或 Markdown，提供字符级精确高亮及统一补丁导出。',
},
fontSubsetterConverter: {
  name: '网页字体精简抽离 (Subsetter) 与 WOFF2 格式转换器',
  description: '通过剥离生僻字将字体文件体积缩减 90%，并快速转换为高压缩比 WOFF2 网页字体。',
},
seamlessTextureGenerator: {
  name: '无缝连续贴图与无接缝图案纹理生成器',
  description: '将普通照片与贴图转换为无缝平铺的四方连续贴图，支持泊松融合与法线贴图生成。',
},
floorPlanFurnitureScaler: {
  name: '交互式 2D 户型图测量与家具摆放排布比例尺',
  description: '从建筑蓝图与户型图中校准实际尺寸，自由拖拽标准家具验证离墙空间与动线尺寸。',
},
emergencyRecoveryKit: {
  name: '可打印离线紧急恢复备忘单与密保卡片生成器',
  description: '生成高安全性纸质备份卡，妥善记录主密码、双重验证 (2FA) 备用码及加密助记词。',
},
csvVectorChartBuilder: {
  name: 'CSV 与表格数据一键生成矢量图表与信息图',
  description: '将表格粘贴数据直接转换为出版级 SVG 柱状图、折线图与信息图表，支持矢量 SVG 和 PNG 导出。',
},
```

---

### 3.7. Japanese (`ja.ts`)
```typescript
ribbonTools: '🇨🇭 59+ の日常便利ツール',
searchPlaceholder: '59+ の完全ローカルツールを検索 (PDF, 画像, 3D, 暗号, 開発)...',

parametricLampDesigner: {
  name: '3Dパラメトリック ランプ＆シェード デザイナー',
  description: '標準E27、E14、IKEAソケットに対応したスパイラル、リブ、フルート、ボロノイ模様のランプシェードを作成できます。',
},
lithophaneMaker: {
  name: '曲面＆平面 3Dリソフェン（透光浮彫）メーカー',
  description: '写真を高解像度の曲面、平面、円筒、ナイトライト型3Dプリント透光レリーフに変換し、バックライトをシミュレートします。',
},
gridfinityBinGenerator: {
  name: 'Gridfinity規格 引き出しモジュール収納ボックス生成器',
  description: 'カスタム仕切り、リップ形状、マグネット穴を備えたGridfinity準拠のオーガナイザーケースを生成します。',
},
electronicsBoxEnclosure: {
  name: 'パラメトリック電子工作ケース＆スナップフィット蓋生成器',
  description: 'Arduino、ESP32、Raspberry Pi、自作基板向けのスナップ留めまたはネジ止め用エンクロージャーを設計します。',
},
underDeskClampGenerator: {
  name: 'デスク下クランプ＆ケーブルホルダー 3Dジェネレーター',
  description: 'ACME台形ネジを採用した頑丈なクランプ、ヘッドホンフック、配線ダクトを3Dプリント用に作成します。',
},
skadisPegboardMaker: {
  name: 'IKEA スコーディス (Skådis) 有孔ボード用フック＆ホルダー作成器',
  description: 'IKEAスコーディス有孔ボードにぴったり嵌まるツールホルダー、汎用フック、棚受けを生成します。',
},
geometricPlantPot: {
  name: '幾何学デザイン植木鉢＆給水機能付きプランター',
  description: '底面給水タンクと排水グリッドを備えた多面体・ボロノイ・スパイラル形状の多肉植物用ポットを設計します。',
},
brailleAdaSignGenerator: {
  name: '点字＆ADA規格対応 触知式ドアサイン生成器',
  description: 'カリフォルニア規格グレード2点字ドットと立体凸文字を備えたバリアフリー対応の部屋・ドア銘板を作成します。',
},
keycapSwitchTesterMaker: {
  name: 'メカニカルキーボード用キーキャップ＆スイッチテスター作成器',
  description: 'Cherry MX軸対応のカスタムキーキャップや複数キースイッチ打鍵音確認用テストプレートを設計します。',
},
cappuccinoStencilMaker: {
  name: 'カプチーノステンシル＆エアブラシ用型紙作成器',
  description: 'SVGロゴやシルエット画像を自動ブリッジ処理により食品対応のラテアート用ステンシルに変換します。',
},
petIdTagGenerator: {
  name: '迷子防止ペット用ネームタグ＆首輪通し型プレート作成器',
  description: '犬や猫向けに名前、電話番号、マイクロチップ番号を立体刻印した首輪スライド型静音ネームタグを生成します。',
},
hswInsertAdapter: {
  name: 'Honeycomb Storage Wall (HSW) インサート＆アダプター作成器',
  description: 'ハニカム収納壁向けの六角スナップインサート、M3/M4/M5ナット保持具、工具ホルダーを生成します。',
},
passportBiometricPhoto: {
  name: 'パスポート・ビザ・身分証用 生体認証証明写真作成器',
  description: '国際規格（2×2インチ、35×45mm）に準拠して顔写真をトリミングし、L判・A4印刷シートに自動面付けします。',
},
heicAvifConverter: {
  name: 'HEIC＆AVIF一括 JPG / PNG 変換ツール',
  description: 'iPhoneのHEIC写真や次世代AVIF画像をブラウザ内だけで高品質JPG/PNGにまとめて一括変換します。',
},
pdfSignerStamper: {
  name: '完全ローカル PDF電子署名・日付スタンプ・イニシャル記入ツール',
  description: '契約書PDFに署名描画、日付印、イニシャルを書き込みます。機密文書は一切クラウドに送信されません。',
},
facePlateBlur: {
  name: '写真の顔＆ナンバープレート自動ぼかし・モザイク保護ツール',
  description: 'ブラウザ内AIが写真内の顔や車のナンバープレートを自動認識し、ガウスぼかしや黒帯で不可逆マスキングします。',
},
localOcrTextExtractor: {
  name: 'ローカルOCR 画像・スキャンPDF テキスト抽出ツール',
  description: 'レシート、スクリーンショット、PDF文書から端末内機械学習により編集可能なテキストを高速抽出します。',
},
fileEncryptorVault: {
  name: 'ゼロナレッジ型 ファイル暗号化保管庫',
  description: '軍用規格AES-256-GCMとArgon2id/PBKDF2暗号化を用い、重要ファイルを自己復号可能な安全パッケージに変換します。',
},
piiScrubberAnonymizer: {
  name: 'ログ＆CSV 個人情報 (PII) 自動匿名化スクラバー',
  description: 'ログやCSVからマイナンバー、メールアドレス、クレジットカード番号、IP、電話番号を検出して安全にマスキングします。',
},
bankStatementConverter: {
  name: '銀行取引明細 CSV / OFX の Excel＆QIF 変換ツール',
  description: '乱雑なオンラインバンキング明細やOFXデータを整理し、標準取引形式の綺麗なExcel表に変換します。',
},
audioTrimmerBooster: {
  name: '音声トリミング・音量ブースター＆着信音作成器',
  description: 'MP3、WAV、AAC音声を波形を見ながらカットし、フェードイン・アウト処理や音量増幅をオフラインで実行します。',
},
videoCompressorResizer: {
  name: 'ブラウザ内動画圧縮＆SNS向けサイズ調整ツール',
  description: 'MP4やWebM動画をDiscordの10MB/25MB上限以下に軽量化し、TikTokやReels、Shorts向けに画角をクロップします。',
},
nutritionLabelMaker: {
  name: 'FDA＆EU食品基準 栄養成分表示ラベル作成器',
  description: '米国FDA規則や欧州連合基準に準拠した商品パッケージ用ベクター栄養成分表を正確に作成します。',
},
svgOptimizerCleaner: {
  name: 'SVG軽量化オプティマイザー＆React / Vueコード出力ツール',
  description: 'SVGベクターから無駄なメタデータを除去してパスを単純化し、ReactやVueコンポーネントとしてコピーできます。',
},
diffChecker: {
  name: '2画面並行 ソースコード＆契約書 差分比較ツール (Diff)',
  description: 'プログラムコードや契約書文書の相違点を文字単位で並べて比較し、変更ハイライトやパッチを出力します。',
},
fontSubsetterConverter: {
  name: 'Webフォント軽量化サブセッター＆WOFF2変換器',
  description: '使わない文字グリフを削除してフォント容量を最大90%削減し、高圧縮なWOFF2形式に変換します。',
},
seamlessTextureGenerator: {
  name: 'シームレス タイル状テクスチャ＆パターン画像生成器',
  description: '写真を継ぎ目なくリピートできるテクスチャ素材に変換し、ノーマルマップも同時に生成します。',
},
floorPlanFurnitureScaler: {
  name: '2D間取り図スケール計測＆家具レイアウトシミュレーター',
  description: '間取り図面から縮尺比率をキャリブレーションし、実寸家具を配置して部屋の動線や隙間寸法を検証します。',
},
emergencyRecoveryKit: {
  name: '緊急時用オフラインパスワード＆暗号資産復旧シート作成器',
  description: 'マスターパスワード、2段階認証予備コード、秘密鍵シードフレーズを保管するための安全な印刷用紙を作成します。',
},
csvVectorChartBuilder: {
  name: 'CSV表データからベクターグラフ＆インフォグラフィック作成器',
  description: '貼り付けた表データを印刷品質のSVG棒グラフ、折れ線グラフ、インフォグラフィックに即座に可視化します。',
},
```

---

### 3.8. Arabic (`ar.ts`, RTL)
```typescript
ribbonTools: '🇨🇭 أكثر من 59 أداة يومية',
searchPlaceholder: 'ابحث في أكثر من 59 أداة محلية آمنة (PDF، صور، 3D، تشفير، تطوير)...',

parametricLampDesigner: {
  name: 'مصمم المصابيح ومظلات الإضاءة البارامترية ثلاثية الأبعاد',
  description: 'صمم مظلات مصابيح لولبية ومضلعة ومفرغة بنمط فورونوي مع محولات لقواعد E27 و E14 و IKEA مع دعم وضع المزهرية.',
},
lithophaneMaker: {
  name: 'صانع الصور البارزة ثلاثية الأبعاد (ليثوفان) المنحنية والمسطحة',
  description: 'حوّل صورك الفوتوغرافية إلى نقوش ثلاثية الأبعاد منحنية أو مسطحة أو أسطوانية مع محاكاة واقعية لنفاذ الضوء الخلفي.',
},
gridfinityBinGenerator: {
  name: 'مولد علب وصناديق الأدراج المعيارية بنظام Gridfinity',
  description: 'أنشئ صناديق تنظيم بارامترية متوافقة مع معيار Gridfinity مع تقسيمات مخصصة وحواف قوية وتجاويف مغناطيسية.',
},
electronicsBoxEnclosure: {
  name: 'صندوق الإلكترونيات البارامتري وحافظة الأجهزة الدقيقة',
  description: 'صمم علب محكمة الإغلاق أو مثبتة ببراغي لـ Arduino و ESP32 و Raspberry Pi مع فتحات مخصصة للمنافذ والأسلاك.',
},
underDeskClampGenerator: {
  name: 'مولد مرابط التثبيت تحت المكتب وحوامل تنظيم الكابلات',
  description: 'صمم مرابط تثبيت لولبية وحوامل سماعات ومسارات كابلات بقلاووظ لولبي من نوع ACME المخصص للطباعة ثلاثية الأبعاد.',
},
skadisPegboardMaker: {
  name: 'صانع خطافات وحوامل ألواح IKEA Skådis المثقبة',
  description: 'أنشئ حوامل أدوات وخطافات شاملة ورفوف مصممة بدقة لتناسب ألواح ايكيا Skådis المثقبة للتنظيم المكتبي.',
},
geometricPlantPot: {
  name: 'وعاء نباتات هندسي ومزهرية ذاتية الري للطباعة ثلاثية الأبعاد',
  description: 'صمم أحواض نباتات مضلعة وعضوية بنمط فورونوي مع خزان مياه سفلي للري التلقائي وشبكة لتصريف المياه الزائدة.',
},
brailleAdaSignGenerator: {
  name: 'مولد لافتات الأبواب اللمسية بطريقة برايل ومعايير ADA',
  description: 'أنشئ لافتات متوافقة مع معايير إمكانية الوصول ADA بنقاط برايل ونصوص بارزة للمكاتب والأبواب.',
},
keycapSwitchTesterMaker: {
  name: 'صانع أغطية مفاتيح الكيبورد الميكانيكي ولوحات اختبار المفاتيح',
  description: 'صمم أغطية مفاتيح مخصصة لقواعد Cherry MX ولوحات اختبار صوت النقر للمفاتيح الميكانيكية.',
},
cappuccinoStencilMaker: {
  name: 'قوالب تزيين الكابتشينو وفوهات الرسم بالرش للطباعة ثلاثية الأبعاد',
  description: 'حوّل شعارات SVG والرسومات إلى قوالب آمنة لتزيين رغوة القهوة بالكاكاو مع وصلات تلقائية للأجزاء المعلقة.',
},
petIdTagGenerator: {
  name: 'مولد لوحات تعريف الحيوانات الأليفة وحلقات أطواق الكلاب والقطط',
  description: 'صمم بطاقات تعريف صامتة تنزلق على الطوق مع نصوص بارزة للاسم ورقم الهاتف وبيانات الشريحة الإلكترونية.',
},
hswInsertAdapter: {
  name: 'حوامل وقطع ربط جدار التخزين السداسي (HSW)',
  description: 'أنشئ إضافات سداسية ومثبتات صواميل M3/M4/M5 ومحولات أدوات مخصصة لجدران Honeycomb Storage Wall.',
},
passportBiometricPhoto: {
  name: 'صانع صور جواز السفر والتأشيرات الحيوية البيومترية',
  description: 'قص وعدل الصور الشخصية بدقة لتطابق معايير 2×2 بوصة و 35×45 مم الدولية على ورق طباعة قياسي جاهز للقص.',
},
heicAvifConverter: {
  name: 'محول صيغ الصور من HEIC و AVIF إلى JPG و PNG دفعة واحدة',
  description: 'حوّل صور آيفون HEIC وصيغ AVIF الحديثة إلى JPG أو PNG بجودة عالية بالكامل داخل المتصفح وبشكل فوري.',
},
pdfSignerStamper: {
  name: 'توقيع وختم مستندات PDF وتأشير العقود محلياً',
  description: 'ارسم أو أرفق توقيعك، وأضف أختام التاريخ والأحرف الأولى على عقود PDF دون رفع ملفاتك القانونية لأي خادم سحابي.',
},
facePlateBlur: {
  name: 'أداة تعتيم وتظليل الوجوه ولوحات أرقام السيارات لحماية الخصوصية',
  description: 'اكتشف الوجوه ولوحات المركبات تلقائياً بذكاء اصطناعي محلي وطبق التمويه الغاوسي أو المربعات لإخفائها بالكامل.',
},
localOcrTextExtractor: {
  name: 'مستخرج النصوص الذكي (OCR) من الصور والمستندات الممسوحة ضوئياً',
  description: 'استخرج النصوص القابلة للتعديل من الإيصالات والمستندات متعددة الصفحات بتعلم آلي محلي دون اتصال بالإنترنت.',
},
fileEncryptorVault: {
  name: 'خزنة الملفات المشفرة ومستودع الأمان معدوم المعرفة',
  description: 'شفر أي ملف أو مجلد بتشفير عسكري AES-256-GCM واشتقاق مفاتيح Argon2id في حاويات آمنة ذاتية فك التشفير.',
},
piiScrubberAnonymizer: {
  name: 'منظف ومجهل البيانات الشخصية الحساسة (PII) من السجلات وملفات CSV',
  description: 'احجب تلقائياً الهويات والبريد وبطاقات الائتمان وعناوين IP وأرقام الهواتف من سجلات النظام وملفات البيانات.',
},
bankStatementConverter: {
  name: 'محول كشوف الحسابات البنكية CSV و OFX إلى Excel و QIF',
  description: 'نظف ونسق صادرات البنوك العشوائية ووحد أعمدة الحركات وحول ملفات OFX/QFX إلى جداول إكسيل جاهزة للمحاسبة.',
},
audioTrimmerBooster: {
  name: 'مقص المقاطع الصوتية ومضخم الصوت وصانع نغمات الرنين',
  description: 'قص ملفات MP3 و WAV و AAC بدقة، وأضف تأثيرات التلاشي وضخم التسجيلات الصوتية الهادئة بدون خوادم.',
},
videoCompressorResizer: {
  name: 'ضاغط مقاطع الفيديو ومعدل أبعاد المقاطع لشبكات التواصل',
  description: 'اضغط ملفات MP4 و WebM الكبيرة لتناسب حدود 10MB و 25MB لبرنامج Discord وقص الفيديو لملائمة تيك توك وريلز.',
},
nutritionLabelMaker: {
  name: 'صانع بطاقات الحقائق الغذائية المعتمدة لمعايير FDA والاتحاد الأوروبي',
  description: 'أنشئ جداول القيم الغذائية المتوافقة مع اللوائح الدولية بجودة متجهة فائقة الدقة وجاهزة لطباعة عبوات المنتجات.',
},
svgOptimizerCleaner: {
  name: 'أداة تحسين وتنظيف كود ملفات SVG وتصدير مكونات React و Vue',
  description: 'تخلص من البيانات الزائدة في ملفات SVG وبسط المسارات وصدر كود نقي جاهز للاستخدام في تطبيقات الويب الحديثة.',
},
diffChecker: {
  name: 'أداة المقارنة المزدوجة لاختلافات الأكواد والنصوص والعقود (Diff)',
  description: 'قارن نسختين من الأكواد البرمجية أو العقود القانونية جنباً إلى جنب مع تمييز دقيق للتعديلات على مستوى الحرف.',
},
fontSubsetterConverter: {
  name: 'مقلص أحجام خطوط الويب ومحول TTF و OTF إلى WOFF2',
  description: 'وفر 90% من حجم ملفات الخطوط بحذف الحروف والرموز غير المستخدمة وحولها لصيغة WOFF2 فائقة الضغط للويب.',
},
seamlessTextureGenerator: {
  name: 'مولد الخامات والأنماط المتكررة السلسة بدون فواصل للرندرة ثلاثية الأبعاد',
  description: 'حوّل الصور العادية إلى خامات متكررة بدون أي خطوط فاصلة مع توليد خريطة البروز والتجسيم (Normal Map).',
},
floorPlanFurnitureScaler: {
  name: 'مقياس مخططات الطوابق ثنائي الأبعاد وموزع قطع الأثاث التفاعلي',
  description: 'عاير مقياس الرسم من المخططات الهندسية واسحب قطع الأثاث القياسية للتحقق من الممرات والمساحات بدون إنترنت.',
},
emergencyRecoveryKit: {
  name: 'ورقة الطوارئ المطبوعة لحفظ كلمات المرور ومفاتيح الاسترداد المشفرة',
  description: 'أنشئ وثائق ورقية مؤمنة لتدوين كلمات المرور الرئيسية ورموز التحقق الثنائي (2FA) وعبارات استرداد المحافظ المشفرة.',
},
csvVectorChartBuilder: {
  name: 'صانع الرسوم البيانية المتجهة والإنفوجرافيك التفاعلي من جداول البيانات',
  description: 'حوّل بيانات الجداول إلى رسوم بيانية احترافية بالأعمدة والخطوط ومخططات بيانية دقيقة قابلة للتحميل بصيغتي SVG و PNG.',
},
```

---

## 4. Architectural Integration & Modifications

### 4.1. File Layout & Affected Artifacts
```text
PrivKnife/
├── src/app/core/i18n/
│   ├── locales/
│   │   ├── en.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── es.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   │   ├── fr.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   │   ├── it.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   │   ├── de.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   │   ├── zh.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   │   ├── ja.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   │   └── ar.ts                # Add tools 31-60 translations + update ribbonTools/searchPlaceholder
│   ├── types.ts                 # Validates TranslationSchema adheres to new keys
│   └── i18n.service.spec.ts     # Add verification that all 59 tools resolve across all 8 locales
└── src/app/pages/home/
    ├── home.ts                  # Assign i18nKey to items 31-60 in CATALOG_TOOLS
    └── home.spec.ts             # Test that all CATALOG_TOOLS have valid i18nKey and resolve in EN & ES
```

### 4.2. `home.ts` Catalog Tool Binding
In `src/app/pages/home/home.ts`, every catalog item from `parametric-lamp-designer` through `csv-vector-chart-builder` receives its corresponding `i18nKey: '<key>'`:
```typescript
{
  id: 'parametric-lamp-designer',
  i18nKey: 'parametricLampDesigner',
  name: '3D Parametric Lamp & Lampshade Designer',
  // ...
},
{
  id: 'lithophane-maker',
  i18nKey: 'lithophaneMaker',
  name: 'Curved & Flat 3D Lithophane Maker',
  // ...
},
// ... through tool 60
{
  id: 'csv-vector-chart-builder',
  i18nKey: 'csvVectorChartBuilder',
  name: 'CSV / Paste to Vector Chart & Infographic Builder',
  // ...
}
```

---

## 5. Acceptance Criteria

1. **Schema & Locale Parity**:
   - All 8 dictionary files (`en.ts`, `es.ts`, `fr.ts`, `it.ts`, `de.ts`, `zh.ts`, `ja.ts`, `ar.ts`) compile with 0 TypeScript type errors against `TranslationSchema`.
   - Every one of the 30 Batch 2 tools has a non-empty `name` and `description` in all 8 languages.
2. **Catalog Binding**:
   - All 59 functional tools in `CATALOG_TOOLS` have an `i18nKey` property.
   - When the user selects any language from `<app-header>`'s language dropdown, all 59 tool cards immediately reflect the translated title and description without requiring a page reload.
3. **Hero & Ribbon Accuracy**:
   - `ribbonTools` displays `59+ Everyday Tools` (or localized translation) across all 8 languages.
   - `searchPlaceholder` displays `Search 59+ private tools...` (or localized translation) across all 8 languages.
4. **Multilingual Search Filtering**:
   - Typing a translated keyword (e.g., `"litofanía"`, `"lámpara"`, `"cajones"`, `"boîtier"`, `"Schubladen"`, `"灯罩"`, `"リソフェン"`, `"مصباح"`) into the home search bar successfully matches and filters the corresponding tool cards.
5. **Privacy & Sandboxing**:
   - All dictionary loading remains 100% client-side via ES dynamic imports.
   - Strictly `0` network requests to translation endpoints or third-party APIs.

import { TranslationSchema } from './en';

export const ja: TranslationSchema = {
  common: {
    brandName: 'PrivKnife',
    tagline: 'ブラウザ完結型プライベートツールキット',
    privacyBadge: '🛡️ 100% ブラウザ内処理 • デバイス外への送信なし',
    inBrowserBadge: '100% ブラウザ内完結',
    zeroServerNotice: 'サーバーデータ収集ゼロ • テレメトリゼロ',
    themeLight: '☀️ ライト',
    themeDark: '🌙 ダーク',
    switchToLight: 'ライトモードに切り替え',
    switchToDark: 'ダークモードに切り替え',
    selectLanguage: '言語を選択',
    download: 'ダウンロード',
    copy: 'コピー',
    copied: '✓ コピーしました！',
    reset: 'リセット',
    clear: 'クリア',
    cancel: 'キャンセル',
    close: '閉じる',
    done: '完了',
    loading: '読み込み中...',
    processing: '処理中...',
    error: 'エラー',
    dropFilesPrompt: 'ファイルをここにドロップ、または選択',
    offlineGuarantee: '100% ローカル処理・サーバーへのアップロードなし',
    preview: 'プレビュー',
    settings: '設定',
    options: 'オプション',
    save: '保存',
    undo: '元に戻す',
    readyToUse: '利用可能',
    roadmap: 'ロードマップ',
    comingSoon: '近日公開',
    openTool: 'ツールを開く',
    clearFilters: 'フィルターを解除',
    guaranteedClientSide: '安心のクライアント側完結',
    verifiableOpenSource: '検証可能なオープンソース',
  },
  header: {
    title: 'PrivKnife',
    tagline: 'ブラウザ完結型プライベートツールキット',
    languageSelectAria: '表示言語の選択',
  },
  home: {
    heroTitle: '日常の定番ツールを、ひとつに統合。',
    heroSubtitle: 'バックエンドサーバーなし。テレメトリゼロ。100% クライアントサイド完結。',
    heroBadge: '🛡️ 100% ブラウザ内処理 • サーバー送信ゼロ • テレメトリゼロ',
    heroHeadingStart: 'プライバシー重視のブラウザ内',
    heroHeadingHighlight: '十徳ナイフ',
    heroDescription:
      'ブラウザ内だけで完全に動作する高速な日常ツールスイート。クラウドアップロードなし、テレメトリなし、クッキーなし。',
    ribbonTools: '🇨🇭 59+ の日常便利ツール',
    ribbonZeroBytes: '🔒 端末外への送信 0 バイト',
    ribbonWasm: '⚡ クライアント側 WebAssembly',
    ribbonOpenSource: '📜 MIT オープンソース',
    searchPlaceholder: '59+ の完全ローカルツールを検索 (PDF, 画像, 3D, 暗号, 開発)...',
    allTools: 'すべてのツール',
    toolsCount: '{count} 個のツールが利用可能',
    noResultsTitle: '一致するツールが見つかりません',
    noResultsHint: '別の検索キーワードを試すか、上のカテゴリーを選択してください。',
    launchTool: 'ツールを起動',
    privacyByArchTitle: 'ポリシーではなくアーキテクチャによるプライバシー',
    privacyByArchDesc:
      '一般的なウェブツールは利用規約への同意を求めつつ、裏で文書をクラウドに送信します。PrivKnife は構造から根本的に異なります。',
    categories: {
      all: 'すべてのツール',
      privacy: 'プライバシー & セキュリティ',
      documents: 'ドキュメント & PDF',
      media: 'メディア & 画像',
      audioVideo: 'オーディオ & ビデオ',
      dev: '開発者ユーティリティ',
      '3d': '3D プリント & CAD',
    },
    pillars: {
      zeroServerTitle: 'サーバーデータ収集ゼロ',
      zeroServerDesc:
        'PrivKnife には処理サーバーもリモートストレージもありません。WebAssembly と Web Worker により、すべての処理が端末内で完結します。',
      privacyTitle: 'テレメトリ・追跡ゼロ',
      privacyDesc:
        'Google アナリティクス、追跡ピクセル、ビーコン、広告クッキーは一切不使用。完全な匿名性を保護します。',
      threadTitle: '圧倒的なローカル処理速度',
      threadDesc:
        'ネットワーク送信の遅延ゼロ。CPU/GPU のネイティブ性能をフル活用し、大容量ファイルや大量画像も瞬時に処理します。',
    },
    verifiableTitle: '検証可能なオープンソース',
    verifiableDesc:
      'ブラウザの開発者ツール (F12) のネットワークタブで通信が 0 であることを確認するか、GitHub でソースコードを直接検査できます。',
    githubRepo: 'GitHub リポジトリ',
    uiKitDesignSystem: 'デザインシステム & UI キット',
  },
  footer: {
    mission:
      'PrivKnife はサーバーへのデータ送信や追跡を一切行わず、お使いのブラウザ内だけで完全に動作します。',
    privacyNotice: 'ポリシーではなくアーキテクチャによるプライバシー。',
    copyright: '© 2026 PrivKnife. MIT ライセンスによるオープンソース。',
    zeroStorage: 'サーバー保存ゼロ • テレメトリゼロ • クッキーゼロ',
    privacyLink: 'プライバシー',
    termsLink: '利用規約',
    uiKitLink: 'UI キット',
    githubLink: 'GitHub',
    contactLink: 'お問い合わせ & 課題報告',
  },
  tools: {
    exifStripper: {
      name: 'EXIF & プライバシーメタデータ削除',
      description: '写真をネットに共有する前に、GPS 位置情報、カメラ機種、撮影日時などの個人情報を完全消去。',
    },
    cryptoHash: {
      name: '暗号化ハッシュ & UUID 一括生成',
      description: 'Web Crypto を使用し、ブラウザ上で安全に SHA-256、SHA-512、MD5、UUIDv4 を高速一括生成。',
    },
    csvConverter: {
      name: 'CSV & Excel 変換 (JSON / SQL / Markdown)',
      description: 'CSV や Excel スプレッドシートをパース・フィルタリングし、JSON、SQL INSERT文、Markdown 表に変換。',
    },
    colorPalette: {
      name: 'カラーパレット抽出 & コントラストチェッカー',
      description: '画像から主要色を抽出し、WCAG AA/AAA コントラスト比の検証と HEX/RGB/HSL コードを取得。',
    },
    meshGradient: {
      name: 'CSS メッシュグラデーション & グラスモーフィズム生成',
      description: 'マルチポイントの滑らかな流体グラデーションやすりガラス効果の CSS / Tailwind コードをリアルタイムプレビュー生成。',
    },
    calendarLinker: {
      name: 'カレンダー登録リンク & .ics ファイル作成',
      description: 'Google、Outlook、Yahoo カレンダー追加リンクおよび標準 RFC 5545 .ics ファイルを作成。',
    },
    emailSignature: {
      name: '無料 HTML メール署名ジェネレーター',
      description: 'Gmail、Outlook、Apple Mail、Thunderbird に対応した規格準拠のレスポンシブ HTML メール署名をデザイン。',
    },
    robotsSitemap: {
      name: 'Robots.txt & XML サイトマップビルダー',
      description: 'クローラー指示の設定、AI スクレイピングのブロック、標準 XML サイトマップをクライアント側で生成。',
    },
    pdfMerger: {
      name: 'PDF 結合・分割 & ページ並べ替え',
      description: 'ファイル数や容量制限なしで、ブラウザ内で複数の PDF を結合、回転、並べ替え、分割。',
    },
    pdfRedaction: {
      name: 'PDF 黒塗り・匿名化マスキング',
      description: '機密情報や個人名を復元不能な形で恒久的に黒塗り・白塗りし、内部メタデータも完全抹消。',
    },
    invoiceMaker: {
      name: '即時クライアントサイド請求書・領収書作成',
      description: '自動計算とローカル下書き保存を備えた、クリアなベクター PDF 請求書・領収書をオフライン作成。',
    },
    gridPaper: {
      name: '印刷用 カスタム方眼紙・ドットペーパー作成',
      description: 'メモや製図に最適な高精度ベクター方眼紙、ドットグリッド、アイソメトリック、六角形、罫線紙を生成。',
    },
    barcodeLabels: {
      name: 'Avery バーコード & ラベルシート作成',
      description: 'Code 128、EAN、UPC バーコードや QR コードを含む印刷用 Avery ラベルシールシートを生成。',
    },
    tableTentMaker: {
      name: '折りたたみ卓上三角POP & 店頭サイン作成',
      description: 'メニュー、イベント、WiFi 案内に最適な QR コード付き両面反転 PDF 卓上POP を生成。',
    },
    markdownCheatsheet: {
      name: 'Markdown から学術・技術チートシート PDF 変換',
      description: 'Markdown ノートをシンタックスハイライト付きの多段組み高密度リファレンスシートに変換。',
    },
    batchCompressor: {
      name: '画像一括圧縮 & WebP コンバーター',
      description: '画質を落とさずに数百枚の写真を圧縮し、PNG、JPG、AVIF を最新の WebP に変換。ZIP 一括ダウンロード対応。',
    },
    faviconGenerator: {
      name: 'アプリアイコン & ファビコン一括生成',
      description: 'ファビコン一式、Apple Touch Icon、Android PWA アイコン、webmanifest を完全オフライン生成。',
    },
    ogCardMaker: {
      name: 'SNS シェア (Open Graph) カード作成',
      description: 'Twitter、Facebook、LinkedIn 向けの 1200×630 OGP 画像をテンプレートとプレビュー付きで作成。',
    },
    screenshotMockup: {
      name: 'アプリスクリーンショット モックアップスタジオ',
      description: 'スマホやデスクトップのスクリーンショットを美しい 3D 端末フレームに収め、背景や影をカスタマイズ。',
    },
    subtitlesShifter: {
      name: '字幕タイムシフト & SRT/VTT 変換',
      description: '映画字幕のズレをミリ秒単位で補正し、FPS 変換や SRT / WebVTT 間のフォーマット変換を実行。',
    },
    bpmTapDetector: {
      name: '音声 BPM・ピッチ・キー タップ検出',
      description: 'テンポ、キー、ピッチをリアルタイム検出。音声ファイルをドロップして解析、またはタップでテンポ計測。',
    },
    soundwaveArt: {
      name: 'Spotify コード & 音波アートポスター作成',
      description: 'お気に入りの楽曲をスキャン可能な Spotify コード付きの音波アートに変換し、高解像度ベクター出力。',
    },
    videoGifTrimmer: {
      name: '動画 GIF 変換 & クリップトリマー',
      description: 'MP4 や WebM 動画をアニメーション GIF や軽量動画クリップにブラウザ内オフラインで切り出し。',
    },
    qrStandKeychain: {
      name: '3D プリント QR スタンド & キーホルダー作成',
      description: 'エンボス QR コードを備えた 2 色 3D プリント用スタンドとキーホルダーを生成（.stl, .3mf 出力対応）。',
    },
    cookieCutter: {
      name: 'オリジナル クッキー型 & スタンプ 3D 作成',
      description: 'イラストのシルエットを補強リブ付きの 3D プリント用クッキー抜き型・スタンプに変換。',
    },
    deskWedge: {
      name: 'パラメトリック 卓上ネームプレート 3D 作成',
      description: 'テキスト、傾斜角度、面取りを自由に変更できる 2 色 3D プリント対応の卓上名札プレートをデザイン。',
    },
    backgroundRemover: {
      name: '自動 背景切り抜き・透過スタジオ',
      description: 'ブラウザ内蔵 AI により、人物、商品、イラストの背景を 100% ローカル処理で瞬時に自動消去。',
    },
    dnsChecker: {
      name: 'グローバル DNS 伝播 & WHOIS チェッカー',
      description: 'ブラウザ直結の DNS-over-HTTPS を使用し、世界中の DNS レコード (A, AAAA, MX, CNAME, TXT) とドメイン情報を確認。',
    },
    webVitals: {
      name: 'ウェブサイト パフォーマンス & Core Web Vitals 診断',
      description: '表示速度、アクセシビリティ、Core Web Vitals (LCP, INP, CLS) を診断し、実践的な改善アドバイスを提供。',
    },
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
  },
};

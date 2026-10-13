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
    ribbonTools: '🇨🇭 29+ 種類の便利ツール',
    ribbonZeroBytes: '🔒 端末外への送信 0 バイト',
    ribbonWasm: '⚡ クライアント側 WebAssembly',
    ribbonOpenSource: '📜 MIT オープンソース',
    searchPlaceholder: '29以上の安全なツールを検索（PDF、画像、3D、暗号、開発者向け）...',
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
  },
};

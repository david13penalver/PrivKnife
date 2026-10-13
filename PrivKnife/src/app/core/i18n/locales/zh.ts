import { TranslationSchema } from './en';

export const zh: TranslationSchema = {
  common: {
    brandName: 'PrivKnife',
    tagline: '纯浏览器端隐私工具箱',
    privacyBadge: '🛡️ 100% 浏览器内运行 • 绝不上传您的设备',
    inBrowserBadge: '100% 浏览器内运行',
    zeroServerNotice: '零服务端摄入 • 零遥测跟踪',
    themeLight: '☀️ 浅色',
    themeDark: '🌙 深色',
    switchToLight: '切换至浅色模式',
    switchToDark: '切换至深色模式',
    selectLanguage: '选择语言',
    download: '下载',
    copy: '复制',
    copied: '✓ 已复制！',
    reset: '重置',
    clear: '清空',
    cancel: '取消',
    close: '关闭',
    done: '完成',
    loading: '加载中...',
    processing: '处理中...',
    error: '错误',
    dropFilesPrompt: '将文件拖放至此处，或浏览选择',
    offlineGuarantee: '100% 本地处理，零服务器上传',
    preview: '预览',
    settings: '设置',
    options: '选项',
    save: '保存',
    undo: '撤销',
    readyToUse: '即刻可用',
    roadmap: '路线图',
    comingSoon: '敬请期待',
    openTool: '打开工具',
    clearFilters: '清除筛选',
    guaranteedClientSide: '保证客户端运行',
    verifiableOpenSource: '可验证且开源',
  },
  header: {
    title: 'PrivKnife',
    tagline: '纯浏览器端隐私工具箱',
    languageSelectAria: '选择界面语言',
  },
  home: {
    heroTitle: '集成式日常实用工具箱。',
    heroSubtitle: '无后端服务器。零遥测跟踪。100% 客户端运行。',
    heroBadge: '🛡️ 100% 浏览器内运行 • 零服务器摄入 • 零遥测跟踪',
    heroHeadingStart: '隐私安全的纯浏览器端',
    heroHeadingHighlight: '瑞士军刀',
    heroDescription:
      '完全在您的浏览器内部运行的高速日常网络工具套件。无需云端上传，无遥测，无 Cookie。',
    ribbonTools: '🇨🇭 29+ 款日常工具',
    ribbonZeroBytes: '🔒 0 字节离开设备',
    ribbonWasm: '⚡ 客户端 WebAssembly',
    ribbonOpenSource: '📜 MIT 开源协议',
    searchPlaceholder: '搜索 29+ 款隐私工具（PDF、图像、3D、加密、开发者）...',
    allTools: '全部工具',
    toolsCount: '共 {count} 款可用工具',
    noResultsTitle: '未找到匹配的工具',
    noResultsHint: '请尝试其他搜索词或在上方选择不同分类。',
    launchTool: '启动工具',
    privacyByArchTitle: '架构级隐私保障，而非纸面政策',
    privacyByArchDesc:
      '大多数在线工具要求您信任其法律条款，同时暗中将您的隐私文件上传到远程云存储。PrivKnife 从根本上截然不同。',
    categories: {
      all: '全部工具',
      privacy: '隐私与安全',
      documents: '文档与 PDF',
      media: '媒体与图像',
      audioVideo: '音频与视频',
      dev: '开发者工具',
      '3d': '3D 打印与 CAD',
    },
    pillars: {
      zeroServerTitle: '零服务器数据摄入',
      zeroServerDesc:
        'PrivKnife 没有处理服务器或远程存储桶。所有文件解析、二进制处理与渲染均通过 WebAssembly 与 Web Workers 在您的本地设备上运行。',
      privacyTitle: '零遥测与跟踪',
      privacyDesc:
        '无 Google Analytics，无追踪像素，无遥测信标，零广告 Cookie。让您享有完全的数字匿名性。',
      threadTitle: '极速本地性能',
      threadDesc:
        '零网络上传延迟。利用本地 CPU/GPU 全速处理数十亿字节级文档或数百张图片。',
    },
    verifiableTitle: '可验证且完全开源',
    verifiableDesc:
      '打开浏览器开发者工具 (F12) → 网络 (Network) 标签页可验证 0 个网络请求，或在 GitHub 上审查全部源码。',
    githubRepo: 'GitHub 代码仓库',
    uiKitDesignSystem: '设计系统与 UI 套件',
  },
  footer: {
    mission:
      'PrivKnife 完全在您的浏览器中运行，零服务器数据摄入，零分析跟踪。',
    privacyNotice: '架构级隐私保障，而非纸面政策。',
    copyright: '© 2026 PrivKnife. 基于 MIT 协议开源。',
    zeroStorage: '零服务器存储 • 零遥测跟踪 • 零 Cookie',
    privacyLink: '隐私政策',
    termsLink: '使用条款',
    uiKitLink: 'UI 套件',
    githubLink: 'GitHub',
    contactLink: '联系与反馈',
  },
  tools: {
    exifStripper: {
      name: 'EXIF 与隐私元数据清除器',
      description: '在线分享照片前，清除 GPS 坐标、相机型号及隐私元数据。',
    },
    cryptoHash: {
      name: '密码学哈希与 UUID 批量生成器',
      description: '使用 Web Crypto 在浏览器中安全批量生成 SHA-256、SHA-512、MD5 与 UUIDv4 哈希。',
    },
    csvConverter: {
      name: 'CSV & Excel 转 JSON、SQL 与 Markdown',
      description: '解析、筛选并将 CSV 和 Excel 电子表格转换为 JSON、SQL 插入语句和 Markdown 表格。',
    },
    colorPalette: {
      name: '调色板提取与对比度检测器',
      description: '从图像提取主色调，提供 WCAG AA/AAA 对比度分析与 HEX/RGB/HSL 色值代码。',
    },
    meshGradient: {
      name: 'CSS 流体渐变与毛玻璃代码生成器',
      description: '生成多点流体渐变与毛玻璃磨砂效果 CSS/Tailwind 代码，支持实时预览。',
    },
    calendarLinker: {
      name: '通用日历事件与 .ics 链接生成器',
      description: '创建 Google、Outlook 与 Yahoo 通用添加日历链接，以及标准 RFC 5545 .ics 文件。',
    },
    emailSignature: {
      name: '免费 HTML 邮件签名生成器',
      description: '为 Gmail、Outlook、Apple Mail 及 Thunderbird 设计符合标准的响应式 HTML 邮件签名。',
    },
    robotsSitemap: {
      name: 'Robots.txt 与 XML 网站地图构建器',
      description: '配置搜索引擎爬虫规则、拦截 AI 爬虫抓取，并在客户端直接生成标准 XML Sitemap。',
    },
    pdfMerger: {
      name: 'PDF 合并、拆分与页面整理器',
      description: '直接在浏览器中合并多个 PDF、重新排版、旋转或拆分页面，没有任何文件大小限制。',
    },
    pdfRedaction: {
      name: 'PDF 敏感信息涂黑与脱敏工具',
      description: '永久遮蔽或涂白敏感数据、身份证号与姓名，同时彻底清除机密元数据。',
    },
    invoiceMaker: {
      name: '纯客户端即时发票与收据生成器',
      description: '离线起草清晰的矢量 PDF 发票与打印收据，支持即时计算与本地草稿保存。',
    },
    gridPaper: {
      name: '自定义可打印坐标纸与点阵纸',
      description: '生成高精度矢量方格、点阵、等轴测、六边形及横线纸张，适合笔记与绘图设计。',
    },
    barcodeLabels: {
      name: 'Avery 条形码与标签纸生成器',
      description: '生成包含 Code 128、EAN、UPC 条形码及自定义二维码的可打印 Avery 标签纸。',
    },
    tableTentMaker: {
      name: '折叠桌牌与立牌告示生成器',
      description: '生成带二维码的双面倒置 PDF 折叠立牌，适用于菜单、活动通知及 WiFi 提示牌。',
    },
    markdownCheatsheet: {
      name: 'Markdown 转学术与技术速查表 PDF',
      description: '将 Markdown 笔记转换为紧凑多栏、带代码语法高亮的高清打印参考速查表。',
    },
    batchCompressor: {
      name: '批量图像压缩与 WebP 转换器',
      description: '无损压缩数百张照片，将 PNG、JPG、AVIF 转换为现代 WebP 格式，支持一键 ZIP 打包下载。',
    },
    faviconGenerator: {
      name: '应用图标与 Favicon 套件生成器',
      description: '离线生成完整的网站图标包、Apple Touch 图标、Android PWA 图标及 webmanifest 文件。',
    },
    ogCardMaker: {
      name: '社交分享 (Open Graph) 卡片设计器',
      description: '为 Twitter、Facebook 和 LinkedIn 设计 1200×630 社交分享预览图，提供模版与实时预览。',
    },
    screenshotMockup: {
      name: '应用截图模型包装工作室',
      description: '将移动与桌面应用截图放入高品质 3D 设备模型中，支持自定义背景与阴影。',
    },
    subtitlesShifter: {
      name: '字幕时间轴校准与 SRT/VTT 转换器',
      description: '修复音画不同步的影视字幕，毫秒级调整时间偏移、转换帧率，并在 SRT 与 WebVTT 间转换。',
    },
    bpmTapDetector: {
      name: '音频 BPM 测速、音高与调性检测器',
      description: '实时检测节拍速度、音乐调性与音高。拖放音频进行本地深度分析或伴随节拍器手动敲击测速。',
    },
    soundwaveArt: {
      name: 'Spotify 歌曲代码与声波艺术画生成器',
      description: '将喜爱的歌曲转化为定制声波装饰画，附带可扫码的 Spotify 代码与高清矢量导出。',
    },
    videoGifTrimmer: {
      name: '视频转 GIF 与片段裁剪工具',
      description: '完全在浏览器中离线将 MP4、WebM 视频剪裁为动图 GIF 或轻量级视频片段。',
    },
    qrStandKeychain: {
      name: '3D 二维码立牌与钥匙扣生成器',
      description: '生成双色 3D 可打印二维码展示架和钥匙扣，浮雕立体码支持导出为 .stl 和 .3mf 格式。',
    },
    cookieCutter: {
      name: '定制曲奇饼干模具与印章 3D 制作器',
      description: '将剪影轮廓图转换为带有加强筋壁厚的 3D 可打印曲奇切模与压印模具。',
    },
    deskWedge: {
      name: '参数化桌面铭牌与桌签 3D 制作器',
      description: '设计可定制文字、倾角与倒角的双色 3D 打印桌面名牌立牌。',
    },
    backgroundRemover: {
      name: '全自动智能抠图与背景去除工作室',
      description: '100% 在浏览器本地运行轻量 AI，精准抠出人像、商品及图形照片的主体。',
    },
    dnsChecker: {
      name: '全球 DNS 解析记录与 WHOIS 查询',
      description: '通过浏览器原生 DNS-over-HTTPS 直接查询全球 DNS 记录 (A, AAAA, MX, CNAME, TXT) 与域名信息。',
    },
    webVitals: {
      name: '网页性能与 Core Web Vitals 检测诊断',
      description: '评估页面性能、无障碍性及核心性能指标 (LCP, INP, CLS)，并提供实用的优化建议。',
    },
  },
};

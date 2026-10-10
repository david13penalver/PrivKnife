# 00 - Platform, SEO, UX & Production Readiness Specification

> **Scope**: This document defines the core infrastructure, SEO standards, accessibility requirements, responsive design rules, error handling, loading patterns, and compliance policies shared by all tools in **PrivKnife**.

---

## 1. Technical Architecture & Foundational Goals

Every tool developed in PrivKnife inherits this specification to ensure consistent user experience, SEO discoverability, WCAG 2.1 AA accessibility, and zero-compromise privacy.

---

## 2. SEO & Meta Architecture

### 2.1. Dynamic Meta Titles & Descriptions
- Every tool route in `app.routes.ts` **MUST** declare a unique, keyword-optimized `title`:
  ```typescript
  {
    path: 'tools/exif-stripper',
    title: 'EXIF Metadata Stripper & Privacy Cleaner — PrivKnife',
    loadComponent: () => import('./tools/privacy/exif-stripper/exif-stripper.component')
      .then(m => m.ExifStripperComponent)
  }
  ```
- **Formula**: `[Tool Name] — [Primary Benefit / Keywords] | PrivKnife`
- **Length**: 50–60 characters max.

### 2.2. Dynamic Meta Descriptions
- Handled via Angular's `Meta` service on component initialization or router navigation:
- **Formula**: High-intent, action-oriented summary highlighting 100% in-browser privacy and zero file uploads.
- **Length**: 140–160 characters.
- **Example**: *"Strip GPS location, camera model, and timestamps from your photos online for free. 100% client-side in your browser. No files uploaded."*

### 2.3. Social Share Cards (Open Graph & Twitter)
- Open Graph tags added to `index.html` and updated per tool:
  - `og:type = "website"`
  - `og:site_name = "PrivKnife"`
  - `og:title = "[Tool Title]"`
  - `og:description = "[Tool Description]"`
  - `og:image = "https://privknife.com/assets/og/og-[tool-slug].png"` (1200×630px `.webp` / `.png`)
  - `twitter:card = "summary_large_image"`

### 2.4. `robots.txt` & `sitemap.xml`
- Located in `public/robots.txt`:
  ```txt
  User-agent: *
  Allow: /
  Sitemap: https://privknife.com/sitemap.xml
  ```
- Located in `public/sitemap.xml`:
  - Contains index URL (`/`) with priority `1.0`.
  - Lists all 29 tool URLs with priority `0.8` and `monthly` change frequency.

### 2.5. Favicon Package
- Multi-resolution icon suite in `public/`:
  - `favicon.ico` (multi-size: 16x16, 32x32, 48x48)
  - `favicon.svg` (crisp vector SVG with Swiss red theme)
  - `apple-touch-icon.png` (180×180px)
  - `site.webmanifest` (PWA manifest with name, theme_color, and icons)

---

## 3. UI/UX, Layout & Responsive Standards

### 3.1. Mobile-First Responsive Design
- Every tool MUST be fully functional on mobile devices (down to 320px screen width).
- **Minimum Touch Targets**: All interactive buttons, checkboxes, and tabs must be at least 44×44px (`min-height: 44px; min-width: 44px;`).
- Multi-column layouts (`.l-columns--3`, `.l-columns--2`) must automatically collapse to single-column on mobile viewports.
- File dropzones on mobile must support camera/gallery file picker fallback.

### 3.2. Loading States & Transitions
- For operations taking **>50ms**:
  - Buttons must show `.c-button--loading` with animated spinner.
  - Workers must report progress percentages using `<app-progress-bar [value]="percent">`.
  - Indeterminate background tasks (e.g. WASM binary compilation) must display `<app-progress-bar [indeterminate]="true">`.
- Avoid layout shifts (CLS < 0.1) by reserving container dimensions before rendering images or previews.

### 3.3. Actionable Error Messaging
- Never display raw exception traces or cryptic console errors to the user.
- Errors must appear in clear, human-readable alert boxes styled with `.c-badge--danger` or `.c-input__error`.
- Error messages must explain **what went wrong** and **what to do next**:
  - *Bad*: "Error: Failed to parse buffer."
  - *Good*: "Unable to read this file. Please verify that the file is a valid JPEG or PNG under 100MB."

### 3.4. Custom 404 Page (`NotFoundPage`)
- Angular wildcard route `{ path: '**', loadComponent: ... }`.
- Features:
  - Clean error illustration/graphic with Swiss aesthetic.
  - "Page Not Found (404)" title.
  - Search or category shortcuts to the most popular tools.
  - Primary button: "← Back to All Tools" navigating to `/`.

---

## 4. Accessibility & Performance (WCAG 2.1 AA)

### 4.1. Image & Asset Hygiene
- **Alt Text**: Every informative `<img>` MUST have a descriptive `alt` attribute. Decorative icons must have `aria-hidden="true"`.
- **Format**: All static graphic assets must be optimized `.webp` or vector `.svg`.
- **Contrast**: Text contrast ratios must meet WCAG 2.1 AA (at least 4.5:1 for body text, 3:1 for large headings).

### 4.2. Keyboard Navigation
- Every tool must be operable using keyboard only (`Tab`, `Enter`, `Space`, `Esc`).
- Visible focus rings styled using `@mixin focus-ring` on all interactive controls.

---

## 5. Privacy, Compliance & Legal Policies

### 5.1. Zero-Cookie Policy
- **No Tracking Cookies**: PrivKnife does not set any third-party, analytics, or advertising cookies.
- **Local Storage**: `localStorage` is used exclusively for client-side user preferences (such as dark/light mode `theme` and unsaved draft forms).
- **Banner Requirement**: Because no tracking cookies exist, no intrusive cookie-consent popups are required under GDPR/ePrivacy directives. A clear *"Zero Cookies / 100% In-Browser"* badge in the footer replaces the banner.

### 5.2. Privacy & Telemetry Standards
- Strictly adheres to **Directive 2 of AGENTS.md**: No telemetry beacons, Google Analytics, Mixpanel, or third-party tracking scripts.
- Privacy Policy page (`/privacy`) outlines:
  - Technical guarantee: In-browser WebAssembly and Web Crypto execution.
  - Zero server logging.
  - Code auditability via open-source GitHub repository.

### 5.3. Terms and Conditions (`/terms`)
- MIT License declaration.
- Standard "AS IS" disclaimer: No warranty of fitness for a particular purpose; users retain 100% ownership of processed files.

### 5.4. Legitimate Contact & Feedback Channels
- Footer and header links to:
  - **GitHub Repository**: Bug reports and feature requests via GitHub Issues.
  - **Community Discussions**: GitHub Discussions for tool ideas and feedback.
  - **Security Email**: Direct contact channel (`security@privknife.com` or GitHub Security Advisory) for reporting vulnerability disclosures.

---

## 6. Implementation Checklist for Production

- [x] **Custom 404 Route**: Register wildcard route in `app.routes.ts`.
- [x] **SEO Service**: Service managing dynamic titles, meta descriptions, and Open Graph tags.
- [x] **Favicon Bundle**: Generate `.ico`, `.svg`, and Apple touch icons in `public/`.
- [x] **robots.txt & sitemap.xml**: Static generation in `public/`.
- [x] **Privacy & Terms Pages**: Static informational routes `/privacy` and `/terms`.
- [x] **Contact Section**: Links to GitHub and community feedback in `<app-footer>`.
- [x] **Lighthouse Verification**: Target 100/100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.

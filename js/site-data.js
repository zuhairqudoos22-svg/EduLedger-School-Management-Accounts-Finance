/**
 * ============================================================================
 * NextGenAI — Central Site Content Configuration (EDIT EVERYTHING HERE)
 * ============================================================================
 *
 * HOW TO EDIT:
 * 1. Replace obvious placeholders like "YOUR_EMAIL_HERE", "YOUR_PHONE_HERE",
 *    "YOUR_WHATSAPP_NUMBER_HERE", and "YOUR_LINK_HERE" with your real details.
 * 2. Leave any optional URL or social link as "" (empty string) to hide it
 *    automatically — the page will never break or show empty buttons.
 * 3. To add a new project, copy ONE object inside the `projects` array below,
 *    paste it at the top or bottom, edit the fields, save, and upload again.
 *
 * NOTE: Use relative paths (./assets/...) so everything works on Netlify root,
 * GitHub Pages sub-paths (/your-repo/), and offline caches.
 * ============================================================================
 */
window.SITE_DATA = {
  /* ------------------------------------------------------------------------
   * 1. BRAND IDENTITY & HERO COPY
   * ---------------------------------------------------------------------- */
  brand: {
    name: 'NextGenAI',
    tagline: 'Intelligent software, built for the next generation',
    heroHeadline: 'Software, engineered for what’s next.',
    heroSubtitle:
      'We design and build fast, offline-first web applications, Progressive Web Apps, and practical school and business management platforms — crafted to run reliably on free-tier cloud infrastructure.',
    trustChips: [
      'Offline-first',
      'PWA',
      'Secure by design',
      'Free-tier friendly',
    ],
    logos: {
      128: {
        webp: './assets/logo/nextgenai-logo-128.webp',
        jpg: './assets/logo/nextgenai-logo-128.jpg',
      },
      256: {
        webp: './assets/logo/nextgenai-logo-256.webp',
        jpg: './assets/logo/nextgenai-logo-256.jpg',
      },
      512: {
        webp: './assets/logo/nextgenai-logo-512.webp',
        jpg: './assets/logo/nextgenai-logo-512.jpg',
      },
      // Last-resort embedded fallback so the brand logo never shows a broken image
      fallbackDataUri:
        'data:image/webp;base64,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',
    },
    footerNote: 'Built with care by NextGenAI',
    footerBlurb:
      'Independent software studio crafting offline-first PWAs, institutional systems, and practical digital products that run lean and last.',
  },

  /* ------------------------------------------------------------------------
   * 2. ABOUT SECTION & TECH STACK
   * ---------------------------------------------------------------------- */
  about: {
    eyebrow: 'About NextGenAI',
    heading: 'Practical engineering for real-world teams.',
    paragraphs: [
      'NextGenAI is an independent software studio focused on turning complex day-to-day workflows — from school finance and attendance to retail billing — into calm, dependable web applications.',
      'Every product is engineered with an offline-first mindset, strict data hygiene, and zero unnecessary cloud bloat so organizations can run modern software without heavy monthly infrastructure bills.',
    ],
    // Edit this placeholder bio with your personal founder story anytime
    founderBio:
      'Replace this short note in js/site-data.js with your own background, mission, or city. Keep it to 2–3 focused sentences for crisp readability.',
  },

  stats: [
    { label: 'Projects Shipped', value: 14, suffix: '+' },
    { label: 'Years Building', value: 4, suffix: '+' },
    { label: 'Active Clients', value: 25, suffix: '+' },
    { label: 'Countries Reached', value: 6, suffix: '' },
  ],

  skills: [
    'HTML5 & Modern CSS',
    'Vanilla JavaScript (ES6+)',
    'Progressive Web Apps (PWA)',
    'Offline-First & IndexedDB',
    'Firebase Spark (Auth & Firestore)',
    'React & TypeScript',
    'Responsive UI Systems',
    'AI-Assisted Workflows',
    'Netlify & GitHub Pages',
  ],

  /* ------------------------------------------------------------------------
   * 3. PROJECTS PORTFOLIO
   *    Category options used by filter tabs: "Web Apps", "PWAs", "Tools"
   *    Status options: "Live" | "Beta" | "Coming Soon"
   *    Leave `image`, `liveUrl`, or `githubUrl` empty ("") to use clean fallbacks.
   * ---------------------------------------------------------------------- */
  projects: [
    {
      id: 'eduledger-pwa',
      title: 'EduLedger: School Management & Accounts PWA',
      category: 'PWAs',
      shortDescription:
        'All-in-one offline-first school administration, student and staff attendance, fee collection, payroll, and financial reporting suite built for everyday reliability.',
      longDescription:
        'EduLedger brings student admissions, dynamic class and fee structures, batch fee collection, automated receipt generation, staff payroll, expense budgets, and data-integrity audits into a single installable Progressive Web App. Designed to operate seamlessly even during internet outages, with optional free-tier cloud sync.',
      highlights: [
        'Offline-first architecture with instant local backup and JSON restore',
        'Dynamic class management, itemized fee heads, and batch collection',
        'Role-based access control, attendance CSV exports, and audit trails',
      ],
      tags: ['PWA', 'Offline-first', 'Firebase', 'Finance'],
      image: './assets/images/eduledger-preview.webp',
      imageFallback: './assets/images/eduledger-preview.jpg',
      gallery: [
        {
          src: './assets/images/eduledger-preview.webp',
          fallback: './assets/images/eduledger-preview.jpg',
          caption: 'Executive operations dashboard with real-time attendance and fee collection analytics.',
        },
      ],
      liveUrl: 'YOUR_EDULEDGER_URL_HERE',
      githubUrl: 'YOUR_LINK_HERE',
      status: 'Live',
      featured: true,
    },
    {
      id: 'quickbill-invoice',
      title: 'QuickBill: Invoice & Receipt Generator',
      category: 'Tools',
      shortDescription:
        'Lightweight browser-based invoicing tool for freelancers and small shops to generate itemized receipts, tax totals, and print-ready PDFs with zero server setup.',
      longDescription:
        'QuickBill eliminates bloated accounting subscriptions for solo operators and small businesses. Save client profiles locally in the browser, customize currency and tax rates, apply line-item discounts, and export clean branded PDF invoices in seconds.',
      highlights: [
        '100% client-side storage — financial data never leaves the device',
        'Multi-currency support with automatic subtotal, tax, and discount math',
        'Clean print stylesheet and one-click PDF download',
      ],
      tags: ['Tools', 'Offline-first', 'PDF Export', 'Zero-Backend'],
      image: './assets/images/invoice-generator-preview.webp',
      imageFallback: './assets/images/invoice-generator-preview.jpg',
      gallery: [
        {
          src: './assets/images/invoice-generator-preview.webp',
          fallback: './assets/images/invoice-generator-preview.jpg',
          caption: 'Clean itemized invoice builder with live tax totals and instant PDF export.',
        },
      ],
      liveUrl: 'YOUR_LINK_HERE',
      githubUrl: '',
      status: 'Beta',
      featured: false,
    },
    {
      id: 'pulsepos-coming-soon',
      title: 'PulsePOS: Retail Inventory & Billing',
      category: 'Web Apps',
      shortDescription:
        'Upcoming fast-checkout inventory and point-of-sale web application tailored for local bookstores, clinics, and neighborhood retailers.',
      longDescription:
        'Currently in active design and prototyping at NextGenAI. PulsePOS will pair barcode-ready item scanning, low-stock alerts, daily cash-drawer reconciliation, and offline receipt printing inside a lightweight web app that runs on any laptop or tablet.',
      highlights: [
        'Keyboard-first fast checkout flow with barcode scanner compatibility',
        'Automatic stock alerts and supplier purchase tracking',
        'Works offline with automatic sync when connectivity returns',
      ],
      tags: ['Web Apps', 'Inventory', 'PWA', 'Retail'],
      // Left empty on purpose to show the built-in styled gradient preview fallback
      image: '',
      imageFallback: '',
      gallery: [],
      liveUrl: '',
      githubUrl: '',
      status: 'Coming Soon',
      featured: false,
    },
  ],

  /* ------------------------------------------------------------------------
   * 4. SERVICES OFFERED (4 CORE CARDS)
   *    Supported icon keys: "web", "systems", "pwa", "ai"
   * ---------------------------------------------------------------------- */
  services: [
    {
      number: '01',
      icon: 'web',
      title: 'Custom Web Apps',
      description:
        'Fast, maintainable browser applications tailored to your exact workflow — built with clean standards, responsive layouts, and zero vendor lock-in.',
    },
    {
      number: '02',
      icon: 'systems',
      title: 'School & Business Management Systems',
      description:
        'End-to-end administration portals covering student records, billing, payroll, inventory, and printable audit reports designed for real teams.',
    },
    {
      number: '03',
      icon: 'pwa',
      title: 'PWA & Mobile-Ready Apps',
      description:
        'Installable Progressive Web Apps that feel native on desktop and mobile, stay responsive on slow networks, and keep working offline.',
    },
    {
      number: '04',
      icon: 'ai',
      title: 'AI-Assisted Development',
      description:
        'Rapid prototyping, smart automation workflows, and modern engineering acceleration that take ideas from specification to production faster.',
    },
  ],

  /* ------------------------------------------------------------------------
   * 5. CONTACT DETAILS & SOCIAL LINKS
   *    Replace placeholders with your real info. Leave unused socials as ""
   *    to hide them automatically.
   * ---------------------------------------------------------------------- */
  contact: {
    email: 'YOUR_EMAIL_HERE',
    phone: 'YOUR_PHONE_HERE',
    // Enter digits with country code and no + or spaces, e.g. "923001234567"
    whatsapp: 'YOUR_WHATSAPP_NUMBER_HERE',
    location: 'YOUR_CITY_COUNTRY_HERE',
    availability: 'Available for freelance projects & custom software',
    socials: {
      github: 'YOUR_LINK_HERE',
      linkedin: 'YOUR_LINK_HERE',
      facebook: '',
      youtube: '',
      x: '',
    },
  },
};

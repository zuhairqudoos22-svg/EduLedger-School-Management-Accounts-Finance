/**
 * NextGenAI Developer Branding Configuration (Vanilla JS / Browser Global)
 * Ships with the application codebase for Netlify and PWA offline deployment.
 */
(function(root) {
  var NEXTGENAI_128_DATA_URI =
    'data:image/webp;base64,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';

  var branding = {
    developerName: 'NextGenAI',
    creditText: 'Developed by NextGenAI',
    poweredByText: 'Powered by NextGenAI',
    tagline: 'Intelligent Institutional Management Systems',
    websiteUrl: 'https://nextgenai.dev',
    supportEmail: 'nextgentai@proton.me',
    logos: {
      128: {
        webp: './assets/branding/nextgenai-logo-128.webp',
        jpg: './assets/branding/nextgenai-logo-128.jpg'
      },
      256: {
        webp: './assets/branding/nextgenai-logo-256.webp',
        jpg: './assets/branding/nextgenai-logo-256.jpg'
      },
      512: {
        webp: './assets/branding/nextgenai-logo-512.webp',
        jpg: './assets/branding/nextgenai-logo-512.jpg'
      }
    },
    fallbackDataUri128: NEXTGENAI_128_DATA_URI
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = branding;
  } else {
    root.NextGenAIBranding = branding;
  }
})(typeof window !== 'undefined' ? window : this);

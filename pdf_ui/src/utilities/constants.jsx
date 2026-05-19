// Brand colors aligned to Hartnell's Bootstrap variables
export const BLUE = '#4F9DF0';
export const INDIGO = '#6610f2';
export const PURPLE = '#A25581';
export const PINK = '#e83e8c';
export const RED = '#860038';
export const ORANGE = '#F54F38';
export const YELLOW = '#FFCC21';
export const GREEN = '#019366';
export const TEAL = '#15D48A';
export const CYAN = '#43C3C6';
export const WHITE = '#fff';
export const GRAY = '#7D818B';
export const GRAY_DARK = '#4C4E53';
export const LIGHT = '#FAFBFB';
export const DARK = '#48002E';
export const DANGER = '#FF0000';

export const PRIMARY_MAIN = RED;
export const SECONDARY_MAIN = DARK;
export const CHAT_LEFT_PANEL_BACKGROUND = LIGHT;
export const HEADER_BACKGROUND = DARK;
export const primary_50 = '#F8E6EF';

export const isMaintenanceMode = import.meta.env.REACT_APP_MAINTENANCE_MODE === 'true';

// export const Authority = import.meta.env.REACT_APP_AUTHORITY;
// export const region = import.meta.env.REACT_APP_AWS_REGION;
// export const Bucket = import.meta.env.REACT_APP_BUCKET_NAME;
// export const Bucket_Region = import.meta.env.REACT_APP_BUCKET_REGION;

// Separate buckets for different formats
export const PDFBucket = import.meta.env.REACT_APP_PDF_BUCKET_NAME || 'Null';
export const HTMLBucket = import.meta.env.REACT_APP_HTML_BUCKET_NAME || 'Null';

/**
 * Validate bucket configuration and return deployment status
 * @returns {Object} Validation result with deployment status and missing buckets
 */
export const validateBucketConfiguration = () => {
  const pdfBucketConfigured = import.meta.env.REACT_APP_PDF_BUCKET_NAME && import.meta.env.REACT_APP_PDF_BUCKET_NAME !== 'Null';
  const htmlBucketConfigured = import.meta.env.REACT_APP_HTML_BUCKET_NAME && import.meta.env.REACT_APP_HTML_BUCKET_NAME !== 'Null';

  const needsFullDeployment = !pdfBucketConfigured && !htmlBucketConfigured;
  const missingBuckets = [];

  if (!pdfBucketConfigured) missingBuckets.push('PDF Bucket');
  if (!htmlBucketConfigured) missingBuckets.push('HTML Bucket');

  return {
    needsFullDeployment,
    needsDeployment: missingBuckets.length > 0,
    missingBuckets,
    pdfBucketConfigured,
    htmlBucketConfigured,
    deploymentUrl: 'https://github.com/ASUCICREPO/PDF_Accessibility'
  };
};

/**
 * Validate bucket configuration for a specific format
 * @param {string} format - 'pdf' or 'html'
 * @returns {Object} Validation result for the specific format
 */
export const validateFormatBucket = (format) => {
  const isPdfFormat = format === 'pdf';
  const bucketConfigured = isPdfFormat
    ? (import.meta.env.REACT_APP_PDF_BUCKET_NAME && import.meta.env.REACT_APP_PDF_BUCKET_NAME !== 'Null')
    : (import.meta.env.REACT_APP_HTML_BUCKET_NAME && import.meta.env.REACT_APP_HTML_BUCKET_NAME !== 'Null');

  return {
    isConfigured: bucketConfigured,
    needsDeployment: !bucketConfigured,
    format: format,
    bucketType: isPdfFormat ? 'PDF Bucket' : 'HTML Bucket',
    deploymentUrl: 'https://github.com/ASUCICREPO/PDF_Accessibility'
  };
};

export const COGNITO_AUTHORITY=import.meta.env.REACT_APP_COGNITO_AUTHORITY;
export const COGNITO_DOMAIN=import.meta.env.REACT_APP_COGNITO_DOMAIN;
export const COGNITO_CLIENT_ID=import.meta.env.REACT_APP_COGNITO_CLIENT_ID;
export const COGNITO_IDP_NAME=import.meta.env.REACT_APP_COGNITO_IDP_NAME;
export const REDIRECT_URI=import.meta.env.REACT_APP_REDIRECT_URI;

// Preferably not use
// export const HostedUserPoolDomain = process.env.REACT_APP_USER_POOL_DOMAIN;

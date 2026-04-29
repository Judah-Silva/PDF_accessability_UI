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

export const isMaintenanceMode = import.meta.REACT_APP_MAINTENANCE_MODE === 'true';

export const SESSION_KEY = 'app_authenticated';
export const SESSION_TOKEN_KEY = 'app_token';
export const SESSION_USERNAME_KEY = 'app_username';

// export const Authority = import.meta.REACT_APP_AUTHORITY;
// export const region = import.meta.REACT_APP_AWS_REGION;
// export const Bucket = import.meta.REACT_APP_BUCKET_NAME;
// export const Bucket_Region = import.meta.REACT_APP_BUCKET_REGION;

// Separate buckets for different formats
export const PDFBucket = import.meta.REACT_APP_PDF_BUCKET_NAME || 'Null';
export const HTMLBucket = import.meta.REACT_APP_HTML_BUCKET_NAME || 'Null';

/**
 * Validate bucket configuration and return deployment status
 * @returns {Object} Validation result with deployment status and missing buckets
 */
export const validateBucketConfiguration = () => {
  const pdfBucketConfigured = import.meta.REACT_APP_PDF_BUCKET_NAME && import.meta.REACT_APP_PDF_BUCKET_NAME !== 'Null';
  const htmlBucketConfigured = import.meta.REACT_APP_HTML_BUCKET_NAME && import.meta.REACT_APP_HTML_BUCKET_NAME !== 'Null';

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
  console.log(import.meta.REACT_APP_PDF_BUCKET_NAME);
  console.log(process.env.REACT_APP_PDF_BUCKET_NAME);
  const isPdfFormat = format === 'pdf';
  const bucketConfigured = isPdfFormat
    ? (import.meta.REACT_APP_PDF_BUCKET_NAME && import.meta.REACT_APP_PDF_BUCKET_NAME !== 'Null')
    : (import.meta.REACT_APP_HTML_BUCKET_NAME && import.meta.REACT_APP_HTML_BUCKET_NAME !== 'Null');

  return {
    isConfigured: bucketConfigured,
    needsDeployment: !bucketConfigured,
    format: format,
    bucketType: isPdfFormat ? 'PDF Bucket' : 'HTML Bucket',
    deploymentUrl: 'https://github.com/ASUCICREPO/PDF_Accessibility'
  };
};

// export const DomainPrefix = import.meta.REACT_APP_DOMAIN_PREFIX;
export const HostedUIUrl = import.meta.REACT_APP_HOSTED_UI_URL;
// export const IndentityPoolId = process.env.REACT_APP_IDENTITY_POOL_ID;

// export const FirstSignInAPI = process.env.REACT_APP_UPDATE_FIRST_SIGN_IN;
// export const CheckAndIncrementQuota = process.env.REACT_APP_UPLOAD_QUOTA_API;

// export const UserPoolClientId = process.env.REACT_APP_USER_POOL_CLIENT_ID;
// export const UserPoolId = process.env.REACT_APP_USER_POOL_ID;





// Preferably not use
// export const HostedUserPoolDomain = process.env.REACT_APP_USER_POOL_DOMAIN;

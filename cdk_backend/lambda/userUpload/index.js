import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true', // required for cookies
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const claims = event.requestContext?.authorizer?.claims;
  const userSub = claims?.sub;

  const { fileName, fileType, fileSize, remediationType } = JSON.parse(event.body || '{}');
  
  // SECURITY: validate file type — never trust the client's claimed MIME type alone
  if (!ALLOWED_MIME_TYPES.includes(fileType)) {
    console.log(`Invalid file type: ${fileType}`)
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Only PDF files are allowed' }) };
  }
  
  // SECURITY: scope uploads to the authenticated user's own folder
  // and add a random ID to prevent filename collisions/overwrites
  const uploadKey = remediationType === 'pdf2pdf' ? `pdf/${fileName}` : `uploads/${fileName}`;
  const bucket = remediationType === 'pdf2pdf' ? process.env.PDF_TO_PDF_BUCKET : process.env.PDF_TO_HTML_BUCKET;
  if (!bucket) {
    console.log('Upload bucket not found.')
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server configuration error." })}
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uploadKey,
    ContentType: 'application/pdf',
    ContentLength: fileSize,
    // SECURITY: tag the object with the uploader's identity for auditing
    Tagging: `uploadedBy=${userSub}`,
    // SECURITY: server-side encryption at rest
    ServerSideEncryption: 'AES256',
  });

  // URL expires in 5 minutes — short enough to limit misuse
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      uploadUrl: presignedUrl,
      key: uploadKey, // return the key so the frontend knows where the file landed
    }),
  };
};

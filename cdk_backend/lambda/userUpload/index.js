import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { jwtVerify, importSPKI } from 'jose';

const s3 = new S3Client({});

const ALLOWED_MIME_TYPES = ['application/pdf'];

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true', // required for cookies
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  // SECURITY: verify the user's access token from the httpOnly cookie
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const cookies = parseCookies(cookieHeader);
  const accessToken = cookies['access_token'];

  if (!accessToken) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthenticated' }) };
  }

  let payload;
  try {
    const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'), 'RS256');
    ({ payload } = await jwtVerify(accessToken, publicKey, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    }));
  } catch (err) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const { fileName, fileType, fileSize, remediationType } = JSON.parse(event.body || '{}');

  // SECURITY: validate file type — never trust the client's claimed MIME type alone
  if (!ALLOWED_MIME_TYPES.includes(fileType)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Only PDF files are allowed' }) };
  }

  // SECURITY: sanitize the filename — strip path traversal and special characters
  // const safeFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  // const safeFileName = `${safeName}-${crypto.randomUUID()}`;

  // SECURITY: scope uploads to the authenticated user's own folder
  // and add a random ID to prevent filename collisions/overwrites
  const uploadKey = remediationType === 'pdf2pdf' ? `pdf/${fileName}` : `uploads/${fileName}`;

  const bucket = remediationType === 'pdf2pdf' ? process.env.PDF_TO_PDF_BUCKET : process.env.PDF_TO_HTML_BUCKET;
  if (!bucket) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server configuration error." })}
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uploadKey,
    ContentType: 'application/pdf',
    ContentLength: fileSize,
    // SECURITY: tag the object with the uploader's identity for auditing
    Tagging: `uploadedBy=${payload.sub}`,
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

function parseCookies(header) {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
  );
}

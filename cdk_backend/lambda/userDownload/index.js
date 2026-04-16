import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { jwtVerify, importSPKI } from 'jose';

const s3 = new S3Client({});

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true', // required for cookies
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  // SECURITY: verify the user's access token\
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
  } catch {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const { key } = JSON.parse(event.body || '{}');

  if (!key) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing file key' }) };
  }

  // SECURITY: ensure the user can only download files from their own files.
  // FINISH LATER
  // so we just check the prefix matches the authenticated user.
//   if (!key.split('/')[1].startsWith(`${payload.sub}`)) {
//     return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
//   }

  // SECURITY: make sure the key doesn't contain path traversal
  if (key.includes('..')) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid key' }) };
  }
  try {
      const bucket = key.startsWith('pdf/') ? process.env.PDF_TO_PDF_BUCKET : process.env.PDF_TO_HTML_BUCKET;

      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        // tells the browser to download the file rather than try to open it
        ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`,
      });
    
      // short expiry — download should start immediately
      const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ downloadUrl }),
      };
  } catch (err) {
    if (err.name === 'NotFound') {
      // file doesn't exist yet — not an error, just not ready
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ notFound: true }) };
    }
    console.log(`Error generating presigned download url for ${key}.`)
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Error during S3 download process.' })}
  }
};

function parseCookies(header) {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
  );
}

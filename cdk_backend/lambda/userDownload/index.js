import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { jwtVerify, importSPKI } from 'jose';

const s3 = new S3Client({});

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

  // SECURITY: verify the user's access token
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) {
    console.log('No access token found. Rejecting access.')
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

  const { key, bucket } = JSON.parse(event.body || '{}');

  if (!key) {
    console.log('Missing file key');
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing file key' }) };
  }
  
  if (!bucket) {
    console.log('Missing bucket.');
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing bucket' }) };
  }

  console.log(`Request for bucket - key: ${bucket} - ${key}`);

  // SECURITY: ensure the user can only download files from their own files.
  // FINISH LATER
  // so we just check the prefix matches the authenticated user.
//   if (!key.split('/')[1].startsWith(`${payload.sub}`)) {
//     return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
//   }

  // SECURITY: make sure the key doesn't contain path traversal
  if (key.includes('..')) {
    console.log(`Invalid key: ${key}`)
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid key' }) };
  }
  try {
      console.log(`Checking existence of file: ${key}`);
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));


      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        // tells the browser to download the file rather than try to open it
        ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"`,
      });
    
      // short expiry — download should start immediately
      const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    
      console.log('File found, returning download URL.');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ downloadUrl }),
      };
  } catch (err) {
    if (err.name === 'NotFound') {
      // file doesn't exist yet — not an error, just not ready
      console.log('File not found.');
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

import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

  const { key, bucket } = JSON.parse(event.body || '{}');

  if (!key) {
    console.log('Missing file key');
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing file key' }) };
  }
  
  if (!bucket) {
    console.log('Missing bucket.');
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing bucket' }) };
  }

  // SECURITY: make sure the key doesn't contain path traversal
  if (key.includes('..')) {
    console.log(`Invalid key: ${key}`)
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid key' }) };
  }

  console.log(`Request for bucket - key: ${bucket} - ${key}`);

  // SECURITY: ensure the user can only download files from their own files.
  // FINISH LATER
  // so we just check the prefix matches the authenticated user.
//   if (!key.split('/')[1].startsWith(`${payload.sub}`)) { // file names start with jsmith_hartnell_edu format
//     return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
//   }

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

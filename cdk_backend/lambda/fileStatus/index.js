import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true', // required for cookies
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const key    = event.queryStringParameters?.key;
  const bucket = event.queryStringParameters?.bucket;

  try {
    // SECURITY: same ownership check as download
    // FINISH LATER
    // if (!key.startsWith(`uploads/${payload.sub}/`)) {
    //   return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    // }

    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

    // if HeadObject didn't throw, the file exists
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ready: true }) };

  } catch (err) {
    if (err.name === 'NotFound') {
      // file doesn't exist yet — not an error, just not ready
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ready: false }) };
    }
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
};

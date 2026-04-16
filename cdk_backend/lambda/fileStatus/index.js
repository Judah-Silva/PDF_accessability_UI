import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { jwtVerify, importSPKI } from 'jose';

const s3 = new S3Client({});

const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true', // required for cookies
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  // verify auth cookie — same pattern as other lambdas
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const cookies = parseCookies(cookieHeader);
  const accessToken = cookies['access_token'];

  if (!accessToken) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthenticated' }),
    };
  }

  try {
    const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'), 'RS256');
    const { payload } = await jwtVerify(access_token, publicKey, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    const key    = event.queryStringParameters?.key;
    const bucket = event.queryStringParameters?.bucket;

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

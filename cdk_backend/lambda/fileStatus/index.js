import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { jwtVerify, importSPKI } from 'jose';

const s3 = new S3Client({});

export const handler = async (event) => {
  // verify auth cookie — same pattern as other lambdas
  const cookies = parseCookies(event.headers?.Cookie || '');
  try {
    const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY, 'RS256');
    const { payload } = await jwtVerify(cookies['access_token'], publicKey, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    const { key, bucket } = JSON.parse(event.body || '{}');

    // SECURITY: same ownership check as download
    // FINISH LATER
    // if (!key.startsWith(`uploads/${payload.sub}/`)) {
    //   return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    // }

    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

    // if HeadObject didn't throw, the file exists
    return { statusCode: 200, body: JSON.stringify({ ready: true }) };

  } catch (err) {
    if (err.name === 'NotFound') {
      // file doesn't exist yet — not an error, just not ready
      return { statusCode: 200, body: JSON.stringify({ ready: false }) };
    }
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
};
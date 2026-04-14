import * as crypto from 'crypto';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SignJWT, importPKCS8 } from 'jose';

// SECURITY: Token rotation — every refresh call invalidates the old refresh token
// and issues a brand new one. A stolen token can only be used once.
exports.handler = async (event) => {
  const cookies = parseCookies(event.headers?.Cookie || '');
  const incomingRefreshToken = cookies['refresh_token'];

  if (!incomingRefreshToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No refresh token' }) };
  }

  const tokenHash = crypto.createHash('sha256').update(incomingRefreshToken).digest('hex');

  // Look up hash in DynamoDB
  const stored = await dynamo.send(new GetItemCommand({
    TableName: process.env.REFRESH_TABLE,
    Key: { tokenHash: { S: tokenHash } },
  }));

  if (!stored.Item) {
    // SECURITY: Token not found — may indicate theft. Log for alerting.
    console.warn('[Security] User refresh token not found. Possible token theft.');
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid refresh token' }) };
  }

  // SECURITY: Delete old token immediately (rotation — single use)
  await dynamo.send(new DeleteItemCommand({
    TableName: process.env.REFRESH_TABLE,
    Key: { tokenHash: { S: tokenHash } },
  }));

  const username = stored.Item.username.S;

  // Issue new access token
  const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256');
  const newAccessToken = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(process.env.JWT_ISSUER)
    .setAudience(process.env.JWT_AUDIENCE)
    .setExpirationTime('15m')
    .sign(privateKey);

  // Issue new refresh token
  const newRefreshToken = crypto.randomBytes(64).toString('hex');
  const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await dynamo.send(new PutItemCommand({
    TableName: process.env.REFRESH_TABLE,
    Item: {
      tokenHash: { N: newRefreshHash },
      username:  { S: username },
      createdAt: { N: String(Date.now()) },
      ttl:       { N: String(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60) },
    },
  }));

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': [
        `access_token=${newAccessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`,
        `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/refresh; Max-Age=604800`,
      ].join(', '),
    },
    body: JSON.stringify({ ok: true }),
  };
};

function parseCookies(header) {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
  );
}
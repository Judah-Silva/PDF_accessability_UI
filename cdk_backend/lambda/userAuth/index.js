import * as crypto from 'crypto';
import { Client } from '@duosecurity/duo_universal';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SignJWT, jwtVerify, importPKCS8 } from 'jose'; // use jose, not jsonwebtoken

const duo = new Client({
  clientId: process.env.DUO_CLIENT_ID,
  clientSecret: process.env.DUO_CLIENT_SECRET, // SECURITY: from SSM/Secrets Manager, not env directly
  apiHost: process.env.DUO_API_HOST,
  redirectUrl: process.env.DUO_REDIRECT_URL,
});

const dynamo = new DynamoDBClient({});

// SECURITY: CORS — only allow your exact frontend origin
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN; // e.g. https://app.yourcompany.com

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true', // required for cookies
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const { code, state, username } = JSON.parse(event.body || '{}');

  if (!code || !state || !username) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing params' }) };
  }

  // SECURITY: Verify state from DynamoDB (not memory — Lambda is stateless).
  // State is single-use; delete it immediately after retrieval.
  const stored = await dynamo.send(new GetItemCommand({
    TableName: process.env.STATE_TABLE,
    Key: { state: { S: state } },
  }));

  if (!stored.Item) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or expired state' }) };
  }

  // SECURITY: Immediately delete the used state to prevent replay attacks
  await dynamo.send(new DeleteItemCommand({
    TableName: process.env.STATE_TABLE,
    Key: { state: { S: state } },
  }));

  // SECURITY: Check state TTL — reject if older than 10 minutes
  const createdAt = Number(stored.Item.createdAt.N);
  if (Date.now() - createdAt > 10 * 60 * 1000) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'State expired' }) };
  }

  let duoResult;
  try {
    duoResult = await duo.exchangeAuthorizationCodeFor2FAResult(code, username);
  } catch (err) {
    console.error('[Duo exchange error]', err.message); // SECURITY: don't expose err to client
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Authentication failed' }) };
  }

  // SECURITY: Load RS256 private key from SSM/Secrets Manager, not a hardcoded string.
  // RS256 (asymmetric) is safer than HS256 — your API services verify with the PUBLIC key only.
  const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256');

  const accessToken = await new SignJWT({
    sub: duoResult.preferred_username,
    email: duoResult.email,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(process.env.JWT_ISSUER)       // SECURITY: always set issuer
    .setAudience(process.env.JWT_AUDIENCE)   // SECURITY: always set audience
    .setExpirationTime('15m')                // SECURITY: short-lived access token
    .sign(privateKey);

  // SECURITY: Issue a refresh token separately, store its hash in DynamoDB.
  // Never store the raw refresh token — only a hash.
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await dynamo.send(new PutItemCommand({
    TableName: process.env.REFRESH_TABLE,
    Item: {
      tokenHash: { S: refreshTokenHash },
      username:  { S: duoResult.preferred_username },
      createdAt: { N: String(Date.now()) },
      // SECURITY: TTL field — DynamoDB auto-expires this item after 7 days
      ttl: { N: String(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60) },
    },
  }));

  // SECURITY: Tokens go in httpOnly, Secure, SameSite=Strict cookies.
  // They are NEVER returned in the JSON body — XSS cannot read httpOnly cookies.
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      // Access token: short-lived (matches JWT expiry)
      'Set-Cookie': [
        `access_token=${accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`,
        `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/refresh; Max-Age=604800`,
      ].join(', '),
    },
    body: JSON.stringify({
      // SECURITY: Only return non-sensitive profile info in the body
      user: {
        username: duoResult.preferred_username,
        email: duoResult.email,
      },
    }),
  };
};
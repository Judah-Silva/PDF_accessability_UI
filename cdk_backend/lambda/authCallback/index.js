import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { SignJWT, importPKCS8 } from 'jose';
import { Client } from '@duosecurity/duo_universal'

const duo = new Client({
  clientId: process.env.DUO_CLIENT_ID,
  clientSecret: process.env.DUO_CLIENT_SECRET, // SECURITY: from SSM/Secrets Manager, not env directly
  apiHost: process.env.DUO_API_HOST,
  redirectUrl: process.env.DUO_REDIRECT_URL,
});

const dynamo = new DynamoDBClient({});

// SECURITY: CORS — only allow your exact frontend origin
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN; // e.g. https://app.yourcompany.com

const SESSION_SECONDS = 8 * 60 * 60; // 8hrs

export const handler = async (event) => {
  const duoCode = event.queryStringParameters?.duo_code;
  const state   = event.queryStringParameters?.state;

  // validate params before doing anything
  if (
    typeof duoCode !== 'string' || duoCode.length > 512 ||
    typeof state !== 'string'   || state.length > 512
  ) {
    return redirect(`${ALLOWED_ORIGIN}/home?error=auth_failed`);
  }

  // look up state record
  const stored = await dynamo.send(new GetItemCommand({
    TableName: process.env.DYNAMO_STATE_TABLE,
    Key: { state: { S: state } },
  }));

  if (!stored.Item) {
    return redirect(`${ALLOWED_ORIGIN}/home?error=auth_failed`);
  }

  // manual TTL check — DynamoDB TTL deletion can lag
  const ttl = Number(stored.Item.ttl.N);
  if (Math.floor(Date.now() / 1000) > ttl) {
    // still delete the expired record
    await dynamo.send(new DeleteItemCommand({
      TableName: process.env.DYNAMO_STATE_TABLE,
      Key: { state: { S: state } },
    }));
    return redirect(`${ALLOWED_ORIGIN}/home?error=auth_failed`);
  }

  // single use — delete immediately
  await dynamo.send(new DeleteItemCommand({
    TableName: process.env.DYNAMO_STATE_TABLE,
    Key: { state: { S: state } },
  }));

  const savedUsername = stored.Item.username.S;

  let decodedToken;
  try {
    decodedToken = await duo.exchangeAuthorizationCodeFor2FAResult(
      duoCode,
      savedUsername
    );
  } catch (err) {
    console.error('[Duo exchange error]', err.message);
    return redirect(`${ALLOWED_ORIGIN}/home?error=auth_failed`);
  }

  const privateKey = await importPKCS8(
    process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    'RS256'
  );

  const accessToken = await new SignJWT({
    sub:   decodedToken.preferred_username ?? savedUsername,
    email: decodedToken.email ?? '',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(process.env.JWT_ISSUER)
    .setAudience(process.env.JWT_AUDIENCE)
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(privateKey);

  return {
    statusCode: 302,
    headers: {
      'Location':   `${ALLOWED_ORIGIN}/app?auth=true&username=${decodedToken.preferred_username || savedUsername}&token=${accessToken}`,
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    },
    body: '',
  };
};

function redirect(url) {
  return { statusCode: 302, headers: { Location: url }, body: '' };
}

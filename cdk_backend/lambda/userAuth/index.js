import * as crypto from 'crypto';
import { Client } from '@duosecurity/duo_universal';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const { username } = JSON.parse(event.body || '{}');

  if (!username) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing username.' }) };
  }

  try {
    if (typeof username !== 'string' || username.length > 255 || username.trim() === '') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid username' }),
      };
    }
    // await duo.healthCheck();

    const state = await duo.generateState();

    // SECURITY: Verify state from DynamoDB (not memory — Lambda is stateless).
    // State is single-use; delete it immediately after retrieval.
    await dynamo.send(new PutItemCommand({
      TableName: process.env.DYNAMO_STATE_TABLE,
      Item: {
        state:    { S: state },
        username: { S: username.trim() },
        ttl:      { N: String(Math.floor(Date.now() / 1000) + 600) }, // 10 min
      },
    }));

    const authUrl = await duo.createAuthUrl(username.trim(), state);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ authUrl }),
    };
  } catch (err) {
    console.error('[Duo health check / createAuthUrl error]', err.message);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Duo service unavailable' }),
    };
  }
};

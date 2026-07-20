import { Router } from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const CLIENT_ID = process.env.POLLINATIONS_APP_KEY || 'pk_fJFepOdA7LMOZ1LA';
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:5173/callback';

export const authRouter = Router();

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Step 1: Generate auth URL for the frontend
authRouter.post('/login', (req, res) => {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'usage',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  res.json({
    authUrl: `https://enter.pollinations.ai/authorize?${params}`,
    state,
    verifier
  });
});

// Step 2: Exchange code for sk_ key (called by frontend after OAuth redirect)
authRouter.post('/exchange', async (req, res) => {
  const { code, verifier } = req.body;
  if (!code || !verifier) {
    return res.status(400).json({ error: 'code and verifier required' });
  }

  try {
    const tokenRes = await fetch('https://enter.pollinations.ai/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      })
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).json({ error: data.error || 'exchange failed' });
    }

    // data = { access_token: "sk_...", token_type: "bearer", expires_in: 604800 }
    res.json({ success: true, expiresIn: data.expires_in });
  } catch (err) {
    console.error('Exchange error:', err);
    res.status(500).json({ error: err.message });
  }
});

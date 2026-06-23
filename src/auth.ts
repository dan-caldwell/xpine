import jsonwebtoken from 'jsonwebtoken';
import { ServerRequest } from '../types';
const { verify, sign, } = jsonwebtoken;

// Pin the algorithm so a token can never dictate how it is verified. This
// prevents "alg: none" and algorithm-confusion attacks (e.g. if the secret is
// ever swapped for an asymmetric key).
const JWT_ALGORITHM = 'HS256';

// Resolve the signing/verification secret, failing loudly if it is missing.
// An empty or undefined secret would make tokens trivially forgeable.
function getSecret(): string {
  const secret = process.env.JWT_PRIVATE_KEY;
  if (!secret) throw new Error('JWT_PRIVATE_KEY is not set');
  return secret;
}

export async function signUser(email: string, username: string) {
  return new Promise((resolve, reject) => {
    sign(
      {
        user: {
          email,
          username,
        },
      },
      getSecret(),
      { expiresIn: '30d', algorithm: JWT_ALGORITHM, },
      (err, token) => {
        if (err) return reject(err);
        resolve(token);
      });
  });
}

export async function verifyUser(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    verify(token, getSecret(), { algorithms: [JWT_ALGORITHM], }, (err, authorizedData) => {
      if (err) return reject(err);
      resolve(authorizedData);
    });
  });
}

export function getTokenFromRequest(req: ServerRequest) {
  const { authorization, } = req.headers;
  if (!authorization) return null;
  const token = authorization.split(' ').pop() || '';
  return token || null;
}

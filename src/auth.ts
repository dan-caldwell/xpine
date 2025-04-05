import jsonwebtoken from 'jsonwebtoken';
import { ServerRequest } from '../types';
const { verify, sign, } = jsonwebtoken;

export async function signUser(email: string, username: string) {
  return new Promise((resolve, reject) => {
    sign(
      {
        user: {
          email,
          username,
        },
      },
      // @ts-ignore
      process.env.JWT_PRIVATE_KEY,
      { expiresIn: '30d', },
      (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
  });
}

export async function verifyUser(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    verify(token, process.env.JWT_PRIVATE_KEY, (err, authorizedData) => {
      if (err) reject(err);
      resolve(authorizedData);
    });
  });
}

export function getTokenFromRequest(req: ServerRequest) {
  // @ts-ignore
  const { authorization, } = req.headers;
  if (!authorization) return null;
  const token = authorization.split(' ').pop() || '';
  return token || null;
}

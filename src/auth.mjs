import jsonwebtoken from 'jsonwebtoken';
const { verify, sign, } = jsonwebtoken;

export async function signUser(email, username) {
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

export async function verifyUser(token) {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    verify(token, process.env.JWT_PRIVATE_KEY, (err, authorizedData) => {
      if (err) reject(err);
      resolve(authorizedData);
    });
  });
}

export function getTokenFromRequest(req) {
  // @ts-ignore
  const { authorization, } = req.headers;
  if (!authorization) return null;
  const token = authorization.split(' ').pop() || '';
  return token || null;
}

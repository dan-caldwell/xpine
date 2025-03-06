import dotenv from 'dotenv';
import path from 'path';
import { config } from './get-config';
// import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export function setupEnv() {
  dotenv.config({ path: path.join(config.rootDir, `./.env.${process.env.STAGE || 'dev'}`),});
}

// async function loadSecretsManagerSecrets() {

// }

// function getSecretValue() {
//   const client = new SecretsManagerClient({ region: "REGION" });

// }

// const getSecretValue = async () => {
//   const region = process.env.REGION
//   const env = process.env.ENV || 'dev'
//   const secretPath = env === 'prod' ? 'prod' : 'dev'
//   const secretName = `[PROJECT]/amplify-${secretPath}/${env}`
 
//   var client = new AWS.SecretsManager({ region })
 
//   return new Promise((resolve, reject) => {
//     client.getSecretValue({ SecretId: secretName }, function(err, data) {
//       if (err) {
//         reject(err)
//       } else {
//         let secret
//         if ('SecretString' in data) {
//           secret = data.SecretString
//         } else {
//           let buff = new Buffer(data.SecretBinary, 'base64')
//           secret = buff.toString('ascii')
//         }
//         resolve(JSON.parse(secret))
//       }
//     })
//   })
// }
 
// const setSecretEnvs = async () => {
//   const secrets = await getSecretValue()
//   Object.keys(secrets).forEach(function(key) {
//     process.env[key] = secrets[key]
//   })
//   return secrets
// }
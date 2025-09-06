import dotenv from 'dotenv';
import path from 'path';
import { config } from './get-config';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export async function setupEnv() {
  if (process.env.HAS_SETUP_ENV) return;
  dotenv.config({ path: path.join(config.rootDir, `./.env.${process.env.STAGE || 'dev'}`), });
  await loadSecretsManagerSecrets();
  process.env.HAS_SETUP_ENV = 'true';
}

async function loadSecretsManagerSecrets() {
  // Ensure the SECRET_NAME environment variable is set
  if (!process.env.SECRET_NAME) return;
  try {
    const client = new SecretsManagerClient();
    const command = new GetSecretValueCommand({
      SecretId: process.env.SECRET_NAME,
    });
    const response = await client.send(command);
    if (!response?.SecretString) throw Error;
    const secretValue = JSON.parse(response.SecretString);
    if (!secretValue || typeof secretValue !== 'object') throw Error;
    Object.keys(secretValue).forEach((key: string) => {
      process.env[key] = secretValue[key];
    });
    client.destroy();
  } catch (err) {
    console.error(`Could not load secret: ${process.env.SECRET_NAME}`);
    console.error(err);
    return null;
  }
}

#!/usr/bin/env -S npx tsx
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { USER } from '../../../scripts/seed/shared-ids.js';

config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!JWT_ACCESS_SECRET) {
  console.error('ERROR: JWT_ACCESS_SECRET not set in .env');
  process.exit(1);
}

const token = jwt.sign(
  {
    sub: USER.ADMIN_SAYED,
    email: 'sayed@hena-wadeena.online',
    role: 'admin',
  },
  JWT_ACCESS_SECRET,
  { expiresIn: '1h' },
);

console.log('\n=== AI Knowledge Base Seed Token ===\n');
console.log('Token (valid for 1 hour):');
console.log(token);
console.log('\nTo seed the knowledge base:\n');
console.log(`SEED_AUTH_TOKEN="${token}" python services/ai/scripts/seed_knowledge_base.py`);
console.log('\nOr export it:');
console.log(`export SEED_AUTH_TOKEN="${token}"`);
console.log('python services/ai/scripts/seed_knowledge_base.py\n');

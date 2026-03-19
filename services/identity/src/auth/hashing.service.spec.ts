import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();
    service = module.get(HashingService);
  });

  it('should hash a password and return argon2id encoded string', async () => {
    const hash = await service.hash('password123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('password123');
    expect(hash).toContain('$argon2id$');
  });

  it('should verify a correct password', async () => {
    const hash = await service.hash('password123');
    const result = await service.verify(hash, 'password123');
    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await service.hash('password123');
    const result = await service.verify(hash, 'wrongpassword');
    expect(result).toBe(false);
  });

  it('should produce different hashes for the same password (random salt)', async () => {
    const hash1 = await service.hash('password123');
    const hash2 = await service.hash('password123');
    expect(hash1).not.toBe(hash2);
  });
});

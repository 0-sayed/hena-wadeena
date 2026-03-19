import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

// Algorithm.Argon2id = 2, inlined because @node-rs/argon2 exports it as
// a const enum which is incompatible with isolatedModules
const ARGON2ID = 2;

@Injectable()
export class HashingService {
  private readonly options = {
    algorithm: ARGON2ID,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 4,
    outputLen: 32,
  };

  async hash(password: string): Promise<string> {
    return hash(password, this.options);
  }

  async verify(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return verify(hashedPassword, plainPassword, this.options);
  }
}

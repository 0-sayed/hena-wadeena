import { Injectable } from '@nestjs/common';
import { hash, verify, Algorithm } from '@node-rs/argon2';

@Injectable()
export class HashingService {
  private readonly options = {
    algorithm: Algorithm.Argon2id,
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

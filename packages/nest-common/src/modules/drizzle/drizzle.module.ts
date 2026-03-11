import { DynamicModule, Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';
export const POSTGRES_CLIENT = 'POSTGRES_CLIENT';

export interface DrizzleModuleOptions {
  connectionString: string;
  schema: string;
}

@Global()
@Module({})
export class DrizzleModule {
  static forRoot(options: DrizzleModuleOptions): DynamicModule {
    const postgresProvider = {
      provide: POSTGRES_CLIENT,
      useFactory: () => {
        return postgres(options.connectionString, {
          max: 20,
          onnotice: () => {},
          connection: {
            search_path: options.schema,
          },
        });
      },
    };

    const drizzleProvider = {
      provide: DRIZZLE_CLIENT,
      useFactory: (sql: postgres.Sql) => {
        return drizzle(sql);
      },
      inject: [POSTGRES_CLIENT],
    };

    return {
      module: DrizzleModule,
      providers: [postgresProvider, drizzleProvider],
      exports: [DRIZZLE_CLIENT, POSTGRES_CLIENT],
    };
  }
}

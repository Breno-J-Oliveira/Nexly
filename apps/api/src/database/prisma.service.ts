import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantExtension } from './tenant-extension';

const createClient = () => new PrismaClient().$extends(tenantExtension);

export type PrismaClientExtended = ReturnType<typeof createClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClientExtended;

  constructor() {
    this.client = createClient();
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

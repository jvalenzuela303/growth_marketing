import { Inject } from '@nestjs/common';

/**
 * Decorador para inyectar una Queue de BullMQ por nombre.
 * Uso: @InjectQueue('scoring') private readonly scoringQueue: Queue
 */
export const QUEUE_TOKEN = (name: string) => `BULLMQ_QUEUE_${name.toUpperCase()}`;

export const InjectQueue = (name: string) => Inject(QUEUE_TOKEN(name));

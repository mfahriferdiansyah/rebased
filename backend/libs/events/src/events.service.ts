import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventChannel, EventPayload } from './event-types';

type EventHandler = (payload: EventPayload) => void | Promise<void>;

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private publisherClient: Redis;
  private subscriberClient: Redis;
  private handlers = new Map<EventChannel, EventHandler[]>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.config.get<string>('redis.host', 'localhost');
    const redisPort = this.config.get<number>('redis.port', 6379);
    const redisPassword = this.config.get<string>('redis.password');

    const redisConfig = {
      host: redisHost,
      port: redisPort,
      ...(redisPassword && { password: redisPassword }),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    // Create two separate clients for pub/sub
    this.publisherClient = new Redis(redisConfig);
    this.subscriberClient = new Redis(redisConfig);

    this.publisherClient.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.subscriberClient.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.publisherClient.on('error', (error) => {
      this.logger.error(`Redis publisher error: ${error.message}`);
    });

    this.subscriberClient.on('error', (error) => {
      this.logger.error(`Redis subscriber error: ${error.message}`);
    });

    // Handle incoming messages
    this.subscriberClient.on('message', (channel, message) => {
      this.handleMessage(channel as EventChannel, message);
    });
  }

  async onModuleDestroy() {
    await this.publisherClient.quit();
    await this.subscriberClient.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Publish an event to a channel
   */
  async publish(channel: EventChannel, payload: EventPayload): Promise<void> {
    try {
      const message = JSON.stringify(payload);
      await this.publisherClient.publish(channel, message);
      this.logger.debug(`Published event to ${channel}`);
    } catch (error) {
      this.logger.error(`Error publishing to ${channel}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to an event channel
   */
  async subscribe(channel: EventChannel, handler: EventHandler): Promise<void> {
    // Add handler to map
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      // Subscribe to channel
      await this.subscriberClient.subscribe(channel);
      this.logger.log(`Subscribed to ${channel}`);
    }

    this.handlers.get(channel)!.push(handler);
  }

  /**
   * Unsubscribe from an event channel
   */
  async unsubscribe(channel: EventChannel, handler?: EventHandler): Promise<void> {
    if (!this.handlers.has(channel)) return;

    if (handler) {
      // Remove specific handler
      const handlers = this.handlers.get(channel)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }

      // If no handlers left, unsubscribe from channel
      if (handlers.length === 0) {
        this.handlers.delete(channel);
        await this.subscriberClient.unsubscribe(channel);
        this.logger.log(`Unsubscribed from ${channel}`);
      }
    } else {
      // Remove all handlers and unsubscribe
      this.handlers.delete(channel);
      await this.subscriberClient.unsubscribe(channel);
      this.logger.log(`Unsubscribed from ${channel}`);
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(channel: EventChannel, message: string) {
    const handlers = this.handlers.get(channel);
    if (!handlers || handlers.length === 0) return;

    try {
      const payload = JSON.parse(message) as EventPayload;

      this.logger.debug(`Received event on ${channel}`);

      // Execute all handlers
      await Promise.all(
        handlers.map((handler) =>
          Promise.resolve(handler(payload)).catch((error) => {
            this.logger.error(
              `Error in handler for ${channel}: ${error.message}`,
              error.stack,
            );
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`Error parsing message on ${channel}: ${error.message}`);
    }
  }

  /**
   * Get list of active subscriptions
   */
  getActiveSubscriptions(): EventChannel[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Health check for Redis connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.publisherClient.ping();
      await this.subscriberClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

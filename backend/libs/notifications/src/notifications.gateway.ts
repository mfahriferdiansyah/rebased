import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true, namespace: '/' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit rebalance started event
   */
  emitRebalanceStarted(userAddress: string, data: any) {
    this.server.to(`user:${userAddress}`).emit('rebalance:started', data);
  }

  /**
   * Emit rebalance completed event
   */
  emitRebalanceCompleted(userAddress: string, data: any) {
    this.server.to(`user:${userAddress}`).emit('rebalance:completed', data);
  }

  /**
   * Emit rebalance failed event
   */
  emitRebalanceFailed(userAddress: string, data: any) {
    this.server.to(`user:${userAddress}`).emit('rebalance:failed', data);
  }

  /**
   * Emit strategy updated event
   */
  emitStrategyUpdated(userAddress: string, data: any) {
    this.server.to(`user:${userAddress}`).emit('strategy:updated', data);
  }

  /**
   * Emit delegation event
   */
  emitDelegationEvent(userAddress: string, event: string, data: any) {
    this.server.to(`user:${userAddress}`).emit(`delegation:${event}`, data);
  }

  /**
   * Emit notification
   */
  emitNotification(userAddress: string, notification: any) {
    this.server.to(`user:${userAddress}`).emit('notification', notification);
  }

  /**
   * Broadcast system message
   */
  broadcastSystemMessage(message: string, data?: any) {
    this.server.emit('system:message', { message, data, timestamp: Date.now() });
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true),
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(EventsGateway.name)

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '')

      if (!token) {
        client.disconnect()
        return
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      })

      client.data.userId = payload.sub
      client.data.tenantId = payload.tenantId
      client.data.role = payload.role

      await client.join(`user:${payload.sub}`)
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`)
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('join:condo')
  handleJoinCondo(
    @MessageBody() condominiumId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `condo:${condominiumId}`
    client.join(room)
    this.logger.log(`Client ${client.id} joined room ${room}`)
    return { joined: room }
  }

  @SubscribeMessage('leave:condo')
  handleLeaveCondo(
    @MessageBody() condominiumId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`condo:${condominiumId}`)
  }

  emitToCondominium(condominiumId: string, event: string, data: unknown) {
    this.server.to(`condo:${condominiumId}`).emit(event, data)
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data)
  }
}

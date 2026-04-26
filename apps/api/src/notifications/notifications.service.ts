import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../common/prisma/prisma.service'
import { EventsGateway } from '../events/events.gateway'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications') private queue: Queue,
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async sendPush(
    userId: string,
    tenantId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, tenantId, title, body, data: (data ?? {}) as object },
    })
    await this.queue.add('push', { userId, title, body, data, notificationId: notification.id })
    this.events.emitToUser(userId, 'notification.new', notification)
    return notification
  }

  /**
   * Sends an in-app push notification AND an email to the user.
   * E-mail is only dispatched when SMTP is configured (handled gracefully by the processor).
   */
  async notifyUser(
    userId: string,
    tenantId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await this.sendPush(userId, tenantId, title, body, data)

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })

    if (user?.email) {
      await this.queue.add('email', {
        to: user.email,
        subject: title,
        html: this.buildEmailHtml(user.name, title, body),
        text: `${title}\n\n${body}`,
      })
    }

    return notification
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.queue.add('email', { to, subject, html })
  }

  private buildEmailHtml(name: string, title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#2563eb;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">CondoFortis</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:15px;color:#374151">Olá, <strong>${name}</strong></p>
          <h2 style="margin:0 0 16px;font-size:20px;color:#111827">${title}</h2>
          <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6">${body}</p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6">
          <p style="margin:0;font-size:12px;color:#9ca3af">
            Este e-mail foi enviado automaticamente pelo sistema CondoFortis. Por favor, não responda.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  }

  findAll(userId: string, tenantId: string) {
    return this.prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    })
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    })
    if (!notification) throw new NotFoundException('Notificação não encontrada')
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
  }

  async markAllRead(userId: string, tenantId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, tenantId, readAt: null },
      data: { readAt: new Date() },
    })
    return { updated: count }
  }
}

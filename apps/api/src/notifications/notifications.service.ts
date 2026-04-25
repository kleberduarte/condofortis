import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'

@Injectable()
export class NotificationsService {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  async sendPush(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    await this.queue.add('push', { userId, title, body, data })
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.queue.add('email', { to, subject, html })
  }
}

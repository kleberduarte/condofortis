import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name)

  @Process('push')
  async handlePush(job: Job<{ userId: string; title: string; body: string }>) {
    this.logger.log(`Push → user ${job.data.userId}: ${job.data.title}`)
    // TODO: Firebase FCM integration
  }

  @Process('email')
  async handleEmail(job: Job<{ to: string; subject: string; html: string }>) {
    this.logger.log(`Email → ${job.data.to}: ${job.data.subject}`)
    // TODO: Resend integration
  }
}

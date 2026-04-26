import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bull'
import * as nodemailer from 'nodemailer'
import { Transporter } from 'nodemailer'

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name)
  private transporter: Transporter | null = null

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') ?? 587,
        secure: this.config.get<boolean>('SMTP_SECURE') ?? false,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      })
      this.logger.log(`SMTP configurado para ${host}`)
    } else {
      this.logger.warn('SMTP_HOST não definido — envio de e-mail desativado')
    }
  }

  @Process('push')
  async handlePush(
    job: Job<{ userId: string; title: string; body: string; notificationId?: string }>,
  ) {
    this.logger.log(`Push → user ${job.data.userId}: ${job.data.title}`)
  }

  @Process('email')
  async handleEmail(job: Job<{ to: string; subject: string; html: string; text?: string }>) {
    const { to, subject, html, text } = job.data
    this.logger.log(`Email → ${to}: ${subject}`)

    if (!this.transporter) {
      this.logger.warn(`E-mail não enviado (SMTP não configurado): ${to}`)
      return
    }

    try {
      const from =
        this.config.get<string>('SMTP_FROM') ??
        `"CondoFortis" <${this.config.get<string>('SMTP_USER')}>`

      await this.transporter.sendMail({ from, to, subject, html, text })
      this.logger.log(`E-mail enviado com sucesso para ${to}`)
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${(err as Error).message}`)
      throw err
    }
  }
}

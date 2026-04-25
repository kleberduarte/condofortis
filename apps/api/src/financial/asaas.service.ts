import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

@Injectable()
export class AsaasService {
  private readonly http: AxiosInstance
  private readonly logger = new Logger(AsaasService.name)

  constructor(private config: ConfigService) {
    this.http = axios.create({
      baseURL: config.get('ASAAS_BASE_URL', 'https://sandbox.asaas.com/api/v3'),
      headers: { access_token: config.get('ASAAS_API_KEY', '') },
    })
  }

  async createCharge(data: {
    customer: string
    billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD'
    value: number
    dueDate: string
    description?: string
    externalReference?: string
  }) {
    try {
      const res = await this.http.post('/payments', data)
      return res.data
    } catch (err: any) {
      this.logger.error('Asaas createCharge error', err?.response?.data)
      throw err
    }
  }

  async getCharge(externalId: string) {
    const res = await this.http.get(`/payments/${externalId}`)
    return res.data
  }

  async cancelCharge(externalId: string) {
    const res = await this.http.delete(`/payments/${externalId}`)
    return res.data
  }

  async createCustomer(data: { name: string; cpfCnpj?: string; email?: string; phone?: string }) {
    try {
      const res = await this.http.post('/customers', data)
      return res.data
    } catch (err: any) {
      this.logger.error('Asaas createCustomer error', err?.response?.data)
      throw err
    }
  }

  async getPixQrCode(paymentId: string) {
    const res = await this.http.get(`/payments/${paymentId}/pixQrCode`)
    return res.data
  }
}

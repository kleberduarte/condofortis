import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import * as compression from 'compression'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(compression())

  app.enableCors({
    origin:
      process.env.CORS_ORIGINS?.split(',') ||
      ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })

  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1')

  app.enableVersioning({ type: VersioningType.URI })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('CondoFortis API')
    .setDescription('API do sistema de gestão de condomínios CondoFortis')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  const port = Number(process.env.PORT) || 3001
  // 0.0.0.0: evita "connection refused" no browser quando `localhost` resolve para ::1 e o Node só escuta em IPv4 (comum no Windows).
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 API rodando em http://127.0.0.1:${port}`)
  console.log(`📚 Swagger em http://localhost:${port}/docs`)
}

bootstrap()

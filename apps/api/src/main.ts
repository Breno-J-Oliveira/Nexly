import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      // Remove campos não declarados no DTO (defesa contra injection de campos extras).
      whitelist: true,
      // Retorna 400 quando o cliente envia campo não declarado.
      forbidNonWhitelisted: true,
      // Converte primitivos automaticamente (ex: string -> number em @IsNumber).
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Mensagens em pt-BR — descritivas para o front-end exibir no campo certo.
      errorHttpStatusCode: 400,
      stopAtFirstError: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Nexly API')
    .setDescription('API da plataforma Nexly — agenda + estoque/PDV multi-tenant')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(env.PORT);
}

void bootstrap();

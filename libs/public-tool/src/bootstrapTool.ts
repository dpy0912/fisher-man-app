/**
 * 启动服务的工具封装
 */
import { NestFactory } from '@nestjs/core';
import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { mw } from 'request-ip';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions } from '@nestjs/microservices';
// 服务启动配置的参数
type BootstrapToolType = NestApplicationOptions & {
  // 服务启动之前执行
  before?: (app: INestApplication) => void;
  // 是否开启微服务加载
  microservice?: boolean;
};

// 服务启动的程序
export const bootstrapTool = async (
  module: any,
  bootstrapOptions?: BootstrapToolType,
) => {
  // 结构服务项配置
  const { before, microservice, ...options } = bootstrapOptions || {};

  // 创建一个服务
  const app = await NestFactory.create(module, options);

  //   服务执行之前
  before?.(app);

  // 获取客户端真实的ip
  app.use(mw());

  // 获取配置服务
  const configService = app.get<ConfigService>(ConfigService);
  console.log('configService ==>', configService);

  // 服务配置
  const serve = configService.get('serve');
  console.log('serve ==>', serve);

  // 注入日志服务
  //   const loggerService = app.get(LoggerService);
  // app.useLogger(loggerService);

  // 接口请求前缀
  app.setGlobalPrefix(serve.prefix);

  // 使用微服务
  const microserviceService = configService.get('microserviceService');
  if (microservice && microserviceService) {
    // 连接微服务
    app.connectMicroservice<MicroserviceOptions>(microserviceService, {
      inheritAppConfig: true,
    });

    // 启动所有微服务
    app.startAllMicroservices();
  }

  // 启动http服务
  await app.listen(serve.port);

  // 捕获进程异常
  process.on('uncaughtException', (err) => {
    // 异常提醒，后面使用日志收集处理
    console.log('程序异常', err);
  });

  // 日志服务
  // loggerService.log(
  //   `http://localhost:${serve.port}/${swagger.path}`,
  //   swagger.title,
  // );
};
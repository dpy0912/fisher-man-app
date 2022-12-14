import { ClientsModule } from '@nestjs/microservices';
import { AllExceptionFilter, rootPath, TransformInterceptor } from '@app/tool';
import {
  CacheModule,
  DynamicModule,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { load } from 'js-yaml';
import { cloneDeepWith, merge } from 'lodash';
import { extname, join } from 'path';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../logger';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { TxOssModule } from '@app/common/txOss';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as dayjs from 'dayjs';
import * as nuid from 'nuid';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UploadModule } from '@app/common/upload';

/**
 * 全局模块配置
 */
export interface GlobalModuleOptions {
  yamlFilePath?: string[]; // 配置文件的路径
  microservice?: string[]; // 开启微服务的模块
  typeorm?: boolean; // 开启orm连接配置
  upload?: boolean; // 开启文件上传
  cache?: boolean; // 开启缓存
  txOSS?: boolean; // 开启腾讯云对象存储
  throttler?: boolean; // 开启接口限速
  email?: boolean; // 开启邮箱注册
}

/**
 * 全局模块
 */
@Module({})
export class GlobalModule {
  // 全局模块初始话， 加载动态模块
  static forRoot(options: GlobalModuleOptions): DynamicModule {
    const {
      yamlFilePath = [],
      microservice,
      typeorm,
      upload,
      cache,
      txOSS,
      throttler,
      email,
    } = options || {};

    // 导入动态模块
    const imports: DynamicModule['imports'] = [
      // 配置模块
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        load: [
          () => {
            let configs: any = {};
            const configPath = [
              'application.dev.yaml',
              'application.prod.yaml',
              'config.microservice.yaml',
              'config.jwt.yaml',
              'config.file.yaml',
              'config.tx.yaml',
              `${process.env.NODE_ENV || 'application.prod'}.yaml`,
              ...yamlFilePath,
            ];
            for (const path of configPath) {
              try {
                // 读取并解析配置文件
                const filePath = join(rootPath, 'config', path);
                if (existsSync(filePath))
                  configs = merge(
                    configs,
                    load(readFileSync(filePath, 'utf8')),
                  );
              } catch (err) {
                console.log('err', err);
              }
            }
            // 递归将null转为字符串
            configs = cloneDeepWith(configs, (value) => {
              if (value === null) return '';
            });
            return configs;
          },
        ],
      }),

      // 日志模块
      LoggerModule.forRoot({
        isGlobal: true,
        useFactory: (configService: ConfigService) => {
          const path = configService.get('logsPath');
          //  返回文件
          return { filename: join(rootPath, `logs/${path}/${path}.log`) };
        },
        inject: [ConfigService],
      }),
    ];

    // 限制接口访问次数，限流
    if (throttler) {
      imports.push({
        // 限制接口访问次数，限流
        ...ThrottlerModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            const { ttl, limit } = configService.get('throttler');
            console.log('ttl ==>', ttl);
            console.log('limit ==>', limit);
            return {
              ttl: ttl,
              limit: limit,
            };
          },
          inject: [ConfigService],
        }),
        global: true,
      });
    }

    // 开启微服务模块
    if (microservice) {
      imports.push({
        ...ClientsModule.registerAsync(
          microservice.map((name) => ({
            name,
            useFactory: (configService: ConfigService) => {
              return configService.get(`microserviceClients.${name}`);
            },
            inject: [ConfigService],
          })),
        ),
        global: true,
      });
    }

    // 配置orm数据库
    if (typeorm) {
      imports.push(
        TypeOrmModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            // 获取数据库的连接，开启自动加载实体
            const { mysql } = configService.get('db');
            return { ...mysql, autoLoadEntities: true };
          },
          inject: [ConfigService],
        }),
      );
    }

    // 缓存开启
    if (cache) {
      imports.push({
        ...CacheModule.registerAsync({
          useFactory: (configService: ConfigService) => {
            const { redis } = configService.get('cache');
            // 使用redis做缓存服务
            return redis?.host ? { store: redisStore, ...redis } : {};
          },
          inject: [ConfigService],
        }),
        global: true,
      });
    }

    // 开启邮箱
    if (email) {
      imports.push(
        MailerModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            const { QQ, WY } = configService.get('email');
            const template = {
              dir: join(process.cwd(), '/apps/libs/common/src/template/'), // 模板
              adapter: new EjsAdapter(),
              options: {
                strict: true, //严格模式
              },
            };
            return { ...QQ, ...template };
          },
          inject: [ConfigService],
        }),
      );
    }

    // 开启腾讯云对象存储
    if (txOSS) {
      imports.push(
        TxOssModule.forRoot({
          isGlobal: true,
          useFactory: (configService: ConfigService) => {
            const uploadPath = configService.get('uploadPath');
            const fileLimit = configService.get('fileLimit');
            const tx = configService.get('tx');
            const oss = configService.get('oss');
            return {
              uploadPath,
              fileLimit,
              ...tx,
              ...oss,
            };
          },
          inject: [ConfigService],
        }),
      );
    }

    // 开启文件上传
    if (upload) {
      imports.push(
        {
          ...MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
              // 文件路径
              let path = configService.get('uploadPath');
              path = join(rootPath, path);
              existsSync(path) || mkdirSync(path);
              return {
                // 文件存储
                storage: diskStorage({
                  // 确定存储位置
                  destination: (_req, _file, cb) => {
                    // 日期
                    const day = dayjs().format('YYYY-MM-DD');
                    // 文件夹
                    const folder = `${path}/${day}`;
                    // 查询文件夹是否存在，不存在就创建
                    existsSync(folder) || mkdirSync(folder);
                    cb(null, folder);
                  },
                  // 文件名
                  filename: (_req, { originalname }, cb) => {
                    return cb(null, nuid.next() + extname(originalname));
                  },
                }),
              };
            },
            inject: [ConfigService],
          }),
          global: true,
        },
        ServeStaticModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            // 文件路径
            const path = configService.get('uploadPath');
            return [
              { rootPath: join(rootPath, path), exclude: ['/api/:path*'] },
            ];
          },
          inject: [ConfigService],
        }),
        UploadModule.forRoot({
          isGlobal: true,
          useFactory: (configService: ConfigService) => {
            const fileLimit = configService.get('fileLimit');
            return { fileLimit };
          },
          inject: [ConfigService],
        }),
      );
    }

    return {
      module: GlobalModule,
      imports,
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
        // 全局管道验证
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({ transform: true }),
        },
        // 异常过滤器
        {
          provide: APP_FILTER,
          useClass: AllExceptionFilter,
        },
        // 响应参数转化拦截器
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    };
  }
}

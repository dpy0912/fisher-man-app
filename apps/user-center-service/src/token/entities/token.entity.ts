import { Entity } from 'typeorm';
import { CommonEntity, UserConstants } from '@app/common';
import { ApiProperty, Column } from '@app/decorator';

/**
 * token的实体
 */
@Entity('uc_token')
export class Token extends CommonEntity {
  @ApiProperty('用户id')
  @Column('用户id', 36, { name: 'user_id', unique: true })
  userId: string;

  @ApiProperty('刷新token')
  @Column('刷新token', 1024, { name: 'refresh_token' })
  refreshToken: string;

  @ApiProperty('token的key值')
  @Column('token的key值(MD5加密)', 32, { name: 'token_key' })
  tokenKey: string;

  @ApiProperty('登陆来源')
  @Column('登陆来源', null, {
    type: 'enum',
    enum: UserConstants.LOGIN_FROM,
    default: UserConstants.LOGIN_FROM.PC,
    name: 'login_from',
  })
  loginFrom: string;

  @ApiProperty('应用id')
  @Column('应用id', 36, { name: 'app_id' })
  appId: string;
}

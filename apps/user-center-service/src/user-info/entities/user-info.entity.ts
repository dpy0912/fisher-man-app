import { CommonEntity, UserConstants } from '@app/common';
import { ApiProperty, Column } from '@app/decorator';
import { Entity } from 'typeorm';
import { dateTransformer } from '@app/tool';

/**
 *用户信息实体
 */
@Entity('uc_user_info')
export class UserInfo extends CommonEntity {
  @ApiProperty('用户id')
  @Column('用户id', 36, { type: 'varchar', unique: true, name: 'user_id' })
  userId: string;

  @ApiProperty('手机号码')
  @Column('手机号码', 11, { name: 'phone_num', unique: true, nullable: true })
  phoneNum: string;

  @ApiProperty('邮箱')
  @Column('邮箱', 128, { unique: true })
  email: string;

  @ApiProperty('公司地址')
  @Column('公司地址', 128, {
    nullable: true,
    default: UserConstants.USER_INFO_CONFIG.COMPANY_ADDRESS,
  })
  company: string;

  @ApiProperty('职位')
  @Column('职位', 128, {
    nullable: true,
    default: UserConstants.USER_INFO_CONFIG.POSITION,
  })
  position: string;

  @ApiProperty('擅长')
  @Column('擅长', 128, {
    name: 'good_at',
    default: UserConstants.USER_INFO_CONFIG.GOOD_AT,
    nullable: true,
  })
  goodAt: string;

  @ApiProperty('生日')
  @Column('生日', null, {
    comment: '生日',
    transformer: dateTransformer,
    nullable: true,
  })
  birthday: Date;

  @ApiProperty('封面地址')
  @Column('封面地址', 256, {
    nullable: true,
  })
  cover: string;

  @ApiProperty('所在地')
  @Column('所在地', 128, {
    nullable: true,
  })
  location: string;
}

/**
 * 全局常量的定义
 */
export const UserConstants = {
  DEFAULT_AVATAR:
    'http://imgs.sunofbeaches.com/group1/M00/00/40/rBsADWAYITCAJpK1AABZPRa3kCo649.png', // 默认头像
  USER_STATE: [
    {
      statusNum: '0',
      statusName: '账户未审核',
    },
    {
      statusNum: '1',
      statusName: '账户有效',
    },
    {
      statusNum: '2',
      statusName: '账户已冻结',
    },
  ],
  // token的key
  TOKEN_KEY: 'token_key_',
  // 盐值的key
  SALT_KEY: 'salt_key_',
  // 摸鱼君cookie的key
  FISHER_COOKIE_KEY: 'fisher_cookie_key_',
  // 邮箱验证码的key
  FISHER_EMAIL_KEY: 'fisher_email_key_',
};

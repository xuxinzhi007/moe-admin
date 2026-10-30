import { botTag, genderLabel, roleTag, vipTag } from '../lib/adminLabels'
import { formatDateTime } from '../lib/format'
import { AdminTag, TagRow } from './AdminTag'
import { UserAvatar } from './UserAvatar'

export type UserProfile = {
  id: string
  username: string
  email: string
  moe_no?: string
  avatar?: string
  signature?: string
  gender?: string
  role?: string
  is_vip: boolean
  vip_expires_at?: string
  balance?: number
  gift_charm?: number
  created_at?: string
  feishu_bound?: boolean
  is_bot?: boolean
  bot_agent_key?: string
}

export function UserProfileCard({ user }: { user: UserProfile }) {
  return (
    <div className="user-profile-card">
      <UserAvatar src={user.avatar} name={user.username} size="lg" />
      <div className="user-profile-main">
        <div className="user-profile-name">{user.username}</div>
        <TagRow>
          <AdminTag spec={roleTag(user.role)} />
          <AdminTag spec={vipTag(user.is_vip)} />
          {user.feishu_bound ? <AdminTag label="飞书已绑" tone="mint" /> : null}
          {botTag(user.is_bot ?? false, user.bot_agent_key) ? (
            <AdminTag spec={botTag(user.is_bot ?? false, user.bot_agent_key)!} />
          ) : null}
        </TagRow>
        {user.signature ? <p className="user-profile-signature">{user.signature}</p> : null}
      </div>
      <dl className="user-profile-dl">
        <div>
          <dt>用户 ID</dt>
          <dd>{user.id}</dd>
        </div>
        <div>
          <dt>Moe 号</dt>
          <dd>{user.moe_no || '—'}</dd>
        </div>
        <div>
          <dt>邮箱</dt>
          <dd>{user.email || '—'}</dd>
        </div>
        <div>
          <dt>性别</dt>
          <dd>{genderLabel(user.gender)}</dd>
        </div>
        {user.is_vip ? (
          <div>
            <dt>VIP 到期</dt>
            <dd>{formatDateTime(user.vip_expires_at)}</dd>
          </div>
        ) : null}
        {typeof user.balance === 'number' ? (
          <div>
            <dt>余额</dt>
            <dd>{user.balance.toFixed(2)}</dd>
          </div>
        ) : null}
        {typeof user.gift_charm === 'number' ? (
          <div>
            <dt>魅力值</dt>
            <dd>{user.gift_charm}</dd>
          </div>
        ) : null}
        <div>
          <dt>注册时间</dt>
          <dd>{formatDateTime(user.created_at)}</dd>
        </div>
        {user.is_bot ? (
          <div>
            <dt>Bot Agent</dt>
            <dd>{user.bot_agent_key || '—'}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

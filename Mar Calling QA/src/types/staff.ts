export type UserRole = 'qa_manager' | 'staff' | 'management';

export interface AvatarStyle {
  skin: string;
  hair: string;
  hairStyle: 'bob' | 'long' | 'bun' | 'ponytail' | 'short';
  shirt: string;
  accessory?: 'glasses' | 'earrings' | 'clip';
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  outlet: string;
  joinedMonth: string;
  avatar: AvatarStyle;
  isDemo: boolean;
  /** Include in team leaderboards / charts. */
  showInTeam: boolean;
  motto?: string;
}

export type AchievementId =
  | 'great_listener'
  | 'sharp_closer'
  | 'product_pro'
  | 'customer_empathy'
  | 'hot_streak'
  | 'growing'
  | 'icc_master';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  emoji: string;
  description: string;
  /** Human-readable earning rule, shown when the badge is clicked. */
  rule: string;
  tint: string;
}

export interface EarnedAchievement {
  id: AchievementId;
  /** Call that triggered (or most recently re-confirmed) the badge. */
  callId: string;
  earnedOn: string;
  reason: string;
}

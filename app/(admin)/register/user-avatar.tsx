import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// User picture with the first letter as fallback (no LINE picture, or image
// still loading). Shared by the profile column and the pending dialog so the
// two views render identity the same way.
export function UserAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string
  avatarUrl?: string
}) {
  return (
    <Avatar size="sm">
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

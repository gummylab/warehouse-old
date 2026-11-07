'use client'

import { MoreVerticalIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ImageRecord } from '@/lib/db/types'
import { PACKAGE_OPTIONS } from '@/lib/order-images/packages'

// One photo in the admin detail page. The tile is a div, not a button: the
// picture and the menu trigger are two separate controls.
export function AdminImageTile({
  image,
  pending,
  onPreview,
  onPackageChange,
  onDelete,
}: {
  image: ImageRecord
  pending: boolean
  onPreview: () => void
  onPackageChange: (pkg: string | null) => void
  onDelete: () => void
}) {
  return (
    <div className="relative flex flex-col gap-y-2 rounded-xl border p-2">
      <button
        type="button"
        onClick={onPreview}
        className="block overflow-hidden rounded-lg border outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30">
        {/* next/image would proxy through /_next/image without the session
            cookie, so the auth-gated route is loaded directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated src */}
        <img
          src={`/api/liff/order-images/images/${image.id}/file?size=thumb`}
          alt={`รูปที่ ${image.seq}`}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full bg-muted object-cover"
        />
      </button>

      <span className="w-full truncate text-xs text-muted-foreground text-center">
        {image.package ?? 'ยังไม่ระบุแพ็กเกจ'}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1.5 top-1.5 bg-background/80 backdrop-blur-sm"
              aria-label={`ตั้งค่ารูปที่ ${image.seq}`}
              disabled={pending}
            />
          }>
          <MoreVerticalIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>แพ็กเกจ</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-auto min-w-48">
              <DropdownMenuRadioGroup
                value={image.package ?? null}
                onValueChange={(value: string | null) => onPackageChange(value)}>
                <DropdownMenuRadioItem value={null} closeOnClick>
                  ยังไม่ระบุแพ็กเกจ
                </DropdownMenuRadioItem>
                {PACKAGE_OPTIONS.map((pkg) => (
                  <DropdownMenuRadioItem key={pkg} value={pkg} closeOnClick>
                    {pkg}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={onDelete}>
            <Trash2Icon />
            ลบรูปนี้
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

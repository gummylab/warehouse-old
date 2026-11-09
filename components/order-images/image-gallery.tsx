'use client'

import { useMemo } from 'react'

import { LightGallery, type GalleryItem } from '@lightgallery/react'
import Thumbnail from '@lightgallery/react/plugins/thumbnail'
import Zoom from '@lightgallery/react/plugins/zoom'

import { photoFileUrl } from '@/lib/order-images/urls'

// One photo in the viewer, by position. Callers keep the id (a refresh
// re-derives the position from it) and hand the gallery the order plus the
// label the grid already shows.
export interface GalleryPhoto {
  id: string
  seq: number
}

// Module scope so the plugin array keeps its identity across renders; the
// gallery memoises its settings against it.
const PLUGINS = [Thumbnail, Zoom]

// lightGallery ships English chrome and, on touch devices, hides the
// controls entirely (`mobileSettings` replaces rather than extends the
// defaults). The controls and the download are restated here: the app is
// Thai and a phone still needs a way to walk the photos. Gesture buttons
// stay off, which is lightGallery's own touch default — pinch and
// double-tap already zoom, and the toolbar stays small enough to fit.
const THAI_STRINGS = {
  previousSlide: 'รูปก่อนหน้า',
  nextSlide: 'รูปถัดไป',
  closeGallery: 'ปิด',
  download: 'ดาวน์โหลด',
  slideAnnouncement: 'รูปที่ {index} จาก {total}',
  toggleThumbnails: 'แถบรูป',
  zoomIn: 'ขยาย',
  zoomOut: 'ย่อ',
  viewActualSize: 'ขนาดจริง',
}

const TOUCH_CONTROLS = {
  controls: true,
  showCloseIcon: true,
  download: true,
  showGestureButtons: false,
}

// The photo viewer shared by the LIFF item page and the admin order detail.
// Both used to carry their own copy of a Base UI dialog with swipe handlers
// and arrow-key listeners; lightGallery owns gestures, keyboard, focus and
// the thumbnail strip, so the callers only keep the open/index state.
//
// Controlled on purpose: `open` and `index` live in the caller, because both
// screens also keep the photo id in state and re-derive it after a refresh.
export function ImageGallery({
  photos,
  open,
  index,
  onClose,
  onIndexChange,
}: {
  photos: GalleryPhoto[]
  open: boolean
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const slides = useMemo<GalleryItem[]>(
    () =>
      photos.map((photo) => ({
        src: photoFileUrl(photo.id, 'web'),
        thumb: photoFileUrl(photo.id, 'thumb'),
        alt: `รูปที่ ${photo.seq}`,
      })),
    [photos],
  )

  // No photos means nothing to walk, and an empty gallery has no slide to
  // show. The callers only open it with at least one photo.
  if (photos.length === 0) return null

  return (
    <LightGallery
      plugins={PLUGINS}
      slides={slides}
      open={open}
      index={index}
      onClose={onClose}
      onIndexChange={onIndexChange}
      // The dialog's accessible name counts positions, not seq: seq is
      // allocated as MAX(seq) + 1 per item, so a delete leaves gaps.
      strings={{ ...THAI_STRINGS, galleryLabel: `รูปที่ ${index + 1} จาก ${photos.length}` }}
      mobileSettings={TOUCH_CONTROLS}
    />
  )
}

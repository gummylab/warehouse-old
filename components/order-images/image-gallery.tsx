'use client'

import { useEffect, useMemo } from 'react'

import { LightGallery, type GalleryItem } from '@lightgallery/react'
import Thumbnail from '@lightgallery/react/plugins/thumbnail'
import Zoom from '@lightgallery/react/plugins/zoom'

import { photoDownloadName } from '@/lib/order-images/download'
import { photoDownloadUrl, photoFileUrl } from '@/lib/order-images/urls'

// One photo in the viewer, by position. Callers keep the id (a refresh
// re-derives the position from it) and hand the gallery the order plus the
// label the grid already shows.
export interface GalleryPhoto {
  id: string
  seq: number
  fileName?: string | null
  mimeType?: string | null
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
  onDownload,
}: {
  photos: GalleryPhoto[]
  open: boolean
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
  /** Replaces the built-in download anchor when the browser needs a different
   *  save path (the LINE client). Leave it out to keep the plain download. */
  onDownload?: (photo: GalleryPhoto) => void | Promise<void>
}) {
  const slides = useMemo<GalleryItem[]>(
    () =>
      photos.map((photo) => ({
        src: photoFileUrl(photo.id, 'web'),
        thumb: photoFileUrl(photo.id, 'thumb'),
        alt: `รูปที่ ${photo.seq}`,
        // The built-in anchor otherwise points at the web copy and has no
        // filename, which is not what the operator asked to keep.
        downloadUrl: photoDownloadUrl(photo.id),
        download: photoDownloadName(photo),
      })),
    [photos],
  )

  // lightGallery renders its own toolbar anchor. A WebView that ignores the
  // download attribute turns that anchor into a dead tap, so the LIFF screen
  // intercepts it and saves through the share sheet or the external browser.
  // Capture phase runs before lightGallery's own toolbar handlers.
  useEffect(() => {
    if (!open || !onDownload) return
    const download = onDownload

    function handleClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.lg-download')) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const photo = photos[index]
      if (photo) void download(photo)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [open, onDownload, photos, index])

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

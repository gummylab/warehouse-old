'use client'

import { useState, useTransition } from 'react'

import { LoaderCircle, MapPin, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toastMessages } from '@/lib/messages'
import { notifySuccess } from '@/lib/toast'

import { saveDatabasePath, saveStoragePath } from './actions'

// The two paths the app reads and writes. Both apply as soon as they are
// saved: the storage root is read per call, and the database switch validates
// the new file before it replaces the live connection (ADR 0014).
export function LocationsCard({
  databasePath,
  storagePath,
}: {
  databasePath: string
  storagePath: string
}) {
  const [database, setDatabase] = useState(databasePath)
  const [storage, setStorage] = useState(storagePath)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  // The resolved path waiting for the "this file does not exist yet" answer.
  const [pending, setPending] = useState<string | null>(null)
  const [savingDatabase, startDatabase] = useTransition()
  const [savingStorage, startStorage] = useTransition()
  const router = useRouter()

  function submitDatabase(confirm: boolean) {
    startDatabase(async () => {
      const result = await saveDatabasePath({ path: database, confirm })
      if (result.status === 'confirm') {
        setPending(result.path)
        return
      }
      if (result.status === 'error') {
        setDatabaseError(result.message)
        return
      }
      setPending(null)
      setDatabaseError(null)
      setDatabase(result.path)
      notifySuccess(toastMessages.databaseConnected, { id: 'settings-saved' })
      // The switch cleared the server caches; reload the current route so the
      // paths this page reads match the settings file the action just wrote.
      router.refresh()
    })
  }

  function submitStorage() {
    startStorage(async () => {
      const result = await saveStoragePath({ path: storage })
      if (result.status === 'error') {
        setStorageError(result.message)
        return
      }
      if (result.status !== 'saved') return
      setStorageError(null)
      setStorage(result.path)
      notifySuccess(toastMessages.settingsSaved, { id: 'settings-saved' })
    })
  }

  return (
    <section
      aria-labelledby="locations-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-1">
        <h2 id="locations-title" className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4" />
          ตำแหน่งที่ตั้ง
        </h2>

      </div>

      {savingDatabase ? (
        // The connection swap is the only operation that changes what every
        // page reads, so it owns the card until the action has proved the new
        // file answers a query. Both fields stay mounted only while idle.
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg bg-muted/60 px-4 py-6 text-center">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">กำลังเชื่อมต่อฐานข้อมูล…</p>
          <p className="text-xs text-muted-foreground">
            หน้าจอจะกลับมาใช้งานได้เมื่อเชื่อมต่อสำเร็จ
          </p>
        </div>
      ) : (
        <>
          <PathField
            id="settings-database-path"
            label="โฟลเดอร์ฐานข้อมูล"
            value={database}
            error={databaseError}
            saving={savingDatabase}
            savingLabel="กำลังเชื่อมต่อ…"
            onChange={setDatabase}
            onSave={() => submitDatabase(false)}
          />

          <PathField
            id="settings-storage-path"
            label="โฟลเดอร์ที่จัดเก็บไฟล์"
            value={storage}
            error={storageError}
            saving={savingStorage}
            onChange={setStorage}
            onSave={submitStorage}
          />
        </>
      )}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !savingDatabase) setPending(null)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างฐานข้อมูลใหม่</DialogTitle>
            <DialogDescription>
              โฟลเดอร์นี้ยังไม่มีไฟล์ wh.db ระบบจะสร้างฐานข้อมูลว่างที่{' '}
              {pending}/wh.db ข้อมูลเดิมยังอยู่ที่ไฟล์เดิม และกลับมาใช้ได้โดยแก้ที่อยู่กลับ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPending(null)}
              disabled={savingDatabase}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => submitDatabase(true)}
              disabled={savingDatabase}>
              {savingDatabase ? 'กำลังเชื่อมต่อ…' : 'สร้างและสลับ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// One labelled path with its own save button: the two fields have different
// consequences, so they are saved separately and an error stays next to the
// field that caused it.
function PathField({
  id,
  label,
  icon: Icon,
  value,
  error,
  hint,
  saving,
  savingLabel = 'กำลังบันทึก',
  onChange,
  onSave,
}: {
  id: string
  label: string
  icon?: LucideIcon
  value: string
  error: string | null
  hint?: string
  saving: boolean
  savingLabel?: string
  onChange: (value: string) => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        {Icon ? <Icon className="size-4" /> : null}
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          type="text"
          dir="ltr"
          className="font-mono text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={saving}
          aria-label={`บันทึก${label}`}
          className="sm:w-28">
          {saving ? savingLabel : 'บันทึก'}
        </Button>
      </div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

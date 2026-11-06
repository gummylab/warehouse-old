'use client'

import { useState, useTransition } from 'react'

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
      notifySuccess(toastMessages.settingsSaved, { id: 'settings-saved' })
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
        <h2 id="locations-title" className="text-sm font-semibold">
          ตำแหน่งที่ตั้ง
        </h2>
        <p className="text-xs text-muted-foreground">
          แก้ที่อยู่แล้วบันทึก มีผลทันทีโดยไม่ต้องรีสตาร์ท
        </p>
      </div>

      <PathField
        id="settings-database-path"
        label="ฐานข้อมูล"
        value={database}
        error={databaseError}
        saving={savingDatabase}
        onChange={setDatabase}
        onSave={() => submitDatabase(false)}
      />

      <PathField
        id="settings-storage-path"
        label="ที่จัดเก็บ"
        value={storage}
        error={storageError}
        saving={savingStorage}
        onChange={setStorage}
        onSave={submitStorage}
        hint="รูปเดิมยังอยู่ที่โฟลเดอร์เดิม ไม่ถูกย้ายตาม"
      />

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !savingDatabase) setPending(null)
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างฐานข้อมูลใหม่</DialogTitle>
            <DialogDescription>
              ไฟล์นี้ยังไม่มี ระบบจะสร้างฐานข้อมูลว่างที่ {pending}{' '}
              ข้อมูลเดิมยังอยู่ที่ไฟล์เดิม และกลับมาใช้ได้โดยแก้ที่อยู่กลับ
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
              สร้างและสลับ
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
  value,
  error,
  hint,
  saving,
  onChange,
  onSave,
}: {
  id: string
  label: string
  value: string
  error: string | null
  hint?: string
  saving: boolean
  onChange: (value: string) => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
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
          {saving ? 'กำลังบันทึก' : 'บันทึก'}
        </Button>
      </div>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

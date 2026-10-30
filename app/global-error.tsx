'use client'

import { useEffect, type CSSProperties } from 'react'

// Global error UI: the last line of defence, shown when even the root
// layout fails to render. It replaces the root layout, so it cannot rely on
// the app's global stylesheet or Tailwind classes. Everything here is an
// inline style on purpose.
//
// The digest identifies the error in the server log, so the operator can
// match a report from a phone to a line in the dev server output.
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '1rem',
    textAlign: 'center',
    fontFamily: 'system-ui, sans-serif',
    color: '#18181b',
    background: '#ffffff',
  },
  title: { margin: 0, fontSize: '1.125rem', fontWeight: 600 },
  description: { margin: 0, maxWidth: '28rem', fontSize: '0.875rem', color: '#52525b' },
  reference: { margin: 0, fontSize: '0.75rem', color: '#71717a' },
  button: {
    borderRadius: '0.5rem',
    border: '1px solid #d4d4d8',
    background: 'transparent',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'inherit',
    cursor: 'pointer',
  },
} satisfies Record<string, CSSProperties>

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="th">
      <body style={{ margin: 0 }}>
        <div style={styles.page}>
          <h1 style={styles.title}>เกิดข้อผิดพลาดที่ระบบ</h1>
          <p style={styles.description}>
            กรุณาลองใหม่อีกครั้ง ถ้ายังพบปัญหาให้แจ้งผู้ดูแลระบบ
          </p>
          {error.digest ? <p style={styles.reference}>รหัสอ้างอิง: {error.digest}</p> : null}
          <button type="button" onClick={() => retry()} style={styles.button}>
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  )
}

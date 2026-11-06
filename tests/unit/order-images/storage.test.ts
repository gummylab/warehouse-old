import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildKey,
  derivativeKey,
  derivativePath,
  isInsideRoot,
  originalPath,
  sanitize,
  storageRoot,
} from '@/lib/order-images/storage'

// STORAGE_PATH is read on every call, so each test can point it wherever it
// likes without re-importing the module. Nothing here writes to disk: the
// path math is the point, and the e2e spec asserts a real file landing.
const BASE = path.resolve('tests', '.tmp', 'unit-storage-base')

// A real line name from the seeded catalog ("ดอกแค"), built from code points
// on purpose: a Thai literal that looks right on screen can still carry the
// wrong character, and these tests compare strings character by character.
const THAI_LINE = String.fromCodePoint(0x0e14, 0x0e2d, 0x0e01, 0x0e41, 0x0e04)

beforeEach(() => {
  vi.stubEnv('STORAGE_PATH', BASE)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('storage root', () => {
  it('appends the app folder name to the configured base', () => {
    expect(storageRoot()).toBe(path.join(path.resolve(BASE), 'order-images'))
  })

  it('does not append the folder name twice when the base already ends with it', () => {
    const alreadyRoot = path.join(path.resolve(BASE), 'order-images')
    vi.stubEnv('STORAGE_PATH', alreadyRoot)
    expect(storageRoot()).toBe(alreadyRoot)
  })

  it('does not mistake a base that merely ends with the folder name for the root', () => {
    // A string suffix check would treat this as the root and write there.
    const lookalike = path.join(path.resolve(BASE), 'backup-order-images')
    vi.stubEnv('STORAGE_PATH', lookalike)
    expect(storageRoot()).toBe(path.join(lookalike, 'order-images'))
  })

  it('follows a changed STORAGE_PATH immediately, without a re-import', () => {
    const other = path.resolve('tests', '.tmp', 'other-base')
    vi.stubEnv('STORAGE_PATH', other)
    expect(storageRoot()).toBe(path.join(other, 'order-images'))
  })
})

describe('sanitize', () => {
  it('removes path separators and Windows-forbidden characters', () => {
    // User-supplied order numbers and line names flow through here, so no
    // segment may smuggle a separator or an invalid character into the key.
    expect(sanitize('12/34')).toBe('1234')
    expect(sanitize('12\\34')).toBe('1234')
    expect(sanitize('a:b*c?d"e<f>g|h')).toBe('abcdefgh')
  })

  it('collapses runs of whitespace and trims the ends', () => {
    expect(sanitize('  x  1  ')).toBe('x 1')
  })

  it('keeps hyphens untouched', () => {
    expect(sanitize('E2E-1234')).toBe('E2E-1234')
  })

  it('keeps a non-ASCII line name untouched', () => {
    expect(sanitize(THAI_LINE)).toBe(THAI_LINE)
  })

  it('removes control characters, which are invalid in a path segment', () => {
    // Built from char codes on purpose: a literal control character in the
    // source can be stripped by an editor and then the test asserts nothing.
    const nul = String.fromCharCode(0)
    const unitSeparator = String.fromCharCode(31)
    const del = String.fromCharCode(127)

    expect(sanitize(`a${nul}b`)).toBe('ab')
    expect(sanitize(`a${unitSeparator}b`)).toBe('ab')
    expect(sanitize(`a${del}b`)).toBe('ab')
  })

  it('replaces a segment made only of dots, which is a path instruction', () => {
    // "." and ".." mean "this folder" and "the parent folder". Left alone,
    // path.normalize() would collapse them and the file would land outside
    // its date folder.
    expect(sanitize('.')).toBe('_dots_1')
    expect(sanitize('..')).toBe('_dots_2')
    expect(sanitize('...')).toBe('_dots_3')
  })

  it('keeps distinct dot-only segments distinct', () => {
    // The stand-in has to be injective, otherwise two different order
    // numbers would share one folder and overwrite each other.
    expect(sanitize('.')).not.toBe(sanitize('..'))
    expect(sanitize('..')).not.toBe(sanitize('...'))
  })

  it('replaces a segment that filtered away to nothing', () => {
    // An empty segment collapses away when the path is normalized, which
    // drops a level of the key just as effectively as "..".
    expect(sanitize('')).toBe('_empty')
    expect(sanitize('///')).toBe('_empty')
    expect(sanitize('   ')).toBe('_empty')
  })

  it('keeps a name that merely contains dots', () => {
    expect(sanitize('1234.5')).toBe('1234.5')
    expect(sanitize('.1234')).toBe('.1234')
  })
})

describe('buildKey', () => {
  it('builds date/order/line/item/seq-package.ext', () => {
    expect(buildKey('2026-10-19', '1234', 'line-a', 100, 1, null, 'jpg')).toBe(
      '2026-10-19/1234/line-a/100/1-Primary.jpg',
    )
  })

  it('falls back to Primary while a photo is still unlabelled', () => {
    // The upload route always stores package NULL, so this fallback is the
    // normal case, not an edge case.
    expect(buildKey('2026-10-19', '1234', 'line-a', 100, 3, null, 'png')).toContain('3-Primary.png')
  })

  it('uses the package display string as-is, spaces included', () => {
    expect(buildKey('2026-10-19', '1234', 'line-a', 110, 1, 'Inner Box', 'jpg')).toBe(
      '2026-10-19/1234/line-a/110/1-Inner Box.jpg',
    )
  })

  it('normalises the extension: leading dot, upper case, or missing', () => {
    expect(buildKey('2026-10-19', '1', 'l', 100, 1, null, '.PNG')).toContain('1-Primary.png')
    expect(buildKey('2026-10-19', '1', 'l', 100, 1, null, 'webp')).toContain('1-Primary.webp')
    expect(buildKey('2026-10-19', '1', 'l', 100, 1, null, '')).toContain('1-Primary.jpg')
  })

  it('sanitises every user-supplied segment of the key', () => {
    expect(buildKey('2026-10-19', '12/34', 'a:b', 100, 1, null, 'jpg')).toBe(
      '2026-10-19/1234/ab/100/1-Primary.jpg',
    )
  })

  it('keeps the production line name as its own path segment', () => {
    expect(buildKey('2026-10-19', '1234', THAI_LINE, 100, 1, null, 'jpg')).toBe(
      `2026-10-19/1234/${THAI_LINE}/100/1-Primary.jpg`,
    )
  })

  it('never produces a key whose segments can escape the date folder', () => {
    // Every segment of the built key has to survive path.normalize() as a
    // plain name. A ".." segment would be resolved as "the parent folder",
    // and an empty one would be dropped, so both would move the file out
    // of the folder the key names.
    const key = buildKey('2026-10-19', '..', '..', 100, 1, null, 'jpg')
    for (const segment of key.split('/')) {
      expect(segment).not.toBe('.')
      expect(segment).not.toBe('..')
      expect(segment).not.toBe('')
    }
  })

  it('keeps two dot-only order numbers in separate folders', () => {
    // Otherwise the second photo would overwrite the first one.
    expect(buildKey('2026-10-19', '.', 'line-a', 100, 1, null, 'jpg')).not.toBe(
      buildKey('2026-10-19', '..', 'line-a', 100, 1, null, 'jpg'),
    )
  })
})

describe('originalPath', () => {
  it('resolves a storage key under the originals folder', () => {
    expect(originalPath('2026-10-19/1234/100/1-Primary.jpg')).toBe(
      path.join(
        storageRoot(),
        'originals',
        '2026-10-19',
        '1234',
        '100',
        '1-Primary.jpg',
      ),
    )
  })

  it('resolves a key that carries a non-ASCII line segment', () => {
    expect(originalPath(`2026-10-19/1234/${THAI_LINE}/100/1-Primary.jpg`)).toBe(
      path.join(
        storageRoot(),
        'originals',
        '2026-10-19',
        '1234',
        THAI_LINE,
        '100',
        '1-Primary.jpg',
      ),
    )
  })
})

describe('derivatives', () => {
  it('keeps the key folders, swaps the extension and adds the size folder', () => {
    expect(derivativeKey('2026-10-19/1234/100/1-Primary.png', 'web')).toBe(
      'web/2026-10-19/1234/100/1-Primary.webp',
    )
    expect(derivativeKey('2026-10-19/1234/100/1-Primary.jpg', 'thumb')).toBe(
      'thumb/2026-10-19/1234/100/1-Primary.webp',
    )
  })

  it('resolves under the storage root, not under originals', () => {
    expect(derivativePath('2026-10-19/1234/100/1-Primary.jpg', 'web')).toBe(
      path.join(storageRoot(), 'web', '2026-10-19', '1234', '100', '1-Primary.webp'),
    )
  })

  it('handles a key whose file name already ends in webp', () => {
    expect(derivativeKey('2026-10-19/1234/100/1-Primary.webp', 'thumb')).toBe(
      'thumb/2026-10-19/1234/100/1-Primary.webp',
    )
  })
})

describe('isInsideRoot', () => {
  it('accepts a file inside the root', () => {
    expect(isInsideRoot(originalPath('2026-10-19/1234/100/1-Primary.jpg'))).toBe(true)
  })

  it('accepts the root itself', () => {
    expect(isInsideRoot(storageRoot())).toBe(true)
  })

  it('rejects a key that climbs out of the root', () => {
    expect(isInsideRoot(path.join(storageRoot(), '..', '..', 'evil.txt'))).toBe(false)
  })

  it('rejects a sibling directory whose name starts with the root name', () => {
    // Without the trailing separator, "root-evil" would pass a naive
    // startsWith check.
    expect(isInsideRoot(`${storageRoot()}-evil/evil.txt`)).toBe(false)
  })
})

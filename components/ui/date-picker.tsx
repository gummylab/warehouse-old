'use client'

import { useState } from 'react'

import { th } from 'date-fns/locale'
import {
  CalendarDaysIcon,
  CalendarIcon,
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  dateToIso,
  formatThaiMonthYear,
  formatThaiMonthYearCaption,
  formatThaiYear,
  isoMonthParts,
  isoToDate,
  isoYear,
  thaiMonthName,
} from '@/lib/order-images/date'
import { formatThaiDate } from '@/lib/order-images/format'
import { todayBangkok } from '@/lib/order-images/validation'

// Date pickers for the surfaces that select a day, a month or a year.
//
// The stored value is always the string the rest of the app uses
// ('YYYY-MM-DD', 'YYYY-MM', 'YYYY'), never a Date. The calendar works with
// Date objects, so lib/order-images/date.ts owns the conversion and this file
// keeps the picker's own state (open, the displayed month or year page).
//
// A picker is a button that shows the Thai value and opens a popover. The
// LIFF form and the admin filter use the same control, so the two surfaces
// cannot drift apart.

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  // Accessible name for the trigger. The visible label stays with the caller.
  label: string
  id?: string
  disabled?: boolean
  placeholder?: string
}

export function DatePicker({
  value,
  onChange,
  label,
  id,
  disabled,
  placeholder = 'เลือกวันที่',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = isoToDate(value)

  const calendar = (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={(next) => {
        if (!next) return
        onChange(dateToIso(next))
        setOpen(false)
      }}
      locale={th}
      today={isoToDate(todayBangkok())}
      showOutsideDays={false}
      formatters={{ formatCaption: formatThaiMonthYearCaption }}
    />
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            id={id}
            variant="outline"
            className="w-full justify-start font-normal"
            aria-label={label}
            data-date={value}
            disabled={disabled}
          />
        }>
        <CalendarIcon />
        {selected ? formatThaiDate(value) : placeholder}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        {calendar}
      </PopoverContent>
    </Popover>
  )
}

type MonthPickerProps = {
  value: string // YYYY-MM
  onChange: (value: string) => void
  label: string
  disabled?: boolean
}

export function MonthPicker({
  value,
  onChange,
  label,
  disabled,
}: MonthPickerProps) {
  const selected = isoMonthParts(value)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(
    () => selected?.year ?? currentBangkokYear(),
  )

  function handleOpenChange(next: boolean) {
    // Reopening starts on the selected year even when the user navigated away
    // the last time the popover was open.
    if (next) setViewYear(selected?.year ?? currentBangkokYear())
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
            aria-label={label}
            data-month={value}
            disabled={disabled}
          />
        }>
        <CalendarDaysIcon />
        {selected ? formatThaiMonthYear(value) : 'เลือกเดือน'}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-3">
        <YearStepper
          year={viewYear}
          previousLabel="ปีก่อนหน้า"
          nextLabel="ปีถัดไป"
          onPrevious={() => setViewYear((year) => year - 1)}
          onNext={() => setViewYear((year) => year + 1)}
        />

        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, index) => {
            const month = index + 1
            const monthValue = `${viewYear}-${String(month).padStart(2, '0')}`
            const active =
              selected?.year === viewYear && selected.month === month

            return (
              <Button
                key={month}
                type="button"
                variant={active ? 'default' : 'ghost'}
                size="sm"
                className="w-full"
                aria-label={`${thaiMonthName(index, 'long')} ${formatThaiYear(viewYear)}`}
                data-month-value={monthValue}
                onClick={() => {
                  onChange(monthValue)
                  setOpen(false)
                }}>
                {thaiMonthName(index, 'short')}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type YearPickerProps = {
  value: string // YYYY
  onChange: (value: string) => void
  label: string
  disabled?: boolean
}

const YEARS_PER_PAGE = 12

export function YearPicker({
  value,
  onChange,
  label,
  disabled,
}: YearPickerProps) {
  const selectedYear = isoYear(value)
  const [open, setOpen] = useState(false)
  const [pageStart, setPageStart] = useState(() =>
    startOfYearPage(selectedYear ?? currentBangkokYear()),
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setPageStart(startOfYearPage(selectedYear ?? currentBangkokYear()))
    }
    setOpen(next)
  }

  const years = Array.from(
    { length: YEARS_PER_PAGE },
    (_, index) => pageStart + index,
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
            aria-label={label}
            data-year={value}
            disabled={disabled}
          />
        }>
        <CalendarRangeIcon />
        {selectedYear ? formatThaiYear(selectedYear) : 'เลือกปี'}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-3">
        <YearStepper
          year={pageStart}
          yearOffset={YEARS_PER_PAGE - 1}
          previousLabel="ช่วงปีก่อนหน้า"
          nextLabel="ช่วงปีถัดไป"
          onPrevious={() => setPageStart((start) => start - YEARS_PER_PAGE)}
          onNext={() => setPageStart((start) => start + YEARS_PER_PAGE)}
        />

        <div className="grid grid-cols-3 gap-1">
          {years.map((year) => (
            <Button
              key={year}
              type="button"
              variant={year === selectedYear ? 'default' : 'ghost'}
              size="sm"
              className="w-full"
              aria-label={formatThaiYear(year)}
              data-year-value={year}
              onClick={() => {
                onChange(String(year))
                setOpen(false)
              }}>
              {formatThaiYear(year)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Shared header: chevrons around one or two Buddhist-era years.
function YearStepper({
  year,
  yearOffset = 0,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: {
  year: number
  yearOffset?: number
  previousLabel: string
  nextLabel: string
  onPrevious: () => void
  onNext: () => void
}) {
  const label =
    yearOffset > 0
      ? `${formatThaiYear(year)} - ${formatThaiYear(year + yearOffset)}`
      : formatThaiYear(year)

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={previousLabel}
        onClick={onPrevious}>
        <ChevronLeftIcon />
      </Button>
      <span className="text-sm font-medium">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={nextLabel}
        onClick={onNext}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}

function currentBangkokYear(): number {
  return Number(todayBangkok().slice(0, 4))
}

function startOfYearPage(year: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE
}

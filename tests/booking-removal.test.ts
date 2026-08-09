import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as dbTypes from '../src/types/database'
import * as servicesApi from '../src/lib/api/services'
import * as useServicesMod from '../src/hooks/useServices'

// Booking removal verification.
//
// The booking *types* (ServiceRequest / BookingFormData / the service_requests
// table) are TypeScript interfaces and are erased at runtime, so we cannot read
// them off an `import * as` namespace. Instead we assert on the SOURCE files
// (they must not contain the booking identifiers) and on the REAL runtime
// exports of the Services helpers (which must remain intact). We also assert the
// physical booking routes/doc are gone. This breaks if a booking artifact is
// reintroduced or a Services artifact is accidentally dropped.

const root = process.cwd()

function readSource(rel: string): string {
  return readFileSync(path.resolve(root, rel), 'utf8')
}

const databaseDotTs = readSource('src/types/database.ts')
const generated = readSource('src/types/database.types.ts')

describe('booking removal: physical artifacts gone', () => {
  it('src/app/booking route directory removed', () => {
    expect(existsSync(path.resolve(root, 'src/app/booking'))).toBe(false)
  })

  it('docs/BOOKING_INTEGRATION.md removed', () => {
    expect(existsSync(path.resolve(root, 'docs/BOOKING_INTEGRATION.md'))).toBe(
      false
    )
  })
})

describe('booking removal: booking-only identifiers absent from source', () => {
  it('BookingFormData not declared in database.ts', () => {
    expect(databaseDotTs).not.toContain('BookingFormData')
  })

  it('ServiceRequest not declared in database.ts', () => {
    expect(databaseDotTs).not.toContain('ServiceRequest')
  })

  it('service_requests table not declared in database.types.ts', () => {
    expect(generated).not.toContain('service_requests')
  })
})

describe('services preservation: code helpers intact (runtime)', () => {
  it('getServices family exported from lib/api/services.ts', () => {
    expect(typeof servicesApi.getServices).toBe('function')
    expect(typeof servicesApi.getServiceById).toBe('function')
    expect(typeof servicesApi.getServicesByCategory).toBe('function')
    expect(typeof servicesApi.getEmergencyServices).toBe('function')
  })

  it('useServices / useServiceById exported from hooks/useServices.ts', () => {
    expect(typeof useServicesMod.useServices).toBe('function')
    expect(typeof useServicesMod.useServiceById).toBe('function')
  })

  it('Service / ServiceWithIcon interfaces still declared in database.ts', () => {
    expect(databaseDotTs).toContain('export interface Service ')
    expect(databaseDotTs).toContain('export interface ServiceWithIcon')
  })

  it('services table still declared in generated database.types.ts', () => {
    expect(generated).toContain('services:')
  })
})

// Reference the type namespace import so tsc does not flag it as unused while
// still leaving the runtime-lightweight checks above authoritative.
void dbTypes

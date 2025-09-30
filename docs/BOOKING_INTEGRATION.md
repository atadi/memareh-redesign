# Booking Component - Supabase Integration

This document describes the Supabase integration for the booking system.

## Overview

The booking component now reads services from and writes service requests to the Supabase `memareh` schema.

## Files Updated/Created

### 1. Type Definitions
- **`src/types/database.ts`** - TypeScript interfaces matching the Supabase schema
  - `Service` - Service data from `memareh.services` table
  - `ServiceRequest` - Service request data for `memareh.service_requests` table
  - `Profile` - User profile from `memareh.profiles` table
  - `BookingFormData` - Form data types

### 2. Data Fetching Hooks
- **`src/hooks/useServices.ts`** - Custom React hooks for fetching services
  - `useServices()` - Fetches all active services, ordered by popularity
  - `useServiceById(id)` - Fetches a single service by ID

### 3. Updated Components
- **`src/components/booking/ServiceSelection.tsx`**
  - Now uses `useServices()` hook to fetch from Supabase
  - Displays loading and error states
  - Maps icon names from database to React components
  - Shows popular and emergency badges based on database flags

- **`src/app/booking/page.tsx`**
  - Integrated Supabase client for saving service requests
  - Validates user authentication before submission
  - Generates unique request numbers
  - Saves complete booking data to `service_requests` table
  - Shows loading states during submission
  - Redirects to success page after booking

- **`src/app/booking/success/page.tsx`** (NEW)
  - Displays booking confirmation
  - Shows request details fetched from Supabase
  - Displays tracking number and next steps

## Database Schema Dependencies

The booking system relies on these tables in the `memareh` schema:

### Services Table
```sql
memareh.services (
  id uuid PRIMARY KEY,
  name_fa text,
  slug text,
  description text,
  category service_category,
  base_price numeric,
  estimated_duration integer,
  is_emergency boolean,
  popular boolean,
  active boolean,
  icon text,
  ...
)
```

### Service Requests Table
```sql
memareh.service_requests (
  id uuid PRIMARY KEY,
  request_number text UNIQUE,
  customer_id uuid REFERENCES memareh.profiles(id),
  service_id uuid REFERENCES memareh.services(id),
  title text,
  description text,
  property_type property_type,
  address text,
  city text,
  requested_date date,
  requested_time_slot text,
  status request_status DEFAULT 'pending',
  priority priority_level,
  is_emergency boolean,
  ...
)
```

## Icon Mapping

Service icons are stored as strings in the database and mapped to Lucide React icons:

```typescript
const iconMap = {
  'alert-triangle': AlertTriangle,
  'zap': Zap,
  'wrench': Wrench,
  'home': Home,
  'building': Building,
  'check-circle': CheckCircle,
}
```

To add a new icon, update the `iconMap` in `ServiceSelection.tsx` and set the icon name in the database.

## Usage Flow

1. **User visits booking page** → Services are fetched from Supabase
2. **User selects service** → Service details stored in form state
3. **User fills location details** → Address and city captured
4. **User selects date/time** → Appointment time recorded
5. **User confirms** → Data saved to `service_requests` table
6. **Success page** → Confirmation with tracking number

## Authentication

The booking system requires authentication:
- Checks `supabase.auth.getUser()` before submission
- Redirects to login if user is not authenticated
- Uses user ID as `customer_id` in service requests

## Error Handling

- Loading states with spinners
- Error messages displayed to users
- Toast notifications for success/failure
- Form validation with Zod schema
- Graceful fallbacks if data fetch fails

## Future Enhancements

- [ ] Image upload for service requests
- [ ] Real-time status updates
- [ ] Email/SMS notifications
- [ ] Payment integration
- [ ] Technician assignment logic
- [ ] Calendar integration for scheduling

## Testing

To test the integration:

1. Ensure Supabase is configured with the `memareh` schema
2. Add some services to the `memareh.services` table:
   ```sql
   INSERT INTO memareh.services (name_fa, description, category, base_price, estimated_duration, is_emergency, active, icon)
   VALUES ('نصب کولر', 'نصب و راه‌اندازی کولر گازی', 'installation', 500000, 120, false, true, 'home');
   ```
3. Create a user account
4. Navigate to `/booking` and complete the booking flow
5. Check the `service_requests` table for the new entry

## Environment Variables

Make sure these are set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

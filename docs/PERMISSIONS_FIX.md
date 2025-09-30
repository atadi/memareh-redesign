# Supabase Permissions Fix

## Problem
Users were getting `permission denied for schema memareh` error when trying to access the booking system.

## Solution
Applied two migrations to grant proper permissions:

### 1. Schema and Table Permissions
- Granted `USAGE` on `memareh` schema to `authenticated` and `anon` roles
- Granted `SELECT` on all tables for authenticated users
- Granted `INSERT`, `UPDATE` on specific tables (`service_requests`, `profiles`)
- Set up default privileges for future tables

### 2. Row Level Security (RLS) Policies

#### Services Table
```sql
-- Anyone can view active services
CREATE POLICY "Anyone can view active services" ON memareh.services
  FOR SELECT
  USING (active = true);
```

#### Profiles Table
```sql
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON memareh.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON memareh.profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### Service Requests Table
```sql
-- Users can create their own service requests
CREATE POLICY "Users can create own service requests" ON memareh.service_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Users can view their own service requests
CREATE POLICY "Users can view own service requests" ON memareh.service_requests
  FOR SELECT USING (auth.uid() = customer_id);

-- Users can update their own pending requests
CREATE POLICY "Users can update own pending requests" ON memareh.service_requests
  FOR UPDATE USING (auth.uid() = customer_id AND status = 'pending');
```

#### Other Tables
- **Technicians**: Anyone can view available technicians
- **Invoices**: Users can view their own invoices
- **Notifications**: Users can view/update their own notifications
- **Reviews**: Anyone can read reviews, users can create reviews for completed requests

## Testing

### 1. Test Service Fetching (No Auth Required)
```javascript
// Should work without authentication
const { data, error } = await supabase
  .from('services')
  .select('*')
  .eq('active', true);

console.log('Services:', data);
```

### 2. Test Service Request Creation (Auth Required)
```javascript
// Must be authenticated
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      customer_id: user.id,
      service_id: 'some-service-id',
      title: 'Test Request',
      description: 'Test description',
      property_type: 'apartment',
      address: 'Test address',
      city: 'Tehran',
      requested_date: '2025-10-01',
      status: 'pending'
    })
    .select();

  console.log('Request created:', data);
  console.log('Error:', error);
}
```

### 3. Verify Permissions in Supabase Dashboard

1. Go to **Table Editor** → `memareh.services`
2. Click on **RLS** icon to see policies
3. Verify "Anyone can view active services" policy exists

4. Go to **Table Editor** → `memareh.service_requests`
5. Verify these policies exist:
   - Users can create own service requests
   - Users can view own service requests
   - Users can update own pending requests

## Common Issues

### Issue: Still getting permission denied
**Solution**: 
1. Make sure you're using the correct Supabase URL and anon key
2. Verify the user is authenticated when creating service requests
3. Check that the schema name is correct (should be `memareh`)

### Issue: Can't see services
**Solution**:
- Make sure services have `active = true` in the database
- Check that services table exists in `memareh` schema

### Issue: Can't create service request
**Solution**:
- User must be authenticated
- `customer_id` must match `auth.uid()`
- All required fields must be provided

## Security Notes

✅ **What's Protected:**
- Users can only view/edit their own data
- Service requests are tied to authenticated users
- Profiles are private to each user

✅ **What's Public:**
- Active services (needed for browsing)
- Available technicians (needed for display)
- Reviews (needed for social proof)

⚠️ **Important:**
- Never expose sensitive data in public policies
- Always test RLS policies before production
- Review policies regularly for security

## Verifying RLS is Working

Run this SQL in Supabase SQL Editor:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'memareh' 
ORDER BY tablename;

-- View all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'memareh'
ORDER BY tablename, policyname;
```

Expected output:
- All tables should have `rowsecurity = t` (true)
- Each table should have appropriate policies listed

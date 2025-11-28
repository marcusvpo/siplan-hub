# Supabase Migration Instructions

## 1. Apply Database Schema
The database schema needs to be created in your new Supabase project.

1.  Go to your Supabase Dashboard: [https://supabase.com/dashboard/project/okvufcwkophaadttmjwa](https://supabase.com/dashboard/project/okvufcwkophaadttmjwa)
2.  Navigate to the **SQL Editor** (icon on the left sidebar).
3.  Click **New Query**.
4.  Copy the entire content of the file `supabase/schema.sql` from your project.
5.  Paste it into the SQL Editor.
6.  Click **Run**.

## 2. Verify Connection
After applying the schema, the application should be fully functional.
You can verify the connection by running the application:

```bash
npm run dev
# or
bun run dev
```

The application will now use the new Supabase project.

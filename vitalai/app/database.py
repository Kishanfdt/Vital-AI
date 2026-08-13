from supabase import create_client, Client
from app.config import settings

# Server-side client using the service role key.
# NEVER expose this key to a frontend - it bypasses Row Level Security.
# All access control in this backend is enforced explicitly via user_id filters
# and by RLS policies on the tables themselves (see schema.sql).
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)

from supabase import create_client, Client
from app.config import settings

supabase: Client = None
if settings.supabase_url and settings.supabase_service_role_key:
    supabase = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    groq_api_key: str = os.environ.get("GROQ_API_KEY", "")
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_jwt_secret: str = os.environ.get("SUPABASE_JWT_SECRET", "")
    environment: str = os.environ.get("ENVIRONMENT", "development")

    llm_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    voyage_api_key: str = os.environ.get("VOYAGE_API_KEY", "")


settings = Settings()

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Lokasi backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
else:
    load_dotenv(override=True)

# Supabase configuration (mendukung format standar & format publishable/secret baru)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)
SUPABASE_SECRET_KEY = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL")

# Validasi environment
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL belum terbaca dari backend/.env")

if not SUPABASE_PUBLISHABLE_KEY:
    raise ValueError("SUPABASE_PUBLISHABLE_KEY atau SUPABASE_ANON_KEY belum diisi!")

if not SUPABASE_SECRET_KEY:
    raise ValueError("SUPABASE_SECRET_KEY atau SUPABASE_SERVICE_ROLE_KEY belum diisi!")

# Supabase client untuk autentikasi
auth_client: Client = create_client(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
)

# Supabase client untuk database backend (menggunakan service role / secret key)
db: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)

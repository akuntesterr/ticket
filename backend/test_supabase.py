from app.database.supabase import db, auth_client, SUPABASE_URL

print("================================")
print("ZTICK - SUPABASE CONNECTION TEST")
print("================================")
print(f"Target URL: {SUPABASE_URL}")

try:
    # Test query ke tabel events atau ticket_categories
    print("\nMenguji koneksi database...")
    try:
        response = db.table("events").select("id, title, status").limit(5).execute()
        print("✓ Koneksi Supabase DB berhasil!")
        print(f"Data event ({len(response.data)} ditemukan):")
        for event in response.data:
            print(f"- {event.get('title')} ({event.get('status')})")
    except Exception as table_err:
        print(f"Catatan: Query tabel 'events' menghasilkan: {table_err}")
        print("Mencoba query tabel 'ticket_categories'...")
        response = db.table("ticket_categories").select("id, name").limit(5).execute()
        print("✓ Koneksi Supabase DB berhasil!")
        for cat in response.data:
            print(f"- {cat.get('name')}")

except Exception as error:
    print("✗ Koneksi Supabase gagal!")
    print("Error:", error)

from database import supabase

try:
    response = supabase.table("hospitals").select("*").limit(1).execute()
    print("Database connection successful!")
    print(response.data)

except Exception as e:
    print("Database connection error:", e)
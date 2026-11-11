
from database import supabase

hospital = {
    "name": "Apollo Hospitals",
    "address": "13-1-3, Main Road, Suryaraopeta, Kakinada, Andhra Pradesh 533001",
    "city": "Kakinada",
    "phone": "08069049760",
    "specialty": "Cardiology, Neurology, Orthopedics, Nephrology, General Medicine",
    "is_verified": True
}

response = supabase.table("hospitals").insert(hospital).execute()

print("Hospital added successfully!")
print(response.data)

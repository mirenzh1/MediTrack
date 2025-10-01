import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('../.env')

# Get Supabase credentials
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 70)
print("MEDICATION DATABASE VERIFICATION")
print("=" * 70)

# Get all active medications
result = supabase.table('medications').select('*').eq('is_active', True).order('name').execute()

print(f"\n✓ Total active medications: {len(result.data)}")
print("\nSample medications:")
print("-" * 70)

for i, med in enumerate(result.data[:10], 1):
    name = med.get('name', 'N/A')
    strength = med.get('strength', 'N/A')
    dosage_form = med.get('dosage_form', 'N/A')
    stock = med.get('current_stock', 0)
    print(f"{i:2d}. {name:35s} {strength:15s} ({dosage_form:10s}) Stock: {stock:3d}")

print("-" * 70)
print(f"\n... and {len(result.data) - 10} more medications")

# Check for duplicates
print("\n" + "=" * 70)
print("DUPLICATE CHECK (by name and strength)")
print("=" * 70)

name_strength_map = {}
for med in result.data:
    key = f"{med['name']}|{med['strength']}"
    if key not in name_strength_map:
        name_strength_map[key] = []
    name_strength_map[key].append(med)

duplicates = {k: v for k, v in name_strength_map.items() if len(v) > 1}

if duplicates:
    print(f"\n⚠ Found {len(duplicates)} duplicate medication entries:")
    for key, meds in duplicates.items():
        name, strength = key.split('|')
        print(f"  - {name} {strength}: {len(meds)} entries")
else:
    print("\n✓ No duplicates found! All medications are unique.")

# Stock summary
print("\n" + "=" * 70)
print("STOCK SUMMARY")
print("=" * 70)

total_stock = sum(med.get('current_stock', 0) for med in result.data)
meds_with_stock = [med for med in result.data if med.get('current_stock', 0) > 0]
meds_no_stock = [med for med in result.data if med.get('current_stock', 0) == 0]

print(f"\nTotal stock across all medications: {total_stock}")
print(f"Medications with stock: {len(meds_with_stock)}")
print(f"Medications with no stock: {len(meds_no_stock)}")

if meds_no_stock:
    print(f"\nMedications with zero stock:")
    for med in meds_no_stock[:10]:
        print(f"  - {med['name']} {med.get('strength', 'N/A')}")
    if len(meds_no_stock) > 10:
        print(f"  ... and {len(meds_no_stock) - 10} more")

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE")
print("=" * 70)

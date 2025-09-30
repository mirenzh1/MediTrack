"""
Import extracted sample data into Supabase
Loads data from sample_data.json created by extraction script
"""

import json
import hashlib
from supabase import create_client, Client
from datetime import datetime

# Supabase configuration - UPDATE THESE!
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHF4dXNtenVqbnpseW1lY2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1Njc0MjAsImV4cCI6MjA3NDE0MzQyMH0.7ZRP3RScuMpro3HSElG03N0b86i0UcGV9cG-wzPZJtw"
SUPABASE_URL= "https://autqxusmzujnzlymeccc.supabase.co" 

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def load_sample_data():
    """Load the extracted sample data"""
    with open('sample_data.json', 'r') as f:
        return json.load(f)

def import_clinic_sites(supabase, sites):
    """Import clinic sites"""
    print("\n" + "="*60)
    print("IMPORTING CLINIC SITES")
    print("="*60)
    
    inserted_sites = {}
    for site in sites:
        try:
            result = supabase.table('clinic_sites').insert(site).execute()
            site_id = result.data[0]['id']
            inserted_sites[site['site_name']] = site_id
            print(f"✓ {site['site_name']} ({site['clinic_date']})")
        except Exception as e:
            print(f"✗ Error: {site['site_name']} - {str(e)}")
    
    return inserted_sites

def import_medications(supabase, medications):
    """Import medications"""
    print("\n" + "="*60)
    print("IMPORTING MEDICATIONS")
    print("="*60)
    
    inserted_meds = {}
    for med in medications:
        try:
            # Check if exists
            existing = supabase.table('medications')\
                .select("*")\
                .eq('name', med['name'])\
                .eq('strength', med.get('strength'))\
                .execute()
            
            if not existing.data:
                result = supabase.table('medications').insert(med).execute()
                med_id = result.data[0]['id']
                key = f"{med['name']} {med.get('strength', '')}".strip()
                inserted_meds[key] = med_id
                print(f"✓ {med['name']} {med.get('strength', '')}")
            else:
                med_id = existing.data[0]['id']
                key = f"{med['name']} {med.get('strength', '')}".strip()
                inserted_meds[key] = med_id
                print(f"- {med['name']} {med.get('strength', '')} (already exists)")
        except Exception as e:
            print(f"✗ Error: {med['name']} - {str(e)}")
    
    return inserted_meds

def import_users(supabase, users):
    """Import users (physicians, students, pharmacy staff)"""
    print("\n" + "="*60)
    print("IMPORTING USERS")
    print("="*60)
    
    # Add pharmacy staff
    users.append({
        "email": "pharmacy@clinic.org",
        "role": "pharmacy_staff",
        "first_name": "Pharmacy",
        "last_name": "Staff"
    })
    
    inserted_users = {}
    for user in users:
        try:
            # Add password hash
            user['password_hash'] = hash_password('TempPass123!')
            user['is_active'] = True
            
            # Check if exists
            existing = supabase.table('users')\
                .select("*")\
                .eq('email', user['email'])\
                .execute()
            
            if not existing.data:
                result = supabase.table('users').insert(user).execute()
                user_id = result.data[0]['id']
                name_key = user['first_name'].lower()
                inserted_users[name_key] = user_id
                print(f"✓ {user['email']} ({user['role']})")
            else:
                user_id = existing.data[0]['id']
                name_key = user['first_name'].lower()
                inserted_users[name_key] = user_id
                print(f"- {user['email']} (already exists)")
        except Exception as e:
            print(f"✗ Error: {user['email']} - {str(e)}")
    
    return inserted_users

def import_dispensing_logs(supabase, logs, site_ids, user_ids):
    """Import dispensing logs"""
    print("\n" + "="*60)
    print("IMPORTING DISPENSING LOGS")
    print("="*60)
    
    success_count = 0
    error_count = 0
    
    for log in logs:
        try:
            # Parse lot number and expiration date
            lot_exp = log.get('lot_exp', ',')
            if ',' in lot_exp:
                lot_number, exp_date = lot_exp.split(',', 1)
                lot_number = lot_number.strip()
                exp_date = exp_date.strip()
            else:
                lot_number = lot_exp
                exp_date = ""
            
            # Get site ID
            site_id = site_ids.get(log['site'])
            
            # Get physician ID
            physician_name = log['physician'].lower().split()[0] if log['physician'] else None
            physician_id = user_ids.get(physician_name) if physician_name else None
            
            # Get student ID
            student_name = log['student'].lower().split()[0] if log['student'] else None
            student_id = user_ids.get(student_name) if student_name else None
            
            # Get pharmacy staff for dispensed_by
            dispensed_by = user_ids.get('pharmacy')
            
            # Prepare record
            record = {
                'log_date': log['date'],
                'patient_id': log['patient_id'],
                'medication_name': log['medication'],
                'dose_instructions': log['dose'],
                'lot_number': lot_number,
                'expiration_date': exp_date,
                'amount_dispensed': log['amount'],
                'physician_name': log['physician'],
                'student_name': log['student'],
                'clinic_site_id': site_id,
                'entered_by': dispensed_by,
                # 'status': 'completed'
            }
            
            result = supabase.table('dispensing_logs').insert(record).execute()
            success_count += 1
            
            if success_count % 10 == 0:
                print(f"✓ Imported {success_count} records...")
                
        except Exception as e:
            error_count += 1
            print(f"✗ Error: Patient {log.get('patient_id', 'Unknown')} - {str(e)}")
    
    print(f"\n✓ Successfully imported {success_count} dispensing logs")
    if error_count > 0:
        print(f"✗ Failed to import {error_count} records")
    
    return success_count

def main():
    """Main import function"""
    print("\n" + "="*70)
    print(" "*15 + "MEDTRACK DATA IMPORT")
    print("="*70)
    
    # Check if sample data exists
    try:
        data = load_sample_data()
    except FileNotFoundError:
        print("\n✗ ERROR: sample_data.json not found!")
        print("Please run the extraction script first to create sample_data.json")
        return
    
    # Initialize Supabase
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("\n✓ Connected to Supabase")
    except Exception as e:
        print(f"\n✗ Failed to connect to Supabase: {str(e)}")
        print("\nPlease update SUPABASE_URL and SUPABASE_KEY in this script")
        return
    
    try:
        # Import in correct order (respecting foreign keys)
        site_ids = import_clinic_sites(supabase, data['clinic_sites'])
        med_ids = import_medications(supabase, data['medications'])
        user_ids = import_users(supabase, data['users'])
        log_count = import_dispensing_logs(supabase, data['dispensing_logs'], site_ids, user_ids)
        
        # Summary
        print("\n" + "="*70)
        print(" "*20 + "IMPORT COMPLETE")
        print("="*70)
        print(f"\nSummary:")
        print(f"  Clinic Sites:     {len(site_ids)}")
        print(f"  Medications:      {len(med_ids)}")
        print(f"  Users:            {len(user_ids)}")
        print(f"  Dispensing Logs:  {log_count}")
        print("\n" + "="*70)
        print("\nNext steps:")
        print("  1. Go to your Supabase dashboard")
        print("  2. Check the tables to verify data")
        print("  3. Test queries on the dispensing_logs table")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n✗ Import failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("""
    IMPORTANT: Before running this script, you must:
    
    1. Update the Supabase credentials at the top of this file:
       - SUPABASE_URL = "https://your-project.supabase.co"
       - SUPABASE_KEY = "your-anon-key-here"
    
    2. Install required package:
       pip install supabase
    
    3. Make sure sample_data.json exists (run extraction script first)
    """)
    
    # Auto-run the import
    main()
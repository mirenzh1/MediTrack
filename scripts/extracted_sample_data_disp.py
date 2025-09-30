"""
Complete extraction from first 2 pages of dispensary logs
Ready to import into Supabase for testing
"""

import csv
import json
from datetime import datetime

# Extracted dispensing records from Page 1 (Pacific) and Page 4 (James Town)
SAMPLE_DISPENSING_RECORDS = [
    # PAGE 1 - PACIFIC SITE - 6/11/23
    {
        "date": "2023-06-11",
        "patient_id": "2035-39",
        "medication": "Aspirin 81mg",
        "dose": "1 tab",
        "lot_exp": "QA01467, 7/25",
        "amount": "90 tabs",
        "physician": "Dr. B",
        "student": "G.A.G",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2635-324",
        "medication": "Aspirin 81 mg",
        "dose": "QD",
        "lot_exp": "11454, 4/26",
        "amount": "90 tabs",
        "physician": "Dr. B",
        "student": "G.A.G",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-311",
        "medication": "Ibuprofen 200 mg",
        "dose": "PRN",
        "lot_exp": "REE2003, 2/27",
        "amount": "as tabs",
        "physician": "Alex",
        "student": "Michaela",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-304",
        "medication": "Amlodipine 5 mg",
        "dose": "1 tab",
        "lot_exp": "EW0636, 2/25",
        "amount": "90 tabs",
        "physician": "L Bourne",
        "student": "Simeon R",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-340",
        "medication": "Metformin 500mg",
        "dose": "BID",
        "lot_exp": "QA140406, 7/25",
        "amount": "200 tabs",
        "physician": "L Bourne",
        "student": "Simeon R",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-340",
        "medication": "Acetaminophen 500mg",
        "dose": "1 tab",
        "lot_exp": "X1682, 1/26",
        "amount": "90 tabs",
        "physician": "Ramirez",
        "student": "Taylor",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-2616",
        "medication": "Lisinopril 10 mg",
        "dose": "1 tab",
        "lot_exp": "REE1043, 1/25",
        "amount": "30 tabs",
        "physician": "Karen C",
        "student": "Ann S",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-246",
        "medication": "Lisinopril 10 mg",
        "dose": "1 tab",
        "lot_exp": "REE1043, 1/25",
        "amount": "90 tabs",
        "physician": "Karen C",
        "student": "Ann S",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-246",
        "medication": "Lisinopril 10 mg",
        "dose": "1 tab",
        "lot_exp": "QA01453, 6/25",
        "amount": "40 tabs",
        "physician": "Karen C",
        "student": "Ann S",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-246",
        "medication": "Artificial Tears",
        "dose": "PRN",
        "lot_exp": "11AFX, 6/24",
        "amount": "10 ml",
        "physician": "Karen C",
        "student": "Ann S",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-249",
        "medication": "Famotidine 20mg",
        "dose": "1 tab BD",
        "lot_exp": "AFEA385, 3/24",
        "amount": "90 tabs",
        "physician": "Karen C",
        "student": "Emily R",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-249",
        "medication": "Multivitamin",
        "dose": "1 tab",
        "lot_exp": "SAV04, 2/27",
        "amount": "100 tabs",
        "physician": "Alex",
        "student": "Kailyn",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2635-243",
        "medication": "APAP 500 mg",
        "dose": "2 TABS PRN",
        "lot_exp": "3AE8082, 4/24",
        "amount": "24 tabs",
        "physician": "Laura B.",
        "student": "Simone",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2635-244",
        "medication": "APAP 500 mg",
        "dose": "PRN",
        "lot_exp": "3AE8082, 4/24",
        "amount": "24 tabs",
        "physician": "Ramirez",
        "student": "Allison",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-337",
        "medication": "APAP 500 mg",
        "dose": "PRN",
        "lot_exp": "3AE8082, 4/24",
        "amount": "24 tabs",
        "physician": "Veronica C.",
        "student": "Colletti",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-337",
        "medication": "Ibuprofen 200mg",
        "dose": "PRN",
        "lot_exp": "QA0140405, 7/25",
        "amount": "24 tabs",
        "physician": "Veronica C.",
        "student": "Colletti",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-335",
        "medication": "Lisinopril 10 mg",
        "dose": "1 tab",
        "lot_exp": "REE1043, 1/25",
        "amount": "30 tabs",
        "physician": "Jennifer",
        "student": "Taylor",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-335",
        "medication": "Omeprazole 20 mg",
        "dose": "1 tab",
        "lot_exp": "QA115604, 1/26",
        "amount": "30 tabs",
        "physician": "Jennifer",
        "student": "M. Kanliu",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-247",
        "medication": "Omeprazole 20 mg",
        "dose": "QD",
        "lot_exp": "QA115604, 1/26",
        "amount": "30 tabs",
        "physician": "Jennifer",
        "student": "Brian",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-218",
        "medication": "APAP 500 mg",
        "dose": "PRN",
        "lot_exp": "SAV04, 2/27",
        "amount": "30 tabs",
        "physician": "Jennifer S",
        "student": "M. Kanliu",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-218",
        "medication": "Lisinopril 10 mg",
        "dose": "1 tab",
        "lot_exp": "QA115604, 1/26",
        "amount": "30 tabs",
        "physician": "Jennifer S",
        "student": "M. Kanliu",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-271",
        "medication": "Lisinopril 10 mg",
        "dose": "PAU",
        "lot_exp": "11953A, 6/26",
        "amount": "30 tabs",
        "physician": "Jennifer S",
        "student": "M. Kanliu",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-271",
        "medication": "Naproxen 375 mg",
        "dose": "PRN",
        "lot_exp": "11953A, 6/26",
        "amount": "30 tabs",
        "physician": "Jennifer S",
        "student": "Arrocho",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-271",
        "medication": "Omeprazole 20 mg",
        "dose": "PRN",
        "lot_exp": "QA115604, 1/26",
        "amount": "30 tabs",
        "physician": "Romir",
        "student": "Arrocho",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-403",
        "medication": "Multivitamin",
        "dose": "1 tab",
        "lot_exp": "1wG314, 7/25",
        "amount": "120 tabs",
        "physician": "",
        "student": "Emily",
        "site": "Pacific"
    },
    {
        "date": "2023-06-11",
        "patient_id": "2035-403",
        "medication": "Omeprazole 20mg",
        "dose": "1C BID",
        "lot_exp": "QA115600, 10/24",
        "amount": "60 tabs",
        "physician": "Adam",
        "student": "Colton",
        "site": "Pacific"
    },
    
    # PAGE 4 - JAMES TOWN SITE - 6/10/23
    {
        "date": "2023-06-10",
        "patient_id": "2035-62",
        "medication": "Famotidine 20 mg",
        "dose": "PRN",
        "lot_exp": "AFEA418, 4/24",
        "amount": "60 tabs",
        "physician": "Jennifer",
        "student": "Morace",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-111",
        "medication": "Saline Nasal Spray",
        "dose": "PRN",
        "lot_exp": "RC150242, 6/24",
        "amount": "44 mL",
        "physician": "Buckley",
        "student": "Alexis",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-84",
        "medication": "Amlodipine 5mg",
        "dose": "1 tab",
        "lot_exp": "EFE6224, 6/24",
        "amount": "90 tabs",
        "physician": "Manuel",
        "student": "Brandin",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-36",
        "medication": "Omeprazole 20mg",
        "dose": "1 tab daily",
        "lot_exp": "QA11606, 9/24",
        "amount": "30 tabs",
        "physician": "Alex",
        "student": "Michaela",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-53",
        "medication": "Amox 500 mg",
        "dose": "1 tab BID",
        "lot_exp": "AFGA2A06, 9/25",
        "amount": "16 caps",
        "physician": "Jennifer",
        "student": "Alexis",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-73",
        "medication": "Lisinopril 10",
        "dose": "1 tab",
        "lot_exp": "G3OH52, 6/25",
        "amount": "30 tabs",
        "physician": "Jennifer",
        "student": "Melissa",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-95",
        "medication": "Naproxen 375mg",
        "dose": "PRN",
        "lot_exp": "11953A, 6/25",
        "amount": "30 tabs",
        "physician": "Jose",
        "student": "Taylor",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-125",
        "medication": "Omeprazole 20 mg",
        "dose": "2C BID",
        "lot_exp": "CA11S600, 9/24",
        "amount": "120 caps",
        "physician": "Pandya",
        "student": "Colton",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-157",
        "medication": "Fluoxetine 20 mg",
        "dose": "1 tab",
        "lot_exp": "AFEA2A06, 9/25",
        "amount": "60 tabs",
        "physician": "Pandya",
        "student": "Colton",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-136",
        "medication": "Doxy Hyclate 100mg",
        "dose": "1 tab",
        "lot_exp": "3417545, 7/24",
        "amount": "14 tabs",
        "physician": "Pandya",
        "student": "Claire",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-177",
        "medication": "Ibuprofen 400 mg",
        "dose": "ST PRN",
        "lot_exp": "LFA102A, 8/25",
        "amount": "48 tabs",
        "physician": "Kushala H",
        "student": "Michaela",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-94",
        "medication": "APAP 500 mg",
        "dose": "1 tab",
        "lot_exp": "3AE3085, 4/24",
        "amount": "24 tablets",
        "physician": "Kushala",
        "student": "Michaela",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-136",
        "medication": "Amlodipine 10mg",
        "dose": "1 tab",
        "lot_exp": "QA61441A, 11/25",
        "amount": "60 tabs",
        "physician": "Pandya",
        "student": "Emma",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-89",
        "medication": "Albuterol 90mcg",
        "dose": "2 PUFF PRN",
        "lot_exp": "A10A1601, 10/25",
        "amount": "15 g inh",
        "physician": "Pandya",
        "student": "Emma",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-125",
        "medication": "Naproxen 375mg",
        "dose": "ST BID",
        "lot_exp": "11953A, 6/25",
        "amount": "7 tabs",
        "physician": "Dr. B",
        "student": "Gina",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-139",
        "medication": "Diphenhydramine",
        "dose": "1 tab",
        "lot_exp": "A136020L, 9/25",
        "amount": "30 caps",
        "physician": "Dr. B",
        "student": "Gina",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-154",
        "medication": "Amoxicillin 500mg",
        "dose": "1 tab",
        "lot_exp": "QA04366, 7/25",
        "amount": "30 caps",
        "physician": "Adam",
        "student": "Ann",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-142",
        "medication": "Amlodipine 5mg",
        "dose": "1 tab",
        "lot_exp": "EW0646, 2/25",
        "amount": "90 tabs",
        "physician": "Jennifer C",
        "student": "Ivone",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-102",
        "medication": "Naproxen 375 mg",
        "dose": "PRN",
        "lot_exp": "11953A, 6/25",
        "amount": "20 tabs",
        "physician": "Manuel",
        "student": "Marie",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-93",
        "medication": "Artificial Tears",
        "dose": "PRN",
        "lot_exp": "11F3S, 6/25",
        "amount": "10 mL",
        "physician": "Laura B.",
        "student": "Melissa",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-132",
        "medication": "Albuterol 90 mcg",
        "dose": "PRN",
        "lot_exp": "EW6341, 1/25",
        "amount": "8.5g",
        "physician": "Laura B.",
        "student": "Melissa",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-132",
        "medication": "Amlodipine 5mg",
        "dose": "1 tab",
        "lot_exp": "X1681113, 12/25",
        "amount": "90 tabs",
        "physician": "Pandya",
        "student": "Colton",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2035-140",
        "medication": "Naproxen 375 mg",
        "dose": "ST BID",
        "lot_exp": "11953A, 6/25",
        "amount": "30 tabs",
        "physician": "Jennifer",
        "student": "Daniel",
        "site": "James Town"
    },
    {
        "date": "2023-06-10",
        "patient_id": "2635-177",
        "medication": "Amoxicillin 500 mg",
        "dose": "1 tab",
        "lot_exp": "SE113644, 4/26",
        "amount": "30 tabs",
        "physician": "Pandya",
        "student": "Colton",
        "site": "James Town"
    },
]

# Unique clinic sites
CLINIC_SITES = [
    {"site_name": "Pacific", "clinic_date": "2023-06-11"},
    {"site_name": "James Town", "clinic_date": "2023-06-10"},
]

# Extract unique medications
def extract_unique_medications(records):
    meds = set()
    for record in records:
        med_name = record['medication']
        # Try to parse strength
        parts = med_name.split()
        if len(parts) >= 2 and any(char.isdigit() for char in parts[-1]):
            name = ' '.join(parts[:-1])
            strength = parts[-1]
        else:
            name = med_name
            strength = None
        meds.add((name, strength))
    
    return [{"name": name, "strength": strength, "dosage_form": "tablet"} 
            for name, strength in sorted(meds)]

# Extract unique staff
def extract_unique_staff(records):
    physicians = set()
    students = set()
    
    for record in records:
        if record['physician']:
            physicians.add(record['physician'])
        if record['student']:
            students.add(record['student'])
    
    users = []
    for phys in sorted(physicians):
        users.append({
            "email": f"{phys.lower().replace(' ', '.').replace('.', '')}@clinic.org",
            "role": "physician",
            "first_name": phys.split()[0] if phys else "",
            "last_name": ' '.join(phys.split()[1:]) if len(phys.split()) > 1 else ""
        })
    
    for stud in sorted(students):
        users.append({
            "email": f"{stud.lower().replace(' ', '.')}@emory.edu",
            "role": "student",
            "first_name": stud.split()[0] if stud else "",
            "last_name": ' '.join(stud.split()[1:]) if len(stud.split()) > 1 else ""
        })
    
    return users

# Export functions
def export_to_csv():
    """Export to CSV files"""
    # Dispensing logs
    with open('dispensing_logs.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=SAMPLE_DISPENSING_RECORDS[0].keys())
        writer.writeheader()
        writer.writerows(SAMPLE_DISPENSING_RECORDS)
    
    # Clinic sites
    with open('clinic_sites.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['site_name', 'clinic_date'])
        writer.writeheader()
        writer.writerows(CLINIC_SITES)
    
    # Medications
    medications = extract_unique_medications(SAMPLE_DISPENSING_RECORDS)
    with open('medications.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'strength', 'dosage_form'])
        writer.writeheader()
        writer.writerows(medications)
    
    # Users
    users = extract_unique_staff(SAMPLE_DISPENSING_RECORDS)
    with open('users.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['email', 'role', 'first_name', 'last_name'])
        writer.writeheader()
        writer.writerows(users)
    
    print("✓ Created dispensing_logs.csv")
    print("✓ Created clinic_sites.csv")
    print("✓ Created medications.csv")
    print("✓ Created users.csv")
    print(f"\nTotal records: {len(SAMPLE_DISPENSING_RECORDS)}")

def export_to_json():
    """Export to JSON for the import script"""
    data = {
        "clinic_sites": CLINIC_SITES,
        "medications": extract_unique_medications(SAMPLE_DISPENSING_RECORDS),
        "users": extract_unique_staff(SAMPLE_DISPENSING_RECORDS),
        "dispensing_logs": SAMPLE_DISPENSING_RECORDS
    }
    
    with open('sample_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print("✓ Created sample_data.json")

if __name__ == "__main__":
    print("Extracting data from 2 pages of dispensary logs...")
    print("=" * 60)
    export_to_csv()
    print()
    export_to_json()
    print("=" * 60)
    print("\nNext step: Run the import script to load into Supabase")

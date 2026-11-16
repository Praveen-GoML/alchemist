"""
Seed initial data with all team members from the organization.
Default password for all accounts: password123
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal, engine
from models import Base, User
from auth import get_password_hash

TEAM_USERS = [
    # Administrators & Delivery Leads
    {"email": "admin@goml.io", "name": "System Admin", "role": "admin"},
    {"email": "praveen.karuppusamy@goml.io", "name": "Praveen Karuppusamy M", "role": "admin"},
    {"email": "praveen@goml.io", "name": "Praveen Karuppusamy", "role": "admin"},
    {"email": "kapil.joshi@goml.io", "name": "Kapil Joshi", "role": "admin"},

    # Project Managers & Team Leads
    {"email": "thasleema.p@goml.io", "name": "Thasleema P", "role": "pm"},
    {"email": "akshay.shende@goml.io", "name": "Akshay Shende", "role": "tl"},
    {"email": "mohan.kumar.s@goml.io", "name": "Mohan Kumar Singh", "role": "pm"},
    {"email": "neha.rawat@goml.io", "name": "Neha Rawat", "role": "pm"},
    {"email": "madhurima@goml.io", "name": "Madhurima", "role": "pm"},

    # Fullstack & Backend Developers
    {"email": "syed.hussain@goml.io", "name": "Syed Hussain Saber", "role": "developer"},
    {"email": "abhishek.shigavan@goml.io", "name": "Abhishek Ashok Shigavan", "role": "developer"},
    {"email": "saurav.sikdar@goml.io", "name": "Saurav Sikdar", "role": "developer"},
    {"email": "suren.s@goml.io", "name": "Suren S", "role": "developer"},
    {"email": "megh.shah@goml.io", "name": "Megh Shah", "role": "developer"},
    {"email": "pranav.dodiya@goml.io", "name": "Pranav Dodiya", "role": "developer"},
    {"email": "mani.sekar@goml.io", "name": "Mani Sekar", "role": "developer"},

    # Machine Learning Team
    {"email": "ramya.raghuraman@goml.io", "name": "Ramya Raghuraman", "role": "ml"},
    {"email": "harini.m@goml.io", "name": "Harini M", "role": "ml"},
    {"email": "sriram.kanungo@goml.io", "name": "Sriram Kanungo", "role": "ml"},
    {"email": "davis.l@goml.io", "name": "Davis L", "role": "ml"},
    {"email": "charan.b@goml.io", "name": "Charan B", "role": "ml"},
    {"email": "shubham.kapoor@goml.io", "name": "Shubham Kapoor", "role": "ml"},
    {"email": "rajeshwaran.m@goml.io", "name": "Rajeshwaran M", "role": "ml"},
    {"email": "veerpal.singh@goml.io", "name": "Veerpal Singh", "role": "ml"},
    {"email": "midhun.kuppusamy@goml.io", "name": "Midhun K", "role": "ml"},
    {"email": "haresh.narayanasamy@goml.io", "name": "Haresh K N", "role": "ml"},
]

def seed_users():
    db = SessionLocal()
    
    # Create tables if not exist
    Base.metadata.create_all(bind=engine)
    
    created_count = 0
    updated_count = 0
    default_password_hash = get_password_hash("password123")

    for user_info in TEAM_USERS:
        clean_email = user_info["email"].strip().lower()
        existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
        
        if existing:
            # Update role or name if changed
            existing.name = user_info["name"]
            existing.role = user_info["role"]
            existing.is_active = True
            # Reset password to default password123 to guarantee login
            existing.hashed_password = default_password_hash
            updated_count += 1
        else:
            new_user = User(
                email=clean_email,
                name=user_info["name"],
                hashed_password=default_password_hash,
                role=user_info["role"],
                is_active=True
            )
            db.add(new_user)
            created_count += 1

    db.commit()
    print(f"[OK] Seed users completed! Added: {created_count}, Updated/Verified: {updated_count}")
    print("Default password for all accounts: password123\n")
    print("Available team accounts:")
    for u in TEAM_USERS:
        print(f"  - {u['email']} ({u['role']}) - {u['name']}")
    
    db.close()

if __name__ == "__main__":
    seed_users()

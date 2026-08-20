from db import initialize_database

if __name__ == "__main__":
    initialize_database(seed_if_empty=True)
    print("Member360 PostgreSQL database initialized and seeded from seed_data.py when empty.")

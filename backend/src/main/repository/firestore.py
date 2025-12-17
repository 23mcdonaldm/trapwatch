from google.cloud import firestore
from config.settings import settings

db = None

def get_db() -> firestore.Client:
    global db
    if db is None:
        db = firestore.Client(project=settings.gcp_project_id)
    return db

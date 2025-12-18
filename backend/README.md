## Firestore backend connectivity

Your backend uses the Google Cloud Firestore Python client:

- `backend/src/main/repository/firestore.py` creates `firestore.Client(project=settings.gcp_project_id)`
- **Project ID alone is not enough**. The client also needs **Google credentials** (Application Default Credentials) and the identity needs **IAM permissions** to Firestore.

### 1) Set the project id

Set `gcp_project_id` to your Firebase project id (same as `frontend/firebase/firebase.ts` → `projectId`).

Example `.env` (create `backend/.env`):

```
gcp_project_id=YOUR_GCP_PROJECT_ID
odds_api_key=YOUR_ODDS_API_KEY
```

### 2) Run backend

python -m uvicorn main:app --reload


### 3) Open Server

localhost:8000
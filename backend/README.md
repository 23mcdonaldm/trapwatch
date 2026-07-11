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

### 2) Set up Google project and auth for local runs

in computer terminal:

```
gcloud auth application-default login
gcloud config set project YOUR_GCP_PROJECT_ID
```

ex:
```bash
gcloud auth login
gcloud config set project trapwatch-2d010
```

### 2) Run backend

```
cd backend
pip install -r requirements.txt
cd src/main
python -m uvicorn main:app --reload
```

### 3) Open Server

in chrome or any other browser:

localhost:8000

### 3) Calling API Endpoints

routes are outlined in backend/src/main/api/v1/routes

and called by:

localhost:8000/{route}

ex: localhost:8000/api/v1/odds/NFL



### 4) Testing

Run all tests
```
cd backend
python -m unittest discover -s src/test -p '*test*.py' -v
```

Run a specific set of tests (csv_odds_test.py)
```
cd backend
python -m unittest src.test.csv_odds_test -v
```

Run a specific test
```
cd backend
python -m unittest src.test.csv_odds_test.CsvOddsRepositoryTests.test_upsert_csv_odds_writes_main_doc_and_history -v
```
# Deployment notes

## Firebase Cloud Functions

### First-time setup

```bash
npm install --save-dev firebase-tools
npx firebase-tools login
npx firebase-tools init functions
```

### Deploying

From the repo root:

```bash
gcloud auth login
gcloud config set project gen-lang-client-0521438359

gcloud services enable eventarc.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com

npx firebase-tools deploy --only functions
```

Deploy a single function:

```bash
npx firebase-tools deploy --only functions:on_user_vote_write
```

### Deleting a function

```bash
npx firebase-tools functions:delete on_user_vote_write
```

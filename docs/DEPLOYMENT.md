# Deployment notes

## Firebase Cloud Functions

### First-time setup

```bash
npm install --save-dev firebase-tools
npx firebase-tools login
npx firebase-tools init functions
```

### Deploying

> Cloud Functions run on Cloud Run under the hood, which requires the project to be on the **Blaze (pay-as-you-go) plan**. Upgrade at https://console.firebase.google.com/project/trapwatch-2d010/usage/details before enabling the services below — `gcloud services enable` will fail with a billing error otherwise.

From the repo root:

```bash
gcloud auth login
gcloud config set project trapwatch-2d010

gcloud services enable eventarc.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com

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

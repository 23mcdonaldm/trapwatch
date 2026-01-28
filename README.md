Setting up Firebase Cloud Functions

npm install --save-dev firebase-tools
npx firebase-tools login
npx firebase-tools init functions


deploying firebase cloud functions

in root computer terminal:

gcloud auth login
gcloud config set project gen-lang-client-0521438359

gcloud services enable eventarc.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com

running:
npx firebase-tools deploy --only functions

or just one

npx firebase-tools deploy --only functions:on_user_vote_write


deleting functions:

npx firebase-tools functions:delete on_user_vote_write
This folder contains Cloud Functions for Firebase used to set default user roles and custom claims on user creation.

Quick start:
1. Install dependencies:
   cd functions; npm install

2. Login & select project (on your machine):
3. 
4. npm install -g firebase-tools
   firebase login
   firebase use --add

5. Deploy functions:
   firebase deploy --only functions

What this does:
- onUserCreate: when a new Firebase Auth user is created, it writes/merges a document at `users/{uid}` and sets a custom claim `role: 'user'`.

Security note:
- After deploying, update your Firestore rules (firestore.rules) and deploy them too:
  firebase deploy --only firestore:rules

If you'd like, I can help craft a script to promote a user to admin using the Admin SDK (run server-side) or help you create an admin console to do this securely.

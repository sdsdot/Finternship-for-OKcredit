rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Global default-deny safety net
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // Collection: Users
    match /users/{userId} {
      allow get: if isOwner(userId);
      allow create, update: if isOwner(userId)
        && request.resource.data.id == userId
        && request.resource.data.email is string
        && request.resource.data.name is string
        && request.resource.data.name.size() <= 100;
      allow delete: if false; // Users cannot be deleted via clientSDK
    }

    // Collection: Sales Entries
    match /sales/{saleId} {
      allow get: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow list: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.product is string
        && request.resource.data.qty is number
        && request.resource.data.price is number
        && request.resource.data.revenue is number;
      allow update: if isSignedIn()
        && resource.data.userId == request.auth.uid
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.product is string
        && request.resource.data.qty is number;
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
  }
}

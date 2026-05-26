# Firebase Security Rules voor Song Sharing

Om de song sharing functionaliteit te laten werken, moet je de Firebase Realtime Database security rules aanpassen.

## Stappen

1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Selecteer je project
3. Ga naar **Realtime Database** > **Rules** tab
4. Vervang de regels met onderstaande configuratie

## Security Rules

```json
{
  "rules": {
    "users": {
      ".read": "auth != null && auth.token.email === 'jared@vanhensen.nl'",
      "$userId": {
        ".read": "$userId === auth.uid || root.child('teacherStudents').child(auth.uid).child($userId).val() === true",
        ".write": "$userId === auth.uid",
        "songs": {
          ".read": "$userId === auth.uid || root.child('teacherStudents').child(auth.uid).child($userId).val() === true",
          ".write": "$userId === auth.uid"
        },
        "setlists": {
          ".read": "$userId === auth.uid || root.child('teacherStudents').child(auth.uid).child($userId).val() === true",
          ".write": "$userId === auth.uid"
        },
        "pendingSongs": {
          ".read": "$userId === auth.uid || root.child('teacherStudents').child(auth.uid).child($userId).val() === true",
          ".write": "auth != null"
        },
        "email": {
          ".read": "$userId === auth.uid || root.child('teacherStudents').child(auth.uid).child($userId).val() === true",
          ".write": "$userId === auth.uid"
        }
      }
    },
    "publicSongs": {
      ".read": "auth != null",
      "$songId": {
        ".write": "auth != null && (data.val() == null || data.child('submittedBy').val() === auth.uid || auth.token.email === 'jared@vanhensen.nl')"
      }
    },
    "emailToUserId": {
      "$email": {
        ".read": "auth != null",
        ".write": "auth != null && newData.val() === auth.uid"
      }
    },
    "leaderboards": {
      ".read": true,
      ".write": "auth != null",
      "$modeKey": {
        "$userId": {
          ".write": "$userId === auth.uid"
        }
      }
    },
    "songRequests": {
      ".read": "auth != null && auth.token.email === 'jared@vanhensen.nl'",
      ".write": "auth != null"
    },
    "fixRequests": {
      ".read": "auth != null && auth.token.email === 'jared@vanhensen.nl'",
      ".write": "auth != null"
    },
    "settings": {
      ".read": true,
      ".write": "auth != null && auth.token.email === 'jared@vanhensen.nl'"
    },
    "teacherCodes": {
      ".read": "auth != null",
      "$code": {
        ".write": "auth != null && newData.val() === auth.uid"
      }
    },
    "teacherStudents": {
      "$teacherUid": {
        ".read": "$teacherUid === auth.uid",
        "$studentUid": {
          ".write": "$studentUid === auth.uid"
        }
      }
    },
    "studentProgress": {
      "$teacherUid": {
        ".read": "$teacherUid === auth.uid",
        ".write": "$teacherUid === auth.uid",
        "$studentUid": {
          ".read": "$studentUid === auth.uid || $teacherUid === auth.uid",
          ".write": "$studentUid === auth.uid || $teacherUid === auth.uid"
        }
      }
    }
  }
}
```

## Uitleg

- **users/{userId}**: Gebruikers kunnen alleen hun eigen data lezen/schrijven
- **users/{userId}/pendingSongs**: 
  - Alleen de eigenaar kan lezen (om hun pending songs te zien)
  - Iedereen die ingelogd is kan schrijven (zodat anderen songs kunnen delen)
- **emailToUserId/{email}**: 
  - Iedereen die ingelogd is kan lezen (om andere gebruikers te vinden)
  - Gebruikers kunnen alleen hun eigen email schrijven (waarbij de waarde hun userId moet zijn)
- **teacherCodes/{code}**:
  - Wordt gebruikt om een Teacher Code om te zetten naar een teacherUid. Iedereen kan lezen. Alleen de docent zelf mag schrijven.
- **teacherStudents/{teacherUid}/{studentUid}**:
  - De docent mag zijn eigen lijst met studenten lezen.
  - Een student mag zichzelf toevoegen onder de ID van de docent (schrijven).
  - De rules voor de `users/{userId}` zijn aangepast zodat docenten de data (profiel en songs) van hun gekoppelde studenten kunnen inzien.

## Belangrijk

Na het aanpassen van de rules, klik op **Publish** om de wijzigingen door te voeren.


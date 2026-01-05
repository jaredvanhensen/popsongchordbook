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
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid",
        "songs": {
          ".read": "$userId === auth.uid",
          ".write": "$userId === auth.uid"
        },
        "setlists": {
          ".read": "$userId === auth.uid",
          ".write": "$userId === auth.uid"
        },
        "pendingSongs": {
          ".read": "$userId === auth.uid",
          ".write": "auth != null"
        },
        "email": {
          ".read": "$userId === auth.uid",
          ".write": "$userId === auth.uid"
        }
      }
    },
    "emailToUserId": {
      "$email": {
        ".read": "auth != null",
        ".write": "auth != null && newData.val() === auth.uid"
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

## Belangrijk

Na het aanpassen van de rules, klik op **Publish** om de wijzigingen door te voeren.


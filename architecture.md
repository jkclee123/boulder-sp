# Boulder SP - Architecture

This document outlines the technical architecture, primarily focusing on the Firestore data model.

## High-Level Requirements

- **Framework**: React web app
- **Backend**: Firebase (Auth, Hosting, Firestore, Functions)
- **App Name**: Boulder SP
- **Timezone**: Hong Kong Time (UTC+8)
- **Currency**: Hong Kong Dollar (HKD)
- **Data Management**: Records are soft-deleted using an `active` flag.
- **Payments**: Handled off-platform via Telegram.

## Firestore Data Model

### `gyms` collection
- **`displayName`**: `string`
- **`id`**: `string`

### `users` collection
- Document ID: Firebase Auth `uid`
- **`createdAt`**: `timestamp`
- **`updatedAt`**: `timestamp`
- **`name`**: `string`
- **`email`**: `string`
- **`providerIds`**: `string[]`
- **`telegramId`**: `string` (without @)
- **`phoneNumber`**: `string` (optional)
- **`gymMemberId`**: `map<string, string>` (gym id -> member id, *unique per gym*)
- **`isAdmin`**: `boolean`
- **`adminGym`**: `string` (name of gym for admin users)

### `privatePass` collection
- **`createdAt`**: `timestamp`
- **`updatedAt`**: `timestamp`
- **`gymDisplayName`**: `string` (displayName of gym)
- **`gymId`**: `string` (name of gym)
- **`purchasePrice`**: `number` (total price for the batch)
- **`purchaseCount`**: `number` (initial count of passes in the batch)
- **`count`**: `number` (current remaining count)
- **`userRef`**: `reference` to `user` collection
- **`lastDay`**: `timestamp` (expiration date)
- **`active`**: `boolean`

### `marketPass` collection
- **`createdAt`**: `timestamp`
- **`updatedAt`**: `timestamp`
- **`gymDisplayName`**: `string` (displayName of gym)
- **`gymId`**: `string` (name of gym)
- **`price`**: `number` (price per pass)
- **`count`**: `number`
- **`userRef`**: `reference` to `user` collection
- **`privatePassRef`**: `reference` to `privatePass` collection
- **`remarks`**: `string`
- **`lastDay`**: `timestamp`
- **`active`**: `boolean`

### `adminPass` collection
- **`createdAt`**: `timestamp`
- **`updatedAt`**: `timestamp`
- **`count`**: `number` (*Note: This count does not decrease upon transfer*)
- **`gymDisplayName`**: `string` (displayName of gym)
- **`gymId`**: `string` (name of gym)
- **`price`**: `number` (total price for the batch)
- **`duration`**: `number` (in days, used to calculate `lastDay` for transferred passes)
- **`lastDay`**: `timestamp` (expiration date for the admin pass itself)
- **`active`**: `boolean`

### `passLog` collection
- **`createdAt`**: `timestamp`
- **`gym`**: `string` (name of gym)
- **`count`**: `number`
- **`price`**: `number`
- **`fromUserRef`**: `reference` to `user` collection
- **`toUserRef`**: `reference` to `user` collection
- **`action`**: `string` (`transfer` | `consume`)
- **`participants`**: `array` (`[fromUserUid, toUserUid]`)

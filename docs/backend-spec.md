# Boulder SP - Backend Specification

This document details the server-side implementation logic for core application features as Firebase Cloud Functions. For high-level business rules and domain concepts, refer to [AGENTS.md](./AGENTS.md).

## Implementation Notes

- **Time Zone**: All timestamps use Hong Kong Time (UTC+8)
- **Currency**: All monetary values are in HKD
- **Consumption Priority**: privatePass before marketPass
- **Transfer Validation**: Single pass type per transaction
- **Soft Deletes**: Use `active` flag for pass lifecycle management

## Transfer Process

- **Trigger**: Initiated from the "My Pass" page via a "Transfer" button on a pass item.
- **Applicable Passes**: Any active `privatePass` (non-expired and count > 0), `marketPass` (non-expired and count > 0), or `adminPass`.
- **Steps**:
    1.  **Recipient Search**: The sender (fromUser) searches for the recipient (toUser) by their unique `phoneNumber` or `gymMemberId`.
    2.  **Confirmation**: The recipient's name is displayed for confirmation.
    3.  **Set Details**: The sender specifies the `count` and total `purchasePrice` for the transfer.
    4.  **Execution**:
        - The sender's pass count is reduced (unless it's an `adminPass`).
        - A new `privatePass` is created for the recipient.
        - The new pass's `lastDay` is calculated as `createdAt` + `duration` from the source pass, ending at 23:59:59 HKT.
        - A `passRecord` record is generated.
- **Special Rule for `adminPass`**: The `count` of an `adminPass` is never reduced upon transfer.

## Consume Process (Admin Only)

- **Trigger**: Initiated from the "Admin Page" via a "Consume Pass" button.
- **Permissions**: Admins can only consume passes associated with their `adminGym`.
- **Steps**:
    1.  **User Search**: The admin searches for the target user by their `phoneNumber` or `gymMemberId`.
    2.  **Confirmation**: The target user's name is displayed for confirmation.
    3.  **Set Details**: The admin enters the number of passes to consume.
    4.  **Execution & Validation**:
        - The function checks if the user has enough passes of a *single type* (`privatePass` or `marketPass`) from the admin's gym.
        - **Error Condition 1**: The user does not have enough passes.
        - **Error Condition 2**: The consumption would require using both `privatePass` and `marketPass` types (e.g., consume 2, user has 1 of each). This is not allowed to simplify the transaction.
        - **Consumption Priority**: The function will consume from a `privatePass` first. If no matching `privatePass` exists, it will consume from a `marketPass`.
        - The `count` of the consumed pass is reduced.
    5.  **Logging**: A `passRecord` record is created with `price: 0`, `fromUserRef` pointing to the target user, and `toUserRef` pointing to the admin.

## Remove Process (Soft Delete)

- **Trigger**: Initiated from the "My Pass" page via a "Remove" button on expired passes.
- **Permissions**: Users can only remove passes they own.
- **Function**: `removePass`
- **Steps**:
    1.  **Validation**: The function validates that the user owns the pass and that the pass is currently active.
    2.  **Soft Delete**: The function sets the pass's `active` flag to `false`.
    3.  **Real-time Updates**: The pass disappears from all views due to Firestore real-time listeners.
- **Supported Pass Types**: Both `privatePass` and `marketPass`.
- **Validation**:
    - Pass must exist and be owned by the requesting user.
    - Pass must currently be active (`active = true`).
    - Pass type must be either "private" or "market".
- **Error Conditions**:
    - Pass not found
    - User doesn't own the pass
    - Pass is already inactive

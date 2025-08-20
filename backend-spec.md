# Boulder SP - Backend Specification

This document details the server-side logic for core application features, intended to be implemented as Firebase Cloud Functions.

## Transfer Process

- **Trigger**: Initiated from the "My Pass" page via a "Transfer" button on a pass item.
- **Applicable Passes**: Any active (non-expired) `privatePass`, `marketPass`, or `adminPass`.
- **Steps**:
    1.  **Recipient Search**: The sender (fromUser) searches for the recipient (toUser) by their unique `telephone` or `gymMemberId`.
    2.  **Confirmation**: The recipient's name is displayed for confirmation.
    3.  **Set Details**: The sender specifies the `count` and total `purchasePrice` for the transfer.
    4.  **Execution**:
        - The sender's pass count is reduced (unless it's an `adminPass`).
        - A new `privatePass` is created for the recipient.
        - The new pass's `lastDay` is calculated as `createdAt` + `duration` from the source pass, ending at 23:59:59 HKT. This is especially important for `adminPass` transfers.
        - A `passLog` record is generated.
- **Special Rule for `adminPass`**: The `count` of an `adminPass` is never reduced upon transfer.

## Consume Process (Admin Only)

- **Trigger**: Initiated from the "Admin Page" via a "Consume Pass" button.
- **Permissions**: Admins can only consume passes associated with their `adminGym`.
- **Steps**:
    1.  **User Search**: The admin searches for the target user by their `telephone` or `gymMemberId`.
    2.  **Confirmation**: The target user's name is displayed for confirmation.
    3.  **Set Details**: The admin enters the number of passes to consume.
    4.  **Execution & Validation**:
        - The function checks if the user has enough passes of a *single type* (`privatePass` or `marketPass`) from the admin's gym.
        - **Error Condition 1**: The user does not have enough passes.
        - **Error Condition 2**: The consumption would require using both `privatePass` and `marketPass` types (e.g., consume 2, user has 1 of each). This is not allowed to simplify the transaction.
        - **Consumption Priority**: The function will consume from a `privatePass` first. If no matching `privatePass` exists, it will consume from a `marketPass`.
        - The `count` of the consumed pass is reduced.
    5.  **Logging**: A `passLog` record is created with `price: 0`, `fromUserRef` pointing to the target user, and `toUserRef` pointing to the admin.

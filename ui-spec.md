# Boulder SP - UI/UX Specification

This document details the user interface and user experience for each page of the application.

## General UI Notes
- Clicking on the user's profile icon should show a pop-up/menu with links to:
    - "Account Page"
    - "My Pass Page"
    - "Pass Log Page"
    - "Admin Page" (only if the logged-in user is an admin)

## Page-Specific Designs

### Login Page
- Status: **Completed**.
- Functionality: Standard user authentication.

### Account Page
- **Objective**: Allow users to set their personal information. This page is mandatory for new users.
- **Fields**:
    - `name`: `string`
    - `telegramId`: `string`
    - `telephone`: `string` (input restricted to 8 digits, no verification needed)
    - `gymMemberId`: A section to add membership IDs for different gyms.
- **Routing**: Users are forced to this page if `name` or `telephone` is not set.

### My Pass Page
- **Objective**: Display the user's pass inventory.
- **Views**: Three separate list views:
    1.  **Private Passes**: Active `privatePass` records belonging to the user that have not expired.
    2.  **Market Passes**: Active `marketPass` records belonging to the user that have not expired.
    3.  **Expired Passes**: `privatePass` and `marketPass` records where `lastDay` is in the past.
        - Show expired `privatePass` even if `count` is 0.
        - Do NOT show expired `marketPass` if `count` is 0.
- **Actions (List Item Buttons)**:
    - **Private Pass**:
        - `Transfer`: Initiates the transfer process.
        - `Market`: Opens a form to list the pass on the market. Requires `telegramId` to be set.
    - **Market Pass**:
        - `Transfer`: Initiates the transfer process.
        - `Unlist`: Removes the pass from the market and merges the count back to the parent `privatePass`.
    - **Expired Pass**:
        - `De-activate`: Sets the `active` flag to `false`.

### Market Page
- **Objective**: Display all passes available for sale.
- **Content**: A list of all `marketPass` records where `active` is true, `lastDay` has not passed, and `count` > 0.
- **Filtering**: A control to filter the list by `gym`.
- **Actions**:
    - Each list item has a "Contact Seller" button.
    - Before navigating, the app must check if the *current user's* `telephone` is set.
    - The button links to `https://t.me/{owner-telegramId}`.

### Admin Page
- **Objective**: Allow gym administrators to manage passes.
- **Views**:
    - A list of active `adminPass` records for the admin's associated gym.
- **Actions**:
    - **Add Admin Pass**: A form to create new `adminPass` records.
    - **De-activate Admin Pass**: A button on each list item to set `active` to `false`.
    - **Transfer Admin Pass**: Initiates a transfer to a normal user, creating a `privatePass` for them.
    - **Consume Pass**: A dedicated button to start the pass consumption process for a user.

### Pass Log Page
- **Objective**: Show a history of the user's transactions.
- **Content**: A list of all `passLog` records where the current user is either the `fromUserRef` or the `toUserRef`.

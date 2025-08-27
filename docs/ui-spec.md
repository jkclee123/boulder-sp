# Boulder SP - UI/UX Specification

This document details the user interface and user experience for each page of the application.

## General UI Notes
- Clicking on the user's profile icon should show a pop-up/menu with links to:
    - "Account Page"
    - "My Pass Page"
    - "Pass Record Page"
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
    - `phoneNumber`: `string` (follows standard validation rules)
    - `gymMemberId`: A section to add member IDs for different gyms.
- **Routing**: Users are forced to this page if `name` or `phoneNumber` is not set.

### My Pass Page
- **Objective**: Display the user's pass inventory.
- **Views**: Three separate list views:
    1.  **Private Passes**: Active `privatePass` records belonging to the user that have not expired and have `count` > 0.
    2.  **Market Passes**: Active `marketPass` records belonging to the user that have not expired and have `count` > 0.
    3.  **Expired Passes**: `privatePass` and `marketPass` records that are considered expired but are still active.
        - A `privatePass` is considered expired if `lastDay` is in the past OR `count` is 0.
        - A `marketPass` is considered expired if `lastDay` is in the past AND `count` > 0.
        - Show expired `privatePass` even if `count` is 0 (even if not date-expired).
        - Do NOT show expired `marketPass` if `count` is 0.
- **Actions (List Item Buttons)**:
    - **Private Pass**:
        - `Transfer`: Initiates the transfer process.
        - `Market`: Opens a form to list the pass on the market.
    - **Market Pass**:
        - `Transfer`: Initiates the transfer process.
        - `Unlist`: Removes the pass from the market and merges the count back to the parent `privatePass`.
    - **Expired Pass**:
        - `Remove`: Performs soft delete by setting the `active` flag to `false`.

### Market Page
- **Objective**: Display all passes available for sale.
- **Content**: A list of all `marketPass` records where `active` is true, `lastDay` has not passed, and `count` > 0.
- **Filtering**: A control to filter the list by `gym`.
- **Actions**:
    - Each list item has a "Contact Seller" button.
    - The button links to `https://t.me/{owner-telegramId}`.

### Admin Page
- **Objective**: Allow gym administrators to manage passes.
- **Views**:
    - A list of active `adminPass` records for the admin's associated gym.
- **Actions**:
    - **Add Admin Pass**: A form to create new `adminPass` records.
    - **Remove Admin Pass**: A button on each list item to permanently delete the `adminPass` record from the database.
    - **Transfer Admin Pass**: Initiates a transfer to a normal user, creating a `privatePass` for them.
    - **Consume Pass**: A dedicated button to start the pass consumption process for a user.

### Pass Record Page
- **Objective**: Show a history of the user's transactions.
- **Content**: A list of all `passRecord` records where the current user is either the `fromUserRef` or the `toUserRef`.

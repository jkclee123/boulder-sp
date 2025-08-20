Got it. Here is the complete Product Requirements Document for "Boulder SP" for you to copy.

***

# Boulder SP Product Requirements Document (PRD)

## Goals and Background Context

### Goals
* To establish a functional and trusted secondary market for climbing gym passes.
* To streamline the pass management and consumption process for gym administrators.
* To provide a value-added service to gym members, increasing satisfaction and engagement.

### Background Context
Gym members often face financial loss from underutilized bulk passes that expire, while administrators rely on inefficient manual tracking systems. Boulder SP addresses these issues by providing a centralized web platform for members to manage and trade surplus passes and for admins to digitally issue and consume them.

The Minimum Viable Product (MVP) will focus on core pass management, transfer, and marketplace functionalities. To simplify initial development, user-to-user payments will be handled off-platform via Telegram, with the app facilitating the initial contact. The application will be built using React and a Firebase backend to ensure a scalable and real-time experience.

## Requirements

### Functional
* **FR1**: Users must be able to log in to the application using Firebase Authentication.
* **FR2**: Users must be routed to their Account page upon login if their `name` and `phoneNumber` fields are not set.
* **FR3**: The Account page shall allow users to set their `name`, `telegramId`, `phoneNumber` (8 digits), and gym-specific `gymMemberId`.
* **FR4**: Normal users shall be routed to the Market page after a successful login (if their profile is complete).
* **FR5**: Admin users shall be routed to the Admin page after a successful login (if their profile is complete).
* **FR6**: The "My Pass" page shall display a user's passes in three distinct lists: active `privatePass`, active `marketPass`, and expired passes.
* **FR7**: Users must set their `telegramId` before they can list a `privatePass` for sale on the market.
* **FR8**: Listing a `privatePass` for sale shall decrease its count and create a corresponding `marketPass` record with the specified count and price.
* **FR9**: Unlisting a `marketPass` shall delete the `marketPass` record and merge its `count` back into the parent `privatePass`.
* **FR10**: Users can initiate a transfer of any active `privatePass` or `marketPass` they own.
* **FR11**: The transfer process requires the sender to find the recipient by their unique `phoneNumber` or `gymMemberId`.
* **FR12**: A successful transfer creates a new `privatePass` for the recipient and generates a `passLog` record.
* **FR13**: The Market page shall display all active, unexpired `marketPass` records with a `count` greater than 0.
* **FR14**: The Market page shall include a button on each listing that links to the owner's Telegram profile.
* **FR15**: Users must set their `phoneNumber` number before they can contact a seller on Telegram from the market page.
* **FR16**: The Admin page shall display a list of active `adminPass` records associated with the admin's gym.
* **FR17**: Admins shall be able to add and deactivate `adminPass` records.
* **FR18**: Admins can transfer an `adminPass` to a normal user, which creates a `privatePass` for that user. An `adminPass`'s count is not reduced upon transfer.
* **FR19**: Admins can consume passes from users belonging to their gym by searching for the user via `phoneNumber` or `gymMemberId`.
* **FR20**: The consume process shall default to consuming a `privatePass` before consuming a `marketPass`. A transaction attempting to consume from both types simultaneously shall fail.
* **FR21**: A successful consumption shall reduce the `count` of the user's pass and create a `passLog` record.
* **FR22**: The "Pass Log" page shall display all log entries where the current user is either the `fromUserRef` or the `toUserRef`.

### Non-Functional
* **NFR1**: All timestamps stored and displayed in the application must be in Hong Kong Time (UTC+8).
* **NFR2**: All currency values must be stored and displayed in Hong Kong Dollars (HKD).
* **NFR3**: Records in the database will not be physically deleted. A boolean `active` flag will be used to manage visibility and status (soft-delete).
* **NFR4**: The application will be a responsive web app built with React.
* **NFR5**: The backend infrastructure will exclusively use Firebase services: Authentication, Hosting, Firestore, and Cloud Functions.
* **NFR6**: The `phoneNumber` field in the `user` collection must be unique across all users.
* **NFR7**: The `gymMemberId` map values in the `user` collection must be unique for each gym.

---
## User Interface Design Goals

* **Overall UX Vision**: A clean, task-oriented, and mobile-first interface that allows for intuitive management of gym passes. The design should clearly distinguish between the standard user and admin experiences, presenting relevant information and actions without clutter.
* **Core Screens and Views**:
    * Login Page
    * Account Page
    * My Pass Page
    * Pass Log Page
    * Market Page
    * Admin Page
* **Accessibility**: The application should strive to meet WCAG 2.1 Level AA compliance.
* **Branding**: TBD. Initial design should be clean and neutral, allowing for future branding integration.
* **Target Device and Platforms**: Web Responsive, designed to function seamlessly on both mobile and desktop browsers.

---
## Technical Assumptions

* **Repository Structure**: **Monorepo**. This will facilitate sharing of types and utility functions between the React frontend and the Firebase Functions backend.
* **Service Architecture**: **Serverless**. All backend logic, including pass transfers, market listings, and consumptions, will be handled by Firebase Cloud Functions triggered via HTTPS requests from the client.
* **Testing Requirements**: **Unit + Integration**. The project will include unit tests for individual components and functions, as well as integration tests for core user workflows to ensure frontend and backend services communicate correctly.

---
## Epic List

* **Epic 1: Foundation, Auth & User Profile**: Establish the project foundation, implement user authentication, and build the user profile management system with mandatory completion logic.
* **Epic 2: Core Pass & Market Viewing**: Develop the functionality for users to view their pass inventory (`privatePass`) and browse the public marketplace (`marketPass`).
* **Epic 3: Pass Transactions & Marketplace Interaction**: Implement the core user-to-user actions: listing a pass for sale, unlisting it, and transferring passes between users, including transaction logging.
* **Epic 4: Admin Portal & Pass Lifecycle Management**: Build the complete feature set for administrators, including `adminPass` management, transferring passes to users, and the critical "consume" functionality.

---
## Epic 1: Foundation, Auth & User Profile
**Goal**: To set up the project structure, implement a secure authentication flow, and ensure all users have a complete profile before accessing core application features.

* **Story 1.1: Project & Firebase Initialization**
    * **As a** developer, **I want** to set up a new React project in a monorepo structure and initialize Firebase services, **so that** we have a foundational platform for development.
    * **Acceptance Criteria**:
        1.  A new React (Vite) project is created.
        2.  Firebase project is initialized with Authentication, Firestore, Hosting, and Functions.
        3.  Environment variables for Firebase configuration are set up correctly.
        4.  A basic "Hello World" page can be deployed to Firebase Hosting.

* **Story 1.2: User Authentication**
    * **As a** user, **I want** to log in to the application, **so that** I can access my personal account and features.
    * **Acceptance Criteria**:
        1.  A Login page with an email/password or social provider login option is implemented.
        2.  Successful authentication creates a `user` document in Firestore with the `uid` as the document ID.
        3.  The user's authentication state is managed globally in the app.
        4.  A functional logout button is available.

* **Story 1.3: Account Profile Page**
    * **As a** user, **I want** a dedicated Account page, **so that** I can manage my personal information.
    * **Acceptance Criteria**:
        1.  An Account page is created with input fields for `name`, `telegramId`, `phoneNumber`, and a section for `gymMemberId`.
        2.  The phoneNumber input is restricted to 8 digits.
        3.  The form successfully saves the entered data to the user's Firestore document.
        4.  Existing data is pre-populated in the form fields.

* **Story 1.4: Mandatory Profile Completion**
    * **As a** new user, **I want** to be directed to my Account page until I provide my name and phone number, **so that** my profile is complete before I use other features.
    * **Acceptance Criteria**:
        1.  Upon login, the system checks if the user's `name` and `phoneNumber` are set.
        2.  If either field is missing, the user is automatically redirected to the `/account` page.
        3.  The user cannot navigate to other pages (e.g., `/market`, `/my-pass`) until these fields are filled.
        4.  Once the fields are set, the user is correctly routed to the `/market` page (for normal users) or `/admin` page (for admins).

---
## Epic 2: Core Pass & Market Viewing
**Goal**: To provide users with the ability to view their own pass inventory and browse all available passes for sale on the marketplace.

* **Story 2.1: My Pass Page - View Private & Market Passes**
    * **As a** user, **I want** to see my active private and market passes on the "My Pass" page, **so that** I can track my current inventory.
    * **Acceptance Criteria**:
        1.  The "My Pass" page contains two lists: one for `privatePass` and one for `marketPass`.
        2.  The `privatePass` list displays all passes from the `privatePass` collection where `userRef` matches the current user, `active` is true, and `lastDay` has not passed.
        3.  The `marketPass` list displays all passes from the `marketPass` collection under the same conditions.
        4.  Each list item shows key details like gym, count, and last day.

* **Story 2.2: My Pass Page - View Expired Passes**
    * **As a** user, **I want** to see a list of my expired passes, **so that** I can review my past inventory.
    * **Acceptance Criteria**:
        1.  The "My Pass" page has a third list for expired passes.
        2.  This list shows `privatePass` and `marketPass` records where `lastDay` is in the past but the pass is still `active`.
        3.  Expired `privatePass` records with `count: 0` are displayed.
        4.  Expired `marketPass` records with `count: 0` are NOT displayed.

* **Story 2.3: Market Page - View & Filter Listings**
    * **As a** user, **I want** to view all passes for sale on the Market page and filter them by gym, **so that** I can find passes I'm interested in buying.
    * **Acceptance Criteria**:
        1.  The Market page displays a list of all `marketPass` records from all users that are `active`, not expired, and have a `count` > 0.
        2.  Each list item displays the gym, price per pass, count available, and remarks.
        3.  A filter control (e.g., a dropdown) is available to filter the list by `gym`.
        4.  The list updates correctly when a gym filter is applied.

---
## Epic 3: Pass Transactions & Marketplace Interaction
**Goal**: To enable all user-to-user interactions, including listing passes on the market, unlisting them, transferring passes, and ensuring all transactions are logged.

* **Story 3.1: List Private Pass on Market**
    * **As a** user, **I want** to list my private passes for sale, **so that** I can sell my surplus passes.
    * **Acceptance Criteria**:
        1.  A "Market" button on a `privatePass` item opens a form/modal to list it for sale.
        2.  The user cannot open this form if their `telegramId` is not set in their profile.
        3.  The user inputs the desired `count` to sell and the `price` per pass.
        4.  On submission, a Firebase Function reduces the `privatePass` count and creates a new `marketPass` record with the specified details and a reference to the parent `privatePass`.

* **Story 3.2: Unlist Market Pass**
    * **As a** user, **I want** to remove my pass from the marketplace, **so that** I can use it myself or consolidate my inventory.
    * **Acceptance Criteria**:
        1.  An "Unlist" button is available on `marketPass` items in the "My Pass" page.
        2.  On click, a Firebase Function deletes the `marketPass` record.
        3.  The `count` from the deleted `marketPass` is added back to the parent `privatePass` record referenced by `privatePassRef`.

* **Story 3.3: Transfer Pass to Another User**
    * **As a** user, **I want** to transfer a pass to another user, **so that** I can give or sell it to them directly.
    * **Acceptance Criteria**:
        1.  A "Transfer" button is available on active `privatePass` and `marketPass` items.
        2.  The transfer form requires searching for the recipient by `phoneNumber` or `gymMemberId`. The recipient's name is displayed for confirmation.
        3.  The sender can specify the `count` and total `purchasePrice` for the transfer.
        4.  A Firebase Function executes the transfer, reducing the sender's pass count and creating a new `privatePass` for the recipient.
        5.  The new `privatePass`'s `lastDay` is calculated based on its `createdAt` date plus the `duration` inherited from the original pass, not the sender's pass `lastDay`.

* **Story 3.4: Pass Transaction Logging**
    * **As a** user, **I want** to see a log of all my pass activities, **so that** I can track my transfers and consumptions.
    * **Acceptance Criteria**:
        1.  A `passLog` record is created for every successful transfer and consumption.
        2.  The log includes `fromUserRef`, `toUserRef`, `count`, `price`, `action` ('transfer' or 'consume'), and `gym`.
        3.  The "Pass Log" page displays all log records where the current user is a participant.

* **Story 3.5: Contact Seller from Market**
    * **As a** buyer, **I want** to contact a seller from the market page, **so that** I can arrange payment.
    * **Acceptance Criteria**:
        1.  A contact button is present on each Market page listing.
        2.  The user is prevented from clicking the button if their own `phoneNumber` number is not set, with an appropriate message.
        3.  Clicking the button opens a new tab to `https://t.me/{owner-telegramId}`.

---
## Epic 4: Admin Portal & Pass Lifecycle Management
**Goal**: To provide administrators with the tools to manage the entire lifecycle of passes for their gym, including creation, distribution, and consumption.

* **Story 4.1: Admin Pass Management**
    * **As an** admin, **I want** to view, add, and deactivate `adminPass` records, **so that** I can manage the source of all passes for my gym.
    * **Acceptance Criteria**:
        1.  The Admin page shows a list of `active` `adminPass` records where the `gym` field matches the admin's `adminGym`.
        2.  A form allows the admin to create a new `adminPass` with `count`, total `price`, `duration` (in days), and `lastDay`.
        3.  A "Deactivate" button on each pass sets its `active` flag to `false`.

* **Story 4.2: Transfer Admin Pass to User**
    * **As an** admin, **I want** to transfer passes to a user, **so that** I can distribute passes they have purchased.
    * **Acceptance Criteria**:
        1.  A transfer option is available on each `adminPass` item.
        2.  The admin searches for the recipient user by `phoneNumber` or `gymMemberId`.
        3.  On confirmation, a Firebase Function creates a new `privatePass` for the recipient.
        4.  The new `privatePass` inherits its `duration` from the `adminPass`. Its `lastDay` is calculated as `createdAt` + `duration`, ending at 23:59:59 HKT.
        5.  The original `adminPass` `count` is NOT reduced.
        6.  A `passLog` is created for the transaction.

* **Story 4.3: Consume User Pass**
    * **As an** admin, **I want** to consume a pass from a user who is visiting the gym, **so that** I can redeem their entry.
    * **Acceptance Criteria**:
        1.  A "Consume Pass" button is available on the Admin page.
        2.  The admin searches for the target user by `phoneNumber` or `gymMemberId`, and the user's name appears for confirmation.
        3.  The admin enters the number of passes to consume.
        4.  A Firebase Function verifies the user has enough passes of a single type (`privatePass` or `marketPass`) from the admin's gym. It shows an error if not, or if the consumption would require using both types.
        5.  The function preferentially reduces the count of a `privatePass`. If none exists, it reduces the count of a `marketPass`.
        6.  A `passLog` is created with `price: 0`, `fromUser`: the target user, and `toUser`: the admin.

---
## Checklist Results Report
This PRD has been generated based on the Project Brief. The next step is for the Product Owner (PO) to run the `po-master-checklist` against this document and the architecture to ensure completeness, consistency, and logical sequencing before development begins.

---
## Next Steps

* **For the UX Expert**: Please use this PRD to create the detailed **UI/UX Specification** (`front-end-spec.md`). Focus on user flows for the core journeys: pass management, marketplace interaction, and the admin consumption process.

* **For the Architect**: Please use this PRD to create the **Fullstack Architecture Document** (`fullstack-architecture.tmpl.yaml`). Key decisions include defining the precise Firestore rules for security, designing the Firebase Cloud Function interfaces, and establishing the data models with their relationships.
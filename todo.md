# Boulder SP - Development TODO

This document outlines the development tasks based on the PRD.

## Epic 1: Foundation, Auth & User Profile
**Goal**: To set up the project structure, implement a secure authentication flow, and ensure all users have a complete profile before accessing core application features.

- [x] **Story 1.1: Project & Firebase Initialization**: As a developer, I want to set up a new React project in a monorepo structure and initialize Firebase services, so that we have a foundational platform for development.
- [x] **Story 1.2: User Authentication**: As a user, I want to log in to the application, so that I can access my personal account and features.
- [x] **Story 1.3: Account Profile Page**: As a user, I want a dedicated Account page, so that I can manage my personal information.
- [ ] **Story 1.4: Mandatory Profile Completion**: As a new user, I want to be directed to my Account page until I provide my name and phone number, so that my profile is complete before I use other features.

## Epic 2: Core Pass & Market Viewing
**Goal**: To provide users with the ability to view their own pass inventory and browse all available passes for sale on the marketplace.

- [ ] **Story 2.1: My Pass Page - View Private & Market Passes**: As a user, I want to see my active private and market passes on the "My Pass" page, so that I can track my current inventory.
- [ ] **Story 2.2: My Pass Page - View Expired Passes**: As a user, I want to see a list of my expired passes, so that I can review my past inventory.
- [ ] **Story 2.3: Market Page - View & Filter Listings**: As a user, I want to view all passes for sale on the Market page and filter them by gym, so that I can find passes I'm interested in buying.

## Epic 3: Pass Transactions & Marketplace Interaction
**Goal**: To enable all user-to-user interactions, including listing passes on the market, unlisting them, transferring passes, and ensuring all transactions are logged.

- [ ] **Story 3.1: List Private Pass on Market**: As a user, I want to list my private passes for sale, so that I can sell my surplus passes.
- [ ] **Story 3.2: Unlist Market Pass**: As a user, I want to remove my pass from the marketplace, so that I can use it myself or consolidate my inventory.
- [ ] **Story 3.3: Transfer Pass to Another User**: As a user, I want to transfer a pass to another user, so that I can give or sell it to them directly.
- [ ] **Story 3.4: Pass Transaction Logging**: As a user, I want to see a log of all my pass activities, so that I can track my transfers and consumptions.
- [ ] **Story 3.5: Contact Seller from Market**: As a buyer, I want to contact a seller from the market page, so that I can arrange payment.

## Epic 4: Admin Portal & Pass Lifecycle Management
**Goal**: To provide administrators with the tools to manage the entire lifecycle of passes for their gym, including creation, distribution, and consumption.

- [ ] **Story 4.1: Admin Pass Management**: As an admin, I want to view, add, and deactivate `adminPass` records, so that I can manage the source of all passes for my gym.
- [ ] **Story 4.2: Transfer Admin Pass to User**: As an admin, I want to transfer passes to a user, so that I can distribute passes they have purchased.
- [ ] **Story 4.3: Consume User Pass**: As an admin, I want to consume a pass from a user who is visiting the gym, so that I can redeem their entry.

# Implementation Plan: Customer App Authentication Flow

This document outlines the architecture and implementation steps to connect the Customer Mobile App to a real backend authentication flow, replacing the local PIN mock.

## Goal

Create a secure, backend-driven authentication flow for the Customer App with the following features:
1. **Signup Flow**: First-time users register with First Name, Mobile Number, Email, PIN, and Confirm PIN.
2. **Login Flow**: Returning users log in with Mobile Number and PIN.
3. **Forgot PIN Flow**: Users can request an OTP to their registered email to reset their PIN.
4. **Cross-Boutique Data Fetching**: Once logged in, the app automatically fetches all orders linked to the user's mobile number across all registered boutiques in the Admin panel.

## User Review Required

> [!WARNING]
> **Backend Architecture Decision**
> The current backend stores customers inside specific boutiques (`company_id`). Since Customer App users need to see orders across *all* boutiques, we need a new global table (e.g., `AppCustomer`) to store their login credentials (PIN, email) independently of any single boutique.
> Please confirm if creating a new `AppCustomer` entity is the preferred approach, or if you'd prefer to use the existing `User` table with a new `CustomerApp` role.

> [!IMPORTANT]
> **Email Service Provider**
> The Forgot PIN flow requires sending an OTP via email. Does the backend already have an Email service configured (e.g., AWS SES, SendGrid, NodeMailer), or will we need to set one up?

## Proposed Changes

---

### 1. Backend: Database Entities
#### [NEW] `src/Mobile/customer-auth/entities/app-customer.entity.ts`
- Create a new `AppCustomer` entity to store global app users.
- Fields: `id`, `name`, `mobile` (unique), `email` (unique), `pin_hash`, `reset_otp`, `reset_otp_expiry`, `created_at`, `updated_at`.

### 2. Backend: API Endpoints
#### [NEW] `src/Mobile/customer-auth/customer-auth.controller.ts` & `.service.ts`
- **POST `/mobile/customer-auth/register`**: 
  - Validates input (Name, Mobile, Email, PIN).
  - Hashes the PIN using bcrypt.
  - Creates the `AppCustomer` record.
  - Returns a JWT token.
- **POST `/mobile/customer-auth/login`**:
  - Verifies mobile and PIN hash.
  - Returns a JWT token.
- **POST `/mobile/customer-auth/forgot-pin`**:
  - Looks up the customer by email/mobile.
  - Generates a 4-6 digit OTP, stores it with an expiry time.
  - Dispatches an email with the OTP.
- **POST `/mobile/customer-auth/reset-pin`**:
  - Validates the OTP.
  - Hashes and updates the new PIN.

### 3. Backend: Auth Guards
#### [MODIFY] `src/Mobile/customer-portal/customer-portal.controller.ts`
- Currently, `/orders` is a public endpoint.
- We will secure it using a JWT strategy tailored for `AppCustomer` to ensure users can only fetch orders associated with their own verified mobile number.

---

### 4. Mobile App: UI/UX Changes
#### [NEW] `src/screens/SignupScreen.js`
- **Step 1 View**: First Name, Mobile Number, Email Address.
- **Step 2 View**: PIN (4-digit), Confirm PIN (4-digit).
- **Submit**: Calls `/register`. On success, plays a beautiful loading/success animation (e.g., Lottie) before navigating to the Main Dashboard.

#### [MODIFY] `src/screens/LoginScreen.js`
- Remove the local `AsyncStorage` PIN logic.
- Change the `Continue` button to call the new `/login` backend API.
- Maintain the "Forgot PIN?" and "Sign up now" links to navigate to their respective screens.

#### [NEW] `src/screens/ForgotPinScreen.js`
- **Step 1**: Enter Registered Email Address.
- **Step 2**: Enter OTP (sent via email) and New PIN.

### 5. Mobile App: API Integration
#### [MODIFY] `src/context/AuthContext.js`
- Update the `login` and `saveUser` functions to store the real JWT returned from the backend.
- Ensure all subsequent requests to the `customer-portal/orders` endpoint include the `Authorization: Bearer <token>` header.

## Verification Plan

### Automated Tests
- N/A for mobile UI, but we can write Jest tests for the backend `customer-auth.service.ts` to ensure PIN hashing and OTP generation work correctly.

### Manual Verification
1. **Signup**: Register a new user on the mobile app. Verify the record appears in the backend database.
2. **Login**: Log out and log back in using the correct PIN. Try an incorrect PIN to ensure rejection.
3. **Forgot PIN**: Trigger the forgot PIN flow, check the email inbox for the OTP, and successfully reset the PIN.
4. **Cross-Boutique Data**: Create an order in Boutique A and Boutique B using the same customer phone number. Log into the app and verify both orders appear on the dashboard.

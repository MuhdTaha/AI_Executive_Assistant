# AI_Executive_Assistant

This project is an intelligent personal assistant designed to optimize time management for students and professionals. It syncs with a user's Google Calendar and Google Tasks, using the Gemini LLM to analyze vague tasks, ask clarifying questions, and dynamically slot focused work blocks into the calendar.

## 1. Project Architecture
The application uses a modern, secure architecture split into three layers:

- Frontend: React/TypeScript hosted on Cloudflare Pages (or similar CDN). Handles the UI and delegates authentication to Supabase.

- Authentication & Database: Supabase (PostgreSQL). Handles user authentication (Google OAuth 2.0/OIDC), stores internal app data, and securely encrypts user Refresh Tokens.

- Backend/API: NestJS/TypeScript deployed on Google Cloud Run. This is the core logic engine responsible for running the scheduling algorithm, communicating with the Google Calendar/Tasks APIs, and calling the Gemini LLM.

## 2. Initial Setup: External Services
Before running the code, you must configure the following services to enable secure Google Sign-In.

### A. Google Developer Console (OAuth Credentials)
- Create a Web Application Client ID: Go to the Google Cloud Console and create an OAuth 2.0 Web Application Client ID.

- Configure Redirect URI: You must obtain the Redirect URI from your Supabase project (see Step B.2) and paste it into the Authorized Redirect URIs list in the Google Console.

- Define Required Scopes: Ensure your OAuth client requests these sensitive scopes, which allow the backend access to the user's data:
  - email
  - profile
  - https://www.googleapis.com/auth/calendar.events (For scheduling events)
  - https://www.googleapis.com/auth/tasks (For managing the to-do list)

- Save Credentials: Record your Client ID and Client Secret.

### B. Supabase (Auth and Database)
- Create Project: Create a new project in the Supabase Dashboard. Note your Project URL and Anon Public Key.

- Configure Google Provider: Navigate to Authentication > Providers and select Google.
  - Paste the Client ID and Client Secret obtained from the Google Console.
  - Crucially, in the scope configuration for Google on Supabase, enter the required scopes, separated by spaces:
    ```
    email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks
    ```
  - Save the settings.

## 3. Local Development Setup and Run
The project uses a monorepo structure with NPM Workspaces.

### A. Environment Preparation
- Clone the Repository:
  ```bash
  git clone [YOUR-REPO-URL]
  cd ai-executive-assistant
  ```

- Install Dependencies: Run this command from the root directory to install all packages for both the frontend and backend:

  ```bash
  npm install
  ```

- Configure Frontend Secrets: Create a file named .env in the root of the frontend folder (/frontend/.env). This file will hold your Supabase credentials:
  ```bash
  # .env in /frontend/
  VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
  VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY" 
  ```
  
  - Note: You must then replace the placeholder strings in ```frontend/src/App.tsx``` with ```import.meta.env.VITE_SUPABASE_URL```, etc., to safely load these variables.

### B. Running the Frontend (React TS)
- Navigate to the frontend directory:

  ```bash
  cd frontend
  ```

- Start the development server (runs with Vite):

  ```bash
  npm run dev
  ```
  
  The app should open on http://localhost:5173.

### C. Testing User Authentication
- Test 1: Initial Load: Verify the "Sign In with Google" button is displayed.

- Test 2: OAuth Flow: Click the button. Verify that the browser redirects to Google and the permissions screen explicitly lists the Calendar and Tasks permissions.

- Test 3: Session State: After successful login, the app should redirect back and display "Welcome Back, [Your Name]!"

### D. Running the Backend (NestJS API Shell)
- Go back to the backend directory:
  ```bash
  cd ../backend
  ```

- Start the development server:

  ```bash
  npm run start:dev
  ```

The server will run on ```http://localhost:3000```. You can verify it's working by hitting the test endpoint: ```curl http://localhost:3000/test-api```.

You now have a secure, running foundation! The next phase involves implementing the complex logic inside the NestJS service.

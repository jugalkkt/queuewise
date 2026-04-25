## UI Development Plan — Hospital Queue Time Predictor MVP

---

### Overview

The MVP requires **12 screens** across 5 functional areas: Public / Pre-Auth, Onboarding, Core App, Live Visit Flow, and Settings. Every screen maps directly to a touchpoint in the user journey defined earlier. Nothing is included that isn't in the MVP feature set. Nothing from the journey is left without a screen.

---

## AREA 1 — Public / Pre-Auth Screens

---

### Screen 1 — Landing Page

**Purpose:**
Convert a first-time visitor into a signed-up user by demonstrating the product's value before asking for anything in return.

**What it shows:**
- A headline focused on the core pain point of wasted waiting time at government hospitals
- A single search input field asking which hospital the user is visiting, placed prominently above the fold
- A static but realistic-looking heatmap of a well-known Kerala government hospital showing today's busy hours, used as a live product demo
- Three short benefit statements written from the patient's perspective, not feature descriptions
- A social proof line showing the number of patients who used the product recently
- A short looping demo showing a wait time prediction being generated
- A primary CTA button leading to the search or signup flow
- A minimal navigation bar with only a logo and a Login link — no distractions

**What the user can do:**
- Type a hospital name into the search field and initiate a guest search
- Click the primary CTA to begin the signup flow
- Click Login if they already have an account

---

### Screen 2 — Guest Search Result (Pre-Signup Gate)

**Purpose:**
Let the user experience a taste of the product's core value before creating an account, lowering the barrier to signup by creating desire first.

**What it shows:**
- The hospital and department the user searched for, displayed at the top as confirmation
- A partially visible or blurred wait time prediction card with a lock icon overlay
- A visible but incomplete heatmap showing the shape of the week's busy periods without the specific time labels
- A short prompt explaining that signing up is free and takes under a minute to unlock the full prediction
- A signup CTA button
- A smaller secondary link to continue browsing the landing page

**What the user can do:**
- Click the signup CTA to proceed to account creation, carrying their search context forward
- Go back to the landing page
- See enough of the product to understand what they're about to unlock

---

### Screen 3 — Signup / Login Screen

**Purpose:**
Create a new account or log into an existing one with the least possible friction.

**What it shows:**
- A clean, minimal layout with the product logo at the top
- A "Continue with Google" button as the primary option
- A phone number input field with an OTP-based login as the secondary option
- A brief one-line note that no password is required
- Terms of service and privacy policy links in small text at the bottom
- No long forms, no address fields, no date of birth

**What the user can do:**
- Sign up or log in with Google in one tap
- Enter a phone number to receive an OTP
- Submit the OTP to complete phone-based authentication
- Navigate to the privacy policy or terms if they choose

---

### Screen 4 — OTP Verification Screen

**Purpose:**
Complete the phone-based authentication step for users who did not use Google login.

**What it shows:**
- A confirmation that an OTP was sent to the entered phone number
- A 6-digit OTP input field
- A countdown timer showing when the user can request a new OTP
- A resend OTP link that activates after the timer expires
- An option to go back and change the phone number if it was entered incorrectly

**What the user can do:**
- Enter the 6-digit OTP received by SMS
- Request a new OTP after the timer expires
- Go back to edit their phone number
- Proceed automatically to onboarding once the correct OTP is entered

---

## AREA 2 — Onboarding Screens

---

### Screen 5 — Hospital Selection (Onboarding Step 1 of 2)

**Purpose:**
Personalise the app immediately by capturing the user's primary hospital so that every subsequent screen shows relevant data rather than generic content.

**What it shows:**
- A progress indicator showing Step 1 of 2
- A short, friendly heading asking which hospital the user visits most often
- A searchable dropdown list of Kerala government hospitals, with the most prominent ones shown by default
- A brief note that they can change this later in settings
- A Next button that activates once a hospital is selected

**What the user can do:**
- Search for a hospital by name or location
- Select one hospital as their primary
- Tap Next to proceed to department selection

---

### Screen 6 — Department Selection (Onboarding Step 2 of 2)

**Purpose:**
Further personalise the experience by capturing which department the user typically visits, enabling department-specific predictions from the very first dashboard view.

**What it shows:**
- A progress indicator showing Step 2 of 2
- A heading asking which department they usually visit
- A scrollable list of departments available at their chosen hospital — General OPD, Cardiology, Orthopaedics, Paediatrics, Gynaecology, ENT, Dermatology, and others
- A note that they can select multiple departments if they visit more than one
- A Skip option in small text for users who are unsure
- A Done button that finalises onboarding and takes them to the dashboard

**What the user can do:**
- Select one or more departments from the list
- Skip this step if they prefer to explore first
- Tap Done to complete onboarding and land on their personalised dashboard

---

## AREA 3 — Core App Screens

---

### Screen 7 — Home Dashboard

**Purpose:**
This is the central screen of the product. It is where users spend the majority of their time and where the core value — knowing wait times before leaving home — is delivered every single day.

**What it shows:**
- The user's selected hospital and department displayed at the top with an option to switch
- A prominently displayed wait time prediction card for today, showing the estimated wait in hours and minutes for the current time of day
- A "Best Time to Visit" card directly below the prediction, showing a specific recommended time window with the expected wait at that time
- A weekly heatmap grid below the recommendation, showing all days of the current week with colour intensity indicating queue volume — darker for busier, lighter for quieter
- A live crowdsource feed at the bottom showing recent check-ins from other users at this hospital, displayed as anonymous data points such as "3 users reported medium wait 45 minutes ago"
- A doctor availability strip showing the on-duty or on-leave status of the primary doctors in the selected department
- A floating action button for checking in if the user is currently at the hospital

**What the user can do:**
- Switch between their saved hospitals or departments using the selector at the top
- Tap the heatmap on any future time slot to see the predicted wait for that specific window
- Tap the Best Time card to set a visit reminder for that time
- Tap the floating check-in button if they are currently at the hospital
- Tap any doctor's name in the availability strip to see more detail
- Pull down to refresh live data

---

### Screen 8 — Hospital / Department Detail Screen

**Purpose:**
Give users a deeper view of a specific hospital and department beyond what the home dashboard summarises, including a fuller heatmap, historical patterns, and the complete doctor list.

**What it shows:**
- Full hospital name, address, and contact number at the top
- Department selector tabs if the user has multiple departments saved for this hospital
- An expanded heatmap covering the full week with hour-by-hour granularity on tap
- A historical average section showing typical wait times by day of week, derived from aggregated past data
- The full list of doctors assigned to this department with their current availability status — on duty, on leave, or status unknown
- The complete live crowdsource feed for this department, showing timestamped anonymous reports from other users
- A button to save this hospital-department combination to their profile if it is not already saved

**What the user can do:**
- Switch between departments within the same hospital using tabs
- Tap any hour on the expanded heatmap to see the predicted wait for that time
- Tap a doctor's name to open their individual detail view
- Contribute a queue report from this screen even without formally checking in
- Save this hospital or department to their profile

---

### Screen 9 — Doctor Availability Screen

**Purpose:**
Allow users to check the status of a specific doctor before making the trip, addressing one of the most common and frustrating failure modes of government hospital visits.

**What it shows:**
- The doctor's name, department, and hospital at the top
- A clear status indicator showing one of three states: On Duty Today, On Leave, or Status Not Updated
- The doctor's typical weekly schedule if available — for example, present on Monday, Wednesday, and Friday
- A last-updated timestamp so users know how fresh the information is
- A note explaining how the status is sourced — either from hospital-provided data or from recent user reports
- A button to report a discrepancy if the user is at the hospital and the status shown is incorrect

**What the user can do:**
- See the doctor's current and upcoming availability at a glance
- Report a status error if they are physically at the hospital and the information is wrong
- Go back to the department or hospital detail screen

---

## AREA 4 — Live Visit Flow Screens

---

### Screen 10 — Visit Check-In Screen

**Purpose:**
Capture the moment a user arrives at the hospital, enabling real-time queue tracking for them personally and contributing live data to the crowdsource layer for all other users.

**What it shows:**
- A confirmation of the hospital and department they are checking into
- A personalised wait estimate at this moment: based on current crowdsource reports, their estimated wait from now
- A simple three-option queue report selector asking how the queue feels right now — Short, Medium, or Long — presented as large tappable buttons, not a dropdown
- A note that their anonymous report will help other patients planning their visit today
- An optional field to note the specific doctor they are waiting for
- A confirmation button to complete the check-in

**What the user can do:**
- Confirm their hospital and department or change it before checking in
- Select their current queue experience from the three options
- Optionally specify which doctor they are waiting for
- Submit the check-in and proceed to the Active Visit screen

---

### Screen 11 — Active Visit Tracker Screen

**Purpose:**
Keep the user informed while they are physically waiting at the hospital, giving them a live sense of their position and estimated time remaining.

**What it shows:**
- A live countdown or progress indicator showing estimated time remaining based on their check-in time and current crowdsource data
- A feed of anonymous updates from other users who have checked in around the same time — for example, "2 users who checked in before you have now left"
- A live queue status indicator showing whether the queue is moving faster or slower than predicted
- A notification from the app when the user is estimated to be within 15 minutes of being seen
- A prominent End Visit button for when they are done

**What the user can do:**
- Monitor their estimated remaining wait in real time
- Update their queue status report if conditions have changed since check-in — for example, upgrading from Medium to Long
- Tap End Visit when they are done to trigger the post-visit feedback screen
- Minimise the screen and return to it from a persistent notification in their status bar

---

### Screen 12 — Post-Visit Feedback Screen

**Purpose:**
Collect the actual wait time and visit outcome after the user is done, closing the loop between predicted and actual data so the prediction engine can improve over time.

**What it shows:**
- A short, warm heading thanking the user and acknowledging the visit is complete
- A wait time slider asking how long they actually waited — ranging from under 30 minutes to over 4 hours, in 15-minute increments
- A single yes or no question asking whether their intended doctor was available
- A three-option mood selector for overall experience — a poor, neutral, or good indicator
- A brief message below the submission area showing how their input contributes to the system — for example, "Your report helps improve predictions for 4,000+ patients"
- A Skip option for users who do not want to complete the feedback

**What the user can do:**
- Drag the slider to report their actual wait time
- Tap yes or no for doctor availability
- Select their experience rating
- Submit the feedback and be taken back to the home dashboard
- Skip the feedback entirely with one tap

---

## AREA 5 — Settings and Profile Screens

---

### Screen 13 — Profile and Settings Screen

**Purpose:**
Let users manage their preferences, saved hospitals, notification settings, and account details from a single place.

**What it shows:**
- The user's name and login method at the top
- A Saved Hospitals section listing all hospitals and departments they have added, each with an option to set as default or remove
- A Notification Preferences section with individual toggles for: morning daily digest, best-time alerts, live queue change alerts, and post-visit feedback reminders
- A Visit History section showing a log of all past check-ins with the hospital, department, date, and their reported wait time
- An Account section with options to change login details or delete the account
- An About section with app version, privacy policy, and a link to submit feedback or report a bug

**What the user can do:**
- Add or remove saved hospitals and departments
- Set a different hospital as their default
- Turn individual notification types on or off
- Browse their full visit history
- Delete their account and all associated data
- Submit feedback about the app

---

## Screen Summary Table

| # | Screen Name | Area | Primary User Goal |
|---|------------|------|-------------------|
| 1 | Landing Page | Public | Understand and want the product |
| 2 | Guest Search Result | Public | Experience value before signing up |
| 3 | Signup / Login | Auth | Create account with minimal friction |
| 4 | OTP Verification | Auth | Complete phone-based login |
| 5 | Hospital Selection | Onboarding | Personalise the app |
| 6 | Department Selection | Onboarding | Deepen personalisation |
| 7 | Home Dashboard | Core App | Check today's wait and best time |
| 8 | Hospital / Department Detail | Core App | Deep-dive into a specific hospital |
| 9 | Doctor Availability | Core App | Confirm doctor is present today |
| 10 | Visit Check-In | Live Visit | Register arrival and report queue |
| 11 | Active Visit Tracker | Live Visit | Monitor wait in real time |
| 12 | Post-Visit Feedback | Live Visit | Report actual outcome |
| 13 | Profile and Settings | Settings | Manage preferences and history |

---

### Design Principles That Should Run Across All 13 Screens

**Speed over completeness.** Every screen should load its most important information first and defer secondary content. A patient checking wait times at 7am before leaving home does not have time for spinners.

**One primary action per screen.** Each screen has one thing it wants the user to do. Secondary actions exist but are visually subordinate. There is no screen where the user should feel unsure about what to tap next.

**Data freshness is always visible.** Any prediction, crowdsource figure, or doctor status should show a last-updated timestamp. Users are trusting this data to make real decisions. They deserve to know how fresh it is.

**Graceful empty states.** For any hospital or department where data is thin — especially at launch — the app should show a helpful empty state rather than a broken or blank screen. Something like "Not enough data yet for this department — check back soon or be the first to report."

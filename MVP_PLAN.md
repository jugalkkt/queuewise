# Hospital Queue Time Predictor — MVP Plan

---

## 1. Product Overview

### Vision
> Empower Kerala government hospital patients to know their wait time before they leave home — so they never waste a day in a queue again.

### The Pain Point
Government hospitals in Kerala serve millions of patients who cannot afford private healthcare. These patients — often daily-wage workers, elderly individuals, and those travelling long distances — arrive with no visibility into how long they will wait. There is no system, no estimate, and no way to plan. The result is 2–4 hour waits that cost people their income, their time, and sometimes their willingness to seek care at all. No tool exists today that solves this specifically for government hospitals in India.

---

## 2. Finalized MVP Features

The MVP is built around five features selected using the MoSCoW framework, prioritised for maximum value with minimum build time.

### Feature 1 — Wait Time Prediction Engine
The core of the product. Users select a hospital and department, and the app returns a predicted wait time for the current moment or any planned visit time. At launch, predictions are powered by manually collected historical patterns — day of week, time of day, and department — before machine learning layers are added in later versions. Even a simple, accurate prediction delivers more value than anything currently available to these patients.

### Feature 2 — Live Queue Heatmap
A colour-coded weekly grid showing busy versus quiet periods for each hospital and department. Darker cells indicate higher queue volume; lighter cells indicate calmer windows. This makes the prediction data immediately visual and scannable — a patient can understand the best time to visit in under five seconds without reading a single number.

### Feature 3 — Best Time to Visit Recommendation
A single auto-generated text card that tells the user the optimal visit window this week: for example, *"Best time this week: Wednesday 2:00 – 3:30pm. Expected wait: ~40 minutes."* This removes any need for the user to interpret the heatmap themselves. It is the product's most shareable and screenshot-able output, and the primary driver of organic word-of-mouth via WhatsApp.

### Feature 4 — Real-Time Queue Crowdsourcing (Lightweight)
A one-tap check-in that lets users at the hospital report current queue conditions as Short, Medium, or Long. No forms, no typing, no friction. This creates a live data layer from day one without requiring any partnership with hospital systems. Over time, this crowdsourced signal becomes the most accurate real-time input the prediction engine has.

### Feature 5 — Doctor Availability Tracker (Basic)
A simple on-duty or on-leave status for key doctors in each department. Even if updated manually at launch, this solves one of the most common and frustrating failures of a government hospital visit — arriving for a specific doctor who is not there. A single binary status per doctor is enough to deliver immediate value.

---

## 3. Detailed User Journey

### Morning — Pre-Visit Planning (Primary Use Case)

The patient wakes up knowing they need to visit the hospital today. This is the most important moment the product is built around.

**7:30am — The user opens the app.**
Their default hospital and department are already loaded. The home dashboard shows today's predicted wait time for the current time of day, the weekly heatmap, and the Best Time to Visit card. The doctor availability strip confirms whether their intended doctor is on duty.

**The user sees the prediction and makes a decision.**
The wait at 9am is predicted at 2 hours 15 minutes. The Best Time card suggests arriving at 2:00pm for a 45-minute wait instead. The user decides to go in the afternoon rather than the morning.

**The user sets a reminder.**
They tap the Best Time card and set a reminder for 1:15pm — a prompt to leave for the hospital. The app confirms: *"Reminder set. We'll nudge you at 1:15pm."*

**The user closes the app.**
The entire interaction took under 90 seconds and meaningfully changed how they planned their day. This is the core value loop.

---

### Midday — En Route and On-Site (Live Visit Flow)

**1:15pm — Reminder fires.**
The user gets a push notification: *"Time to head to the hospital. Queue at General OPD is currently lighter than predicted — good time to go."*

**1:50pm — User arrives at the hospital.**
The app prompts: *"Are you at the hospital now?"* The user taps yes and is taken to the Check-In screen.

**Check-in takes 10 seconds.**
The user confirms their department, taps Medium for current queue conditions, and optionally notes which doctor they are waiting for. They submit and land on the Active Visit Tracker.

**While waiting — the app keeps them informed.**
The Active Visit Tracker shows an estimated time remaining based on their check-in time and live crowdsource data from other users who checked in before them. A status line shows whether the queue is moving faster or slower than predicted. Anonymous check-ins from other users — *"2 users who arrived before you have now been seen"* — give a real sense of progress.

**~15 minutes before their turn** — the app sends a gentle notification: *"You're likely next within 15 minutes. Stay close to the waiting area."*

---

### End of Day — Closing the Loop (Post-Visit Feedback)

**After the visit — 3-question micro-survey.**
The app sends a single notification: *"How was your visit today?"* The survey takes 20 seconds:
- Actual wait time, via a slider from under 30 minutes to over 4 hours
- Was your doctor available — Yes or No
- Overall experience — Poor, Neutral, or Good

**Why this step matters.**
Every response closes the gap between predicted and actual wait time. This feedback is the engine that makes the product smarter over time. After 500 responses, prediction accuracy improves measurably. After 5,000, the product has a data asset no competitor can replicate quickly. Users who skip this step are shown no friction — the skip option is always one tap away.

**What the user receives in return.**
A brief confirmation: *"Thank you. Your report helps improve predictions for patients across Kerala."* Their visit is automatically logged in their personal visit history. If their actual wait was significantly worse than predicted, the app acknowledges it: *"We'll factor this in. Sorry your wait was longer than expected."*

---

### Weekly — Passive Engagement Loop

**Monday morning — Weekly digest notification.**
Users receive a summary of the week ahead for their saved hospitals: the best day to visit, any unusual patterns detected, and doctor availability changes. This keeps the app relevant even in weeks when the user has no hospital visit planned.

**Mid-week — Sharing moment.**
If the app's Best Time suggestion saved the user a significant wait the previous week, a shareable card is surfaced: *"Visited at 2pm instead of 9am. Saved ~1h 45min of waiting."* This card is designed for WhatsApp sharing, which is the primary distribution channel for this demographic in Kerala.

**End of week — Contribution acknowledgement.**
Users who submitted queue reports during the week receive a brief note: *"You contributed 3 queue reports this week. Your data helped 67 patients plan better."* This is the same retention mechanic used by Waze and Duolingo — making contribution feel meaningful rather than extractive, and giving users a reason to return even when they have not visited a hospital themselves.

---

## Appendix — MVP at a Glance

| Section | Summary |
|---|---|
| Core Problem | No wait time visibility at Kerala government hospitals |
| Target User | Patients visiting government hospitals in Kerala |
| MVP Features | Prediction engine, heatmap, best time card, crowdsourcing, doctor status |
| Primary Use Case | Morning check before leaving home |
| Secondary Use Case | Live tracking while at the hospital |
| Data Strategy | Manual collection at launch, crowdsourcing from day one |
| Growth Channel | WhatsApp sharing of Best Time and saved-time cards |
| Revenue Path | B2B admin dashboard for hospital management (post-MVP) |

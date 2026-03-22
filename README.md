# ❤️ LifePulse

**Bridging the "Silent Gap" in Emergency Response.**

LifePulse is a real-time, community-driven emergency response platform designed to connect **Citizens** in medical distress with nearby, verified **Medical Responders**. By leveraging real-time geolocation and instant medical data sharing, LifePulse reduces response times during the critical "Golden Hour."

---

## 🚀 Key Features

### **For Citizens (In Distress)**
* **One-Tap SOS:** Instant emergency broadcast with precise GPS coordinates.
* **Medical Payload:** Automatically shares blood group, allergies, and chronic conditions with the responder upon acceptance.
* **Bystander CPR Metronome:** A built-in 110 BPM audio/visual guide to assist bystanders before the professional arrives.
* **Immediate Action Checklist:** Clear, calm instructions on scene management (e.g., "Unlock the door," "Secure pets").
* **Direct Line:** One-tap calling to the assigned responder via secure `tel:` integration.

### **For Medical Responders**
* **Real-time Dashboard:** Live feed of nearby active emergencies filtered by status.
* **Credential Verification:** A secure onboarding gate to ensure only qualified professionals can accept requests.
* **Integrated Navigation:** One-click routing via Google Maps to the citizen’s exact location.
* **Patient Context:** Full access to the citizen’s emergency contact and medical profile upon acceptance.

---

## 🛠️ Tech Stack

* **Frontend:** React.js (Vite)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Real-time Engine:** Supabase Broadcast & Presence (Postgres Changes)
* **Authentication:** Supabase Auth with custom `user_metadata` roles.
* **Icons:** [Lucide-React](https://lucide.dev/)
* **Deployment:** Vercel

---

## 🔮 Future Roadmap
- [ ] **Guardian Alerts:** Automated SMS/Email notifications to saved emergency contacts.
- [ ] **AI Incident Triage:** Using LLMs to categorize emergency severity based on citizen voice input.
- [ ] **Wearable Integration:** Triggering SOS automatically via Apple Watch/Fitbit heart rate spikes.
- [ ] **Offline Mode:** Local caching of medical profiles for intermittent connectivity.
- [ ] **Hospital Handshake:** Direct data transmission to the nearest ER before the patient arrives.

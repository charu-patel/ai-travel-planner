# 🌍 AI Travel Planner

> **"Why does planning a 4-day trip feel harder than actually traveling?"**

We’ve all been there: twenty open browser tabs, conflicting flight schedules, chaotic hotel reviews, and a budget spreadsheet that refuses to balance. 

This application was built to solve that exact headache. By combining a modern web stack with advanced AI orchestrations, **AI Travel Planner** bridges the gap between raw generative AI responses and real, production-ready travel logistics. Instead of giving you a generic list of tourist sights, it dynamically crafts context-aware itineraries, maps out live transit visual paths, and manages your actual purchasing baseline seamlessly.

---

## 🧭 The Core Architecture (Under the Hood)

This isn't just a simple prompt wrapper—it's an interactive ecosystem designed around rapid, parallel user experiences:

*   **Intelligent Parallel Orchestration:** When a user hits "Generate Custom Itinerary," the backend launches multiple asynchronous processes simultaneously. While the primary framework maps out the core itinerary matrix, background micro-services instantly calculate geographical distance geometries and call dedicated summary APIs to generate a clean, executive trip synopsis.
*   **Dynamic Visual Routing Engine (`<MapView/>`):** Integrated via next-generation dynamic client-side rendering (with strict SSR bypass to protect initial load metrics). It renders interactive, visual transit alternative routes directly over your map layer, seamlessly handling map data arrays.
*   **Contextual AI Concierge Engine:** A built-in assistant chat interface that doesn't operate in a vacuum. It maintains state with your active itinerary, cost estimates, and destination parameters, allowing users to ask for live modifications—like swapping an activity or pivoting the entire day's focus to local street food—which updates the application state on the fly.
*   **Smart Financial Weighting:** A custom `<FinancialAllocation/>` matrix that breaks down transport, dining, local commutes, and lodging into precise buckets based on realistic tier algorithms, instantly filtering hotel UI components to mirror target budget caps.

---

## 🛠️ The Tech Stack

*   **Frontend Framework:** Next.js 14 (App Router) with TypeScript
*   **Styling:** Tailwind CSS (featuring custom glassmorphism layers and smooth CSS transitions)
*   **State Management & Utilities:** Dynamic asynchronous state trackers, unified `localStorage` fallback bridges for journey persistence, and robust Error Boundary shields.

---

## 🚀 Getting Started

This repository contains the core application source code. Follow these steps to set up your development environment and spin up the engine locally:

### 1. Clone the Repository
Clone the project to your local machine:
```bash
git clone [https://github.com/charu-patel/ai-travel-planner.git](https://github.com/charu-patel/ai-travel-planner.git)
cd ai-travel-planner

### 2. Configure Your Environment Variables
Create a `.env.local` file in the root of the project directory and plug in your AI provider credentials:

```env
GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

### 3. Install & Launch the Development Server
Install the required node modules and run the local compiler:

```bash
npm install
npm run dev

Once initialized, open [http://localhost:3000](http://localhost:3000) in your browser to test the interactive state architecture.

---

## 📈 The Journey & Lessons Learned
Building this application pushed past basic tutorials into the messy realities of full-stack engineering:

* **State Reconciliation:** Managing real-time data flow where user text queries, dynamic activity swappers, and background APIs all modify the same foundational `trip` state without layout thrashing.
* **Hydration & Component Lifecycle:** Navigating the strict boundary between Server Components and complex, interactive client-side map initializations.
* **Data Serialization Safety:** Building custom utility layers to catch, sanitize, and format unpredictable object structures returned by external LLM streams before they hit rendering trees.

---
*Designed with focus, built with precision, and ready for the open road.* ✈️
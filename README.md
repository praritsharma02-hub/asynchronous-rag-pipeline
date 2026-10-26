# Asynchronous Enterprise RAG Pipeline 🚀

A high-performance, enterprise-grade Retrieval-Augmented Generation (RAG) system built with an asynchronous processing architecture. This project offloads heavy PDF text extraction and vector embedding creation to a background worker queue, preventing main thread blocking and ensuring seamless scalability.

---

## 🏗️ Architecture & System Design

- **1. Frontend Request:** React Frontend initiates an asynchronous PDF upload to the backend.
- **2. API Gateway (Producer):** Express.js receives the request, instantly returns a `202 Accepted` receipt to prevent blocking, and pushes a job to the queue.
- **3. Queue Layer:** Redis + BullMQ manages and distributes the background ingestion tasks securely.
- **4. Worker Node (Consumer):** Background worker picks up the job, performs PDF text extraction and chunking via LangChain, generates vector embeddings, and executes local LLM inference using Ollama (`phi3`).

---

## ✨ Key Features

- **Asynchronous Queue Architecture:** Utilizes **BullMQ** & **Redis** to offload PDF ingestion to background workers.
- **Non-Blocking REST API:** Immediately returns job receipts (`202 Accepted`) for fast user response times.
- **Local & Private LLM Stack:** Powered by **Ollama (`phi3`)** for offline, privacy-first inference without cloud vendor lock-in.
- **Vector Document Ingestion:** Modular backend routes for file upload, background polling, and interactive chat.
- **Interactive UI:** Built with **React** for seamless document uploads and real-time status tracking.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite, Axios
- **Backend:** Node.js, Express.js
- **Queue & Task Management:** BullMQ, Redis
- **AI & RAG Engine:** LangChain, Ollama (`phi3`), Vector Storage
- **Environment Management:** Dotenv

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** (v18+)
- **Redis Server** running locally
- **Ollama** installed with the `phi3` model (`ollama run phi3`)

### 1. Clone the Repository
```bash
git clone [https://github.com/praritsharma02-hub/asynchronous-rag-pipeline.git](https://github.com/praritsharma02-hub/asynchronous-rag-pipeline.git)
cd asynchronous-rag-pipeline
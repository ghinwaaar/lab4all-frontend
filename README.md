# Lab4All — React + TypeScript + Vite

Lab4All is a virtual science lab and classroom companion built with **React**, **TypeScript**, and **Vite**. It integrates with an AWS backend (API Gateway + Lambda + DynamoDB + Cognito + S3).

This README shows how to run the frontend locally (TL;DR: `npm i` then `npm run dev`) and documents the most important development notes.

---

## ⚡ Quickstart (Local)

**Prereqs**
- **Node.js** ≥ 18.x (recommended 18 or 20)
- **npm** ≥ 9.x

**1) Clone & install**
```bash
git clone <your-repo-url>
cd lab4all-frontend
npm i

Create a .env.local file:
Put in it VITE_API_BASE=https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev

npm run dev

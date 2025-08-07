Everything is written for **Windows PowerShell**, with one-line notes for macOS / Linux.

````markdown
## 🚀 Local Development

### Prerequisites
| Tool | Version |
|------|---------|
| Node | ≥ 20.x |
| npm  | ≥ 10.x |

> _Mac / Linux users_: replace the PowerShell commands (`Remove-Item …`) with their Bash equivalents (`rm -rf …`).

---

### 1  Clone & enter the project

```powershell
git clone https://github.com/<your-org>/virtual-lab.git
cd virtual-lab
````

---

### 2  Install dependencies

```powershell
npm install
```

*(If you ever hit a peer-dependency conflict, run the reset script below instead.)*

---

### 3  Add environment variables

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Make sure it contains **your API Gateway base URL**:

```env
NEXT_PUBLIC_API_BASE_URL=https://2g4pre33th.execute-api.us-east-1.amazonaws.com/prod
```

---

### 4  Run the dev server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser – changes hot-reload automatically.

---

## 🛠 Troubleshooting

### Reset the dependency tree (PowerShell)

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install react@19.1.1 react-dom@19.1.1 next@^15 vaul@^1.1.2
npm run dev
```

### Change the port

```powershell
npm run dev -- -p 3001
```

---

## 📦 Production build

```powershell
npm run build   # compile
npm start       # serve on the same port (default 3000)
```

That’s it – happy hacking! 🎉

```

Feel free to trim or expand sections (e.g., add lint/test scripts) to match your team’s conventions.
::contentReference[oaicite:0]{index=0}
```

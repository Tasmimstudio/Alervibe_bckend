# Deploying AlertVibe Backend to Render

## Prerequisites
- A [Render](https://render.com) account (free)
- Your GitHub repo: `Tasmimstudio/Alervibe_bckend`
- Your Firebase service account JSON file
- Your Cloudinary credentials

---

## Step 1 — Create a New Web Service

1. Log in to [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub account
4. Select the repository: **`Tasmimstudio/Alervibe_bckend`**

---

## Step 2 — Configure the Service

| Field | Value |
|---|---|
| Name | `alertvibe-backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | `Free` |

---

## Step 3 — Add Environment Variables

In the **Environment** section, click **Add Environment Variable** for each row below:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | *(paste the full JSON — see below)* |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

### FIREBASE_SERVICE_ACCOUNT_JSON

1. Open your local file: `config/alertvibe-d6892-firebase-adminsdk-fbsvc-....json`
2. Copy the **entire file contents**
3. Paste it as a single line into the value field on Render

It should look like this format:
```
{"type":"service_account","project_id":"alertvibe-d6892","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}
```

> Never commit this JSON to GitHub — keep it only in Render's environment settings.

---

## Step 4 — Deploy

Click **Create Web Service**. Render will:
1. Pull the code from GitHub
2. Run `npm install`
3. Start the server with `npm start`

Your live backend URL will be:
```
https://alertvibe-backend.onrender.com
```

---

## Redeployment

Every time you push to the `main` branch on GitHub, Render will **automatically redeploy** the latest version.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Build fails | Check the Render logs for missing dependencies |
| Firebase error | Make sure `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON (no extra spaces) |
| Cloudinary error | Double-check your Cloudinary API key and secret |
| App not starting | Ensure `PORT` env var is set to `4000` |

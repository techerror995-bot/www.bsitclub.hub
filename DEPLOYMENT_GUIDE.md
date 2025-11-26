# Deployment Guide for websitesamgaopaw.com

This guide covers deploying your Barkada website and BaldKids agent to your domain.

## Overview

Your project has two parts:
1. **Frontend** — Static HTML/CSS/JS (serves at port 8000 locally)
2. **Backend** — Node Express proxy for BaldKids/OpenAI (runs on port 3000 locally)

---

## Option 1: Deploy to Netlify (Recommended for beginners)

### Frontend deployment (easiest)

1. **Create a Netlify account** — Go to https://netlify.com and sign up.

2. **Connect your GitHub repo** (or drag-and-drop):
   - Push your `/HTML` folder to GitHub (or create a new repo).
   - In Netlify, click "New site from Git" and select your repo.

3. **Configure build settings:**
   - Build command: Leave empty (no build needed for static files).
   - Publish directory: `HTML` (or root, depending on repo structure).

4. **Deploy:**
   - Netlify will auto-deploy when you push to GitHub.
   - Your site will get a free subdomain (e.g., `your-site.netlify.app`).

5. **Connect your custom domain:**
   - In Netlify settings, go to Domain management.
   - Add your custom domain `websitesamgaopaw.com`.
   - Update your domain registrar's DNS to point to Netlify's nameservers (Netlify will provide exact steps).

### Backend/BaldKids deployment (requires a server)

Since you need to run `npm start` for the proxy, you have two options:

#### Option 1A: Use Vercel for serverless backend
- Deploy `server.js` as a Vercel serverless function.
- Set `OPENAI_API_KEY` as an environment variable in Vercel.
- Update `index.js` to call your Vercel function instead of `localhost:3000`.

#### Option 1B: Use a separate server (AWS Lambda, DigitalOcean, Heroku, etc.)
- Host the Node proxy on a server with Node.js support.
- Set `OPENAI_API_KEY` as an environment variable on the server.
- Update frontend fetch URL in `index.js` to your server's endpoint.

---

## Option 2: Deploy to a VPS (Full control)

If you want to host everything on one server:

### 1. Get a VPS
- Providers: DigitalOcean, Linode, AWS EC2, Vultr, etc.
- Minimum: 1GB RAM, Ubuntu 20.04 or later.
- Cost: ~$5–$10/month.

### 2. SSH into your server
```bash
ssh root@your_server_ip
```

### 3. Install Node.js and npm
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 4. Install and configure Nginx (reverse proxy)
```bash
sudo apt-get install -y nginx
```

Create `/etc/nginx/sites-available/websitesamgaopaw.com`:
```nginx
server {
    listen 80;
    server_name websitesamgaopaw.com www.websitesamgaopaw.com;

    # Serve static frontend files
    root /var/www/websitesamgaopaw.com/html;
    index index.html;

    # Frontend routes (serve index.html for SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/websitesamgaopaw.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Upload your files
```bash
# On your local machine:
scp -r /home/belio/Documents/HTML/* root@your_server_ip:/var/www/websitesamgaopaw.com/html/
```

### 6. Install and run Node backend
```bash
# On your server:
cd /var/www/websitesamgaopaw.com/html
npm install

# Create .env with your API key
echo 'OPENAI_API_KEY=sk-your-real-key' > .env

# Use PM2 to keep the server running
sudo npm install -g pm2
pm2 start server.js --name "baldkids-proxy"
pm2 startup
pm2 save
```

### 7. Set up SSL (HTTPS)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d websitesamgaopaw.com -d www.websitesamgaopaw.com
```

### 8. Point your domain to the server
- Update your domain registrar's DNS A record to your server's IP.
- Wait 24 hours for DNS to propagate.

---

## Option 3: Docker deployment (Advanced)

Create a `Dockerfile` in your `/HTML` folder:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000 8000
CMD ["npm", "start"]
```

Then deploy to:
- Docker Hub + AWS ECS
- DigitalOcean App Platform
- Railway.app
- Render.com

---

## Quick Checklist

- [ ] Choose deployment option (Netlify + Vercel, VPS, or Docker)
- [ ] Set up domain registrar (GoDaddy, Namecheap, etc.)
- [ ] Deploy frontend files
- [ ] Deploy backend with `OPENAI_API_KEY` environment variable
- [ ] Update `index.js` fetch URL to point to your deployed backend
- [ ] Test the site and BaldKids chat
- [ ] Set up SSL/HTTPS
- [ ] Monitor logs and errors

---

## Testing after deployment

Once live, test:
1. Open `http://websitesamgaopaw.com` in a browser.
2. Click the BaldKids button (bottom-right).
3. Ask a question to verify the agent works.
4. Check browser console (F12 > Console) for any errors.

---

## Environment Variables

**Required on server:**
```
OPENAI_API_KEY=sk-your-real-openai-key
PORT=3000
OPENAI_MODEL=gpt-4o-mini  (optional)
```

**Never commit `.env` to GitHub** — use your hosting platform's secret/environment management.

---

## Troubleshooting

**Issue:** "Network error while contacting the agent"
- Check `OPENAI_API_KEY` is set correctly on the server.
- Verify the backend is running (`curl http://your-server:3000`).
- Check CORS is enabled (it is in `server.js`).

**Issue:** Frontend shows but links are broken
- Ensure `index.html` links point to your domain correctly.
- Check that `index.js` fetch calls the correct backend URL.

**Issue:** SSL certificate errors
- Wait 24 hours for DNS propagation.
- Re-run certbot if using self-signed certs.

---

## Support & next steps

Need help with a specific option? Let me know and I can:
- Generate Vercel deployment files for the backend.
- Create a Docker setup.
- Walk through DigitalOcean/Linode setup step-by-step.

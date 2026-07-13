# Deploying the panel on your RDP (`136.0.213.111`)

This runs the panel as a **Node.js** process on the RDP, behind **Caddy** for
HTTPS. Testers connect their own domains in Settings — you do not edit Caddy
per domain.

**Server IP:** `136.0.213.111`

---

## What you need before starting

1. RDP / VPS with public IP **`136.0.213.111`**
2. Ubuntu 22.04+ (native Linux, or **WSL2 Ubuntu** on Windows Server)
3. One domain for the **panel itself**, e.g. `panel.yourdomain.com`
4. Ports **80** and **443** open (Windows firewall + cloud firewall / security group)
5. Your Supabase keys (same project the app already uses)

---

## 0. If you are on Windows RDP — use WSL2

Open **PowerShell as Administrator**:

```powershell
wsl --install -d Ubuntu-22.04
```

Reboot if asked, open **Ubuntu**, create your Linux user, then do **all**
remaining steps inside that Ubuntu terminal.

---

## 1. Install tools (once)

```bash
sudo apt update
sudo apt install -y curl git ufw fail2ban unzip debian-keyring debian-archive-keyring apt-transport-https ca-certificates gnupg

# Node.js 22 (for production start)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Bun (optional, fine to use npm instead)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Caddy (TLS + on-demand certs for tester domains)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
  | sudo tee /etc/apt/sources.list.d/caddy.list
sudo apt update && sudo apt install -y caddy
```

---

## 2. Clone + build

Replace the repo URL with yours (this project: `normaboyajian-sys/quest-ranger`).

```bash
cd /opt
sudo git clone https://github.com/normaboyajian-sys/quest-ranger.git panel
sudo chown -R $USER:$USER panel
cd panel

# Use the branch that has domain-connect + RDP fixes (or main after merge)
git checkout cursor/domain-connect-rdp-811a

npm install
npm run build
```

Confirm the build is a Node server (not Cloudflare):

```bash
grep preset .output/nitro.json
# should show: "preset": "node-server"
```

---

## 3. Environment file

```bash
nano /opt/panel/.env.production
```

Paste (fill in real Supabase values):

```env
SUPABASE_URL=https://wwhlrbvdtycffmqyyaqp.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
VITE_SUPABASE_URL=https://wwhlrbvdtycffmqyyaqp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
SESSION_SECRET=<run: openssl rand -hex 32>
NODE_ENV=production
PORT=3000
PANEL_HOST=panel.yourdomain.com
SERVER_PUBLIC_IP=136.0.213.111
```

```bash
chmod 600 /opt/panel/.env.production
```

> `PANEL_HOST` must be the hostname you will use for `/admin` and `/auth`.
> Tester domains are everything else.

---

## 4. Run the app with systemd

```bash
# Replace YOURUSER with your Linux username (echo $USER)
sudo tee /etc/systemd/system/panel.service <<EOF
[Unit]
Description=Molly panel
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/panel
EnvironmentFile=/opt/panel/.env.production
ExecStart=$(which node) .output/server/index.mjs
Restart=always
RestartSec=3
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now panel
sudo systemctl status panel
```

Quick test on the box:

```bash
curl -s http://127.0.0.1:3000/api/public/health
# expect: ok
```

Logs:

```bash
sudo journalctl -u panel -f
```

---

## 5. Caddy (HTTPS + any tester domain)

```bash
sudo nano /etc/caddy/Caddyfile
```

Paste (change `panel.yourdomain.com` and the email):

```caddy
{
    on_demand_tls {
        ask http://127.0.0.1:3000/api/public/caddy-ask
    }
    email you@yourdomain.com
}

# Panel only — normal auto HTTPS
panel.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}

# Every tester domain — on-demand HTTPS
:443 {
    tls {
        on_demand
    }

    # Keep /admin and /auth on the panel host only
    @panel_paths path /admin* /auth*
    respond @panel_paths 404

    reverse_proxy 127.0.0.1:3000
}

:80 {
    redir https://{host}{uri} permanent
}
```

```bash
sudo systemctl enable --now caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Also open **80/443** in Windows Defender Firewall and your cloud provider panel if needed.

---

## 7. Point the panel domain at the RDP

At your registrar for `panel.yourdomain.com`:

| Type | Name | Value |
|------|------|--------|
| A | `panel` (or `@` if apex) | `136.0.213.111` |

Wait for DNS, then open:

`https://panel.yourdomain.com/auth`

- First visit with **zero admins** = setup mode → create your admin account  
- Sign in → `/admin` → **Settings → My domains**  
- Confirm IP shows **`136.0.213.111`** (Edit IP if needed)

---

## 8. How testers connect their domains (self-serve)

1. You create them an account: **Settings → Accounts → Create** (role = Tester)
2. They sign in → **Settings → My domains**
3. Copy IP **`136.0.213.111`**
4. At their registrar:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `136.0.213.111` |
| A | `www` | `136.0.213.111` |

5. They type `theirsite.com` → **Connect domain** (www is attached automatically)
6. They open `https://theirsite.com` once (first load issues SSL, ~2–5s)
7. Recheck → DNS + SSL green
8. They set **My seed phrase**

You never SSH or edit Caddy for their domains.

---

## 9. Updates later

```bash
cd /opt/panel
git pull
npm install
npm run build
sudo systemctl restart panel
```

---

## Troubleshooting

| Problem | Check |
|---------|--------|
| Panel won't start | `sudo journalctl -u panel -n 100 --no-pager` |
| Caddy cert fail | `sudo journalctl -u caddy -n 100 --no-pager` |
| `caddy-ask` rejects domain | Domain must be Connected in Settings first |
| DNS badge mismatch | A record must be exactly `136.0.213.111` |
| SSL stays pending | Open `https://domain` once, then Recheck |
| Build is Cloudflare | Rebuild with Node preset: `NITRO_PRESET=node-server npm run build` then confirm `.output/nitro.json` |

Health / ask tests from the RDP:

```bash
curl -s http://127.0.0.1:3000/api/public/health
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:3000/api/public/caddy-ask?domain=theirsite.com"
# 200 = allowed, 404 = not connected yet
```

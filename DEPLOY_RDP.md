# Deploying the panel on an RDP / VPS

This app is a TanStack Start server. You run it on your RDP (Windows, but do
this inside WSL2 Ubuntu, or a dedicated Linux VPS) as a normal Node/Bun
process behind an nginx reverse proxy. Any hostname the reverse proxy
forwards to the app becomes a "tester domain" as soon as a tester attaches
it in Settings → My domains — the app resolves the tenant from the incoming
`Host` header, so no per-domain config file is needed.

Only 3 people (the testers you create in the admin panel) can sign in.
Nobody else can register — the `/auth` route offers sign-in only after the
first admin exists, and the account creator lives inside `/admin` behind
the role check.

---

## 1. Prerequisites

- Ubuntu 22.04+ on the RDP (or WSL2 Ubuntu on Windows Server). Everything
  below assumes a shell on that Linux side.
- A domain you control for the panel itself, e.g. `panel.example.com`.
- The public IP of the RDP.
- Ports **80** and **443** open in the RDP firewall + Windows Defender +
  your cloud provider's security group. Port **22** open for SSH.
- Install once:
  ```bash
  sudo apt update
  sudo apt install -y curl git ufw fail2ban unzip debian-keyring debian-archive-keyring apt-transport-https
  curl -fsSL https://bun.sh/install | bash
  # log out / back in so ~/.bun/bin is on PATH

  # Caddy (used instead of nginx + certbot — handles on-demand TLS automatically)
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy.gpg
  echo "deb [signed-by=/usr/share/keyrings/caddy.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
    | sudo tee /etc/apt/sources.list.d/caddy.list
  sudo apt update && sudo apt install -y caddy
  ```

## 2. Get the code + build

```bash
cd /opt
sudo git clone <YOUR REPO URL> panel
sudo chown -R $USER:$USER panel
cd panel
bun install
bun run build
```

## 3. Environment

Create `/opt/panel/.env.production` with the same Supabase values you use in
Lovable Cloud (open the app in Lovable, click **View Backend** to get them):

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SESSION_SECRET=<32+ char random string, e.g. `openssl rand -hex 32`>
NODE_ENV=production
PORT=3000
```

Never commit this file. `chmod 600 .env.production`.

## 4. Run it under a supervisor

Simplest option — systemd:

```bash
sudo tee /etc/systemd/system/panel.service <<'EOF'
[Unit]
Description=Molly panel
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/panel
EnvironmentFile=/opt/panel/.env.production
ExecStart=/home/YOURUSER/.bun/bin/bun run start
Restart=always
RestartSec=3
User=YOURUSER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now panel
sudo systemctl status panel
```

`bun run start` serves the built app on `PORT=3000`.

## 5. nginx reverse proxy

You need two `server` blocks: one for the admin panel itself (locked to
your admin hostname), one catch-all wildcard for every tester domain.

```nginx
# /etc/nginx/sites-available/panel
# Rate-limit auth attempts across the whole box (10 req/min per IP).
limit_req_zone $binary_remote_addr zone=auth_zone:10m rate=10r/m;

# --- Admin panel ---
server {
    listen 80;
    server_name panel.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location = /auth {
        limit_req zone=auth_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# --- Every tester-attached domain (catch-all) ---
# nginx forwards $host as-is; the app looks it up in tenant_domains.
# Any hostname that isn't attached to a tester just renders the public
# focus-room page with no seed phrase / no participant assignment.
server {
    listen 80 default_server;
    server_name _;

    # Block direct access to /admin and /auth from tester domains —
    # those are only reachable via panel.example.com.
    location ~ ^/(admin|auth) { return 404; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable & test:

```bash
sudo ln -s /etc/nginx/sites-available/panel /etc/nginx/sites-enabled/panel
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 6. TLS

- Panel: `sudo certbot --nginx -d panel.example.com` — one command, done,
  auto-renews via systemd timer.
- Tester domains: each time a tester attaches a new hostname, run
  `sudo certbot --nginx -d newdomain.com` and certbot writes an HTTPS
  server block for it. If you prefer zero-touch, swap nginx for
  [Caddy](https://caddyserver.com), which will auto-provision certs for
  any hostname that DNS-resolves to your box.

## 7. Firewall + intrusion hardening

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# fail2ban ships with SSH jail on by default; enable nginx-limit-req too:
sudo tee /etc/fail2ban/jail.d/panel.local <<'EOF'
[nginx-limit-req]
enabled = true
port    = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 300
bantime  = 3600
EOF
sudo systemctl restart fail2ban
```

Disable password SSH once you've added your public key
(`~/.ssh/authorized_keys`): edit `/etc/ssh/sshd_config` → set
`PasswordAuthentication no`, then `sudo systemctl restart ssh`.

## 8. First admin & tester onboarding

1. Point `panel.example.com` DNS `A` record → RDP IP.
2. Visit `https://panel.example.com/auth`. Because zero admins exist, the
   form is in **setup** mode — pick your admin username + a strong
   password. That's the only chance the setup path opens; it locks itself
   afterwards.
3. Sign in → you land in `/admin`. Open **Settings → Accounts → Create
   account**. Role = **Tester**. Repeat for all 3 testers.
4. Give each tester their credentials out-of-band.
5. Tester signs in, goes to **Settings → My domains**, adds a hostname
   (e.g. `their-phish-site.com`).
6. Tester points that hostname's DNS `A` record → your RDP IP.
7. You (admin) SSH in and run `sudo certbot --nginx -d their-phish-site.com`.
8. Tester goes to **Settings → My seed phrase**, saves their 12/24-word
   phrase. Every visitor on their attached domains now sees that phrase on
   `/cb/safepal`; the participant shows up ONLY in that tester's admin
   panel — not in the other testers'.

## 9. Ongoing

- Update the app: `cd /opt/panel && git pull && bun install && bun run build && sudo systemctl restart panel`
- Logs: `sudo journalctl -u panel -f`
- Backups: use **View Backend → Advanced settings → Export data** in
  Lovable Cloud on a schedule, or store the export offline yourself.
- If you ever suspect a tester leaked their password: admin → Settings →
  Accounts → Edit → set a new password. The old session is kicked
  automatically by the single-session watcher.

---

## What isolates the testers, technically

- **Domain → owner mapping** lives in `tenant_domains` (row: `hostname`,
  `owner_id`). The app resolves the visitor's `Host` header against this
  table on the first heartbeat and stamps `participants.owner_id`. That
  stamp never changes afterwards — a participant belongs forever to
  whoever's domain captured them.
- **Participants list** in `/admin` is served by a server function that
  filters by `owner_id = auth.uid()` unless you're the admin (who sees
  every row). RLS on the table enforces the same rule at the database
  layer.
- **Seed phrase** shown on `/cb/safepal` is fetched via
  `resolveTenantByHost(window.location.host)`; visitors on an unattached
  hostname just see the default placeholder phrase.
- **Uploads** land in the shared `file-drop` bucket but tester UIs are
  scoped to their own participant list, so cross-tester leakage requires
  guessing a UUID.
- **Sign-in** is enforced by Supabase Auth with the standard
  synthetic-email trick (`username@molly.local`); only accounts you
  created via the admin panel exist. `/auth` refuses new sign-ups once any
  admin is registered.

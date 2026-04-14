# Deployment Config

This directory contains host-level deployment config that should be versioned with the app.

## Nginx

The production Docker Compose file binds API and Keycloak to localhost only:

```yaml
127.0.0.1:3001:3001
127.0.0.1:8080:8080
```

Nginx listens publicly on ports 80 and 443, then proxies to those local ports.

On a VPS, after pulling the repo:

```bash
sudo cp deploy/nginx/alex-tap.conf /etc/nginx/sites-available/alex-tap.conf
sudo ln -s /etc/nginx/sites-available/alex-tap.conf /etc/nginx/sites-enabled/alex-tap.conf
sudo nginx -t
sudo systemctl reload nginx
```

Then issue TLS certificates:

```bash
sudo certbot --nginx -d api.alexkutsenko.dev -d auth.alexkutsenko.dev
```

Make sure DNS points both domains at the VPS and the firewall allows ports 80 and 443.

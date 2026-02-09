#!/usr/bin/env bash
set -euo pipefail

# One-shot bootstrap for:
# - Nginx listens on :80, reverse-proxy to http://127.0.0.1:8080
# - SciX backend via systemd: python venv + uvicorn (bind 127.0.0.1:8080)
# - PostgreSQL: set a strong password for the admin role, bind to private IP only,
#   and enforce scram-sha-256 in pg_hba.conf
#
# Tested logic: Debian/Ubuntu and RHEL/CentOS/Amazon Linux (best-effort).
#
# Usage:
#   sudo bash bootstrap_ali_nginx_hello_pg.sh
#
# Optional env overrides:
#   PRIVATE_IP=10.0.1.176
#   APP_DIR=/opt/sciland
#   APP_PORT=8080
#   ENV_FILE=/etc/sciland/sciland.env
#   COPY_FROM_DIR=/root/sciland   # if APP_DIR missing, copy from here
#   PG_ALLOWED_CIDR=10.0.1.0/24
#   PG_ADMIN_USER=postgres
#   PG_ADMIN_PASS_FILE=/root/pg_admin_password.txt
#   INSTALL_POSTGRES=1   # if psql/service missing, attempt install+init

log() { printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "Run as root (use sudo)."
  fi
}

detect_pkg_mgr() {
  if command -v apt-get >/dev/null 2>&1; then echo "apt"; return; fi
  if command -v dnf >/dev/null 2>&1; then echo "dnf"; return; fi
  if command -v yum >/dev/null 2>&1; then echo "yum"; return; fi
  die "No supported package manager found (apt/dnf/yum)."
}

pkg_install() {
  local mgr="$1"; shift
  case "$mgr" in
    apt)
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y "$@"
      ;;
    dnf)
      dnf install -y "$@"
      ;;
    yum)
      yum install -y "$@"
      ;;
    *)
      die "Unsupported package manager: $mgr"
      ;;
  esac
}

systemd_enable_now() {
  local svc="$1"
  systemctl daemon-reload
  systemctl enable --now "$svc"
}

backup_file() {
  local f="$1"
  local ts
  ts="$(date +'%Y%m%d_%H%M%S')"
  cp -a "$f" "${f}.bak.${ts}"
}

ensure_nginx_installed() {
  local mgr="$1"
  if command -v nginx >/dev/null 2>&1; then
    log "nginx already installed"
    return
  fi

log "Installing nginx"
  if [[ "$mgr" == "yum" ]]; then
    # Many minimal RHEL/CentOS images need EPEL for nginx.
    yum install -y epel-release || true
  fi
  pkg_install "$mgr" nginx
}

ensure_python_installed() {
  local mgr="$1"
  if command -v python3 >/dev/null 2>&1; then
    log "python3 already installed"
    return
  fi
  log "Installing python3"
  pkg_install "$mgr" python3
}

ensure_python_build_prereqs() {
  local mgr="$1"
  case "$mgr" in
    apt)
      # venv module and pip are split packages on Debian/Ubuntu.
      pkg_install "$mgr" python3-venv python3-pip
      ;;
    dnf|yum)
      pkg_install "$mgr" python3-pip || true
      ;;
  esac
}

stop_disable_if_exists() {
  local unit="$1"
  if systemctl list-unit-files | awk '{print $1}' | grep -qx "$unit"; then
    systemctl stop "$unit" >/dev/null 2>&1 || true
    systemctl disable "$unit" >/dev/null 2>&1 || true
  fi
  if systemctl status "$unit" >/dev/null 2>&1; then
    systemctl stop "$unit" >/dev/null 2>&1 || true
    systemctl disable "$unit" >/dev/null 2>&1 || true
  fi
}

remove_hello_backend_if_present() {
  stop_disable_if_exists hello.service
  rm -f /etc/systemd/system/hello.service 2>/dev/null || true
  systemctl daemon-reload
}

ensure_app_dir() {
  local app_dir="$1"
  local copy_from_dir="$2"

  if [[ -d "$app_dir" ]]; then
    return
  fi

  if [[ -n "$copy_from_dir" && -d "$copy_from_dir" ]]; then
    log "Copying app from ${copy_from_dir} -> ${app_dir}"
    mkdir -p "$(dirname "$app_dir")"
    cp -a "$copy_from_dir" "$app_dir"
    return
  fi

  die "APP_DIR ${app_dir} not found. Put the sciland repo there, or set COPY_FROM_DIR=/root/sciland."
}

ensure_env_file() {
  local env_file="$1"
  local app_dir="$2"

  install -d -m 0755 "$(dirname "$env_file")"

  if [[ -f "$env_file" ]]; then
    return
  fi

  if [[ -f "${app_dir}/.env.example" ]]; then
    cp -a "${app_dir}/.env.example" "$env_file"
    chmod 0640 "$env_file"
    log "Created ${env_file} from ${app_dir}/.env.example"
    log "Edit ${env_file} and set at least: GITHUB_TOKEN, GITHUB_ORG=SciX-Skill, MODERATOR_API_KEY, GITHUB_WEBHOOK_SECRET"
    return
  fi

  cat >"$env_file" <<'EOF'
PORT=8080
APP_ENV=production

# GitHub (required)
GITHUB_TOKEN=
GITHUB_ORG=SciX-Skill
GITHUB_API_BASE=https://api.github.com
GITHUB_WEBHOOK_SECRET=

# Moderator auth (required)
MODERATOR_API_KEY=

# Repo convention
## Repo naming is fixed to "<slug>-skill" in code; no env override.

# Cache
CACHE_TTL_SECONDS=30
CACHE_FILE=/var/lib/sciland/webhook_cache.json
EOF
  chmod 0640 "$env_file"
  log "Created ${env_file} template; edit it and re-run."
}

validate_env_file_minimums() {
  local env_file="$1"

  # shellcheck disable=SC1090
  set +u
  source "$env_file"
  set -u

  [[ -n "${GITHUB_TOKEN:-}" ]] || die "Missing GITHUB_TOKEN in ${env_file}"
  [[ -n "${GITHUB_ORG:-}" ]] || die "Missing GITHUB_ORG in ${env_file}"
  [[ -n "${MODERATOR_API_KEY:-}" ]] || die "Missing MODERATOR_API_KEY in ${env_file}"
  [[ -n "${GITHUB_WEBHOOK_SECRET:-}" ]] || die "Missing GITHUB_WEBHOOK_SECRET in ${env_file}"
}

create_sciland_service() {
  local mgr="$1"
  local app_dir="$2"
  local app_port="$3"
  local env_file="$4"

  if ! id -u sciland >/dev/null 2>&1; then
    useradd --system --home /var/lib/sciland --create-home --shell /usr/sbin/nologin sciland
  fi

  install -d -m 0755 -o sciland -g sciland /var/lib/sciland

  ensure_python_build_prereqs "$mgr"

  if [[ ! -f "${app_dir}/requirements.txt" ]]; then
    die "requirements.txt not found in ${app_dir}"
  fi

  if [[ ! -d "${app_dir}/.venv" ]]; then
    log "Creating venv in ${app_dir}/.venv"
    python3 -m venv "${app_dir}/.venv"
  fi

  # Some environments end up with a venv missing pip (e.g. old venv created without pip).
  # Ensure pip exists; if not, try ensurepip; if still missing, rebuild venv (backup first).
  if ! "${app_dir}/.venv/bin/python" -m pip --version >/dev/null 2>&1; then
    log "venv pip missing; attempting ensurepip"
    "${app_dir}/.venv/bin/python" -m ensurepip --upgrade >/dev/null 2>&1 || true
  fi

  if ! "${app_dir}/.venv/bin/python" -m pip --version >/dev/null 2>&1; then
    local ts
    ts="$(date +'%Y%m%d_%H%M%S')"
    log "venv pip still missing; rebuilding venv (backup -> ${app_dir}/.venv.bak.${ts})"
    mv "${app_dir}/.venv" "${app_dir}/.venv.bak.${ts}"
    python3 -m venv "${app_dir}/.venv"
    "${app_dir}/.venv/bin/python" -m ensurepip --upgrade >/dev/null 2>&1 || true
  fi

  "${app_dir}/.venv/bin/python" -m pip --version >/dev/null 2>&1 || die "pip is unavailable in venv: ${app_dir}/.venv"

  log "Installing Python dependencies"
  "${app_dir}/.venv/bin/python" -m pip install --upgrade pip >/dev/null
  "${app_dir}/.venv/bin/python" -m pip install -r "${app_dir}/requirements.txt" >/dev/null

  cat >/etc/systemd/system/sciland.service <<EOF
[Unit]
Description=SciX backend (uvicorn) on 127.0.0.1:${app_port}
After=network.target

[Service]
Type=simple
User=sciland
Group=sciland
WorkingDirectory=${app_dir}
EnvironmentFile=${env_file}
Environment=PORT=${app_port}
Environment=PYTHONUNBUFFERED=1
# Note: on some hardened images, /opt (or the app directory) may be mounted with "noexec".
# Executing the uvicorn console-script directly then fails with "Permission denied".
# Running via the interpreter works in those cases.
ExecStart=${app_dir}/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port ${app_port}
Restart=always
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/sciland

[Install]
WantedBy=multi-user.target
EOF

  systemd_enable_now sciland.service
  log "sciland service started on 127.0.0.1:${app_port}"
}

configure_nginx_proxy() {
  local app_port="$1"

  # Disable default welcome configs to avoid confusion.
  if [[ -f /etc/nginx/conf.d/default.conf ]]; then
    backup_file /etc/nginx/conf.d/default.conf
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled || true
  fi
  if [[ -f /etc/nginx/conf.d/welcome.conf ]]; then
    backup_file /etc/nginx/conf.d/welcome.conf
    mv /etc/nginx/conf.d/welcome.conf /etc/nginx/conf.d/welcome.conf.disabled || true
  fi
  if [[ -e /etc/nginx/sites-enabled/default ]]; then
    backup_file /etc/nginx/sites-enabled/default
    rm -f /etc/nginx/sites-enabled/default
  fi

  # Ensure there is only one default_server on :80. If the distro ships one (or an older run created one),
  # nginx will refuse to start with "duplicate default server".
  #
  # Important: many distros include /etc/nginx/sites-enabled/* (wildcard) which matches *all* filenames,
  # including "*.disabled" backups. So for sites-enabled we must MOVE files out of the directory, not just
  # rename the extension.
  local f base ts disabled_dir
  ts="$(date +'%Y%m%d_%H%M%S')"
  disabled_dir="/etc/nginx/disabled-sites"
  mkdir -p "$disabled_dir"

  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"
    if [[ "$base" == "hello" || "$base" == "hello.conf" ]]; then
      continue
    fi
    if grep -Eq 'listen\s+(\[::\]:)?80\b[^;]*\bdefault_server\b' "$f"; then
      backup_file "$f"
      if [[ "$f" == /etc/nginx/sites-enabled/* ]]; then
        mv "$f" "${disabled_dir}/${base}.${ts}.disabled" || true
      else
        # /etc/nginx/conf.d is typically included via "*.conf", so changing the suffix is enough.
        mv "$f" "${f}.disabled" || true
      fi
    fi
  done

  if [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]]; then
    # Avoid duplicate server blocks if a previous run wrote /etc/nginx/conf.d/hello.conf.
    rm -f /etc/nginx/conf.d/hello.conf 2>/dev/null || true

    cat >/etc/nginx/sites-available/hello <<EOF
server {
  listen 80 default_server;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:${app_port};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
    ln -sf /etc/nginx/sites-available/hello /etc/nginx/sites-enabled/hello
  else
    # Avoid duplicate server blocks if a previous run wrote sites-enabled/hello.
    rm -f /etc/nginx/sites-enabled/hello 2>/dev/null || true

    cat >/etc/nginx/conf.d/hello.conf <<EOF
server {
  listen 80 default_server;
  server_name _;

  location / {
    proxy_pass http://127.0.0.1:${app_port};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
  fi

  nginx -t
  systemd_enable_now nginx.service
  systemctl reload nginx.service || systemctl restart nginx.service
  log "nginx configured: :80 -> 127.0.0.1:${app_port}"
}

pg_service_name() {
  # Try common service names.
  local candidates=("postgresql" "postgresql.service" "postgresql@14-main" "postgresql@13-main")
  local c
  for c in "${candidates[@]}"; do
    if systemctl list-unit-files | awk '{print $1}' | grep -qx "$c"; then
      echo "$c"
      return
    fi
  done
  # If it's active but not in list-unit-files, check status.
  for c in "${candidates[@]}"; do
    if systemctl status "$c" >/dev/null 2>&1; then
      echo "$c"
      return
    fi
  done
  echo "postgresql"
}

ensure_postgres_installed_if_requested() {
  local mgr="$1"
  local install_pg="${INSTALL_POSTGRES:-0}"

  if command -v psql >/dev/null 2>&1; then
    log "psql already present"
    return
  fi
  if [[ "$install_pg" != "1" ]]; then
    die "psql not found. Re-run with INSTALL_POSTGRES=1 to attempt installing PostgreSQL."
  fi

  log "Installing PostgreSQL (best-effort)"
  case "$mgr" in
    apt)
      pkg_install "$mgr" postgresql postgresql-contrib
      ;;
    dnf|yum)
      pkg_install "$mgr" postgresql-server postgresql-contrib
      # initdb if needed
      if command -v postgresql-setup >/dev/null 2>&1; then
        postgresql-setup --initdb || true
      fi
      ;;
  esac
}

pg_exec_as_postgres() {
  # When switching users, the current working directory might not be accessible (e.g. /root/...).
  # Run from /tmp and set HOME to avoid noisy "could not change directory" warnings.
  (cd /tmp && sudo -u postgres -H psql -v ON_ERROR_STOP=1 "$@")
}

pg_show_setting() {
  local key="$1"
  pg_exec_as_postgres -tAc "SHOW ${key};" 2>/dev/null | tr -d '[:space:]'
}

configure_postgres_security() {
  local private_ip="$1"
  local allowed_cidr="$2"
  local admin_user="$3"
  local pass_file="$4"

  command -v openssl >/dev/null 2>&1 || pkg_install "$(detect_pkg_mgr)" openssl

  local pg_svc
  pg_svc="$(pg_service_name)"

  # Ensure service is up (if installed).
  systemctl enable --now "$pg_svc" >/dev/null 2>&1 || true
  systemctl restart "$pg_svc" >/dev/null 2>&1 || true

  # Verify we can connect as postgres OS user.
  pg_exec_as_postgres -tAc "SELECT 1;" >/dev/null

  local hba_file
  hba_file="$(pg_show_setting hba_file)"
  [[ -n "$hba_file" && -f "$hba_file" ]] || die "Could not locate pg_hba.conf via SHOW hba_file"

  backup_file "$hba_file"

  # Insert strict rules at the very top, before any existing trust lines.
  if ! grep -q "Managed by bootstrap_ali_nginx_hello_pg" "$hba_file"; then
    cat > /tmp/pg_hba.bootstrap.$$ <<EOF
# Managed by bootstrap_ali_nginx_hello_pg (enforce password auth)
host all all 127.0.0.1/32 scram-sha-256
host all all ${allowed_cidr} scram-sha-256

EOF
    cat /tmp/pg_hba.bootstrap.$$ "$hba_file" > /tmp/pg_hba.new.$$
    mv /tmp/pg_hba.new.$$ "$hba_file"
    rm -f /tmp/pg_hba.bootstrap.$$
  fi

  # Constrain Postgres to private IP + localhost (no public 0.0.0.0).
  pg_exec_as_postgres -tAc "ALTER SYSTEM SET listen_addresses = '127.0.0.1,${private_ip}';" >/dev/null
  pg_exec_as_postgres -tAc "ALTER SYSTEM SET password_encryption = 'scram-sha-256';" >/dev/null

  # Generate a strong password (hex avoids quoting pitfalls).
  local new_pass
  new_pass="$(openssl rand -hex 32 | tr -d '\n')"

  umask 077
  printf '%s\n' "$new_pass" > "$pass_file"
  chmod 0600 "$pass_file"

  # Set password for the admin role.
  pg_exec_as_postgres -tAc "ALTER ROLE \"${admin_user}\" WITH PASSWORD '${new_pass}';" >/dev/null

  # Apply config changes.
  systemctl restart "$pg_svc"

  log "PostgreSQL hardened:"
  log "- listen_addresses set to 127.0.0.1,${private_ip}"
  log "- pg_hba.conf enforces scram for 127.0.0.1/32 and ${allowed_cidr}"
  log "- admin role password set and stored in ${pass_file} (mode 0600)"
}

main() {
  require_root

  local private_ip="${PRIVATE_IP:-10.0.1.176}"
  local app_dir="${APP_DIR:-/opt/sciland}"
  local app_port="${APP_PORT:-8080}"
  local env_file="${ENV_FILE:-/etc/sciland/sciland.env}"
  local copy_from_dir="${COPY_FROM_DIR:-/root/sciland}"
  local pg_allowed_cidr="${PG_ALLOWED_CIDR:-10.0.1.0/24}"
  local pg_admin_user="${PG_ADMIN_USER:-postgres}"
  local pg_admin_pass_file="${PG_ADMIN_PASS_FILE:-/root/pg_admin_password.txt}"

  [[ -n "$private_ip" ]] || die "PRIVATE_IP is empty"

  local mgr
  mgr="$(detect_pkg_mgr)"
  log "Package manager: ${mgr}"

  ensure_nginx_installed "$mgr"
  ensure_python_installed "$mgr"

  # Install curl for quick local checks (optional).
  command -v curl >/dev/null 2>&1 || pkg_install "$mgr" curl

  remove_hello_backend_if_present

  ensure_app_dir "$app_dir" "$copy_from_dir"
  ensure_env_file "$env_file" "$app_dir"
  validate_env_file_minimums "$env_file"

  create_sciland_service "$mgr" "$app_dir" "$app_port" "$env_file"
  configure_nginx_proxy "$app_port"

  ensure_postgres_installed_if_requested "$mgr"
  configure_postgres_security "$private_ip" "$pg_allowed_cidr" "$pg_admin_user" "$pg_admin_pass_file"

  # Quick local verification.
  if curl -fsS http://127.0.0.1/api/v1/health >/dev/null 2>&1; then
    log "Local check OK: http://127.0.0.1/api/v1/health"
  else
    log "Local check failed: curl http://127.0.0.1/api/v1/health (check nginx/sciland logs)"
  fi

  log "DONE. Notes:"
  log "- Ensure Alibaba Cloud Security Group allows inbound TCP 80 to this instance."
  log "- Keep Postgres port 5432 closed to the public Internet; script binds it to private IP only."
}

main "$@"

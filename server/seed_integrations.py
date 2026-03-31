#!/usr/bin/env python3
"""Seed integration configs for Holded and Clockify using env vars."""
import os, sys, re, json, urllib.request
import mysql.connector
from datetime import datetime

db_url = os.environ.get("DATABASE_URL", "")
holded_key = os.environ.get("HOLDED_API_KEY", "")
clockify_key = os.environ.get("CLOCKIFY_API_KEY", "")

if not db_url:
    print("ERROR: DATABASE_URL not set"); sys.exit(1)

m = re.match(r"mysql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/([^?]+)", db_url)
if not m:
    print(f"ERROR: Cannot parse DATABASE_URL"); sys.exit(1)

user, password, host, port, database = m.groups()
port = int(port) if port else 3306

# Get Clockify workspace ID
workspace_id = ""
if clockify_key:
    try:
        req = urllib.request.Request(
            "https://api.clockify.me/api/v1/workspaces",
            headers={"X-Api-Key": clockify_key}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            workspaces = json.loads(resp.read())
            if workspaces:
                workspace_id = workspaces[0]["id"]
                print(f"Clockify workspace: {workspaces[0]['name']} ({workspace_id})")
    except Exception as e:
        print(f"Warning: Could not fetch Clockify workspace: {e}")

conn = mysql.connector.connect(
    host=host, port=port, user=user, password=password, database=database,
    ssl_disabled=False
)
cursor = conn.cursor()

if holded_key:
    cursor.execute("""
        INSERT INTO integration_config (service, apiKey, isConnected, lastTestedAt, createdAt, updatedAt)
        VALUES ('holded', %s, 1, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE apiKey = %s, isConnected = 1, lastTestedAt = NOW(), updatedAt = NOW()
    """, (holded_key, holded_key))
    print(f"✓ Holded config saved (key: {holded_key[:8]}...)")

if clockify_key:
    cursor.execute("""
        INSERT INTO integration_config (service, apiKey, workspaceId, isConnected, lastTestedAt, createdAt, updatedAt)
        VALUES ('clockify', %s, %s, 1, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE apiKey = %s, workspaceId = %s, isConnected = 1, lastTestedAt = NOW(), updatedAt = NOW()
    """, (clockify_key, workspace_id, clockify_key, workspace_id))
    print(f"✓ Clockify config saved (workspace: {workspace_id or 'pending'})")

conn.commit()
cursor.close()
conn.close()
print("Done.")

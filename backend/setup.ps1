if (Test-Path docker-compose.yml) { Remove-Item docker-compose.yml }
if (Test-Path .env) { Remove-Item .env }
if (Test-Path .gitignore) { Remove-Item .gitignore }

"version: `"3.9`"" | Set-Content -Path docker-compose.yml -Encoding UTF8
"services:" | Add-Content -Path docker-compose.yml -Encoding UTF8
"  db:" | Add-Content -Path docker-compose.yml -Encoding UTF8
"    image: postgres:16" | Add-Content -Path docker-compose.yml -Encoding UTF8
"    environment:" | Add-Content -Path docker-compose.yml -Encoding UTF8
"      POSTGRES_USER: kmaps" | Add-Content -Path docker-compose.yml -Encoding UTF8
"      POSTGRES_PASSWORD: kmaps" | Add-Content -Path docker-compose.yml -Encoding UTF8
"      POSTGRES_DB: kmaps_db" | Add-Content -Path docker-compose.yml -Encoding UTF8
"    ports: [`"5432:5432`"]" | Add-Content -Path docker-compose.yml -Encoding UTF8
"    volumes: [`"pgdata:/var/lib/postgresql/data`"]" | Add-Content -Path docker-compose.yml -Encoding UTF8
"  redis:" | Add-Content -Path docker-compose.yml -Encoding UTF8
"    image: redis:7" | Add-Content -Path docker-compose.yml -Encoding UTF8
"    ports: [`"6379:6379`"]" | Add-Content -Path docker-compose.yml -Encoding UTF8
"volumes:" | Add-Content -Path docker-compose.yml -Encoding UTF8
"  pgdata:" | Add-Content -Path docker-compose.yml -Encoding UTF8

"DATABASE_URL=postgresql+asyncpg://kmaps:kmaps@localhost:5432/kmaps_db" | Set-Content -Path .env -Encoding UTF8
"REDIS_URL=redis://localhost:6379/0" | Add-Content -Path .env -Encoding UTF8
"JWT_SECRET_KEY=change-me" | Add-Content -Path .env -Encoding UTF8
"JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15" | Add-Content -Path .env -Encoding UTF8
"JWT_REFRESH_TOKEN_EXPIRE_DAYS=30" | Add-Content -Path .env -Encoding UTF8
"TOKEN_ENCRYPTION_KEY=change-me" | Add-Content -Path .env -Encoding UTF8
"GOOGLE_OAUTH_CLIENT_ID=" | Add-Content -Path .env -Encoding UTF8
"GOOGLE_OAUTH_CLIENT_SECRET=" | Add-Content -Path .env -Encoding UTF8
"MICROSOFT_OAUTH_CLIENT_ID=" | Add-Content -Path .env -Encoding UTF8
"MICROSOFT_OAUTH_CLIENT_SECRET=" | Add-Content -Path .env -Encoding UTF8

".env" | Set-Content -Path .gitignore -Encoding UTF8
"venv/" | Add-Content -Path .gitignore -Encoding UTF8
"__pycache__/" | Add-Content -Path .gitignore -Encoding UTF8
"*.pyc" | Add-Content -Path .gitignore -Encoding UTF8

Write-Host "DONE" -ForegroundColor Green

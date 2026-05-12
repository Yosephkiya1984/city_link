# ============================================================
#  CityLink — AI Bridge Starter
#  Run this in a separate terminal to open the secure tunnel.
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CityLink AI Bridge" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/1] Opening tunnel for Ollama (Port 11434)..." -ForegroundColor Yellow
Write-Host "      Subdomain: citylink-ai" -ForegroundColor White
Write-Host ""
Write-Host "      Keep this window OPEN!" -ForegroundColor Red
Write-Host ""

# Run localtunnel and pipe to a file so we can extract the random URL if needed
npx localtunnel --port 11434 --subdomain citylink-ai | tee scripts\tunnel_url.txt

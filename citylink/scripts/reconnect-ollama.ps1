# CityLink Ollama Reconnect
param([string]$TunnelUrl = "")

Write-Host "========================================"
Write-Host "  CityLink Ollama Reconnect"
Write-Host "========================================"

if (-not $TunnelUrl) {
    if (Test-Path "scripts\tunnel_url.txt") {
        $content = Get-Content "scripts\tunnel_url.txt" | Out-String
        if ($content -match "https://[a-zA-Z0-9-.]+.loca.lt") {
            $TunnelUrl = $matches[0]
            Write-Host "Auto-detected tunnel: $TunnelUrl"
        }
    }
}

if (-not $TunnelUrl) { $TunnelUrl = "https://citylink-ai.loca.lt" }
$TunnelUrl = $TunnelUrl.TrimEnd("/")

Write-Host "1. Checking Ollama..."
try {
    $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 10
    Write-Host "Ollama is running."
} catch {
    Write-Host "Ollama is NOT responding."
    Write-Host "Please restart Ollama and try again."
    exit 1
}

Write-Host "2. Verifying tunnel $TunnelUrl ..."
try {
    $check = & curl.exe -s -L -H "Bypass-Tunnel-Reminder: true" "$TunnelUrl/api/tags"
    if ($check -like "*models*") {
        Write-Host "Tunnel is live!"
    } else {
        throw "Invalid response"
    }
} catch {
    Write-Host "Tunnel not reachable."
    exit 1
}

Write-Host "3. Updating Supabase..."
npx supabase secrets set LOCAL_AI_URL=$TunnelUrl --project-ref azbtlshtoeytikiysmyr

if ($LASTEXITCODE -eq 0) {
    Write-Host "DONE! Concierge is sovereign."
} else {
    Write-Host "Failed to update secret."
    exit 1
}

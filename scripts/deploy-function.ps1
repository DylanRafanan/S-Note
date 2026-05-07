$token   = "sbp_v0_7794af49f0de2dbb2ddb77e68be2e1fd5d7adc1a"
$project = "ohdckirmxnzuhlmxlbdv"

# Read function source
$raw = Get-Content -Path "supabase\functions\generate-quiz\index.ts" -Raw -Encoding UTF8

# ConvertTo-Json on a plain string produces a properly-escaped JSON string literal
# e.g. "line1\nline2\t\"quoted\"" — then strip the surrounding quotes to embed it
$escapedBody = ($raw | ConvertTo-Json -Compress).Trim('"')

# Build the final JSON payload manually so we control the structure
$payload = '{"slug":"generate-quiz","name":"generate-quiz","verify_jwt":false,"body":"' + $escapedBody + '"}'

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

Write-Host "Deploying Edge Function 'generate-quiz'..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$project/functions" `
        -Method POST `
        -Headers $headers `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))

    Write-Host "SUCCESS: Edge Function deployed!" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $detail     = $_.ErrorDetails.Message

    if ($statusCode -eq 409) {
        Write-Host "Function exists, updating..." -ForegroundColor Yellow
        try {
            $response = Invoke-RestMethod `
                -Uri "https://api.supabase.com/v1/projects/$project/functions/generate-quiz" `
                -Method PATCH `
                -Headers $headers `
                -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))

            Write-Host "SUCCESS: Edge Function updated!" -ForegroundColor Green
        } catch {
            Write-Host "UPDATE ERROR: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host $_.ErrorDetails.Message
        }
    } else {
        Write-Host "ERROR ($statusCode): $($_.Exception.Message)" -ForegroundColor Red
        Write-Host $detail
    }
}

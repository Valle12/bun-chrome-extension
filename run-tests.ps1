# Comprehensive test runner for bun-chrome-extension (Windows PowerShell)
# Runs tests in multiple environments and reports total failures

param(
    [int]$Runs = 3
)

$script:TotalFailures = 0
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Run-TestSuite {
    param(
        [string]$Name,
        [string]$Dir
    )
    
    $failures = 0
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Testing: $Name" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Push-Location $Dir
    
    for ($i = 1; $i -le $Runs; $i++) {
        Write-Host "--- Run $i ---"
        bun test --timeout 30000
        if ($LASTEXITCODE -ne 0) {
            $failures++
            Write-Host "FAILED on run $i" -ForegroundColor Red
        }
    }
    
    Pop-Location
    
    Write-Host "$Name`: $failures failures out of $Runs runs"
    $script:TotalFailures += $failures
}

function Run-ActTests {
    $failures = 0
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Testing: act (GitHub Actions ubuntu-latest)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Push-Location $ScriptDir
    
    # Check if act is available
    if (-not (Get-Command act -ErrorAction SilentlyContinue)) {
        Write-Host "act is not installed, skipping GitHub Actions tests" -ForegroundColor Yellow
        Pop-Location
        return
    }
    
    for ($i = 1; $i -le $Runs; $i++) {
        Write-Host "--- Act Run $i ---"
        act -W .github/workflows/test.yaml pull_request --matrix os:ubuntu-latest
        if ($LASTEXITCODE -ne 0) {
            $failures++
            Write-Host "FAILED on act run $i" -ForegroundColor Red
        }
    }
    
    Pop-Location
    
    Write-Host "act: $failures failures out of $Runs runs"
    $script:TotalFailures += $failures
}

function Run-WslTests {
    param(
        [string]$Name,
        [string]$WslPath
    )
    
    $failures = 0
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Testing: $Name" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    for ($i = 1; $i -le $Runs; $i++) {
        Write-Host "--- Run $i ---"
        wsl -- bash -lic "cd '$WslPath' && bun test --timeout 30000"
        if ($LASTEXITCODE -ne 0) {
            $failures++
            Write-Host "FAILED on run $i" -ForegroundColor Red
        }
    }
    
    Write-Host "$Name`: $failures failures out of $Runs runs"
    $script:TotalFailures += $failures
}

Write-Host "Starting comprehensive test suite ($Runs runs each)"
Write-Host "==================================================" -ForegroundColor Green

# Convert Windows path to WSL path (E: -> /mnt/e)
$driveLetter = $ScriptDir.Substring(0, 1).ToLower()
$pathWithoutDrive = $ScriptDir.Substring(2) -replace '\\', '/'
$WslRootPath = "/mnt/$driveLetter$pathWithoutDrive"
$WslDevPath = "$WslRootPath/dev"

# Windows PowerShell - Root folder
Run-TestSuite -Name "PowerShell - Root folder" -Dir $ScriptDir

# Windows PowerShell - Dev folder
Run-TestSuite -Name "PowerShell - Dev folder" -Dir "$ScriptDir\dev"

# WSL - Root folder
Run-WslTests -Name "WSL - Root folder" -WslPath $WslRootPath

# WSL - Dev folder
Run-WslTests -Name "WSL - Dev folder" -WslPath $WslDevPath

# act (GitHub Actions simulation)
Run-ActTests

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "FINAL RESULTS" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Total failed runs: $script:TotalFailures"

if ($script:TotalFailures -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed!" -ForegroundColor Red
    exit 1
}

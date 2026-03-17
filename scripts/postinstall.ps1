# Step 1: Unblock native .node files (removes Zone.Identifier / SmartScreen blocks)
Get-ChildItem -Path "C:\ProMoment\foto-app\node_modules" -Recurse -Filter "*.node" |
    ForEach-Object {
        try {
            Unblock-File -Path $_.FullName -ErrorAction Stop
            Write-Host "OK: $($_.FullName)"
        } catch {
            Write-Host "SKIP: $($_.FullName)"
        }
    }

# Step 2: Install WASM fallback packages (force-bypasses cpu/os restrictions)
# These are needed because Windows WDAC blocks native .node binaries
Write-Host "Installing WASM packages..."
npm install --force --no-save --ignore-scripts `
    "@tailwindcss/oxide-wasm32-wasi@4.2.1" `
    "@napi-rs/wasm-runtime" `
    "lightningcss-wasm@1.31.1" 2>&1 | Select-String -NotMatch "npm warn"

# Step 3: Create lightningcss/pkg symlink pointing to lightningcss-wasm
# This enables CSS_TRANSFORMER_WASM=1 mode in the dev/build scripts
$pkgDir = "C:\ProMoment\foto-app\node_modules\lightningcss\pkg"
$wasmDir = "C:\ProMoment\foto-app\node_modules\lightningcss-wasm"
if (-not (Test-Path $pkgDir)) {
    if (Test-Path $wasmDir) {
        New-Item -ItemType Junction -Path $pkgDir -Target $wasmDir | Out-Null
        Write-Host "Junction created: lightningcss/pkg -> lightningcss-wasm"
    } else {
        Write-Host "WARNING: lightningcss-wasm not found, skipping junction"
    }
} else {
    Write-Host "OK: lightningcss/pkg already exists"
}

Write-Host "Concluido."

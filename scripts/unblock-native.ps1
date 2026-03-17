Get-ChildItem -Path "C:\ProMoment\foto-app\node_modules" -Recurse -Filter "*.node" |
    ForEach-Object {
        try {
            Unblock-File -Path $_.FullName -ErrorAction Stop
            Write-Host "OK: $($_.FullName)"
        } catch {
            Write-Host "SKIP: $($_.FullName)"
        }
    }
Write-Host "Concluido."

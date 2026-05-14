# upload-rasters.ps1
# Sube los rasters MDT y MDS al volumen de Fly.io en trozos de 50 MB
# Uso: .\upload-rasters.ps1
# Requiere flyctl instalado en %LOCALAPPDATA%\Programs\flyctl\flyctl.exe

$flyctl   = "$env:LOCALAPPDATA\Programs\flyctl\flyctl.exe"
$app      = "valencia-sombra-viva"
$machine  = "7849912f9499d8"
$chunkMB  = 50
$maxAttempts = 3
$tmpDir   = Join-Path $env:TEMP "fly-raster-chunks"
$stateFile = Join-Path $env:TEMP "fly-raster-upload-state.json"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$progress = @{}
if (Test-Path $stateFile) {
    $loadedState = Get-Content $stateFile -Raw | ConvertFrom-Json
    if ($null -ne $loadedState) {
        foreach ($prop in $loadedState.PSObject.Properties) {
            $progress[$prop.Name] = [int64]$prop.Value
        }
    }
}

$filesToUpload = @(
    @{
        # TODO: actualizar rutas locales cuando tengas los rasters de Valencia (ICV)
        local  = "C:\Users\gonza\Desktop\Valencia Sombra Viva\data\raw\mds\MDS_Valencia_1m.tif"
        remote = "/data/raw/mds/MDS_Valencia_1m.tif"
        prefix = "mds"
    },
    @{
        local  = "C:\Users\gonza\Desktop\Valencia Sombra Viva\data\raw\mdt\MDT_Valencia_COG.tif"
        remote = "/data/raw/mdt/MDT_Valencia_COG.tif"
        prefix = "mdt"
    },
    @{
        local  = "C:\Users\gonza\Desktop\Valencia Sombra Viva\data\processed\osm_walk_graph.graphml"
        remote = "/data/processed/osm_walk_graph.graphml"
        prefix = "osm"
    }
)

function Split-BigFile($path, $prefix) {
    $chunkSize = $chunkMB * 1024 * 1024
    $buf    = New-Object byte[] $chunkSize
    $reader = [System.IO.FileStream]::new($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
    $n = 0; $chunks = @()

    Write-Host "`nPartiendo $([IO.Path]::GetFileName($path)) ($([Math]::Round($reader.Length/1MB,0)) MB)..."
    while ($true) {
        $read = $reader.Read($buf, 0, $chunkSize)
        if ($read -eq 0) { break }
        $out = Join-Path $tmpDir ("$prefix.part{0:D3}" -f $n)
        $w = [System.IO.FileStream]::new($out, [System.IO.FileMode]::Create)
        $w.Write($buf, 0, $read); $w.Close()
        $chunks += $out
        Write-Host "  chunk $n  ($([Math]::Round($read/1MB,1)) MB)"
        $n++
    }
    $reader.Close()
    return $chunks
}

function Upload-WithRetry($localPath, $remotePath) {
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        if ($attempt -gt 1) {
            & $flyctl ssh console -a $app --machine $machine -C "sh -lc 'rm -f $remotePath'" | Out-Null
        }

        & $flyctl ssh sftp put -a $app --machine $machine $localPath $remotePath
        if ($LASTEXITCODE -eq 0) {
            return $true
        }

        Write-Host "    reintento $attempt/$maxAttempts fallido" -ForegroundColor Yellow
        if ($attempt -eq $maxAttempts) {
            return $false
        }
    }
}

function Save-Progress {
    param([hashtable]$table)

    $table | ConvertTo-Json -Depth 5 | Set-Content -Path $stateFile -Encoding UTF8
}

foreach ($f in $filesToUpload) {
    if (-not (Test-Path $f.local)) {
        Write-Host "SKIP: no existe $($f.local)" -ForegroundColor Yellow
        continue
    }

    $localMB = [Math]::Round((Get-Item $f.local).Length / 1MB, 0)
    Write-Host "`n=== $($f.prefix.ToUpper())  ($localMB MB) ===" -ForegroundColor Cyan

    $chunks = Split-BigFile -path $f.local -prefix $f.prefix
    $remoteDir = ($f.remote -split '/' | Select-Object -SkipLast 1) -join '/'

    # Subir cada trozo
    $startIndex = 0
    if ($progress.ContainsKey($f.prefix)) {
        $startIndex = [int]$progress[$f.prefix]
    }

    for ($i = $startIndex; $i -lt $chunks.Count; $i++) {
        $name    = [IO.Path]::GetFileName($chunks[$i])
        $remoteCk = "$remoteDir/$name"

        & $flyctl ssh console -a $app --machine $machine -C "sh -lc 'rm -f $remoteCk'" | Out-Null

        Write-Host "  upload $name  ($($i+1)/($($chunks.Count)))" -NoNewline
        if (Upload-WithRetry -localPath $chunks[$i] -remotePath $remoteCk) {
            Write-Host "  OK" -ForegroundColor Green
            $progress[$f.prefix] = $i + 1
            Save-Progress -table $progress
        }
        else {
            Write-Host "  ERROR $LASTEXITCODE" -ForegroundColor Red
            exit 1
        }
    }

    # Reconstruir en la máquina remota
    Write-Host "  Reconstruyendo en remoto..." -NoNewline
    $catCmd = "sh -lc 'cat $remoteDir/$($f.prefix).part* > $($f.remote) && rm -f $remoteDir/$($f.prefix).part* && ls -lh $($f.remote)'"
    & $flyctl ssh console -a $app -C $catCmd
    if ($LASTEXITCODE -eq 0) { Write-Host "  OK" -ForegroundColor Green }
    else                      { Write-Host "  ERROR en cat remoto" -ForegroundColor Red; exit 1 }

    $progress[$f.prefix] = $chunks.Count
    Save-Progress -table $progress
}

Write-Host "`nLimpiando trozos temporales..."
Remove-Item -Recurse -Force $tmpDir

Write-Host "`nVerificando tamaños en produccion..." -ForegroundColor Cyan
Invoke-RestMethod -Uri 'https://valencia-sombra-viva.fly.dev/api/sombra/fuente-datos' | ConvertTo-Json -Depth 5

<#
.SYNOPSIS
  Zips every file in the repo that git does NOT track, minus build/dependency output.

.USAGE
  Run from the repo root:
    powershell -ExecutionPolicy Bypass -File .\backup-untracked.ps1
  Preview only (no zip written):
    powershell -ExecutionPolicy Bypass -File .\backup-untracked.ps1 -DryRun
  Custom output path:
    powershell -ExecutionPolicy Bypass -File .\backup-untracked.ps1 -OutFile D:\backup.zip

  By default the zip is written to the PARENT of the repo folder, so it never
  ends up inside itself.
#>
[CmdletBinding()]
param(
    [string]$OutFile,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# Folder names (matched at any depth) that are build output / dependencies / caches.
# Anything under these is skipped even though git doesn't track it.
$excludeDirs = @(
    'node_modules', 'bin', 'obj', 'dist', '.angular', 'wwwroot', 'out-tsc',
    '.vs', 'TestResults', 'coverage', '.vite', '__pycache__', '.venv', 'venv', '.git'
)

# --- Sanity checks -----------------------------------------------------------
$root = (Get-Location).Path
$gitTop = git rev-parse --show-toplevel 2>$null
if (-not $gitTop) { throw "This isn't a git repository. Run from the project root." }
if ((Resolve-Path $gitTop).Path -ne (Resolve-Path $root).Path) {
    throw "Run this from the repo root: $((Resolve-Path $gitTop).Path)"
}

if (-not $OutFile) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $name = Split-Path $root -Leaf
    $OutFile = Join-Path (Split-Path $root -Parent) "$name-untracked-$stamp.zip"
}

# --- Collect files -----------------------------------------------------------
# --others without --exclude-standard = everything untracked, INCLUDING gitignored files
# (.env files, the SQLite .db, original game assets, notes, etc.)
$all = git -c core.quotepath=off ls-files --others
$excludeRegex = '(^|/)(' + (($excludeDirs | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')/'

$files = @($all | Where-Object { $_ -and ($_ -notmatch $excludeRegex) -and (-not $_.EndsWith('/')) })
$skippedDirs = @($all | Where-Object { $_ -and $_.EndsWith('/') })   # nested git repos etc.

if ($files.Count -eq 0) { Write-Host "Nothing to back up."; return }

# --- Summary -----------------------------------------------------------------
$sizes = foreach ($f in $files) {
    $p = Join-Path $root $f
    if (Test-Path -LiteralPath $p -PathType Leaf) { (Get-Item -LiteralPath $p).Length } else { 0 }
}
$totalMB = [math]::Round((($sizes | Measure-Object -Sum).Sum) / 1MB, 2)

Write-Host ""
Write-Host "Files to include: $($files.Count)  (~$totalMB MB uncompressed)" -ForegroundColor Cyan
Write-Host "By top-level location:"
$files | ForEach-Object {
    if ($_ -match '/') { ($_ -split '/')[0] + '/' } else { '(repo root)' }
} | Group-Object | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,6}  {1}" -f $_.Count, $_.Name)
}

if ($skippedDirs.Count -gt 0) {
    Write-Host ""
    Write-Host "Skipped (nested git repos or similar - copy these by hand):" -ForegroundColor Yellow
    $skippedDirs | ForEach-Object { Write-Host "  $_" }
}

# --- Things a zip of untracked files does NOT protect ------------------------
$dirty    = @(git status --porcelain --untracked-files=no)
$unpushed = @(git log --branches --not --remotes --oneline)
$stashes  = @(git stash list)

if ($dirty.Count -or $unpushed.Count -or $stashes.Count) {
    Write-Host ""
    Write-Host "WARNING - git work that this zip does not cover:" -ForegroundColor Yellow
    if ($dirty.Count)    { Write-Host "  $($dirty.Count) tracked file(s) with uncommitted changes (commit or stash+push them)" }
    if ($unpushed.Count) { Write-Host "  $($unpushed.Count) commit(s) not pushed to any remote (git push --all)" }
    if ($stashes.Count)  { Write-Host "  $($stashes.Count) stash entr(ies) (stashes are local only; apply and commit them)" }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run - full list:" -ForegroundColor Cyan
    $files | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "Would write: $OutFile"
    return
}

# --- Build the zip -----------------------------------------------------------
Add-Type -AssemblyName System.IO.Compression
if (Test-Path -LiteralPath $OutFile) { Remove-Item -LiteralPath $OutFile -Force }

$fs  = [IO.File]::Open($OutFile, [IO.FileMode]::Create)
$zip = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
$added = 0
$failed = @()

try {
    foreach ($rel in $files) {
        $full = Join-Path $root $rel
        if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
        try {
            # Open with ReadWrite sharing so a file locked by a running server (e.g. the SQLite .db) still copies
            $in = [IO.File]::Open($full, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
        } catch {
            $failed += $rel
            continue
        }
        try {
            $entry = $zip.CreateEntry($rel, [IO.Compression.CompressionLevel]::Optimal)
            $entry.LastWriteTime = (Get-Item -LiteralPath $full).LastWriteTime
            $out = $entry.Open()
            try { $in.CopyTo($out) } finally { $out.Dispose() }
            $added++
        } finally {
            $in.Dispose()
        }
    }
} finally {
    $zip.Dispose()
    $fs.Dispose()
}

$zipMB = [math]::Round((Get-Item -LiteralPath $OutFile).Length / 1MB, 2)
Write-Host ""
Write-Host "Done: $added file(s) -> $OutFile ($zipMB MB)" -ForegroundColor Green

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Could not read these (locked?) - close the app using them and re-run:" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "  $_" }
}
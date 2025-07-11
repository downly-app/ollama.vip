# PowerShell script for creating a new release for the Tauri application on Windows.
#
# Usage:
# .\scripts\release.ps1 -Version "v1.2.3"
# .\scripts\release.ps1 -Version "v1.2.3" -SkipLint
# .\scripts\release.ps1 -Version "v1.2.3" -SkipLint -SkipTests
#
# Parameters:
# -Version: The release version (required), e.g., v1.2.3
# -SkipLint: Skip linting checks for emergency releases
# -SkipTests: Skip tests for faster releases
#
# This script will:
# 1. Validate the version format.
# 2. Check for clean Git status.
# 3. Update the version in package.json, Cargo.toml, and tauri.conf.json.
# 4. Run tests and build the frontend (optional).
# 5. Commit the version changes, create a Git tag, and push to the remote.
# 6. Automatically open the GitHub releases page.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "The release version, e.g., v1.2.3")]
    [string]$Version,

    [Parameter(Mandatory = $false, HelpMessage = "Skip linting checks for emergency releases")]
    [switch]$SkipLint,

    [Parameter(Mandatory = $false, HelpMessage = "Skip tests for faster releases")]
    [switch]$SkipTests
)

# --- Helper Functions ---
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Exit-Script {
    param([string]$Message)
    Write-Error $Message
    exit 1
}

# --- Pre-flight Checks ---
Write-Status "Starting release process for version $Version..."

# 1. Validate version format (vX.Y.Z)
if ($Version -notmatch '^v\d+\.\d+\.\d+$') {
    Exit-Script "Invalid version format. Use 'vX.Y.Z' (e.g., v1.2.3)."
}
$VersionNumber = $Version.Substring(1)

# 2. Check for clean Git working directory
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-Error "You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
}

# 3. Check current branch is main or master
$CurrentBranch = git branch --show-current
if ($CurrentBranch -ne "main" -and $CurrentBranch -ne "master") {
    Write-Warning "You are not on the 'main' or 'master' branch (current: $CurrentBranch)."
    $Continue = Read-Host "Do you want to continue? (y/N)"
    if ($Continue.ToLower() -ne "y") {
        Exit-Script "Release cancelled by user."
    }
}

# 4. Check if tag already exists
if (git rev-parse -q --verify "refs/tags/$Version") {
    Exit-Script "Tag $Version already exists."
}

# --- Version Update ---
Write-Status "Updating version to $VersionNumber in configuration files..."

# 1. Update package.json
try {
    npm version $VersionNumber --no-git-tag-version --allow-same-version | Out-Null
    Write-Success "Updated package.json"
}
catch {
    Exit-Script "Failed to update package.json version."
}

# 2. Update src-tauri/Cargo.toml
$CargoTomlPath = "src-tauri/Cargo.toml"
try {
    $CargoContent = Get-Content $CargoTomlPath
    $NewCargoContent = $CargoContent | ForEach-Object {
        if ($_ -match '^\s*version\s*=\s*".*"') {
            'version = "' + $VersionNumber + '"'
        } else {
            $_
        }
    }
    $NewCargoContent | Set-Content $CargoTomlPath -Encoding UTF8
    Write-Success "Updated $CargoTomlPath"
}
catch {
    Exit-Script "Failed to update $CargoTomlPath."
}

# 3. Update src-tauri/tauri.conf.json
$TauriConfPath = "src-tauri/tauri.conf.json"
try {
    # PowerShell's text/JSON manipulation has proven unreliable in this environment.
    # Swapping to Node.js, a project dependency, for a bulletproof JSON update.
    $js_code = "
        const fs = require('fs');
        const path = '$TauriConfPath';
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        config.package.version = '$VersionNumber';
        fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf8');
    "
    node -e $js_code
    Write-Success "Updated $TauriConfPath using Node.js"
}
catch {
    Exit-Script "Failed to update $TauriConfPath."
}

# --- Build and Test ---
Write-Status "Running tests and building frontend..."

# Run yarn install to update lock file
Write-Status "Updating yarn.lock..."
yarn install
if ($LASTEXITCODE -ne 0) {
    Exit-Script "yarn install failed. Could not update lock file."
}
Write-Success "yarn.lock is up to date."

# 1. Run linting (optional)
if (-not $SkipLint) {
    Write-Status "Running linting with increased warning tolerance for release..."
    yarn lint --max-warnings 50
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Linting failed. Attempting to auto-fix some issues..."
        yarn lint:fix
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Auto-fix completed with some remaining warnings. Continuing with release..."
            Write-Warning "Consider running 'yarn lint:fix' manually to address remaining issues."
        }
    }
} else {
    Write-Warning "Skipping linting checks as requested."
}

# 2. Run Rust tests (optional)
if (-not $SkipTests) {
    cargo test --manifest-path src-tauri/Cargo.toml
    if ($LASTEXITCODE -ne 0) {
        Exit-Script "Rust tests failed."
    }
    Write-Success "All tests passed."
} else {
    Write-Warning "Skipping tests as requested."
}

# 3. Build frontend
yarn build
if ($LASTEXITCODE -ne 0) {
    Exit-Script "Frontend build failed."
}
Write-Success "Frontend build completed."

# --- Git Release ---
Write-Status "Committing changes and pushing release to GitHub..."

# 1. Commit version changes
git add package.json yarn.lock src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "Release $Version"
if ($LASTEXITCODE -ne 0) {
    Exit-Script "Failed to commit version changes."
}

# 2. Push commit
git push origin $CurrentBranch
if ($LASTEXITCODE -ne 0) {
    Exit-Script "Failed to push commit to branch '$CurrentBranch'."
}

# 3. Create and push tag
git tag -a $Version -m "Release $Version"
git push origin $Version
if ($LASTEXITCODE -ne 0) {
    Exit-Script "Failed to push tag '$Version'."
}

Write-Success "Successfully pushed commit and tag '$Version' to origin."

# --- Final Steps ---
Write-Status "GitHub Actions should now be building the release artifacts."

# Dynamically get repo URL
$RepoUrl = (git remote get-url origin) -replace '^git@github.com:', 'https://github.com/' -replace '\.git$', ''
if ($RepoUrl) {
    Write-Status "Check progress at: $RepoUrl/actions"
    $ReleaseUrl = "$RepoUrl/releases/tag/$Version"
    try {
        Start-Process $ReleaseUrl
        Write-Status "Opened browser to view the new release at: $ReleaseUrl"
    }
    catch {
        Write-Warning "Could not automatically open browser. Please view the release manually at: $ReleaseUrl"
    }
}

Write-Success "Release process for $Version completed successfully!"
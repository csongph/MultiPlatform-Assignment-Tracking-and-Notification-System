param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$lines = [System.IO.File]::ReadAllLines($InputPath)
$output = [System.Collections.Generic.List[string]]::new()

$output.Add("-- KMAPS public-schema restore for Neon PostgreSQL")
$output.Add("-- Generated from a Supabase cluster dump; Supabase-managed objects are excluded.")
$output.Add("\set ON_ERROR_STOP on")
$output.Add("SET statement_timeout = 0;")
$output.Add("SET lock_timeout = 0;")
$output.Add("SET idle_in_transaction_session_timeout = 0;")
$output.Add("SET client_encoding = 'UTF8';")
$output.Add("SET standard_conforming_strings = on;")
$output.Add("SELECT pg_catalog.set_config('search_path', '', false);")
$output.Add("SET check_function_bodies = false;")
$output.Add("SET xmloption = content;")
$output.Add("SET client_min_messages = warning;")
$output.Add("SET row_security = off;")
$output.Add("")

$block = [System.Collections.Generic.List[string]]::new()
$keepBlock = $false
$blockType = ""

function Flush-Block {
    if (-not $script:keepBlock -or $script:block.Count -eq 0) {
        $script:block.Clear()
        return
    }

    foreach ($line in $script:block) {
        if ($line -match '^ALTER (TABLE|SEQUENCE|FUNCTION|TYPE) .+ OWNER TO .+;$') {
            continue
        }
        if ($line -match '^GRANT |^REVOKE |^ALTER DEFAULT PRIVILEGES ') {
            continue
        }
        $script:output.Add($line)
    }
    $script:output.Add("")
    $script:block.Clear()
}

foreach ($line in $lines) {
    if ($line -match '^-- (?:Data for )?Name: .+; Type: ([^;]+); Schema: ([^;]+); Owner:') {
        Flush-Block
        $blockType = $Matches[1]
        $schema = $Matches[2]
        $keepBlock = $schema -eq 'public' -and $blockType -notin @('ACL', 'DEFAULT ACL', 'COMMENT')
        if ($keepBlock) {
            $block.Add('--')
            $block.Add($line)
            $block.Add('--')
        }
        continue
    }

    if ($keepBlock) {
        $block.Add($line)
    }
}

Flush-Block

$output.Add("-- End of KMAPS Neon restore")
$output.Add("\unset ON_ERROR_STOP")

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) {
    [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}
[System.IO.File]::WriteAllLines($OutputPath, $output, [System.Text.UTF8Encoding]::new($false))

Write-Host "Created $OutputPath"
Write-Host "Included public-schema blocks: $(([regex]::Matches(($output -join "`n"), 'Type: ')).Count)"

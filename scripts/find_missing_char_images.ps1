$ErrorActionPreference = 'Stop'
function NormalizeStr([string]$s){
  if(-not $s){ return '' }
  $t = $s.Normalize([System.Text.NormalizationForm]::FormD)
  $t = [System.Text.RegularExpressions.Regex]::Replace($t,'\p{IsCombiningDiacriticalMarks}+','')
  $t = $t -replace '[^a-zA-Z0-9]+','_'
  $t = $t -replace '^_+|_+$',''
  return $t.ToLower()
}

$repoRoot = (Get-Location).Path
$jsFiles = Get-ChildItem -Path "$repoRoot\public\js" -Recurse -Filter *.js | Select-Object -ExpandProperty FullName
$names = New-Object System.Collections.Generic.HashSet[string]
$re = "name:\s*['\"]([^'\"]+)['\"]"
foreach($f in $jsFiles){
  $txt = Get-Content $f -Raw
  foreach($m in [System.Text.RegularExpressions.Regex]::Matches($txt,$re)){
    $names.Add($m.Groups[1].Value) | Out-Null
  }
}

$charFiles = Get-ChildItem -Path "$repoRoot\public\img\decks\*\characters\*" -File -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
$charNorm = @()
foreach($cf in $charFiles){
  $base = [System.IO.Path]::GetFileNameWithoutExtension($cf)
  $charNorm += @{file=$cf; norm=NormalizeStr($base)}
}

$missing = @()
foreach($n in $names){
  $nn = NormalizeStr($n)
  $tokens = $nn -split '_' | Where-Object { $_ -ne '' }
  $found = $false
  foreach($c in $charNorm){
    if($c.norm -like "*$nn*") { $found = $true; break }
    if($tokens.Count -gt 0){
      $all = $true
      foreach($t in $tokens){ if(-not ($c.norm -like "*$t*")){ $all = $false; break } }
      if($all){ $found = $true; break }
    }
  }
  if(-not $found){ $missing += $n }
}

Write-Host "TOTAL_CARD_NAMES_FOUND: $($names.Count)"
Write-Host "TOTAL_CHARACTER_FILES: $($charNorm.Count)"
Write-Host "MISSING IMAGES: $($missing.Count)"
$missing | Sort-Object | ForEach-Object { Write-Host $_ }

$json = @{cardCount=$names.Count; charFiles=$charNorm; missing=$missing} | ConvertTo-Json -Depth 5
Set-Content -Path "$repoRoot\scripts\missing_char_images_ps.json" -Value $json -Encoding UTF8
Write-Host "`nWROTE: scripts\\missing_char_images_ps.json"

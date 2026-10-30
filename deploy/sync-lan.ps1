# 本机打包 moe-admin，覆盖小主机 /var/www/html/ops
# 用法：cd moe-admin && npm run deploy:lan
# 可选环境变量：MOE_ADMIN_LAN_HOST / MOE_ADMIN_LAN_USER

$ErrorActionPreference = "Stop"

$HostName = if ($env:MOE_ADMIN_LAN_HOST) { $env:MOE_ADMIN_LAN_HOST } else { "192.168.124.77" }
$UserName = if ($env:MOE_ADMIN_LAN_USER) { $env:MOE_ADMIN_LAN_USER } else { "xinzhi" }
$AdminDir = Split-Path -Parent $PSScriptRoot
$TarPath = Join-Path $env:TEMP "moe-admin-dist.tar.gz"
$RemoteTar = "/tmp/moe-admin-dist.tar.gz"
$RemoteOps = "/var/www/html/ops"

Set-Location $AdminDir
npm run build

if (Test-Path $TarPath) {
    Remove-Item $TarPath -Force
}
tar -czf $TarPath -C (Join-Path $AdminDir "dist") .

Write-Host "upload $TarPath -> ${UserName}@${HostName}:$RemoteTar"
scp $TarPath "${UserName}@${HostName}:$RemoteTar"
ssh "${UserName}@${HostName}" "sudo rm -rf $RemoteOps/* && sudo tar -xzf $RemoteTar -C $RemoteOps && sudo chown -R www-data:www-data $RemoteOps"

Write-Host "synced http://${HostName}/ops/"

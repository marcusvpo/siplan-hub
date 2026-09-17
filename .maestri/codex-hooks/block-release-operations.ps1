$rawInput = [Console]::In.ReadToEnd()

try {
    $payload = $rawInput | ConvertFrom-Json -ErrorAction Stop
} catch {
    exit 0
}

$command = $payload.tool_input.command
if ($null -eq $command) {
    $command = $payload.tool_input.cmd
}

if ($null -eq $command) {
    exit 0
}

if ($command -isnot [string]) {
    $command = $command | ConvertTo-Json -Depth 100 -Compress
}

$blockedPatterns = @(
    '(?i)(?:^|[\s;&|])git(?:\.exe)?\s+(?:add|commit|push|pull|fetch|merge|rebase|reset|checkout|switch|cherry-pick|revert|clean|tag)\b',
    '(?i)(?:^|[\s;&|])git(?:\.exe)?\s+stash\s+(?:push|pop|apply|drop|clear)\b',
    '(?i)(?:^|[\s;&|])git(?:\.exe)?\s+branch\s+(?:-d|-D|--delete|--move|--copy)\b',
    '(?i)(?:^|[\s;&|])gh(?:\.exe)?\s+(?:pr\s+(?:create|merge|close|reopen)|release\s+create)\b',
    '(?i)(?:^|[\s;&|])supabase(?:\.exe)?\s+(?:db\s+(?:push|reset)|functions\s+deploy)\b',
    '(?i)(?:^|[\s;&|])(?:npm|pnpm|yarn)(?:\.cmd|\.exe)?\s+(?:run\s+)?deploy\b',
    '(?i)(?:^|[\s;&|])(?:vercel|netlify|firebase)(?:\.cmd|\.exe)?\s+deploy\b',
    '(?i)(?:^|[\s;&|])vercel(?:\.cmd|\.exe)?\s+--prod\b'
)

foreach ($pattern in $blockedPatterns) {
    if ($command -match $pattern) {
        $result = @{
            hookSpecificOutput = @{
                hookEventName = 'PreToolUse'
                permissionDecision = 'deny'
                permissionDecisionReason = 'Operacao de Git, release, deploy ou producao bloqueada. O Tech Lead deve aguardar autorizacao explicita do usuario e encaminhar a acao ao shell Git & Release.'
            }
        }

        $result | ConvertTo-Json -Depth 10 -Compress
        exit 0
    }
}

exit 0

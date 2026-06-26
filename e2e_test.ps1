$TOKEN = Get-Content -Path "$env:TEMP\e2e_token.txt" -Raw
$H = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
$API = "http://localhost:5000/api"
$pass = 0; $fail = 0

function Test-Step($name, $scriptBlock) {
  try { & $scriptBlock; Write-Host "  ✅ $name"; $script:pass++ }
  catch { Write-Host "  ❌ $name`n     $($_.Exception.Message)" -ForegroundColor Red; $script:fail++ }
}

function GET($url) { Invoke-RestMethod -Uri "$API$url" -Headers $H }
function POST($url, $body) { Invoke-RestMethod -Uri "$API$url" -Method Post -Body ($body|ConvertTo-Json) -ContentType "application/json" -Headers $H }
function PATCH($url, $body) { Invoke-RestMethod -Uri "$API$url" -Method Patch -Body ($body|ConvertTo-Json) -ContentType "application/json" -Headers $H }
function DELETE($url) { Invoke-RestMethod -Uri "$API$url" -Method Delete -Headers $H }

# ==================== TEST FLOW ====================

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   E2E TEST SUITE - FULL PROJECT LIFECYCLE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ===== PHASE 1: PROJECT CREATION =====
Write-Host "`n--- PHASE 1: PROJECT CREATION ---" -ForegroundColor Yellow

Test-Step "Create project" {
  $global:Proj = POST "/projects" @{
    name = "E2E Test $(Get-Date -Format 'HHmmss')"
    projectType = "software"
    description = "Full lifecycle test"
    settings = @{ enableAutoPhaseProgression = $true }
  }
  if ($Proj._id -eq $null) { throw "No _id returned" }
}
Test-Step "Project phase is discovery" {
  if ($Proj.phase -ne "discovery") { throw "Expected discovery, got $($Proj.phase)" }
}
Test-Step "GET project returns same data" {
  $g = GET "/projects/$($Proj._id)"
  if ($g._id -ne $Proj._id) { throw "Mismatch" }
}

$PRJ_ID = $Proj._id

# ===== PHASE 2: TEAM & MEMBERS =====
Write-Host "`n--- PHASE 2: TEAM SETUP ---" -ForegroundColor Yellow

Test-Step "Add team member by email (new user creation)" {
  $body = @{
    email = "dev1@e2etest.com"
    projectRole = "developer"
    teamGroup = $null
  }
  $r = POST "/projects/$PRJ_ID/team" $body
  if ($r._id -eq $null -and $r[0]._id -eq $null) { throw "No member created" }
}

# Get the member just created
$members = GET "/projects/$PRJ_ID/team"

Test-Step "Team list returns members" {
  if ($members.Count -lt 1) { throw "Expected at least 1 member" }
}
$MEMBER_ID = $members[0]._id

# ===== PHASE 3: TASKS =====
Write-Host "`n--- PHASE 3: TASKS ---" -ForegroundColor Yellow

Test-Step "Create task 1 (uses projectId field)" {
  $global:T1 = POST "/tasks" @{
    title = "Requirements analysis"
    description = "Gather requirements"
    projectId = $PRJ_ID
    priority = "high"
  }
  if ($T1._id -eq $null) { throw "No task created" }
}
$T1ID = $T1._id
Write-Host "     Task 1: $($T1.title) status=$($T1.status)"

Test-Step "Create task 2" {
  $global:T2 = POST "/tasks" @{
    title = "Development work"
    description = "Implement features"
    projectId = $PRJ_ID
    priority = "medium"
  }
  if ($T2._id -eq $null) { throw "No task created" }
}
$T2ID = $T2._id

# Check phase progression after tasks
$projCheck = GET "/projects/$PRJ_ID"
Write-Host "     Phase after tasks: $($projCheck.phase) (progress: $($projCheck.progress))"

Test-Step "Tasks list pagination works" {
  $list = GET "/tasks?page=1&limit=10"
  if ($list.Count -lt 1 -and $list.data.Count -lt 1) { throw "No tasks returned" }
}

Test-Step "Update task status" {
  $updated = PATCH "/tasks/$T1ID" @{ status = "in_progress" }
  if ($updated.status -ne "in_progress") { throw "Status not updated" }
}
Test-Step "Complete task 1" {
  $done = PATCH "/tasks/$T1ID" @{ status = "done" }
  if ($done.status -ne "done") { throw "Task not done" }
}

# ===== PHASE 4: SPRINTS =====
Write-Host "`n--- PHASE 4: SPRINTS ---" -ForegroundColor Yellow

Test-Step "Create sprint" {
  $global:SPRINT = POST "/sprints" @{
    name = "Sprint 1"
    project = $PRJ_ID
    startDate = (Get-Date).ToString("yyyy-MM-dd")
    endDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
  }
  if ($SPRINT._id -eq $null) { throw "No sprint created" }
}
$SPRINT_ID = $SPRINT._id

Test-Step "Add task to sprint" {
  $r = POST "/sprints/$SPRINT_ID/tasks" @{ taskId = $T2ID }
  if ($r._id -eq $null) { throw "Task not added" }
}

Test-Step "Complete sprint" {
  $r = PATCH "/sprints/$SPRINT_ID" @{ status = "completed" }
  if ($r.status -ne "completed") { throw "Sprint not completed: $($r.status)" }
}

# ===== PHASE 5: TEST CASES =====
Write-Host "`n--- PHASE 5: TEST CASES ---" -ForegroundColor Yellow

Test-Step "Create test case" {
  $global:TC = POST "/test-cases" @{
    title = "Login functionality test"
    project = $PRJ_ID
    type = "manual"
    priority = "critical"
    steps = @(@{ order = 1; description = "Open login page"; expectedResult = "Page loads" })
  }
  if ($TC._id -eq $null) { throw "No TC created" }
}
$TC_ID = $TC._id

Test-Step "GET test case by ID" {
  $g = GET "/test-cases/$TC_ID"
  if ($g._id -ne $TC_ID) { throw "Mismatch" }
}

Test-Step "Test case pagination" {
  $list = GET "/test-cases?page=1&limit=5"
  if ($list.Count -lt 1 -and $list.data.Count -lt 1) { throw "No TCs returned" }
}

Test-Step "Execute test case - FAILED (tests auto-bug creation)" {
  # First set status to in_progress via update
  $global:TC = PATCH "/test-cases/$TC_ID" @{ status = "in_progress" }
  
  # Execute with failure — this triggers auto-bug creation
  # NOTE: The controller reads overallResult (not status) from req.body
  $exec = POST "/test-cases/$TC_ID/execute" @{
    overallResult = "failed"
    stepResults = @(@{
      stepId = $TC.steps[0]._id
      status = "fail"
      actualResult = "Page not loading"
    })
    failureReason = "page_load_error"
  }
  if ($exec._id -eq $null) { throw "Execution failed" }
  $bugId = if ($exec.linkedBug._id) { $exec.linkedBug._id } else { $exec.linkedBug }
  Write-Host "     Executed status=$($exec.status) bug=$bugId"
  
  # CRITICAL: The auto-bug creation should have worked (save fix)
  if ($bugId) {
    $bugCheck = GET "/bugs/$bugId" -ErrorAction SilentlyContinue
    if ($bugCheck._id -ne $null) {
      Write-Host "     ✅ Auto-bug created: $($bugCheck.title) [$($bugCheck.status)]"
    } else {
      throw "Auto-bug NOT created!"
    }
  } else {
    throw "No linkedBug on execution result!"
  }
}

# ===== PHASE 6: BUGS =====
Write-Host "`n--- PHASE 6: BUGS ---" -ForegroundColor Yellow

Test-Step "Create bug manually" {
  $global:BUG = POST "/bugs" @{
    title = "Manual test bug"
    description = "Bug created via E2E test"
    project = $PRJ_ID
    severity = "high"
  }
  if ($BUG._id -eq $null) { throw "No bug created" }
}
$BUG_ID = $BUG._id

Test-Step "Update bug status" {
  $r = PATCH "/bugs/$BUG_ID" @{ status = "in_progress" }
  if ($r.status -ne "in_progress") { throw "Bug status not updated" }
}

Test-Step "Resolve bug" {
  $r = POST "/bugs/$BUG_ID/resolve" @{ resolution = "fixed"; resolutionNotes = "Fixed in latest deploy" }
  if ($r.status -ne "resolved" -and $r.status -ne "fixed") { throw "Bug not resolved: $($r.status)" }
}

Test-Step "Bugs pagination" {
  $list = GET "/bugs?page=1&limit=5"
  if ($list.Count -lt 1 -and $list.data.Count -lt 1) { throw "No bugs returned" }
}

# ===== PHASE 7: TESTING ITEMS =====
Write-Host "`n--- PHASE 7: TESTING ITEMS ---" -ForegroundColor Yellow

Test-Step "Create testing item" {
  $global:TI = POST "/testing" @{
    title = "QA Testing Item 1"
    project = $PRJ_ID
    type = "test_case"
    priority = "high"
  }
  if ($TI._id -eq $null) { throw "No testing item created" }
}

Test-Step "Testing items pagination" {
  $list = GET "/testing?page=1&limit=5"
  if ($list.Count -lt 1 -and $list.data.Count -lt 1) { throw "No testing items returned" }
}

# ===== PHASE 8: WORK LOGS =====
Write-Host "`n--- PHASE 8: WORK LOGS ---" -ForegroundColor Yellow

Test-Step "Create work log" {
  # Use a unique task to avoid duplicate-key conflict on date+user
  $global:WL = POST "/work-logs" @{
    date = (Get-Date).ToString("yyyy-MM-dd")
    project = $PRJ_ID
    task = $T1ID
    hours = 4.5
    category = "development"
    description = "Worked on E2E test features"
    mood = "good"
  }
  if ($WL._id -eq $null) { throw "No work log created" }
}

Test-Step "Update work log (tests existing.user.equals on lean doc)" {
  $r = PATCH "/work-logs/$($WL._id)" @{ description = "Updated description"; hours = 5 }
  if ($r.description -ne "Updated description") { throw "Work log not updated" }
}

Test-Step "Delete work log (tests existing.user.equals on lean doc)" {
  $r = DELETE "/work-logs/$($WL._id)"
  if ($r.message -eq $null) { throw "Delete failed" }
}

Test-Step "Work logs pagination" {
  $list = GET "/work-logs/my?page=1&limit=5"
  if ($null -eq $list -and $null -eq $list.data) { throw "No work logs" }
}

# ===== PHASE 9: WIKI =====
Write-Host "`n--- PHASE 9: WIKI ---" -ForegroundColor Yellow

Test-Step "Create wiki page" {
  $global:WIKI = POST "/wiki" @{
    title = "E2E Test Documentation"
    content = "# Test`nThis is an E2E test page"
    department = "Engineering"
  }
  if ($WIKI._id -eq $null) { throw "No wiki page created" }
}

Test-Step "Update wiki page (tests populateRefs with lean)" {
  $r = PATCH "/wiki/$($WIKI._id)" @{ content = "# Updated`nUpdated content" }
  if ($r.content -notmatch "Updated") { throw "Wiki not updated" }
}

Test-Step "Wiki pagination" {
  $list = GET "/wiki?page=1&limit=5"
  if ($null -eq $list -and $null -eq $list.data) { throw "No wiki pages" }
}

# ===== PHASE 10: RESOURCES =====
Write-Host "`n--- PHASE 10: RESOURCES ---" -ForegroundColor Yellow

Test-Step "Create resource" {
  $global:RES = POST "/projects/$PRJ_ID/resources" @{
    title = "E2E Test Resource"
    type = "document"
    category = "documentation"
    url = "https://example.com/doc"
  }
  if ($RES._id -eq $null) { throw "No resource created" }
}

Test-Step "Resources list (lean populate)" {
  $list = GET "/projects/$PRJ_ID/resources"
  if ($list.Count -lt 1 -and $null -eq $list.data) { throw "No resources" }
}

# ===== PHASE 11: NOTIFICATIONS =====
Write-Host "`n--- PHASE 11: NOTIFICATIONS ---" -ForegroundColor Yellow

Test-Step "Notifications pagination" {
  $list = GET "/notifications?page=1&limit=5"
  if ($list.data.Count -lt 1) { throw "Expected >=1 notification, got 0" }
}

# ===== PHASE 12: ANALYTICS =====
Write-Host "`n--- PHASE 12: ANALYTICS ---" -ForegroundColor Yellow

Test-Step "Project team analytics (batch N+1 fix)" {
  $r = GET "/projects/$PRJ_ID/team/analytics"
  Write-Host "     team analytics: $($r.Count) groups"
}
Test-Step "Project predictions (batch N+1 fix)" {
  $r = GET "/analytics/predictions"
  Write-Host "     Predictions retrieved: OK"
}

# ===== PHASE 13: USER PROFILE =====
Write-Host "`n--- PHASE 13: USER ---" -ForegroundColor Yellow

Test-Step "Get me (lean populate)" {
  $me = GET "/auth/me"
  if ($me.email -ne "admin@gresio.com") { throw "Wrong user" }
  Write-Host "     User: $($me.name) role=$($me.role) theme=$($me.theme)"
}

# ===== PHASE 14: DELETION =====
Write-Host "`n--- PHASE 14: CLEANUP ---" -ForegroundColor Yellow

Test-Step "Delete test case" {
  $r = DELETE "/test-cases/$TC_ID"
  if ($r.message -eq $null) { throw "TC not deleted" }
}

Test-Step "Deactivate task" {
  $r = PATCH "/tasks/$T1ID" @{ isActive = $false }
  if ($r.isActive -ne $false) { throw "Task not deactivated" }
}


# ==================== SUMMARY ====================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ Passed: $pass" -ForegroundColor Green
Write-Host "  ❌ Failed: $fail" -ForegroundColor Red
Write-Host "  Total: $($pass + $fail)"
if ($fail -eq 0) {
  Write-Host "`n  🎉 ALL TESTS PASSED" -ForegroundColor Green
} else {
  Write-Host "`n  ⚠️  $fail TEST(S) FAILED" -ForegroundColor Red
}

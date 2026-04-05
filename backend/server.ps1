param(
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $ProjectRoot "data"
$UploadsDir = Join-Path $ProjectRoot "uploads"

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $UploadsDir | Out-Null

function ConvertTo-JsonSafe {
  param([Parameter(ValueFromPipeline = $true)]$InputObject)
  process { $InputObject | ConvertTo-Json -Depth 12 -Compress:$false }
}

function Get-Sha256Hash {
  param([string]$Value)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function New-RecordId {
  return ([guid]::NewGuid().ToString("N"))
}

function Get-DataPath {
  param([string]$Name)
  return (Join-Path $DataDir "$Name.json")
}

function Write-JsonFile {
  param(
    [string]$Path,
    $Data
  )
  [System.IO.File]::WriteAllText($Path, ($Data | ConvertTo-JsonSafe), [System.Text.Encoding]::UTF8)
}

function Read-JsonFile {
  param(
    [string]$Path,
    $Default
  )
  if (-not (Test-Path $Path)) {
    Write-JsonFile -Path $Path -Data $Default
    return $Default
  }

  $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8).Trim()
  if ([string]::IsNullOrWhiteSpace($raw)) {
    Write-JsonFile -Path $Path -Data $Default
    return $Default
  }

  return ($raw | ConvertFrom-Json)
}

function Ensure-Array {
  param($Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Array]) { return @($Value) }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) { return @($Value) }
  return @($Value)
}

function Get-DefaultSettings {
  return @{
    site = @{
      title = "АкваБлеск"
      phoneDisplay = "+7 (914) 582-63-17"
      phoneHref = "tel:+79145826317"
      city = "Хабаровск"
      hours = "Ежедневно 09:00–22:00"
      address = "Хабаровск, центр города"
    }
    messenger = @{
      name = "MAX"
      url = "https://max.ru/"
      heroLabel = "Написать в MAX"
      contactsLabel = "Перейти в MAX"
      ariaLabel = "Перейти в MAX"
      openInNewTab = $true
    }
    contactMap = @{
      title = "АкваБлеск в Хабаровске"
      note = "Откройте карту, посмотрите точку и постройте маршрут."
      address = "Хабаровск, центр города"
      lat = 48.480223
      lng = 135.071917
      zoom = 15
      routeUrl = "https://www.google.com/maps/dir/?api=1&destination=48.480223,135.071917"
    }
    notifications = @{
      ownerEmail = "admin@aquablesk.local"
      sendClientConfirmation = $false
    }
    reviewCards = @{
      gis = @{
        title = "Отзыв в 2ГИС"
        text = "Помогите другим выбрать нас — оставьте честный отзыв о качестве уборки"
        buttonLabel = "Подробнее"
        buttonUrl = "https://2gis.ru/"
        reviewUrl = "https://2gis.ru/"
        qrUrl = "https://2gis.ru/"
        qrImage = "assets/qr-2gis.svg"
        qrAlt = "QR-код для перехода к отзыву в 2ГИС"
        openInNewTab = $true
      }
      yandex = @{
        title = "Оставить отзыв в Яндекс"
        text = "Поделитесь впечатлением об уборке — это помогает нам расти и повышать качество сервиса"
        buttonLabel = "Перейти"
        buttonUrl = "https://yandex.ru/maps/"
        reviewUrl = "https://yandex.ru/maps/"
        qrUrl = "https://yandex.ru/maps/"
        qrImage = "assets/qr-yandex.svg"
        qrAlt = "QR-код для перехода к отзыву в Яндекс"
        openInNewTab = $true
      }
    }
    reviewsIntegration = @{
      provider = "yandex-widget"
      yandexWidgetUrl = ""
      yandexBusinessUrl = "https://yandex.ru/maps/"
      gisBusinessUrl = "https://2gis.ru/"
      note = "Для автоматического показа отзывов используется официальный виджет Яндекс Карт или серверная синхронизация."
    }
    formService = @{
      endpoint = "/api/leads"
      method = "POST"
      accept = "application/json"
      provider = "aquablesk-backend"
      redirectHash = "#thank-you"
      successMessage = "Ваша заявка принята, ожидайте звонка, мы скоро с вами свяжемся."
      loadingMessage = "Отправляем заявку..."
      errorMessage = "Не удалось отправить заявку. Попробуйте ещё раз позже или свяжитесь с нами по телефону."
      missingEndpointMessage = "Форма ещё не подключена к сервису заявок."
    }
    seo = @{
      title = "АкваБлеск — клининговый сервис в Хабаровске"
      description = "Профессиональная уборка квартир, домов и офисов в Хабаровске."
    }
  }
}

function Merge-Hashtable {
  param(
    [hashtable]$Base,
    $Incoming
  )

  $result = @{}
  foreach ($key in $Base.Keys) {
    $baseValue = $Base[$key]
    $incomingValue = $null
    $hasIncoming = $false

    if ($Incoming -and $Incoming.PSObject -and ($Incoming.PSObject.Properties.Name -contains $key)) {
      $incomingValue = $Incoming.$key
      $hasIncoming = $true
    }

    if ($baseValue -is [hashtable]) {
      $result[$key] = Merge-Hashtable -Base $baseValue -Incoming $incomingValue
      continue
    }

    $result[$key] = if ($hasIncoming -and $null -ne $incomingValue -and -not [string]::IsNullOrWhiteSpace([string]$incomingValue)) {
      $incomingValue
    } else {
      $baseValue
    }
  }

  if ($Incoming -and $Incoming.PSObject) {
    foreach ($property in $Incoming.PSObject.Properties) {
      if (-not $result.ContainsKey($property.Name)) {
        $result[$property.Name] = $property.Value
      }
    }
  }

  return $result
}

function Normalize-Settings {
  param($Incoming)
  return (Merge-Hashtable -Base (Get-DefaultSettings) -Incoming $Incoming)
}

function Get-DefaultUsers {
  return @(
    @{
      id = "admin"
      username = "admin"
      email = "admin@aquablesk.local"
      passwordHash = (Get-Sha256Hash "admin")
      role = "admin"
      mustChangePassword = $true
      createdAt = [DateTime]::UtcNow.ToString("o")
    },
    @{
      id = "moderator"
      username = "moderator"
      email = "moderator@aquablesk.local"
      passwordHash = (Get-Sha256Hash "moderator")
      role = "moderator"
      mustChangePassword = $true
      createdAt = [DateTime]::UtcNow.ToString("o")
    }
  )
}

function Get-DemoLeadDate {
  param(
    [int]$DaysOffset = 0,
    [int]$HoursOffset = 0
  )
  return [DateTime]::UtcNow.AddDays($DaysOffset).AddHours($HoursOffset).ToString("o")
}

function Get-DefaultLeads {
  return @(
    @{
      id = "lead-demo-001"
      name = "Анна Кузнецова"
      phone = "+7 (914) 552-18-40"
      email = "anna.kuznetsova@example.com"
      service = "Генеральная уборка"
      message = "Нужно убрать квартиру 54 м² перед приездом родителей."
      source = "site"
      status = "новая"
      confirmed = $false
      scheduledAt = ""
      adminComment = "Перезвонить после 18:00"
      createdAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -5
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -5
    }
    @{
      id = "lead-demo-002"
      name = "Дмитрий Орлов"
      phone = "+7 (924) 220-44-18"
      email = "orlov.office@example.com"
      service = "Уборка после ремонта"
      message = "Офис после косметического ремонта, 82 м²."
      source = "yandex"
      status = "дозвон"
      confirmed = $false
      scheduledAt = ""
      adminComment = "Не ответил, повторный звонок завтра в 11:00"
      createdAt = Get-DemoLeadDate -DaysOffset -2 -HoursOffset -3
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -1
    }
    @{
      id = "lead-demo-003"
      name = "Елена Соколова"
      phone = "+7 (914) 889-31-20"
      email = "sokolova.home@example.com"
      service = "Поддерживающая уборка"
      message = "Интересует раз в неделю по пятницам."
      source = "max"
      status = "согласовано"
      confirmed = $false
      scheduledAt = (Get-DemoLeadDate -DaysOffset 2 -HoursOffset 1)
      adminComment = "Согласована стоимость, ждёт подтверждения выезда"
      createdAt = Get-DemoLeadDate -DaysOffset -3 -HoursOffset -2
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -4
    }
    @{
      id = "lead-demo-004"
      name = "Игорь Власов"
      phone = "+7 (909) 811-73-55"
      email = ""
      service = "Мытьё окон"
      message = "3 окна и балкон, 9 этаж."
      source = "2gis"
      status = "подтверждено"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset 1 -HoursOffset 3)
      adminComment = "Клиент подтвердил выезд, доступ к парковке открыт"
      createdAt = Get-DemoLeadDate -DaysOffset -4 -HoursOffset -1
      updatedAt = Get-DemoLeadDate -DaysOffset -1
    }
    @{
      id = "lead-demo-005"
      name = "Мария Петрова"
      phone = "+7 (924) 105-66-92"
      email = "m.petrov@example.com"
      service = "Уборка кухни"
      message = "Нужна глубокая чистка кухни и духовки."
      source = "site"
      status = "выезд"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset 0 -HoursOffset 2)
      adminComment = "Бригада уже на объекте"
      createdAt = Get-DemoLeadDate -DaysOffset -5 -HoursOffset -2
      updatedAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset 1
    }
    @{
      id = "lead-demo-006"
      name = "Сергей Иванов"
      phone = "+7 (914) 347-90-11"
      email = "ivanov.family@example.com"
      service = "Генеральная уборка"
      message = "Дом 120 м² после гостей."
      source = "call"
      status = "выполнено"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset -2 -HoursOffset 5)
      adminComment = "Клиент доволен, попросил напомнить о регулярной уборке"
      createdAt = Get-DemoLeadDate -DaysOffset -8 -HoursOffset -1
      updatedAt = Get-DemoLeadDate -DaysOffset -2 -HoursOffset 1
    }
    @{
      id = "lead-demo-007"
      name = "Ольга Романова"
      phone = "+7 (914) 601-25-70"
      email = "romanova@example.com"
      service = "Санузел"
      message = "Нужна срочная уборка санузла сегодня вечером."
      source = "max"
      status = "отменено"
      confirmed = $false
      scheduledAt = (Get-DemoLeadDate -DaysOffset 0 -HoursOffset 6)
      adminComment = "Клиент отменил заявку, уехал из города"
      createdAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -8
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -2
    }
    @{
      id = "lead-demo-008"
      name = "Елена Соколова"
      phone = "+7 (914) 889-31-20"
      email = "sokolova.home@example.com"
      service = "Поддерживающая уборка"
      message = "Повторная запись на следующую неделю."
      source = "max"
      status = "новая"
      confirmed = $false
      scheduledAt = ""
      adminComment = "Повторный клиент"
      createdAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset -4
      updatedAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset -4
    }
    @{
      id = "lead-demo-009"
      name = "Татьяна Миронова"
      phone = "+7 (924) 411-09-83"
      email = ""
      service = "Уборка после ремонта"
      message = "Студия 38 м², много строительной пыли."
      source = "site"
      status = "согласовано"
      confirmed = $false
      scheduledAt = (Get-DemoLeadDate -DaysOffset 3 -HoursOffset 4)
      adminComment = "Ожидает финального звонка утром"
      createdAt = Get-DemoLeadDate -DaysOffset -2 -HoursOffset -6
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -3
    }
    @{
      id = "lead-demo-010"
      name = "Алексей Новиков"
      phone = "+7 (914) 773-48-29"
      email = "novikov.shop@example.com"
      service = "Коммерческое помещение"
      message = "Нужна уборка магазина до открытия."
      source = "yandex"
      status = "подтверждено"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset 1 -HoursOffset 0)
      adminComment = "Выезд в 07:30, нужен отчёт после уборки"
      createdAt = Get-DemoLeadDate -DaysOffset -3 -HoursOffset -5
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -2
    }
    @{
      id = "lead-demo-011"
      name = "Наталья Белова"
      phone = "+7 (909) 302-17-65"
      email = "belova@example.com"
      service = "Мытьё окон"
      message = "Частный дом, 11 окон."
      source = "2gis"
      status = "выполнено"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset -6 -HoursOffset 2)
      adminComment = "Повторно обратится осенью"
      createdAt = Get-DemoLeadDate -DaysOffset -10 -HoursOffset -4
      updatedAt = Get-DemoLeadDate -DaysOffset -6 -HoursOffset -1
    }
    @{
      id = "lead-demo-012"
      name = "Максим Фёдоров"
      phone = "+7 (924) 990-12-48"
      email = ""
      service = "Поддерживающая уборка"
      message = "Интересует договор на 2 раза в месяц."
      source = "site"
      status = "дозвон"
      confirmed = $false
      scheduledAt = ""
      adminComment = "Запросил коммерческое предложение на почту"
      createdAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -10
      updatedAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset -7
    }
    @{
      id = "lead-demo-013"
      name = "Виктория Демина"
      phone = "+7 (914) 412-63-17"
      email = "demina@example.com"
      service = "Генеральная уборка"
      message = "Нужна уборка перед сдачей квартиры."
      source = "site"
      status = "подтверждено"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset 4 -HoursOffset 2)
      adminComment = "Ключи передаст консьерж"
      createdAt = Get-DemoLeadDate -DaysOffset -4 -HoursOffset -7
      updatedAt = Get-DemoLeadDate -DaysOffset -2 -HoursOffset -2
    }
    @{
      id = "lead-demo-014"
      name = "Павел Никитин"
      phone = "+7 (924) 580-77-31"
      email = ""
      service = "Мытьё окон"
      message = "Окна в офисе, 2 этаж."
      source = "call"
      status = "новая"
      confirmed = $false
      scheduledAt = ""
      adminComment = "Новый входящий звонок"
      createdAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset -2
      updatedAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset -2
    }
    @{
      id = "lead-demo-015"
      name = "Светлана Гришина"
      phone = "+7 (914) 745-28-64"
      email = "grishina@example.com"
      service = "Уборка кухни"
      message = "Кухня после праздника и жир на фасадах."
      source = "yandex"
      status = "выполнено"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset -3 -HoursOffset 3)
      adminComment = "Попросила отправить прайс на регулярную уборку"
      createdAt = Get-DemoLeadDate -DaysOffset -7 -HoursOffset -6
      updatedAt = Get-DemoLeadDate -DaysOffset -3 -HoursOffset -1
    }
    @{
      id = "lead-demo-016"
      name = "Константин Белов"
      phone = "+7 (909) 614-92-08"
      email = "belov.office@example.com"
      service = "Коммерческое помещение"
      message = "Уборка зала и санузла в шоуруме."
      source = "2gis"
      status = "согласовано"
      confirmed = $false
      scheduledAt = (Get-DemoLeadDate -DaysOffset 5 -HoursOffset 1)
      adminComment = "Ждёт финального подтверждения по времени"
      createdAt = Get-DemoLeadDate -DaysOffset -2 -HoursOffset -9
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -5
    }
    @{
      id = "lead-demo-017"
      name = "Алёна Сидорова"
      phone = "+7 (924) 300-15-40"
      email = "sidorova@example.com"
      service = "Санузел"
      message = "Уборка после замены плитки."
      source = "max"
      status = "отменено"
      confirmed = $false
      scheduledAt = (Get-DemoLeadDate -DaysOffset 1 -HoursOffset 6)
      adminComment = "Перенесла на следующий месяц"
      createdAt = Get-DemoLeadDate -DaysOffset -5 -HoursOffset -3
      updatedAt = Get-DemoLeadDate -DaysOffset -1 -HoursOffset -6
    }
    @{
      id = "lead-demo-018"
      name = "Роман Лебедев"
      phone = "+7 (914) 234-91-70"
      email = ""
      service = "Поддерживающая уборка"
      message = "Нужен тестовый первый выезд."
      source = "site"
      status = "выезд"
      confirmed = $true
      scheduledAt = (Get-DemoLeadDate -DaysOffset 0 -HoursOffset 5)
      adminComment = "Бригада едет, клиент на связи"
      createdAt = Get-DemoLeadDate -DaysOffset -2 -HoursOffset -4
      updatedAt = Get-DemoLeadDate -DaysOffset 0 -HoursOffset 2
    }
  )
}

function Get-DefaultReviews {
  return @(
      @{
        id = (New-RecordId)
        author = "Дмитрий К."
        source = "Яндекс Карты"
        rating = 5
        text = "Заказывали уборку после ремонта. Команда справилась отлично: убрали строительную пыль, отмыли плитку и окна."
        published = $true
        publishedAt = [DateTime]::UtcNow.ToString("o")
        link = "https://yandex.ru/maps/"
        qrBinding = "yandex"
        createdAt = [DateTime]::UtcNow.ToString("o")
      },
      @{
        id = (New-RecordId)
        author = "Елена М."
        source = "2ГИС"
        rating = 5
        text = "Понравилась аккуратность и пунктуальность. Всё сделали спокойно, без лишней суеты, результат отличный."
        published = $true
        publishedAt = [DateTime]::UtcNow.ToString("o")
        link = "https://2gis.ru/"
        qrBinding = "gis"
        createdAt = [DateTime]::UtcNow.ToString("o")
      }
  )
}

function Get-DefaultBeforeAfter {
  return @(
    @{
      id = (New-RecordId)
      title = "Диван"
      before = "assets/before-living-gray-2026.jpg"
      after = "assets/after-living-gray-2026.jpg"
      published = $true
    },
    @{
      id = (New-RecordId)
      title = "Санузел"
      before = "assets/before-shower-2026.jpg"
      after = "assets/after-shower-2026.jpg"
      published = $true
    },
    @{
      id = (New-RecordId)
      title = "Диван, крупный план"
      before = "assets/before-living-beige-2026.jpg"
      after = "assets/after-living-beige-2026.jpg"
      published = $true
    },
    @{
      id = (New-RecordId)
      title = "Вентиляционная решётка"
      before = "assets/before-vent-2026.jpg"
      after = "assets/after-vent-2026.jpg"
      published = $true
    }
  )
}

$StoreFiles = @{
  users = Get-DataPath "users"
  sessions = Get-DataPath "sessions"
  leads = Get-DataPath "leads"
  clients = Get-DataPath "clients"
  reviews = Get-DataPath "reviews"
  logs = Get-DataPath "logs"
  settings = Get-DataPath "settings"
  beforeAfter = Get-DataPath "before-after"
  resetTokens = Get-DataPath "reset-tokens"
}

$Users = Ensure-Array (Read-JsonFile -Path $StoreFiles.users -Default (Get-DefaultUsers))
$Sessions = Ensure-Array (Read-JsonFile -Path $StoreFiles.sessions -Default @())
$Leads = Ensure-Array (Read-JsonFile -Path $StoreFiles.leads -Default (Get-DefaultLeads))
$Clients = Ensure-Array (Read-JsonFile -Path $StoreFiles.clients -Default @())
$Reviews = Ensure-Array (Read-JsonFile -Path $StoreFiles.reviews -Default (Get-DefaultReviews))
$Logs = Ensure-Array (Read-JsonFile -Path $StoreFiles.logs -Default @())
$Settings = Normalize-Settings (Read-JsonFile -Path $StoreFiles.settings -Default (Get-DefaultSettings))
$BeforeAfter = Ensure-Array (Read-JsonFile -Path $StoreFiles.beforeAfter -Default (Get-DefaultBeforeAfter))
$ResetTokens = Ensure-Array (Read-JsonFile -Path $StoreFiles.resetTokens -Default @())
$RateLimitState = @{}
$MaxRequestBodyBytes = 65536

function Save-State {
  Write-JsonFile -Path $StoreFiles.users -Data $Users
  Write-JsonFile -Path $StoreFiles.sessions -Data $Sessions
  Write-JsonFile -Path $StoreFiles.leads -Data $Leads
  Write-JsonFile -Path $StoreFiles.clients -Data $Clients
  Write-JsonFile -Path $StoreFiles.reviews -Data $Reviews
  Write-JsonFile -Path $StoreFiles.logs -Data $Logs
  Write-JsonFile -Path $StoreFiles.settings -Data $Settings
  Write-JsonFile -Path $StoreFiles.beforeAfter -Data $BeforeAfter
  Write-JsonFile -Path $StoreFiles.resetTokens -Data $ResetTokens
}

function Add-Log {
  param(
    [string]$Action,
    [string]$Actor = "system",
    [string]$Message = "",
    $Meta = $null
  )
  $entry = @{
    id = New-RecordId
    action = $Action
    actor = $Actor
    message = $Message
    meta = $Meta
    createdAt = [DateTime]::UtcNow.ToString("o")
  }
  $script:Logs = @($entry) + @($script:Logs | Select-Object -First 499)
  Write-JsonFile -Path $StoreFiles.logs -Data $script:Logs
}

function Parse-Cookies {
  param([string]$CookieHeader)
  $result = @{}
  if ([string]::IsNullOrWhiteSpace($CookieHeader)) { return $result }
  foreach ($pair in $CookieHeader.Split(';')) {
    $parts = $pair.Split('=', 2)
    if ($parts.Count -eq 2) {
      $result[$parts[0].Trim()] = [System.Uri]::UnescapeDataString($parts[1].Trim())
    }
  }
  return $result
}

function Get-CurrentSession {
  param($Request)
  $cookies = Parse-Cookies $Request.Headers["Cookie"]
  $token = $cookies["aquablesk_admin_session"]
  if (-not $token) { return $null }
  $now = [DateTime]::UtcNow
  $session = $Sessions | Where-Object { $_.token -eq $token } | Select-Object -First 1
  if (-not $session) { return $null }
  if ([DateTime]::Parse($session.expiresAt) -lt $now) {
    $script:Sessions = @($Sessions | Where-Object { $_.token -ne $token })
    Write-JsonFile -Path $StoreFiles.sessions -Data $script:Sessions
    return $null
  }
  return $session
}

function Require-Auth {
  param($Request, $Response)
  $session = Get-CurrentSession -Request $Request
  if (-not $session) {
    Send-Json -Response $Response -StatusCode 401 -Data @{ error = "Требуется авторизация" }
    return $null
  }
  return $session
}

function Require-Role {
  param($Request, $Response, [string[]]$Roles)
  $session = Require-Auth -Request $Request -Response $Response
  if (-not $session) {
    return $null
  }
  if (@($Roles) -notcontains ([string]$session.role)) {
    Send-Json -Response $Response -StatusCode 403 -Data @{ error = "Недостаточно прав для этого действия" }
    return $null
  }
  return $session
}

function Read-RequestBody {
  param($Request)
  if ($Request.ContentLength64 -gt $MaxRequestBodyBytes) {
    throw "Превышен допустимый размер запроса"
  }
  $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Get-JsonBody {
  param($Request)
  try {
    $raw = Read-RequestBody -Request $Request
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    return ($raw | ConvertFrom-Json)
  } catch {
    throw "Некорректное тело запроса"
  }
}

function Send-Json {
  param(
    $Response,
    [int]$StatusCode = 200,
    $Data
  )
  $json = $Data | ConvertTo-Json -Depth 12
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.ContentEncoding = [System.Text.Encoding]::UTF8
  $Response.Headers["Cache-Control"] = "no-store"
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

function Send-Text {
  param(
    $Response,
    [int]$StatusCode,
    [string]$Text,
    [string]$ContentType = "text/plain; charset=utf-8"
  )
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = $ContentType
  $Response.ContentEncoding = [System.Text.Encoding]::UTF8
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

function Get-ContentType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".svg" { "image/svg+xml" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".ico" { "image/x-icon" }
    ".webp" { "image/webp" }
    ".xml" { "application/xml; charset=utf-8" }
    ".txt" { "text/plain; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Send-FileResponse {
  param(
    $Response,
    [string]$Path
  )
  if (-not (Test-Path $Path -PathType Leaf)) {
    Send-Text -Response $Response -StatusCode 404 -Text "Not found"
    return
  }
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $Response.StatusCode = 200
  $Response.ContentType = Get-ContentType -Path $Path
  if ($Path -match "\\(assets|uploads)\\") {
    $Response.Headers["Cache-Control"] = "public, max-age=300"
  } else {
    $Response.Headers["Cache-Control"] = "no-cache"
  }
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

function Send-BytesResponse {
  param(
    $Response,
    [int]$StatusCode,
    [byte[]]$Bytes,
    [string]$ContentType,
    [string]$FileName = ""
  )
  $Response.StatusCode = $StatusCode
  $Response.ContentType = $ContentType
  if (-not [string]::IsNullOrWhiteSpace($FileName)) {
    $Response.Headers["Content-Disposition"] = "attachment; filename=`"$FileName`""
  }
  $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Response.Close()
}

function Get-PublicSettings {
  $publishedReviews = @($Reviews | Where-Object { $_.published -ne $false })
  $publishedBeforeAfter = @($BeforeAfter | Where-Object { $_.published -ne $false })
  return @{
    messenger = $Settings.messenger
    contactMap = $Settings.contactMap
    reviewCards = $Settings.reviewCards
    reviewsIntegration = $Settings.reviewsIntegration
    formService = $Settings.formService
    reviews = $publishedReviews
    beforeAfter = $publishedBeforeAfter
    site = $Settings.site
  }
}

function Get-StringOrDefault {
  param($Value, [string]$Default = "")
  if ($null -eq $Value) { return $Default }
  return [string]$Value
}

function Get-CrmLeadStatuses {
  return @("новая", "дозвон", "согласовано", "подтверждено", "выезд", "выполнено", "отменено")
}

function Normalize-LeadStatus {
  param([string]$Status)
  $candidate = (Get-StringOrDefault $Status).Trim().ToLowerInvariant()
  $allowed = Get-CrmLeadStatuses
  if ($allowed -contains $candidate) {
    return $candidate
  }
  switch ($candidate) {
    "new" { return "новая" }
    "in-progress" { return "дозвон" }
    "done" { return "выполнено" }
    "archive" { return "отменено" }
    default { return "новая" }
  }
}

function Sanitize-Input {
  param([string]$Value, [int]$MaxLength = 500)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $clean = ($Value -replace "[<>]", "").Trim()
  if ($clean.Length -gt $MaxLength) {
    return $clean.Substring(0, $MaxLength)
  }
  return $clean
}

function New-LeadHistoryEntry {
  param(
    [string]$Actor = "system",
    [string]$Action = "",
    [string]$FromStatus = "",
    [string]$ToStatus = "",
    [string]$Comment = "",
    [string]$ScheduledAt = "",
    [bool]$Confirmed = $false
  )

  return @{
    id = New-RecordId
    at = [DateTime]::UtcNow.ToString("o")
    actor = $Actor
    action = $Action
    fromStatus = $FromStatus
    toStatus = $ToStatus
    comment = $Comment
    scheduledAt = $ScheduledAt
    confirmed = $Confirmed
  }
}

function Add-LeadHistoryEntry {
  param(
    $Lead,
    [string]$Actor = "system",
    [string]$Action = "",
    [string]$FromStatus = "",
    [string]$ToStatus = "",
    [string]$Comment = "",
    [string]$ScheduledAt = "",
    [bool]$Confirmed = $false
  )

  if (-not $Lead.history) {
    $Lead.history = @()
  }

  $entry = New-LeadHistoryEntry -Actor $Actor -Action $Action -FromStatus $FromStatus -ToStatus $ToStatus -Comment $Comment -ScheduledAt $ScheduledAt -Confirmed $Confirmed
  $Lead.history = @($entry) + @(Ensure-Array $Lead.history)
}

function Get-ClientUserAgent {
  param($Request)
  return (Get-StringOrDefault $Request.UserAgent).Trim()
}

function Get-LeadDuplicateFingerprint {
  param($Lead)
  return (
    @(
      (Get-StringOrDefault $Lead.name).Trim().ToLowerInvariant(),
      ((Get-StringOrDefault $Lead.phone) -replace "\D", ""),
      (Get-StringOrDefault $Lead.email).Trim().ToLowerInvariant(),
      (Get-StringOrDefault $Lead.service).Trim().ToLowerInvariant(),
      (Get-StringOrDefault $Lead.message).Trim().ToLowerInvariant()
    ) -join "|"
  )
}

function Test-RecentLeadDuplicate {
  param($Lead, [int]$WindowSeconds = 120)
  $fingerprint = Get-LeadDuplicateFingerprint -Lead $Lead
  if ([string]::IsNullOrWhiteSpace($fingerprint.Replace("|", ""))) {
    return $false
  }

  $threshold = [DateTime]::UtcNow.AddSeconds(-1 * $WindowSeconds)
  foreach ($existing in @($Leads)) {
    $existingDate = $null
    if (-not [DateTime]::TryParse([string]$existing.createdAt, [ref]$existingDate)) {
      continue
    }
    if ($existingDate -lt $threshold) {
      continue
    }
    if ((Get-LeadDuplicateFingerprint -Lead $existing) -eq $fingerprint) {
      return $true
    }
  }

  return $false
}

function Get-LeadLookupKey {
  param($Lead)
  $value = ""
  if ($Lead.phone) {
    $value = [string]$Lead.phone
  } elseif ($Lead.email) {
    $value = [string]$Lead.email
  }
  return $value.Trim().ToLowerInvariant()
}

function Get-ClientByLead {
  param($Lead)
  $key = Get-LeadLookupKey -Lead $Lead
  if (-not $key) { return $null }
  return ($Clients | Where-Object { $_.lookupKey -eq $key } | Select-Object -First 1)
}

function Upsert-ClientFromLead {
  param($Lead)
  $lookupKey = Get-LeadLookupKey -Lead $Lead
  if (-not $lookupKey) { return }

  $nowIso = [DateTime]::UtcNow.ToString("o")
  $leadId = Get-StringOrDefault $Lead.id
  $leadStatus = Normalize-LeadStatus -Status (Get-StringOrDefault $Lead.status)
  $leadComment = Sanitize-Input -Value (Get-StringOrDefault $Lead.adminComment) -MaxLength 1000
  $scheduledAt = Sanitize-Input -Value (Get-StringOrDefault $Lead.scheduledAt) -MaxLength 80
  $confirmed = [bool]$Lead.confirmed
  $source = Sanitize-Input -Value (Get-StringOrDefault $Lead.source) -MaxLength 80

  $existing = $null
  if ($Lead.clientId) {
    $existing = $Clients | Where-Object { $_.id -eq $Lead.clientId } | Select-Object -First 1
  }
  if (-not $existing) {
    $existing = $Clients | Where-Object { $_.lookupKey -eq $lookupKey } | Select-Object -First 1
  }
  if ($existing) {
    $existing.lookupKey = $lookupKey
    $existing.name = $Lead.name
    $existing.phone = $Lead.phone
    $existing.email = $Lead.email
    if (-not $existing.firstLeadAt) { $existing.firstLeadAt = $Lead.createdAt }
    $existing.lastLeadAt = if ($Lead.updatedAt) { $Lead.updatedAt } else { $Lead.createdAt }
    $existing.lastService = $Lead.service
    $existing.source = if ($source) { $source } else { $existing.source }
    $existing.lastStatus = $leadStatus
    $existing.scheduledAt = $scheduledAt
    $existing.confirmed = $confirmed
    $existing.lastComment = $leadComment
    $existing.lastLeadId = $leadId
    $existing.updatedAt = $nowIso
    if (-not $existing.leadIds) { $existing.leadIds = @() }
    if ($leadId -and -not (@(Ensure-Array $existing.leadIds) -contains $leadId)) {
      $existing.leadIds = @(Ensure-Array $existing.leadIds) + @($leadId)
    }
    $existing.leadsCount = @(Ensure-Array $existing.leadIds).Count
    $Lead.clientId = $existing.id
    return $existing
  }

  $client = @{
    id = New-RecordId
    lookupKey = $lookupKey
    name = $Lead.name
    phone = $Lead.phone
    email = $Lead.email
    firstLeadAt = $Lead.createdAt
    lastLeadAt = if ($Lead.updatedAt) { $Lead.updatedAt } else { $Lead.createdAt }
    lastService = $Lead.service
    leadsCount = 1
    leadIds = @($leadId)
    lastStatus = $leadStatus
    scheduledAt = $scheduledAt
    confirmed = $confirmed
    lastComment = $leadComment
    source = $source
    lastLeadId = $leadId
    createdAt = $nowIso
    updatedAt = $nowIso
  }

  $script:Clients = @($client) + @($script:Clients)
  $Lead.clientId = $client.id
  return $client
}

function Normalize-LeadRecord {
  param($Lead)

  $Lead.status = Normalize-LeadStatus -Status (Get-StringOrDefault $Lead.status)
  if (-not $Lead.source) { $Lead.source = "site" }
  if (-not $Lead.createdAt) { $Lead.createdAt = [DateTime]::UtcNow.ToString("o") }
  if (-not $Lead.updatedAt) { $Lead.updatedAt = $Lead.createdAt }
  if ($null -eq $Lead.confirmed) { $Lead.confirmed = $false }
  if ($null -eq $Lead.scheduledAt) { $Lead.scheduledAt = "" }
  if ($null -eq $Lead.adminComment) {
    $Lead.adminComment = if ($Lead.comment) { [string]$Lead.comment } else { "" }
  }
  if (-not $Lead.history -or @(Ensure-Array $Lead.history).Count -eq 0) {
    $Lead.history = @(
      New-LeadHistoryEntry -Actor "system" -Action "Инициализация карточки" -FromStatus "" -ToStatus $Lead.status -Comment (Get-StringOrDefault $Lead.adminComment) -ScheduledAt (Get-StringOrDefault $Lead.scheduledAt) -Confirmed ([bool]$Lead.confirmed)
    )
  } else {
    $Lead.history = @(Ensure-Array $Lead.history)
  }

  return $Lead
}

function Normalize-ClientRecord {
  param($Client)

  if (-not $Client.createdAt) { $Client.createdAt = [DateTime]::UtcNow.ToString("o") }
  if (-not $Client.updatedAt) { $Client.updatedAt = $Client.createdAt }
  if (-not $Client.leadIds) { $Client.leadIds = @() } else { $Client.leadIds = @(Ensure-Array $Client.leadIds) }
  if (-not $Client.leadsCount) { $Client.leadsCount = @($Client.leadIds).Count }
  if ($null -eq $Client.confirmed) { $Client.confirmed = $false }
  if ($null -eq $Client.scheduledAt) { $Client.scheduledAt = "" }
  if ($null -eq $Client.lastComment) { $Client.lastComment = "" }
  if ($null -eq $Client.lastStatus) { $Client.lastStatus = "новая" }
  return $Client
}

function Convert-ToExcelCell {
  param([string]$Value)
  $safe = [System.Security.SecurityElement]::Escape((Get-StringOrDefault $Value))
  return "<c t=`"inlineStr`"><is><t xml:space=`"preserve`">$safe</t></is></c>"
}

function Convert-ToExcelRowXml {
  param([string[]]$Values)
  $cells = foreach ($value in $Values) {
    Convert-ToExcelCell -Value $value
  }
  return "<row>$($cells -join '')</row>"
}

function New-WorksheetXml {
  param(
    [string[]]$Headers,
    [object[]]$Rows
  )

  $rowsXml = @()
  $rowsXml += Convert-ToExcelRowXml -Values $Headers
  foreach ($row in $Rows) {
    $rowsXml += Convert-ToExcelRowXml -Values @($row)
  }

  return @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    $($rowsXml -join "`n    ")
  </sheetData>
</worksheet>
"@
}

function New-CrmExportWorkbookBytes {
  param(
    [object[]]$LeadRows,
    [object[]]$ClientRows
  )

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem

  $sheet1 = New-WorksheetXml -Headers @(
    "ID заявки", "Дата создания", "Дата обновления", "Статус", "Подтверждено", "Дата и время выезда", "Источник",
    "Клиент", "Телефон", "E-mail", "Услуга", "Сообщение", "Комментарий администратора", "ID клиента", "История"
  ) -Rows $LeadRows

  $sheet2 = New-WorksheetXml -Headers @(
    "ID клиента", "Имя", "Телефон", "E-mail", "Первая заявка", "Последняя заявка", "Последняя услуга",
    "Статус", "Подтверждён", "Дата и время выезда", "Количество заявок", "Последний комментарий", "Источник"
  ) -Rows $ClientRows

  $contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
"@

  $rootRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
"@

  $workbook = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Заявки" sheetId="1" r:id="rId1"/>
    <sheet name="Клиенты" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>
"@

  $workbookRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"@

  $styles = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
"@

  $memory = New-Object System.IO.MemoryStream
  $archive = New-Object System.IO.Compression.ZipArchive($memory, [System.IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    $entries = @{
      "[Content_Types].xml" = $contentTypes
      "_rels/.rels" = $rootRels
      "xl/workbook.xml" = $workbook
      "xl/_rels/workbook.xml.rels" = $workbookRels
      "xl/styles.xml" = $styles
      "xl/worksheets/sheet1.xml" = $sheet1
      "xl/worksheets/sheet2.xml" = $sheet2
    }

    foreach ($key in $entries.Keys) {
      $entry = $archive.CreateEntry($key)
      $stream = $entry.Open()
      $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)
      try {
        $writer.Write($entries[$key])
      } finally {
        $writer.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }

  $memory.Position = 0
  $bytes = $memory.ToArray()
  $memory.Dispose()
  return $bytes
}

$script:Leads = @($Leads | ForEach-Object { Normalize-LeadRecord -Lead $_ })
$script:Clients = @($Clients | ForEach-Object { Normalize-ClientRecord -Client $_ })
if (@($script:Leads).Count -eq 0) {
  $script:Leads = @((Get-DefaultLeads) | ForEach-Object { Normalize-LeadRecord -Lead $_ })
}
foreach ($leadItem in @($script:Leads)) {
  Upsert-ClientFromLead -Lead $leadItem | Out-Null
}
Save-State

function Save-UploadFromDataUrl {
  param($Body)
  if (-not $Body.fileName -or -not $Body.dataUrl) {
    throw "Не переданы fileName или dataUrl"
  }
  $allowed = @(".jpg", ".jpeg", ".png", ".webp", ".svg")
  $safeName = ([System.IO.Path]::GetFileName($Body.fileName) -replace "[^a-zA-Z0-9._-]", "-").ToLowerInvariant()
  $extension = [System.IO.Path]::GetExtension($safeName).ToLowerInvariant()
  if ($allowed -notcontains $extension) {
    throw "Недопустимый формат файла"
  }
  $base64 = ($Body.dataUrl -split ",")[-1]
  $bytes = [Convert]::FromBase64String($base64)
  $targetName = "{0}-{1}" -f ([DateTime]::UtcNow.ToString("yyyyMMddHHmmss")), $safeName
  $targetPath = Join-Path $UploadsDir $targetName
  [System.IO.File]::WriteAllBytes($targetPath, $bytes)
  return ("uploads/" + $targetName)
}

function Remove-UploadFile {
  param([string]$RelativePath)
  if (-not $RelativePath) { return }
  $trimmed = $RelativePath.TrimStart('/').Replace('/', '\')
  $fullPath = Join-Path $ProjectRoot $trimmed
  if ($fullPath.StartsWith($UploadsDir, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $fullPath)) {
    Remove-Item -LiteralPath $fullPath -Force
  }
}

function Get-ServerSetting {
  param([string]$Name, [string]$Default = "")
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
  return $value.Trim()
}

function Get-PublicBaseUrl {
  $configured = Get-ServerSetting -Name "AQUABLESK_PUBLIC_BASE_URL"
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured.TrimEnd("/")
  }
  return "http://localhost:$Port"
}

function New-ResetTokenRecord {
  param([string]$UserId)
  return @{
    id = New-RecordId
    userId = $UserId
    token = New-RecordId
    createdAt = [DateTime]::UtcNow.ToString("o")
    expiresAt = [DateTime]::UtcNow.AddHours(1).ToString("o")
    used = $false
  }
}

function Remove-ExpiredResetTokens {
  $now = [DateTime]::UtcNow
  $script:ResetTokens = @(
    $ResetTokens | Where-Object {
      $expires = $null
      [DateTime]::TryParse([string]$_.expiresAt, [ref]$expires) -and $expires -gt $now -and $_.used -ne $true
    }
  )
}

function Get-ResetTokenRecord {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) { return $null }
  Remove-ExpiredResetTokens
  return ($ResetTokens | Where-Object { $_.token -eq $Token -and $_.used -ne $true } | Select-Object -First 1)
}

function Send-ResetEmail {
  param(
    [string]$To,
    [string]$ResetUrl
  )
  return (Send-EmailMessage -To $To -Subject "Сброс доступа в админку АкваБлеск" -Body "Для смены логина и пароля перейдите по ссылке: $ResetUrl")
}

function Send-EmailMessage {
  param(
    [string]$To,
    [string]$Subject,
    [string]$Body,
    [bool]$IsHtml = $false
  )

  $smtpHost = Get-ServerSetting -Name "AQUABLESK_SMTP_HOST"
  $smtpPort = Get-ServerSetting -Name "AQUABLESK_SMTP_PORT" -Default "587"
  $smtpUser = Get-ServerSetting -Name "AQUABLESK_SMTP_USER"
  $smtpPassword = Get-ServerSetting -Name "AQUABLESK_SMTP_PASSWORD"
  $smtpFrom = Get-ServerSetting -Name "AQUABLESK_SMTP_FROM"
  $smtpFromName = Get-ServerSetting -Name "AQUABLESK_SMTP_FROM_NAME" -Default "АкваБлеск"

  if ([string]::IsNullOrWhiteSpace($To) -or [string]::IsNullOrWhiteSpace($smtpHost) -or [string]::IsNullOrWhiteSpace($smtpFrom)) {
    return $false
  }

  $message = New-Object System.Net.Mail.MailMessage
  $message.From = New-Object System.Net.Mail.MailAddress($smtpFrom, $smtpFromName)
  $message.To.Add($To)
  $message.Subject = $Subject
  $message.Body = $Body
  $message.IsBodyHtml = $IsHtml

  $client = New-Object System.Net.Mail.SmtpClient($smtpHost, [int]$smtpPort)
  $client.EnableSsl = $true
  if (-not [string]::IsNullOrWhiteSpace($smtpUser)) {
    $client.Credentials = New-Object System.Net.NetworkCredential($smtpUser, $smtpPassword)
  }

  try {
    $client.Send($message)
    return $true
  } finally {
    $message.Dispose()
    $client.Dispose()
  }
}

function Send-LeadNotificationEmail {
  param($Lead)

  $ownerEmail = Sanitize-Input -Value (Get-StringOrDefault $Settings.notifications.ownerEmail) -MaxLength 160
  if ([string]::IsNullOrWhiteSpace($ownerEmail)) {
    return $false
  }

  $baseUrl = Get-PublicBaseUrl
  $adminLeadUrl = "$baseUrl/admin/index.html?lead=$($Lead.id)#view-leads"
  $createdAtFormatted = fmt-DateForMail -Value $Lead.createdAt
  $scheduledAtFormatted = fmt-DateForMail -Value $Lead.scheduledAt
  $subject = "Новая заявка на сайте АкваБлеск"
  $body = @"
Вам поступил новый заказ.

Имя клиента: $(Get-StringOrDefault $Lead.name)
Телефон: $(Get-StringOrDefault $Lead.phone)
E-mail: $(if ([string]::IsNullOrWhiteSpace((Get-StringOrDefault $Lead.email))) { "—" } else { $Lead.email })
Услуга: $(if ([string]::IsNullOrWhiteSpace((Get-StringOrDefault $Lead.service))) { "—" } else { $Lead.service })
Дата/время записи: $(if ([string]::IsNullOrWhiteSpace((Get-StringOrDefault $Lead.scheduledAt))) { "Не указаны" } else { $scheduledAtFormatted })
Комментарий: $(if ([string]::IsNullOrWhiteSpace((Get-StringOrDefault $Lead.message))) { "—" } else { $Lead.message })
Источник заявки: $(Get-StringOrDefault $Lead.source "site")
Карточка заявки: $adminLeadUrl
Время отправки: $createdAtFormatted
"@

  return (Send-EmailMessage -To $ownerEmail -Subject $subject -Body $body)
}

function Send-LeadClientConfirmationEmail {
  param($Lead)

  if (-not [bool]$Settings.notifications.sendClientConfirmation) {
    return $false
  }

  $clientEmail = Sanitize-Input -Value (Get-StringOrDefault $Lead.email) -MaxLength 160
  if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    return $false
  }

  $subject = "АкваБлеск — заявка получена"
  $body = @"
Здравствуйте, $(Get-StringOrDefault $Lead.name "клиент").

Ваша заявка принята, ожидайте звонка, мы скоро с вами свяжемся.

Услуга: $(if ([string]::IsNullOrWhiteSpace((Get-StringOrDefault $Lead.service))) { "—" } else { $Lead.service })
Телефон для связи: $(Get-StringOrDefault $Settings.site.phoneDisplay)
Режим работы: $(Get-StringOrDefault $Settings.site.hours)
"@

  return (Send-EmailMessage -To $clientEmail -Subject $subject -Body $body)
}

function fmt-DateForMail {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "—"
  }
  try {
    $parsed = [DateTime]::Parse($Value)
    return $parsed.ToString("dd.MM.yyyy HH:mm")
  } catch {
    return $Value
  }
}

function Get-ClientAddress {
  param($Request)
  $cfIp = [string]$Request.Headers["CF-Connecting-IP"]
  if (-not [string]::IsNullOrWhiteSpace($cfIp)) {
    return $cfIp.Trim()
  }

  $forwardedFor = [string]$Request.Headers["X-Forwarded-For"]
  if (-not [string]::IsNullOrWhiteSpace($forwardedFor)) {
    return ($forwardedFor.Split(",")[0]).Trim()
  }

  if ($Request.RemoteEndPoint -and $Request.RemoteEndPoint.Address) {
    return $Request.RemoteEndPoint.Address.ToString()
  }

  return "unknown"
}

function Test-RateLimit {
  param(
    [string]$Key,
    [int]$Limit,
    [int]$WindowSeconds
  )

  $now = [DateTime]::UtcNow
  $windowStart = $now.AddSeconds(-1 * $WindowSeconds)
  $records = @()
  if ($RateLimitState.ContainsKey($Key)) {
    $records = @($RateLimitState[$Key] | Where-Object { $_ -gt $windowStart })
  }

  if (@($records).Count -ge $Limit) {
    $RateLimitState[$Key] = $records
    return $false
  }

  $RateLimitState[$Key] = @($records + $now)
  return $true
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "AquaBlesk backend started: http://localhost:$Port/"
Add-Log -Action "server.start" -Message "Backend started on port $Port"

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.AbsolutePath
    $method = $request.HttpMethod.ToUpperInvariant()

    $response.Headers["X-Content-Type-Options"] = "nosniff"
    $response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    $response.Headers["X-Frame-Options"] = "SAMEORIGIN"

    if ($method -eq "OPTIONS") {
      $response.StatusCode = 204
      $response.Close()
      continue
    }

    if ($path -eq "/api/public/settings" -and $method -eq "GET") {
      Send-Json -Response $response -Data (Get-PublicSettings)
      continue
    }

    if ($path -eq "/api/public/reviews" -and $method -eq "GET") {
      Send-Json -Response $response -Data @{
        reviews = @($Reviews | Where-Object { $_.published -ne $false })
        reviewCards = $Settings.reviewCards
        reviewsIntegration = $Settings.reviewsIntegration
      }
      continue
    }

    if ($path -eq "/api/leads" -and $method -eq "POST") {
      $clientIp = Get-ClientAddress -Request $request
      $userAgent = Get-ClientUserAgent -Request $request
      if (-not (Test-RateLimit -Key "leads:$clientIp" -Limit 5 -WindowSeconds 600)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Слишком много заявок. Попробуйте ещё раз позже." }
        continue
      }
      if (-not (Test-RateLimit -Key "leads-burst:$clientIp" -Limit 2 -WindowSeconds 30)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Слишком частые отправки. Подождите немного и попробуйте снова." }
        continue
      }
      if (-not [string]::IsNullOrWhiteSpace($userAgent) -and -not (Test-RateLimit -Key "leads-ua:$userAgent" -Limit 20 -WindowSeconds 600)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Временное ограничение на отправку заявок. Попробуйте позже." }
        continue
      }

      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }

      $name = Sanitize-Input -Value (Get-StringOrDefault $body.name) -MaxLength 120
      $phone = Sanitize-Input -Value (Get-StringOrDefault $body.phone) -MaxLength 40
      $service = Sanitize-Input -Value (Get-StringOrDefault $body.service) -MaxLength 160
      $message = Sanitize-Input -Value (Get-StringOrDefault $body.message) -MaxLength 500
      $email = Sanitize-Input -Value (Get-StringOrDefault $body.email) -MaxLength 160

      if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($phone)) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Имя и телефон обязательны" }
        continue
      }

      if ((($phone -replace "\D", "").Length) -lt 10) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Некорректный номер телефона" }
        continue
      }

      if (-not [string]::IsNullOrWhiteSpace($email) -and ($email -notmatch "^[^\s@]+@[^\s@]+\.[^\s@]+$")) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Некорректный e-mail" }
        continue
      }

      $lead = @{
        id = New-RecordId
        name = $name.Trim()
        phone = $phone.Trim()
        email = $email.Trim()
        service = $service.Trim()
        message = $message.Trim()
        source = "site"
        status = "новая"
        confirmed = $false
        scheduledAt = ""
        adminComment = ""
        clientIp = $clientIp
        userAgent = $userAgent
        createdAt = [DateTime]::UtcNow.ToString("o")
        updatedAt = [DateTime]::UtcNow.ToString("o")
        history = @()
      }

      Add-LeadHistoryEntry -Lead $lead -Actor "public" -Action "Создана заявка с сайта" -FromStatus "" -ToStatus "новая" -Comment ""

      if (Test-RecentLeadDuplicate -Lead $lead -WindowSeconds 120) {
        Send-Json -Response $response -StatusCode 409 -Data @{ error = "Похожая заявка уже была получена недавно" }
        continue
      }

      $script:Leads = @($lead) + @($script:Leads)
      Upsert-ClientFromLead -Lead $lead
      Save-State
      Add-Log -Action "lead.created" -Actor "public" -Message "Новая заявка с сайта" -Meta @{ leadId = $lead.id; phone = $lead.phone }

      $ownerMailSent = $false
      $clientMailSent = $false
      try {
        $ownerMailSent = Send-LeadNotificationEmail -Lead $lead
      } catch {
        $ownerMailSent = $false
      }
      try {
        $clientMailSent = Send-LeadClientConfirmationEmail -Lead $lead
      } catch {
        $clientMailSent = $false
      }
      Add-Log -Action "lead.notification" -Actor "system" -Message "Обработаны почтовые уведомления по заявке" -Meta @{ leadId = $lead.id; ownerDelivered = $ownerMailSent; clientDelivered = $clientMailSent }

      Send-Json -Response $response -StatusCode 201 -Data @{
        ok = $true
        message = $Settings.formService.successMessage
        leadId = $lead.id
      }
      continue
    }

    if ($path -eq "/api/admin/login" -and $method -eq "POST") {
      $clientIp = Get-ClientAddress -Request $request
      $userAgent = Get-ClientUserAgent -Request $request
      if (-not (Test-RateLimit -Key "login:$clientIp" -Limit 10 -WindowSeconds 900)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Слишком много попыток входа. Повторите позже." }
        continue
      }
      if (-not [string]::IsNullOrWhiteSpace($userAgent) -and -not (Test-RateLimit -Key "login-ua:$userAgent" -Limit 30 -WindowSeconds 1800)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Слишком много попыток входа с этого клиента. Повторите позже." }
        continue
      }

      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }

      $username = Sanitize-Input -Value (Get-StringOrDefault $body.username) -MaxLength 80
      $password = Get-StringOrDefault $body.password
      $user = $Users | Where-Object { $_.username -eq $username } | Select-Object -First 1
      if (-not $user -or $user.passwordHash -ne (Get-Sha256Hash $password)) {
        Send-Json -Response $response -StatusCode 401 -Data @{ error = "Неверный логин или пароль" }
        continue
      }

      $token = New-RecordId
      $expires = [DateTime]::UtcNow.AddHours(12)
      $script:Sessions = @(
        @{
          token = $token
          userId = $user.id
          username = $user.username
          role = $user.role
          createdAt = [DateTime]::UtcNow.ToString("o")
          expiresAt = $expires.ToString("o")
        }
      ) + @($script:Sessions | Where-Object { $_.username -ne $user.username })
      Write-JsonFile -Path $StoreFiles.sessions -Data $script:Sessions
      $response.Headers.Add("Set-Cookie", "aquablesk_admin_session=$token; Path=/; HttpOnly; SameSite=Lax")
      Add-Log -Action "auth.login" -Actor $user.username -Message "Вход в админку"
      Send-Json -Response $response -Data @{
        ok = $true
        user = @{
          id = $user.id
          username = $user.username
          email = $user.email
          role = $user.role
          mustChangePassword = $user.mustChangePassword
        }
      }
      continue
    }

    if ($path -eq "/api/admin/logout" -and $method -eq "POST") {
      $session = Get-CurrentSession -Request $request
      if ($session) {
        $script:Sessions = @($Sessions | Where-Object { $_.token -ne $session.token })
        Write-JsonFile -Path $StoreFiles.sessions -Data $script:Sessions
        Add-Log -Action "auth.logout" -Actor $session.username -Message "Выход из админки"
      }
      $response.Headers.Add("Set-Cookie", "aquablesk_admin_session=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax")
      Send-Json -Response $response -Data @{ ok = $true }
      continue
    }

    if ($path -eq "/api/admin/session" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      $user = $Users | Where-Object { $_.username -eq $session.username } | Select-Object -First 1
      Send-Json -Response $response -Data @{
        ok = $true
        user = @{
          username = $session.username
          email = $user.email
          role = $session.role
        }
      }
      continue
    }

    if ($path -eq "/api/admin/password/request-reset" -and $method -eq "POST") {
      $clientIp = Get-ClientAddress -Request $request
      if (-not (Test-RateLimit -Key "password-reset:$clientIp" -Limit 5 -WindowSeconds 1800)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Слишком много запросов на сброс. Повторите позже." }
        continue
      }

      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }

      $email = Sanitize-Input -Value (Get-StringOrDefault $body.email) -MaxLength 160
      if ([string]::IsNullOrWhiteSpace($email) -or ($email -notmatch "^[^\s@]+@[^\s@]+\.[^\s@]+$")) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Укажите корректный e-mail" }
        continue
      }

      $user = $Users | Where-Object { ([string]$_.email).Trim().ToLowerInvariant() -eq $email.Trim().ToLowerInvariant() } | Select-Object -First 1
      if ($user) {
        Remove-ExpiredResetTokens
        $tokenRecord = New-ResetTokenRecord -UserId $user.id
        $script:ResetTokens = @($tokenRecord) + @($ResetTokens | Where-Object { $_.userId -ne $user.id })
        Save-State
        $resetUrl = "$(Get-PublicBaseUrl)/admin/reset-password.html?token=$($tokenRecord.token)"
        $sent = $false
        try {
          $sent = Send-ResetEmail -To $user.email -ResetUrl $resetUrl
        } catch {
          $sent = $false
        }
        Add-Log -Action "auth.resetRequested" -Actor $user.username -Message "Запрошен сброс пароля" -Meta @{ delivered = $sent; email = $user.email; resetUrl = $resetUrl }
      }

      Send-Json -Response $response -Data @{
        ok = $true
        message = "Если e-mail найден, на него отправлена ссылка для сброса доступа."
      }
      continue
    }

    if ($path -eq "/api/admin/password/reset-check" -and $method -eq "GET") {
      $token = Get-StringOrDefault $request.QueryString["token"]
      $record = Get-ResetTokenRecord -Token $token
      if (-not $record) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Ссылка для сброса недействительна или устарела" }
        continue
      }
      $user = $Users | Where-Object { $_.id -eq $record.userId } | Select-Object -First 1
      if (-not $user) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Пользователь не найден" }
        continue
      }
      Send-Json -Response $response -Data @{
        ok = $true
        user = @{
          username = $user.username
          email = $user.email
        }
      }
      continue
    }

    if ($path -eq "/api/admin/password/reset" -and $method -eq "POST") {
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }

      $token = Get-StringOrDefault $body.token
      $newUsername = Sanitize-Input -Value (Get-StringOrDefault $body.username) -MaxLength 80
      $newPassword = Get-StringOrDefault $body.newPassword
      $record = Get-ResetTokenRecord -Token $token

      if (-not $record) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Ссылка для сброса недействительна или устарела" }
        continue
      }

      if ([string]::IsNullOrWhiteSpace($newUsername) -or $newUsername.Length -lt 3) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Новый логин должен быть не короче 3 символов" }
        continue
      }

      if ([string]::IsNullOrWhiteSpace($newPassword) -or $newPassword.Length -lt 8) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Новый пароль должен быть не короче 8 символов" }
        continue
      }

      $duplicateUser = $Users | Where-Object { $_.username -eq $newUsername -and $_.id -ne $record.userId } | Select-Object -First 1
      if ($duplicateUser) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Такой логин уже используется" }
        continue
      }

      $user = $Users | Where-Object { $_.id -eq $record.userId } | Select-Object -First 1
      if (-not $user) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Пользователь не найден" }
        continue
      }

      $oldUsername = $user.username
      $user.username = $newUsername
      $user.passwordHash = Get-Sha256Hash $newPassword
      $user.mustChangePassword = $false
      $record.used = $true
      $script:Sessions = @($Sessions | Where-Object { $_.userId -ne $user.id })
      Save-State
      Add-Log -Action "auth.passwordReset" -Actor $oldUsername -Message "Доступ в админку обновлён через reset flow" -Meta @{ newUsername = $newUsername }
      Send-Json -Response $response -Data @{ ok = $true; message = "Доступ обновлён. Выполните вход с новым логином и паролем." }
      continue
    }

    if ($path -eq "/api/admin/dashboard" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      $statusStats = @{
        "новая" = 0
        "дозвон" = 0
        "согласовано" = 0
        "подтверждено" = 0
        "выезд" = 0
        "выполнено" = 0
        "отменено" = 0
      }
      foreach ($leadItem in @($Leads)) {
        $statusKey = Normalize-LeadStatus -Status (Get-StringOrDefault $leadItem.status)
        if (-not $statusStats.Contains($statusKey)) {
          $statusStats[$statusKey] = 0
        }
        $statusStats[$statusKey] = [int]$statusStats[$statusKey] + 1
      }
      Send-Json -Response $response -Data @{
        stats = @{
          leads = @($Leads).Count
          clients = @($Clients).Count
          reviews = @($Reviews).Count
          beforeAfter = @($BeforeAfter).Count
          statuses = $statusStats
        }
        latestLeads = @($Leads | Select-Object -First 8)
      }
      continue
    }

    if ($path -eq "/api/admin/leads" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      Send-Json -Response $response -Data @{ items = $Leads }
      continue
    }

    if ($path -eq "/api/admin/leads" -and $method -eq "POST") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }

      $name = Sanitize-Input -Value (Get-StringOrDefault $body.name) -MaxLength 160
      $phone = Sanitize-Input -Value (Get-StringOrDefault $body.phone) -MaxLength 40
      if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($phone)) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Имя и телефон обязательны" }
        continue
      }

      $createdAt = [DateTime]::UtcNow.ToString("o")
      $lead = @{
        id = New-RecordId
        name = $name
        phone = $phone
        email = Sanitize-Input -Value (Get-StringOrDefault $body.email) -MaxLength 160
        service = Sanitize-Input -Value (Get-StringOrDefault $body.service) -MaxLength 160
        message = Sanitize-Input -Value (Get-StringOrDefault $body.message) -MaxLength 1000
        source = Sanitize-Input -Value (Get-StringOrDefault $body.source "admin") -MaxLength 80
        status = Normalize-LeadStatus -Status (Get-StringOrDefault $body.status "новая")
        confirmed = [bool]$body.confirmed
        scheduledAt = Sanitize-Input -Value (Get-StringOrDefault $body.scheduledAt) -MaxLength 80
        adminComment = Sanitize-Input -Value (Get-StringOrDefault $body.comment) -MaxLength 1000
        createdAt = $createdAt
        updatedAt = $createdAt
        history = @()
      }

      Add-LeadHistoryEntry -Lead $lead -Actor $session.username -Action "Создана заявка вручную" -FromStatus "" -ToStatus $lead.status -Comment (Get-StringOrDefault $lead.adminComment) -ScheduledAt (Get-StringOrDefault $lead.scheduledAt) -Confirmed ([bool]$lead.confirmed)
      $script:Leads = @($lead) + @($Leads)
      Upsert-ClientFromLead -Lead $lead | Out-Null
      Save-State
      Add-Log -Action "lead.created.admin" -Actor $session.username -Message "Создана заявка из админки" -Meta @{ leadId = $lead.id; status = $lead.status }
      Send-Json -Response $response -StatusCode 201 -Data @{ ok = $true; item = $lead }
      continue
    }

    if ($path -match "^/api/admin/leads/([a-z0-9]+)$" -and $method -eq "PATCH") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      $leadId = $Matches[1]
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      $lead = $Leads | Where-Object { $_.id -eq $leadId } | Select-Object -First 1
      if (-not $lead) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Заявка не найдена" }
        continue
      }

      $previousStatus = Normalize-LeadStatus -Status (Get-StringOrDefault $lead.status)
      $nextStatus = if ($body.status) { Normalize-LeadStatus -Status ([string]$body.status) } else { $previousStatus }
      $changes = @()

      if ($body.name -ne $null) {
        $lead.name = Sanitize-Input -Value ([string]$body.name) -MaxLength 160
        $changes += "имя"
      }
      if ($body.phone -ne $null) {
        $lead.phone = Sanitize-Input -Value ([string]$body.phone) -MaxLength 40
        $changes += "телефон"
      }
      if ($body.email -ne $null) {
        $lead.email = Sanitize-Input -Value ([string]$body.email) -MaxLength 160
        $changes += "email"
      }
      if ($body.service -ne $null) {
        $lead.service = Sanitize-Input -Value ([string]$body.service) -MaxLength 160
        $changes += "услуга"
      }
      if ($body.source -ne $null) {
        $lead.source = Sanitize-Input -Value ([string]$body.source) -MaxLength 80
        $changes += "источник"
      }
      if ($body.message -ne $null) {
        $lead.message = Sanitize-Input -Value ([string]$body.message) -MaxLength 1000
        $changes += "сообщение"
      }
      if ($body.scheduledAt -ne $null) {
        $lead.scheduledAt = Sanitize-Input -Value ([string]$body.scheduledAt) -MaxLength 80
        $changes += "дата/время"
      }
      if ($body.confirmed -ne $null) {
        $lead.confirmed = [bool]$body.confirmed
        $changes += "подтверждение"
      }
      if ($body.comment -ne $null) {
        $lead.adminComment = Sanitize-Input -Value ([string]$body.comment) -MaxLength 1000
        $changes += "комментарий"
      }
      if ($body.status) {
        $lead.status = $nextStatus
        $changes += "статус"
      }

      $lead.updatedAt = [DateTime]::UtcNow.ToString("o")
      $commentText = Get-StringOrDefault $lead.adminComment
      $historyAction = if (@($changes).Count -gt 0) {
        "Обновлена заявка: $($changes -join ', ')"
      } else {
        "Карточка заявки просмотрена"
      }
      Add-LeadHistoryEntry -Lead $lead -Actor $session.username -Action $historyAction -FromStatus $previousStatus -ToStatus $lead.status -Comment $commentText -ScheduledAt (Get-StringOrDefault $lead.scheduledAt) -Confirmed ([bool]$lead.confirmed)
      Upsert-ClientFromLead -Lead $lead | Out-Null
      Save-State
      Add-Log -Action "lead.updated" -Actor $session.username -Message "Обновлена CRM-карточка заявки" -Meta @{ leadId = $lead.id; status = $lead.status; confirmed = $lead.confirmed }
      Send-Json -Response $response -Data @{ ok = $true; item = $lead }
      continue
    }

    if ($path -match "^/api/admin/leads/([a-z0-9]+)$" -and $method -eq "DELETE") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      $leadId = $Matches[1]
      $lead = $Leads | Where-Object { $_.id -eq $leadId } | Select-Object -First 1
      if (-not $lead) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Заявка не найдена" }
        continue
      }
      $script:Leads = @($Leads | Where-Object { $_.id -ne $leadId })
      $script:Clients = @()
      foreach ($leadItem in @($script:Leads)) {
        $leadItem.clientId = ""
        Upsert-ClientFromLead -Lead $leadItem | Out-Null
      }
      Save-State
      Add-Log -Action "lead.deleted" -Actor $session.username -Message "Удалена заявка" -Meta @{ leadId = $leadId; name = $lead.name }
      Send-Json -Response $response -Data @{ ok = $true }
      continue
    }

    if ($path -eq "/api/admin/clients" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      Send-Json -Response $response -Data @{ items = $Clients }
      continue
    }

    if ($path -eq "/api/admin/users" -and $method -eq "GET") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      $safeUsers = @($Users | ForEach-Object {
        @{
          id = $_.id
          username = $_.username
          email = $_.email
          role = if ($_.role) { $_.role } else { "moderator" }
          mustChangePassword = [bool]$_.mustChangePassword
          createdAt = $_.createdAt
        }
      })
      Send-Json -Response $response -Data @{ items = $safeUsers }
      continue
    }

    if ($path -eq "/api/admin/users" -and $method -eq "POST") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      $username = Sanitize-Input -Value (Get-StringOrDefault $body.username) -MaxLength 80
      $email = Sanitize-Input -Value (Get-StringOrDefault $body.email) -MaxLength 160
      $role = if ((Get-StringOrDefault $body.role) -eq "admin") { "admin" } else { "moderator" }
      $password = Get-StringOrDefault $body.password
      if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($email)) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Укажите логин и e-mail" }
        continue
      }
      if ([string]::IsNullOrWhiteSpace($password) -or $password.Length -lt 8) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Пароль должен быть не короче 8 символов" }
        continue
      }
      if ($Users | Where-Object { $_.username -eq $username } | Select-Object -First 1) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Такой логин уже используется" }
        continue
      }
      $userItem = @{
        id = New-RecordId
        username = $username
        email = $email
        passwordHash = (Get-Sha256Hash $password)
        role = $role
        mustChangePassword = $false
        createdAt = [DateTime]::UtcNow.ToString("o")
      }
      $script:Users = @($userItem) + @($Users)
      Save-State
      Add-Log -Action "user.created" -Actor $session.username -Message "Создан пользователь" -Meta @{ username = $username; role = $role }
      Send-Json -Response $response -StatusCode 201 -Data @{ ok = $true }
      continue
    }

    if ($path -match "^/api/admin/users/([a-z0-9]+)$") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      $userId = $Matches[1]
      $targetUser = $Users | Where-Object { $_.id -eq $userId } | Select-Object -First 1
      if (-not $targetUser) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Пользователь не найден" }
        continue
      }

      if ($method -eq "PUT") {
        try {
          $body = Get-JsonBody -Request $request
        } catch {
          Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
          continue
        }
        $username = Sanitize-Input -Value (Get-StringOrDefault $body.username) -MaxLength 80
        $email = Sanitize-Input -Value (Get-StringOrDefault $body.email) -MaxLength 160
        $role = if ((Get-StringOrDefault $body.role) -eq "admin") { "admin" } else { "moderator" }
        $password = Get-StringOrDefault $body.password
        if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($email)) {
          Send-Json -Response $response -StatusCode 422 -Data @{ error = "Укажите логин и e-mail" }
          continue
        }
        if ($Users | Where-Object { $_.username -eq $username -and $_.id -ne $targetUser.id } | Select-Object -First 1) {
          Send-Json -Response $response -StatusCode 422 -Data @{ error = "Такой логин уже используется" }
          continue
        }
        $targetUser.username = $username
        $targetUser.email = $email
        $targetUser.role = $role
        if (-not [string]::IsNullOrWhiteSpace($password)) {
          if ($password.Length -lt 8) {
            Send-Json -Response $response -StatusCode 422 -Data @{ error = "Пароль должен быть не короче 8 символов" }
            continue
          }
          $targetUser.passwordHash = (Get-Sha256Hash $password)
        }
        Save-State
        Add-Log -Action "user.updated" -Actor $session.username -Message "Обновлён пользователь" -Meta @{ username = $username; role = $role }
        Send-Json -Response $response -Data @{ ok = $true }
        continue
      }

      if ($method -eq "DELETE") {
        if ($targetUser.username -eq "admin") {
          Send-Json -Response $response -StatusCode 422 -Data @{ error = "Основного администратора нельзя удалить" }
          continue
        }
        $script:Users = @($Users | Where-Object { $_.id -ne $userId })
        $script:Sessions = @($Sessions | Where-Object { $_.userId -ne $userId })
        Save-State
        Add-Log -Action "user.deleted" -Actor $session.username -Message "Удалён пользователь" -Meta @{ username = $targetUser.username }
        Send-Json -Response $response -Data @{ ok = $true }
        continue
      }
    }

    if ($path -eq "/api/admin/export.xlsx" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }

      $leadRows = foreach ($leadItem in @($Leads)) {
        $historySummary = @(
          Ensure-Array $leadItem.history | ForEach-Object {
            "{0}: {1} → {2} ({3})" -f (Get-StringOrDefault $_.at), (Get-StringOrDefault $_.fromStatus), (Get-StringOrDefault $_.toStatus), (Get-StringOrDefault $_.action)
          }
        ) -join " | "

        @(
          (Get-StringOrDefault $leadItem.id),
          (Get-StringOrDefault $leadItem.createdAt),
          (Get-StringOrDefault $leadItem.updatedAt),
          (Get-StringOrDefault $leadItem.status),
          (if ([bool]$leadItem.confirmed) { "Да" } else { "Нет" }),
          (Get-StringOrDefault $leadItem.scheduledAt),
          (Get-StringOrDefault $leadItem.source),
          (Get-StringOrDefault $leadItem.name),
          (Get-StringOrDefault $leadItem.phone),
          (Get-StringOrDefault $leadItem.email),
          (Get-StringOrDefault $leadItem.service),
          (Get-StringOrDefault $leadItem.message),
          (Get-StringOrDefault $leadItem.adminComment),
          (Get-StringOrDefault $leadItem.clientId),
          $historySummary
        )
      }

      $clientRows = foreach ($clientItem in @($Clients)) {
        @(
          (Get-StringOrDefault $clientItem.id),
          (Get-StringOrDefault $clientItem.name),
          (Get-StringOrDefault $clientItem.phone),
          (Get-StringOrDefault $clientItem.email),
          (Get-StringOrDefault $clientItem.firstLeadAt),
          (Get-StringOrDefault $clientItem.lastLeadAt),
          (Get-StringOrDefault $clientItem.lastService),
          (Get-StringOrDefault $clientItem.lastStatus),
          (if ([bool]$clientItem.confirmed) { "Да" } else { "Нет" }),
          (Get-StringOrDefault $clientItem.scheduledAt),
          ([string]([int]$clientItem.leadsCount)),
          (Get-StringOrDefault $clientItem.lastComment),
          (Get-StringOrDefault $clientItem.source)
        )
      }

      $bytes = New-CrmExportWorkbookBytes -LeadRows $leadRows -ClientRows $clientRows
      Add-Log -Action "crm.export" -Actor $session.username -Message "Экспортирована CRM-база в Excel"
      Send-BytesResponse -Response $response -StatusCode 200 -Bytes $bytes -ContentType "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -FileName "aquablesk-crm.xlsx"
      continue
    }

    if ($path -eq "/api/admin/logs" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      Send-Json -Response $response -Data @{ items = $Logs }
      continue
    }

    if ($path -eq "/api/admin/settings" -and $method -eq "GET") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      Send-Json -Response $response -Data $Settings
      continue
    }

    if ($path -eq "/api/admin/settings" -and $method -eq "PUT") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      if (-not $body) {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Пустые данные" }
        continue
      }
      $script:Settings = Normalize-Settings $body
      Save-State
      Add-Log -Action "settings.updated" -Actor $session.username -Message "Обновлены настройки сайта"
      Send-Json -Response $response -Data @{ ok = $true; settings = $Settings }
      continue
    }

    if ($path -eq "/api/admin/reviews" -and $method -eq "GET") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      Send-Json -Response $response -Data @{ items = $Reviews }
      continue
    }

    if ($path -eq "/api/admin/reviews" -and $method -eq "POST") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      $ratingValue = 5
      if ($null -ne $body.rating) { $ratingValue = [int]$body.rating }
        $item = @{
          id = New-RecordId
          author = Sanitize-Input -Value ([string]$body.author) -MaxLength 120
          source = Sanitize-Input -Value ([string]$body.source) -MaxLength 120
          rating = $ratingValue
          text = Sanitize-Input -Value ([string]$body.text) -MaxLength 500
          published = [bool]($body.published -ne $false)
          publishedAt = Get-StringOrDefault $body.publishedAt ([DateTime]::UtcNow.ToString("o"))
          link = Sanitize-Input -Value ([string]$body.link) -MaxLength 500
          qrBinding = Sanitize-Input -Value ([string]$body.qrBinding) -MaxLength 32
          createdAt = [DateTime]::UtcNow.ToString("o")
        }
        $script:Reviews = @($item) + @($script:Reviews)
        Save-State
        Add-Log -Action "review.created" -Actor $session.username -Message "Добавлен отзыв" -Meta @{ reviewId = $item.id }
        Send-Json -Response $response -StatusCode 201 -Data @{ ok = $true; item = $item }
        continue
      }

      if ($path -eq "/api/admin/reviews/reorder" -and $method -eq "POST") {
        $session = Require-Role -Request $request -Response $response -Roles @("admin")
        if (-not $session) { continue }
        try {
          $body = Get-JsonBody -Request $request
        } catch {
          Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
          continue
        }
        $ids = @()
        if ($body.ids) { $ids = @(Ensure-Array $body.ids) }
        if (-not $ids.Count) {
          Send-Json -Response $response -StatusCode 400 -Data @{ error = "Порядок отзывов не передан" }
          continue
        }
        $ordered = New-Object System.Collections.ArrayList
        foreach ($id in $ids) {
          $item = $Reviews | Where-Object { $_.id -eq $id } | Select-Object -First 1
          if ($item) { [void]$ordered.Add($item) }
        }
        foreach ($item in $Reviews) {
          if ($ids -notcontains $item.id) { [void]$ordered.Add($item) }
        }
        $script:Reviews = @($ordered)
        Save-State
        Add-Log -Action "review.reordered" -Actor $session.username -Message "Изменён порядок отзывов"
        Send-Json -Response $response -Data @{ ok = $true; items = $Reviews }
        continue
      }

      if ($path -match "^/api/admin/reviews/([a-z0-9]+)$") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      $reviewId = $Matches[1]
      $item = $Reviews | Where-Object { $_.id -eq $reviewId } | Select-Object -First 1
      if (-not $item) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Отзыв не найден" }
        continue
      }
      if ($method -eq "PUT") {
        try {
          $body = Get-JsonBody -Request $request
        } catch {
          Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
          continue
        }
        $ratingValue = 5
        if ($null -ne $body.rating) { $ratingValue = [int]$body.rating }
          $item.author = Sanitize-Input -Value ([string]$body.author) -MaxLength 120
          $item.source = Sanitize-Input -Value ([string]$body.source) -MaxLength 120
          $item.rating = $ratingValue
          $item.text = Sanitize-Input -Value ([string]$body.text) -MaxLength 500
          $item.published = [bool]($body.published -ne $false)
          $item.publishedAt = Get-StringOrDefault $body.publishedAt $item.publishedAt
          $item.link = Sanitize-Input -Value ([string]$body.link) -MaxLength 500
          $item.qrBinding = Sanitize-Input -Value ([string]$body.qrBinding) -MaxLength 32
          Save-State
          Add-Log -Action "review.updated" -Actor $session.username -Message "Обновлён отзыв" -Meta @{ reviewId = $item.id }
          Send-Json -Response $response -Data @{ ok = $true; item = $item }
        continue
      }
      if ($method -eq "DELETE") {
        $script:Reviews = @($Reviews | Where-Object { $_.id -ne $reviewId })
        Save-State
        Add-Log -Action "review.deleted" -Actor $session.username -Message "Удалён отзыв" -Meta @{ reviewId = $reviewId }
        Send-Json -Response $response -Data @{ ok = $true }
        continue
      }
    }

    if ($path -eq "/api/admin/before-after" -and $method -eq "GET") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      Send-Json -Response $response -Data @{ items = $BeforeAfter }
      continue
    }

    if ($path -eq "/api/admin/before-after" -and $method -eq "POST") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      $item = @{
        id = New-RecordId
        title = Sanitize-Input -Value ([string]$body.title) -MaxLength 160
        before = Sanitize-Input -Value ([string]$body.before) -MaxLength 500
        after = Sanitize-Input -Value ([string]$body.after) -MaxLength 500
        published = [bool]($body.published -ne $false)
      }
      $script:BeforeAfter = @($item) + @($script:BeforeAfter)
      Save-State
      Add-Log -Action "beforeafter.created" -Actor $session.username -Message "Добавлена пара before/after" -Meta @{ itemId = $item.id }
      Send-Json -Response $response -StatusCode 201 -Data @{ ok = $true; item = $item }
      continue
    }

    if ($path -eq "/api/admin/before-after/reorder" -and $method -eq "POST") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      $ids = @()
      if ($body.ids) { $ids = @(Ensure-Array $body.ids) }
      if (-not $ids.Count) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Передайте порядок элементов" }
        continue
      }
      $ordered = @()
      foreach ($idValue in $ids) {
        $item = $BeforeAfter | Where-Object { $_.id -eq [string]$idValue } | Select-Object -First 1
        if ($item) { $ordered += $item }
      }
      foreach ($item in @($BeforeAfter)) {
        if (-not ($ids -contains $item.id)) { $ordered += $item }
      }
      $script:BeforeAfter = @($ordered)
      Save-State
      Add-Log -Action "beforeafter.reordered" -Actor $session.username -Message "Изменён порядок before/after"
      Send-Json -Response $response -Data @{ ok = $true; items = $BeforeAfter }
      continue
    }

    if ($path -match "^/api/admin/before-after/([a-z0-9]+)$") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      $itemId = $Matches[1]
      $item = $BeforeAfter | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
      if (-not $item) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Элемент не найден" }
        continue
      }
      if ($method -eq "PUT") {
        try {
          $body = Get-JsonBody -Request $request
        } catch {
          Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
          continue
        }
        $item.title = Sanitize-Input -Value ([string]$body.title) -MaxLength 160
        $item.before = Sanitize-Input -Value ([string]$body.before) -MaxLength 500
        $item.after = Sanitize-Input -Value ([string]$body.after) -MaxLength 500
        $item.published = [bool]($body.published -ne $false)
        Save-State
        Add-Log -Action "beforeafter.updated" -Actor $session.username -Message "Обновлена пара before/after" -Meta @{ itemId = $item.id }
        Send-Json -Response $response -Data @{ ok = $true; item = $item }
        continue
      }
      if ($method -eq "DELETE") {
        Remove-UploadFile -RelativePath $item.before
        Remove-UploadFile -RelativePath $item.after
        $script:BeforeAfter = @($BeforeAfter | Where-Object { $_.id -ne $itemId })
        Save-State
        Add-Log -Action "beforeafter.deleted" -Actor $session.username -Message "Удалена пара before/after" -Meta @{ itemId = $itemId }
        Send-Json -Response $response -Data @{ ok = $true }
        continue
      }
    }

    if ($path -eq "/api/admin/upload" -and $method -eq "POST") {
      $session = Require-Auth -Request $request -Response $response
      if (-not $session) { continue }
      $clientIp = Get-ClientAddress -Request $request
      if (-not (Test-RateLimit -Key "upload:$clientIp" -Limit 20 -WindowSeconds 600)) {
        Send-Json -Response $response -StatusCode 429 -Data @{ error = "Слишком много загрузок. Повторите позже." }
        continue
      }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      try {
        $relativePath = Save-UploadFromDataUrl -Body $body
        Add-Log -Action "upload.created" -Actor $session.username -Message "Загружен файл" -Meta @{ path = $relativePath }
        Send-Json -Response $response -StatusCode 201 -Data @{ ok = $true; path = $relativePath }
      } catch {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = $_.Exception.Message }
      }
      continue
    }

    if ($path -eq "/api/admin/password" -and $method -eq "POST") {
      $session = Require-Role -Request $request -Response $response -Roles @("admin")
      if (-not $session) { continue }
      try {
        $body = Get-JsonBody -Request $request
      } catch {
        Send-Json -Response $response -StatusCode 400 -Data @{ error = "Некорректный формат данных" }
        continue
      }
      $user = $Users | Where-Object { $_.username -eq $session.username } | Select-Object -First 1
      if (-not $user) {
        Send-Json -Response $response -StatusCode 404 -Data @{ error = "Пользователь не найден" }
        continue
      }
      if ($user.passwordHash -ne (Get-Sha256Hash ([string]$body.currentPassword))) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Текущий пароль неверный" }
        continue
      }

      $nextUsername = Sanitize-Input -Value (Get-StringOrDefault $body.username) -MaxLength 80
      $nextEmail = Sanitize-Input -Value (Get-StringOrDefault $body.email) -MaxLength 160
      $nextPassword = [string]$body.newPassword

      if ([string]::IsNullOrWhiteSpace($nextUsername) -or $nextUsername.Length -lt 3) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Логин должен быть не короче 3 символов" }
        continue
      }

      if ([string]::IsNullOrWhiteSpace($nextEmail) -or ($nextEmail -notmatch "^[^\s@]+@[^\s@]+\.[^\s@]+$")) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Укажите корректный e-mail" }
        continue
      }

      $duplicateUser = $Users | Where-Object { $_.username -eq $nextUsername -and $_.id -ne $user.id } | Select-Object -First 1
      if ($duplicateUser) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Такой логин уже используется" }
        continue
      }

      if ([string]::IsNullOrWhiteSpace($nextPassword) -or $nextPassword.Length -lt 8) {
        Send-Json -Response $response -StatusCode 422 -Data @{ error = "Новый пароль должен быть не короче 8 символов" }
        continue
      }

      $oldUsername = $user.username
      $user.username = $nextUsername
      $user.email = $nextEmail
      $user.passwordHash = Get-Sha256Hash $nextPassword
      $user.mustChangePassword = $false
      $script:Sessions = @($Sessions | Where-Object { $_.userId -ne $user.id })
      Save-State
      Add-Log -Action "auth.passwordChanged" -Actor $oldUsername -Message "Учётные данные администратора изменены" -Meta @{ newUsername = $nextUsername }
      Send-Json -Response $response -Data @{ ok = $true; message = "Данные обновлены. Выполните вход заново." }
      continue
    }

    $safeRelative = if ($path -eq "/") { "index.html" } elseif ($path -eq "/admin" -or $path -eq "/admin/") { "admin/index.html" } else { $path.TrimStart('/') }
    $fullPath = Join-Path $ProjectRoot ($safeRelative.Replace('/', '\'))
    if ($fullPath.StartsWith($ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $fullPath -PathType Leaf)) {
      Send-FileResponse -Response $response -Path $fullPath
      continue
    }

    $notFoundPath = Join-Path $ProjectRoot "404.html"
    if (Test-Path $notFoundPath -PathType Leaf) {
      $response.StatusCode = 404
      $response.ContentType = "text/html; charset=utf-8"
      $response.ContentEncoding = [System.Text.Encoding]::UTF8
      $bytes = [System.IO.File]::ReadAllBytes($notFoundPath)
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
      $response.Close()
    } else {
      Send-Text -Response $response -StatusCode 404 -Text "Not found"
    }
  } catch {
    try {
      if ($context -and $context.Response -and $context.Response.OutputStream.CanWrite) {
        Send-Json -Response $context.Response -StatusCode 500 -Data @{ error = $_.Exception.Message }
      }
    } catch { }
    Add-Log -Action "server.error" -Message $_.Exception.Message
  }
}

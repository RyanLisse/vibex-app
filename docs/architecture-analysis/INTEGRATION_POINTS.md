# Integration Points & Data Flows

## 🔌 System Integration Map

### External Service Integrations
```mermaid
graph TB
    App[Codex Clone Application]
    
    subgraph "AI Services"
        OpenAI[OpenAI API]
        Gemini[Google Gemini]
        Anthropic[Anthropic API]
        VibeKit[VibeKit SDK]
    end
    
    subgraph "Authentication Providers"
        GitHubAuth[GitHub OAuth]
        OpenAIAuth[OpenAI OAuth]
        AnthropicAuth[Anthropic OAuth]
    end
    
    subgraph "Database & Sync"
        NeonDB[Neon PostgreSQL]
        ElectricSQL[ElectricSQL Service]
        PGlite[Local PGlite]
    end
    
    subgraph "Event Processing"
        Inngest[Inngest Platform]
        Realtime[Real-time Channels]
    end
    
    subgraph "Observability"
        OpenTelemetry[OpenTelemetry Collector]
        Metrics[Metrics Collection]
        Logs[Structured Logging]
    end
    
    App --> OpenAI
    App --> Gemini
    App --> Anthropic
    App --> VibeKit
    
    App --> GitHubAuth
    App --> OpenAIAuth
    App --> AnthropicAuth
    
    App --> ElectricSQL
    ElectricSQL --> NeonDB
    App --> PGlite
    
    App --> Inngest
    Inngest --> Realtime
    
    App --> OpenTelemetry
    OpenTelemetry --> Metrics
    OpenTelemetry --> Logs
    
    style OpenAI fill:#74aa9c
    style Gemini fill:#4285f4
    style Anthropic fill:#ff6b35
    style NeonDB fill:#00e5ff
    style ElectricSQL fill:#9c27b0
    style Inngest fill:#ff9800
```

## 📊 Data Flow Architecture

### Task Creation & Processing Flow
```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant API as API Routes
    participant DB as Database Layer
    participant Electric as ElectricSQL
    participant Inngest as Inngest Events
    participant AI as AI Services
    participant Obs as Observability
    
    Note over UI,Obs: Task Creation Flow
    
    UI->>API: POST /api/tasks
    API->>Obs: Start tracing
    API->>DB: Validate & insert task
    DB-->>API: Task created
    API->>Electric: Sync to local/remote
    Electric-->>UI: Real-time update
    API->>Inngest: Trigger task.created event
    
    Note over Inngest,AI: Background Processing
    
    Inngest->>AI: Process with VibeKit
    AI->>AI: Generate code/solution
    AI-->>Inngest: Stream results
    Inngest-->>UI: Real-time updates
    Inngest->>DB: Update task status
    DB->>Electric: Sync changes
    Electric-->>UI: Live status update
    
    Note over API,Obs: Monitoring
    
    API->>Obs: Record metrics
    Obs->>Obs: Track performance
```

### Authentication Flow with Multi-Provider Support
```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> GitHubFlow: Select GitHub
    Unauthenticated --> OpenAIFlow: Select OpenAI
    Unauthenticated --> AnthropicFlow: Select Anthropic
    
    state GitHubFlow {
        [*] --> GeneratePKCE
        GeneratePKCE --> RedirectToGitHub
        RedirectToGitHub --> ReceiveCallback
        ReceiveCallback --> ExchangeToken
        ExchangeToken --> StoreTokens
    }
    
    state OpenAIFlow {
        [*] --> GeneratePKCE2
        GeneratePKCE2 --> RedirectToOpenAI
        RedirectToOpenAI --> ReceiveCallback2
        ReceiveCallback2 --> ExchangeToken2
        ExchangeToken2 --> StoreTokens2
    }
    
    state AnthropicFlow {
        [*] --> GeneratePKCE3
        GeneratePKCE3 --> RedirectToAnthropic
        RedirectToAnthropic --> ReceiveCallback3
        ReceiveCallback3 --> ExchangeToken3
        ExchangeToken3 --> StoreTokens3
    }
    
    GitHubFlow --> Authenticated
    OpenAIFlow --> Authenticated
    AnthropicFlow --> Authenticated
    
    Authenticated --> [*]: Logout
```

## 🔧 API Integration Points

### Core API Routes Structure
```
/api
├── auth/                   # Authentication endpoints
│   ├── github/            # GitHub OAuth flow
│   ├── openai/            # OpenAI OAuth flow
│   └── anthropic/         # Anthropic OAuth flow
├── tasks/                 # Task management
│   ├── [id]/             # Individual task operations
│   └── route.ts          # CRUD operations
├── agents/                # Agent management
│   ├── brainstorm/       # Voice brainstorming
│   └── voice/            # Voice processing
├── ai/                    # AI service integrations
│   └── gemini/           # Google Gemini endpoints
├── electric/              # ElectricSQL operations
│   └── query/            # Real-time queries
└── inngest/              # Event processing
```

### Database Integration Architecture
```mermaid
erDiagram
    Users ||--o{ Tasks : creates
    Users ||--o{ Sessions : has
    Tasks ||--o{ TaskExecutions : triggers
    Tasks }|--|| Repositories : belongs_to
    
    Users {
        string id PK
        string email
        string name
        string avatar_url
        timestamp created_at
        timestamp updated_at
    }
    
    Tasks {
        string id PK
        string user_id FK
        string title
        text description
        string status
        string priority
        string repository
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
    }
    
    Sessions {
        string id PK
        string user_id FK
        string provider
        text access_token
        text refresh_token
        timestamp expires_at
        timestamp created_at
    }
    
    TaskExecutions {
        string id PK
        string task_id FK
        string session_id
        text stdout
        text stderr
        string status
        timestamp started_at
        timestamp completed_at
    }
    
    Repositories {
        string id PK
        string owner
        string name
        string default_branch
        boolean private
        timestamp created_at
    }
```

## 📡 Real-time Sync Integration

### ElectricSQL Sync Flow
```mermaid
graph TB
    subgraph "Client Side"
        ReactApp[React Application]
        PGliteDB[(PGlite Local DB)]
        ElectricClient[ElectricSQL Client]
    end
    
    subgraph "Server Side"
        ElectricService[ElectricSQL Service]
        NeonDB[(Neon PostgreSQL)]
        APIRoutes[API Routes]
    end
    
    subgraph "Sync Layer"
        ConflictResolution[Conflict Resolution]
        OfflineQueue[Offline Queue]
        ChangeLog[Change Log]
    end
    
    ReactApp --> ElectricClient
    ElectricClient --> PGliteDB
    ElectricClient <--> ElectricService
    ElectricService <--> NeonDB
    
    ElectricClient --> ConflictResolution
    ElectricClient --> OfflineQueue
    ElectricService --> ChangeLog
    
    APIRoutes --> NeonDB
    APIRoutes --> ElectricService
    
    style PGliteDB fill:#e1f5fe
    style NeonDB fill:#00e5ff
    style ElectricService fill:#9c27b0
```

## 🎯 Event-Driven Architecture

### Inngest Event Flow
```mermaid
graph LR
    subgraph "Event Sources"
        API[API Routes]
        UI[User Interface]
        Cron[Scheduled Jobs]
        Webhook[External Webhooks]
    end
    
    subgraph "Event Processing"
        InngestPlatform[Inngest Platform]
        EventQueue[Event Queue]
        Functions[Function Handlers]
    end
    
    subgraph "Event Handlers"
        TaskCreation[create-task]
        TaskControl[task-control]
        VoiceBrainstorm[voice-brainstorm]
        StatusUpdate[status-update]
    end
    
    subgraph "Real-time Updates"
        Channels[Real-time Channels]
        WebSocket[WebSocket Connections]
        SSE[Server-Sent Events]
    end
    
    API --> InngestPlatform
    UI --> InngestPlatform
    Cron --> InngestPlatform
    Webhook --> InngestPlatform
    
    InngestPlatform --> EventQueue
    EventQueue --> Functions
    
    Functions --> TaskCreation
    Functions --> TaskControl
    Functions --> VoiceBrainstorm
    Functions --> StatusUpdate
    
    TaskCreation --> Channels
    TaskControl --> Channels
    VoiceBrainstorm --> Channels
    StatusUpdate --> Channels
    
    Channels --> WebSocket
    Channels --> SSE
    
    style InngestPlatform fill:#ff9800
    style Channels fill:#4caf50
```

## 🔐 Security Integration Points

### Authentication & Authorization Flow
```mermaid
graph TB
    subgraph "Client Security"
        CSRF[CSRF Protection]
        StateValidation[OAuth State Validation]
        PKCE[PKCE Implementation]
        TokenStorage[Secure Token Storage]
    end
    
    subgraph "Server Security"
        JWTValidation[JWT Token Validation]
        RateLimit[Rate Limiting]
        InputValidation[Input Validation]
        SQLInjection[SQL Injection Prevention]
    end
    
    subgraph "Transport Security"
        HTTPS[HTTPS/TLS 1.3]
        HeaderSecurity[Security Headers]
        CORS[CORS Configuration]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption]
        SecretManagement[Secret Management]
        Auditing[Security Auditing]
    end
    
    Client[Client Application] --> CSRF
    CSRF --> StateValidation
    StateValidation --> PKCE
    PKCE --> TokenStorage
    
    Server[Server Application] --> JWTValidation
    JWTValidation --> RateLimit
    RateLimit --> InputValidation
    InputValidation --> SQLInjection
    
    Network[Network Layer] --> HTTPS
    HTTPS --> HeaderSecurity
    HeaderSecurity --> CORS
    
    Storage[Data Storage] --> Encryption
    Encryption --> SecretManagement
    SecretManagement --> Auditing
    
    style PKCE fill:#4caf50
    style JWTValidation fill:#ff9800
    style Encryption fill:#f44336
```

## 📊 Monitoring & Observability Integration

### Telemetry Data Flow
```mermaid
graph TB
    subgraph "Application Layer"
        Components[React Components]
        APIRoutes[API Routes]
        Services[Business Services]
        Database[Database Operations]
    end
    
    subgraph "Observability Layer"
        ObservabilityService[Observability Service]
        OpenTelemetry[OpenTelemetry API]
        Metrics[Metrics Collection]
        Events[Event Logging]
    end
    
    subgraph "Data Collection"
        Traces[Distributed Traces]
        Logs[Structured Logs]
        MetricsStore[Metrics Store]
        Errors[Error Tracking]
    end
    
    subgraph "Analysis & Alerting"
        Dashboard[Performance Dashboard]
        Alerts[Alert System]
        Analytics[Usage Analytics]
        Reports[Health Reports]
    end
    
    Components --> ObservabilityService
    APIRoutes --> ObservabilityService
    Services --> ObservabilityService
    Database --> ObservabilityService
    
    ObservabilityService --> OpenTelemetry
    OpenTelemetry --> Metrics
    OpenTelemetry --> Events
    
    Metrics --> Traces
    Events --> Logs
    ObservabilityService --> MetricsStore
    ObservabilityService --> Errors
    
    Traces --> Dashboard
    Logs --> Analytics
    MetricsStore --> Reports
    Errors --> Alerts
    
    style ObservabilityService fill:#9c27b0
    style OpenTelemetry fill:#4caf50
    style Dashboard fill:#2196f3
```

## 🔄 Integration Configuration

### Environment Configuration
```yaml
# Database Integration
DATABASE_URL: neon://user:pass@host/db
ELECTRIC_URL: electric://sync-service
ELECTRIC_AUTH_TOKEN: secure-token

# AI Service Integration
OPENAI_API_KEY: sk-xxx
GOOGLE_AI_API_KEY: AIzaSyXXX
LETTA_API_KEY: letta-xxx

# Authentication Integration
GITHUB_CLIENT_ID: client-id
GITHUB_CLIENT_SECRET: client-secret
OPENAI_CLIENT_ID: openai-client-id
ANTHROPIC_CLIENT_ID: anthropic-client-id

# Event Processing
INNGEST_EVENT_KEY: evt_xxx
INNGEST_SIGNING_KEY: signkey_xxx

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT: http://collector:4317
LOGGING_LEVEL: info
```

### Service Health Checks
```mermaid
graph LR
    HealthCheck[Health Check Service]
    
    HealthCheck --> DatabaseHealth[Database Health]
    HealthCheck --> ElectricHealth[ElectricSQL Health]
    HealthCheck --> InngestHealth[Inngest Health]
    HealthCheck --> AIHealth[AI Services Health]
    HealthCheck --> AuthHealth[Auth Services Health]
    
    DatabaseHealth --> |Status| HealthCheck
    ElectricHealth --> |Status| HealthCheck
    InngestHealth --> |Status| HealthCheck
    AIHealth --> |Status| HealthCheck
    AuthHealth --> |Status| HealthCheck
    
    HealthCheck --> Dashboard[Health Dashboard]
    HealthCheck --> Alerts[Alert System]
    
    style HealthCheck fill:#4caf50
    style Dashboard fill:#2196f3
    style Alerts fill:#ff9800
```

## 🚀 Deployment Integration Points

### Container Architecture
```mermaid
graph TB
    subgraph "Production Environment"
        LoadBalancer[Load Balancer]
        
        subgraph "Application Tier"
            NextJSApp[Next.js Application]
            APIGateway[API Gateway]
        end
        
        subgraph "Database Tier"
            NeonDB[(Neon PostgreSQL)]
            ElectricSync[ElectricSQL Sync]
            Redis[(Redis Cache)]
        end
        
        subgraph "Service Tier"
            InngestWorkers[Inngest Workers]
            AIGateway[AI Service Gateway]
            AuthProxy[Auth Proxy]
        end
        
        subgraph "Monitoring Tier"
            OTELCollector[OTEL Collector]
            MetricsDB[(Metrics Database)]
            LogStorage[(Log Storage)]
        end
    end
    
    LoadBalancer --> NextJSApp
    LoadBalancer --> APIGateway
    
    NextJSApp --> ElectricSync
    APIGateway --> NeonDB
    APIGateway --> Redis
    
    APIGateway --> InngestWorkers
    APIGateway --> AIGateway
    APIGateway --> AuthProxy
    
    NextJSApp --> OTELCollector
    APIGateway --> OTELCollector
    OTELCollector --> MetricsDB
    OTELCollector --> LogStorage
    
    style NextJSApp fill:#000000,color:#ffffff
    style NeonDB fill:#00e5ff
    style ElectricSync fill:#9c27b0
    style InngestWorkers fill:#ff9800
```

---

*Integration documentation generated on 2025-01-19*
*Version: 1.0.0*
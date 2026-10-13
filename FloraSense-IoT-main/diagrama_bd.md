# Diagrama de Entidad-Relación (Base de Datos)

Este archivo contiene la representación visual de la base de datos PostgreSQL actual.
Puedes visualizarlo directamente en GitHub o usando una extensión de Markdown en VSCode.

```mermaid
erDiagram
    Device ||--o{ Telemetry : "genera"
    Device ||--o{ IrrigationEvent : "registra"
    Device ||--o{ PumpCommand : "recibe"
    Device ||--o{ IrrigationRule : "posee"
    Device ||--o{ SensorCalibration : "tiene"
    User ||--o{ PumpCommand : "solicita"

    Device {
        uuid id PK
        string deviceKey UK
        string name
        string status
        string firmwareVersion
        dateTime lastSeenAt
        dateTime createdAt
    }

    Telemetry {
        bigint id PK
        uuid deviceId FK
        dateTime recordedAt
        float temperatureC
        float airHumidityPct
        int soilMoistureRaw
        float soilMoisturePct
        boolean pumpOn
        int rssi
        int payloadVersion
    }

    IrrigationEvent {
        uuid id PK
        uuid deviceId FK
        uuid commandId
        dateTime startedAt
        dateTime stoppedAt
        int durationSeconds
        string origin
        string stopReason
        string triggeredBy
    }

    PumpCommand {
        uuid id PK
        uuid deviceId FK
        uuid requestedByUserId FK
        string origin
        string action
        int durationSeconds
        string status
        dateTime requestedAt
        dateTime acknowledgedAt
        string error
    }

    IrrigationRule {
        uuid id PK
        uuid deviceId FK
        boolean enabled
        float startBelowPct
        float stopAbovePct
        int maxRuntimeSeconds
        int cooldownSeconds
        string allowedStartTime
        string allowedEndTime
    }

    User {
        uuid id PK
        string name
        string email UK
        string passwordHash
        string role
        dateTime createdAt
        dateTime updatedAt
    }
```

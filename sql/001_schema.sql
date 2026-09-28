IF DB_ID(N'cardboard_plant') IS NULL
BEGIN
    CREATE DATABASE cardboard_plant;
END
GO

USE cardboard_plant;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mill_telemetry')
BEGIN
    CREATE TABLE mill_telemetry (
        id            BIGINT IDENTITY(1,1) PRIMARY KEY,
        ts            DATETIME2 NOT NULL,
        stage_id      VARCHAR(32) NOT NULL,
        line_id       VARCHAR(32) NOT NULL,
        status        VARCHAR(16) NOT NULL,
        speed_mpm     FLOAT NOT NULL,
        throughput_tph FLOAT NOT NULL,
        utilization_pct FLOAT NOT NULL,
        quality_pct   FLOAT NOT NULL,
        alarm_code    VARCHAR(64) NULL,
        source        VARCHAR(32) NOT NULL
    );
    CREATE INDEX ix_mill_telemetry_ts ON mill_telemetry (ts);
    CREATE INDEX ix_mill_telemetry_stage ON mill_telemetry (stage_id, ts);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mill_resources')
BEGIN
    CREATE TABLE mill_resources (
        id            BIGINT IDENTITY(1,1) PRIMARY KEY,
        ts            DATETIME2 NOT NULL,
        stage_id      VARCHAR(32) NOT NULL,
        energy_kwh    FLOAT NOT NULL,
        water_m3      FLOAT NOT NULL,
        steam_bar     FLOAT NOT NULL,
        boiler_pct    FLOAT NOT NULL,
        compressed_air_bar FLOAT NOT NULL,
        material_kg   FLOAT NOT NULL,
        material_type VARCHAR(32) NOT NULL,
        defect_rate   FLOAT NOT NULL,
        output_kg     FLOAT NOT NULL
    );
    CREATE INDEX ix_mill_resources_ts ON mill_resources (ts);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mill_current_state')
BEGIN
    CREATE TABLE mill_current_state (
        stage_id      VARCHAR(32) PRIMARY KEY,
        line_id       VARCHAR(32) NOT NULL,
        status        VARCHAR(16) NOT NULL,
        speed_mpm     FLOAT NOT NULL,
        throughput_tph FLOAT NOT NULL,
        utilization_pct FLOAT NOT NULL,
        quality_pct   FLOAT NOT NULL,
        energy_kwh    FLOAT NOT NULL,
        water_m3      FLOAT NOT NULL,
        steam_bar     FLOAT NOT NULL,
        boiler_pct    FLOAT NOT NULL,
        compressed_air_bar FLOAT NOT NULL,
        material_kg   FLOAT NOT NULL,
        material_type VARCHAR(32) NOT NULL,
        defect_rate   FLOAT NOT NULL,
        output_kg     FLOAT NOT NULL,
        alarm_code    VARCHAR(64) NULL,
        ts            DATETIME2 NOT NULL,
        cycle_id      INT NOT NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'mill_alarm')
BEGIN
    CREATE TABLE mill_alarm (
        alarm_id      INT IDENTITY(1,1) PRIMARY KEY,
        ts            DATETIME2 NOT NULL,
        stage_id      VARCHAR(32) NOT NULL,
        line_id       VARCHAR(32) NOT NULL,
        severity      VARCHAR(16) NOT NULL,
        code          VARCHAR(64) NOT NULL,
        message       VARCHAR(256) NOT NULL,
        acknowledged  BIT NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'replay_state')
BEGIN
    CREATE TABLE replay_state (
        id            INT PRIMARY KEY,
        cycle_id      INT NOT NULL,
        cursor_index  INT NOT NULL,
        as_of         DATETIME2 NOT NULL,
        updated_at    DATETIME2 NOT NULL
    );
END
GO

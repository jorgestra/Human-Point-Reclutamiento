-- =====================================================
-- HUMAN POINT ATS - SQL SERVER MIGRATION SCRIPT COMPLETO
-- Versión: 2.0 (MongoDB → SQL Server)
-- Incluye TODAS las tablas necesarias para el backend FastAPI
-- Ejecutar en orden, una sola vez
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HumanPointATS')
BEGIN
    CREATE DATABASE HumanPointATS;
END
GO

USE HumanPointATS;
GO

-- =====================================================
-- TABLA: ATS_TENANTS
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_TENANTS')
BEGIN
    CREATE TABLE ATS_TENANTS (
        id          NVARCHAR(36)  PRIMARY KEY,
        tenant_code NVARCHAR(50)  NOT NULL UNIQUE,
        company_name NVARCHAR(255) NOT NULL,
        is_active   BIT           DEFAULT 1,
        created_at  DATETIME2     DEFAULT GETUTCDATE(),
        updated_at  DATETIME2     NULL
    );
    CREATE INDEX IX_ATS_TENANTS_code ON ATS_TENANTS(tenant_code);
END
GO

-- =====================================================
-- TABLA: ATS_EMPRESAS (Empresas/Clientes del tenant)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_EMPRESAS')
BEGIN
    CREATE TABLE ATS_EMPRESAS (
        id          NVARCHAR(36)  PRIMARY KEY,
        tenant_id   NVARCHAR(36)  NOT NULL,
        name        NVARCHAR(255) NOT NULL,
        short_name  NVARCHAR(100) NULL,
        rfc         NVARCHAR(50)  NULL,
        address     NVARCHAR(500) NULL,
        phone       NVARCHAR(50)  NULL,
        website     NVARCHAR(255) NULL,
        industry    NVARCHAR(100) NULL,
        is_active   BIT           DEFAULT 1,
        created_at  DATETIME2     DEFAULT GETUTCDATE(),
        created_by  NVARCHAR(36)  NULL,
        updated_at  DATETIME2     NULL,
        updated_by  NVARCHAR(36)  NULL,
        CONSTRAINT FK_EMPRESAS_tenant FOREIGN KEY (tenant_id) REFERENCES ATS_TENANTS(id)
    );
    CREATE INDEX IX_ATS_EMPRESAS_tenant ON ATS_EMPRESAS(tenant_id);
    CREATE UNIQUE INDEX UQ_ATS_EMPRESAS_rfc_tenant ON ATS_EMPRESAS(tenant_id, rfc) WHERE rfc IS NOT NULL;
END
GO

-- =====================================================
-- TABLA: ATS_USERS
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_USERS')
BEGIN
    CREATE TABLE ATS_USERS (
        id            NVARCHAR(36)  PRIMARY KEY,
        tenant_id     NVARCHAR(36)  NOT NULL DEFAULT 'default',
        email         NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        first_name    NVARCHAR(100) NOT NULL,
        last_name     NVARCHAR(100) NOT NULL,
        role          NVARCHAR(50)  NOT NULL DEFAULT 'viewer',
        department    NVARCHAR(100) NULL,
        is_active     BIT           DEFAULT 1,
        created_at    DATETIME2     DEFAULT GETUTCDATE(),
        updated_at    DATETIME2     NULL,
        CONSTRAINT UQ_ATS_USERS_email UNIQUE (email)
    );
    CREATE INDEX IX_ATS_USERS_tenant ON ATS_USERS(tenant_id);
    CREATE INDEX IX_ATS_USERS_email  ON ATS_USERS(email);
END
GO

-- =====================================================
-- TABLA: ATS_HR_PERSONAL (Entrevistadores / Personal RRHH)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_HR_PERSONAL')
BEGIN
    CREATE TABLE ATS_HR_PERSONAL (
        id          NVARCHAR(36)  PRIMARY KEY,
        tenant_id   NVARCHAR(36)  NOT NULL DEFAULT 'default',
        name        NVARCHAR(255) NULL,
        first_name  NVARCHAR(100) NULL,
        last_name   NVARCHAR(100) NULL,
        email       NVARCHAR(255) NULL,
        position    NVARCHAR(255) NULL,
        department  NVARCHAR(100) NULL,
        phone       NVARCHAR(50)  NULL,
        is_active   BIT           DEFAULT 1,
        created_at  DATETIME2     DEFAULT GETUTCDATE(),
        created_by  NVARCHAR(36)  NULL,
        updated_at  DATETIME2     NULL,
        updated_by  NVARCHAR(36)  NULL
    );
    CREATE INDEX IX_ATS_HR_PERSONAL_tenant ON ATS_HR_PERSONAL(tenant_id);
END
GO

-- =====================================================
-- TABLAS: Catálogos de Clasificación de Candidatos
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_NIVELES_PROFESIONALES')
BEGIN
    CREATE TABLE ATS_NIVELES_PROFESIONALES (
        id          NVARCHAR(36)  PRIMARY KEY,
        tenant_id   NVARCHAR(36)  NOT NULL DEFAULT 'default',
        name        NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        [order]     INT           DEFAULT 0,
        is_active   BIT           DEFAULT 1,
        created_at  DATETIME2     DEFAULT GETUTCDATE(),
        created_by  NVARCHAR(36)  NULL,
        updated_at  DATETIME2     NULL,
        updated_by  NVARCHAR(36)  NULL
    );
    CREATE INDEX IX_ATS_NIV_PROF_tenant ON ATS_NIVELES_PROFESIONALES(tenant_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_AREAS_PROFESIONALES')
BEGIN
    CREATE TABLE ATS_AREAS_PROFESIONALES (
        id          NVARCHAR(36)  PRIMARY KEY,
        tenant_id   NVARCHAR(36)  NOT NULL DEFAULT 'default',
        name        NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        is_active   BIT           DEFAULT 1,
        created_at  DATETIME2     DEFAULT GETUTCDATE(),
        created_by  NVARCHAR(36)  NULL,
        updated_at  DATETIME2     NULL,
        updated_by  NVARCHAR(36)  NULL
    );
    CREATE INDEX IX_ATS_AREAS_PROF_tenant ON ATS_AREAS_PROFESIONALES(tenant_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_IDIOMAS')
BEGIN
    CREATE TABLE ATS_IDIOMAS (
        id          NVARCHAR(36)  PRIMARY KEY,
        tenant_id   NVARCHAR(36)  NOT NULL DEFAULT 'default',
        name        NVARCHAR(100) NOT NULL,
        level       NVARCHAR(50)  NULL,
        code        NVARCHAR(10)  NULL,
        is_active   BIT           DEFAULT 1,
        created_at  DATETIME2     DEFAULT GETUTCDATE(),
        created_by  NVARCHAR(36)  NULL,
        updated_at  DATETIME2     NULL,
        updated_by  NVARCHAR(36)  NULL
    );
    CREATE INDEX IX_ATS_IDIOMAS_tenant ON ATS_IDIOMAS(tenant_id);
END
GO

-- =====================================================
-- TABLA: ATS_REQUISICIONES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_REQUISICIONES')
BEGIN
    CREATE TABLE ATS_REQUISICIONES (
        id               NVARCHAR(36)   PRIMARY KEY,
        tenant_id        NVARCHAR(36)   NOT NULL DEFAULT 'default',
        empresa_id       NVARCHAR(36)   NULL,
        title            NVARCHAR(255)  NOT NULL,
        department       NVARCHAR(100)  NOT NULL,
        requesting_area  NVARCHAR(100)  NOT NULL,
        justification    NVARCHAR(MAX)  NOT NULL,
        positions_count  INT            DEFAULT 1,
        salary_min       DECIMAL(18,2)  NOT NULL,
        salary_max       DECIMAL(18,2)  NOT NULL,
        currency         NVARCHAR(10)   DEFAULT 'GTQ',
        job_type         NVARCHAR(50)   DEFAULT 'full_time',
        location         NVARCHAR(255)  NULL,
        requirements     NVARCHAR(MAX)  NULL,
        benefits         NVARCHAR(MAX)  NULL,
        status           NVARCHAR(50)   DEFAULT 'draft',
        vacancy_id       NVARCHAR(36)   NULL,
        created_at       DATETIME2      DEFAULT GETUTCDATE(),
        created_by       NVARCHAR(36)   NULL,
        updated_at       DATETIME2      NULL,
        updated_by       NVARCHAR(36)   NULL
    );
    CREATE INDEX IX_ATS_REQ_tenant   ON ATS_REQUISICIONES(tenant_id);
    CREATE INDEX IX_ATS_REQ_status   ON ATS_REQUISICIONES(status);
    CREATE INDEX IX_ATS_REQ_empresa  ON ATS_REQUISICIONES(empresa_id);
END
GO

-- =====================================================
-- TABLA: ATS_REQUISICIONES_APROBACIONES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_REQUISICIONES_APROBACIONES')
BEGIN
    CREATE TABLE ATS_REQUISICIONES_APROBACIONES (
        id              NVARCHAR(36)  PRIMARY KEY,
        requisition_id  NVARCHAR(36)  NOT NULL,
        approver_id     NVARCHAR(36)  NOT NULL,
        approver_name   NVARCHAR(255) NOT NULL,
        action          NVARCHAR(50)  NOT NULL,
        comments        NVARCHAR(MAX) NULL,
        approved_at     DATETIME2     DEFAULT GETUTCDATE(),
        CONSTRAINT FK_APROB_req FOREIGN KEY (requisition_id) REFERENCES ATS_REQUISICIONES(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_APROB_req ON ATS_REQUISICIONES_APROBACIONES(requisition_id);
END
GO

-- =====================================================
-- TABLA: ATS_VACANTES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_VACANTES')
BEGIN
    CREATE TABLE ATS_VACANTES (
        id                  NVARCHAR(36)  PRIMARY KEY,
        tenant_id           NVARCHAR(36)  NOT NULL DEFAULT 'default',
        empresa_id          NVARCHAR(36)  NULL,
        requisition_id      NVARCHAR(36)  NOT NULL,
        title               NVARCHAR(255) NOT NULL,
        description         NVARCHAR(MAX) NOT NULL,
        requirements        NVARCHAR(MAX) NOT NULL,
        benefits            NVARCHAR(MAX) NULL,
        location            NVARCHAR(255) NOT NULL,
        job_type            NVARCHAR(50)  DEFAULT 'full_time',
        salary_min          DECIMAL(18,2) NOT NULL,
        salary_max          DECIMAL(18,2) NOT NULL,
        currency            NVARCHAR(10)  DEFAULT 'GTQ',
        is_internal         BIT           DEFAULT 0,
        is_external         BIT           DEFAULT 1,
        deadline            DATETIME2     NULL,
        status              NVARCHAR(50)  DEFAULT 'draft',
        applications_count  INT           DEFAULT 0,
        views_count         INT           DEFAULT 0,
        created_at          DATETIME2     DEFAULT GETUTCDATE(),
        created_by          NVARCHAR(36)  NULL,
        updated_at          DATETIME2     NULL,
        updated_by          NVARCHAR(36)  NULL,
        CONSTRAINT FK_VAC_req FOREIGN KEY (requisition_id) REFERENCES ATS_REQUISICIONES(id)
    );
    CREATE INDEX IX_ATS_VAC_tenant  ON ATS_VACANTES(tenant_id);
    CREATE INDEX IX_ATS_VAC_status  ON ATS_VACANTES(status);
    CREATE INDEX IX_ATS_VAC_empresa ON ATS_VACANTES(empresa_id);
    CREATE INDEX IX_ATS_VAC_req     ON ATS_VACANTES(requisition_id);
END
GO

-- =====================================================
-- TABLA: ATS_CANDIDATOS
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATOS')
BEGIN
    CREATE TABLE ATS_CANDIDATOS (
        id                       NVARCHAR(36)   PRIMARY KEY,
        tenant_id                NVARCHAR(36)   NOT NULL DEFAULT 'default',
        first_name               NVARCHAR(100)  NOT NULL,
        last_name                NVARCHAR(100)  NOT NULL,
        email                    NVARCHAR(255)  NOT NULL,
        phone                    NVARCHAR(50)   NULL,
        linkedin_url             NVARCHAR(500)  NULL,
        portfolio_url            NVARCHAR(500)  NULL,
        location                 NVARCHAR(255)  NULL,
        expected_salary          DECIMAL(18,2)  NULL,
        salary_currency          NVARCHAR(10)   DEFAULT 'GTQ',
        source                   NVARCHAR(50)   DEFAULT 'portal',
        notes                    NVARCHAR(MAX)  NULL,
        cv_url                   NVARCHAR(500)  NULL,
        candidate_status         NVARCHAR(50)   DEFAULT 'available',
        disqualification_reason  NVARCHAR(MAX)  NULL,
        experience_range         NVARCHAR(20)   NULL,
        professional_level_id    NVARCHAR(36)   NULL,
        created_at               DATETIME2      DEFAULT GETUTCDATE(),
        created_by               NVARCHAR(36)   NULL,
        updated_at               DATETIME2      NULL,
        updated_by               NVARCHAR(36)   NULL,
        CONSTRAINT UQ_ATS_CAND_email_tenant UNIQUE (tenant_id, email)
    );
    CREATE INDEX IX_ATS_CAND_tenant ON ATS_CANDIDATOS(tenant_id);
    CREATE INDEX IX_ATS_CAND_email  ON ATS_CANDIDATOS(email);
    CREATE INDEX IX_ATS_CAND_status ON ATS_CANDIDATOS(candidate_status);
END
GO

-- =====================================================
-- TABLAS: Detalles de Candidatos (arrays de MongoDB)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATOS_SKILLS')
BEGIN
    CREATE TABLE ATS_CANDIDATOS_SKILLS (
        id           NVARCHAR(36)  PRIMARY KEY,
        candidate_id NVARCHAR(36)  NOT NULL,
        skill_name   NVARCHAR(100) NOT NULL,
        CONSTRAINT FK_SKILLS_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_SKILLS_cand ON ATS_CANDIDATOS_SKILLS(candidate_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATOS_EDUCACION')
BEGIN
    CREATE TABLE ATS_CANDIDATOS_EDUCACION (
        id             NVARCHAR(36)  PRIMARY KEY,
        candidate_id   NVARCHAR(36)  NOT NULL,
        institution    NVARCHAR(255) NOT NULL,
        degree         NVARCHAR(255) NOT NULL,
        field_of_study NVARCHAR(255) NOT NULL,
        start_date     NVARCHAR(20)  NULL,
        end_date       NVARCHAR(20)  NULL,
        CONSTRAINT FK_EDU_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_EDU_cand ON ATS_CANDIDATOS_EDUCACION(candidate_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATOS_EXPERIENCIA')
BEGIN
    CREATE TABLE ATS_CANDIDATOS_EXPERIENCIA (
        id           NVARCHAR(36)  PRIMARY KEY,
        candidate_id NVARCHAR(36)  NOT NULL,
        company      NVARCHAR(255) NOT NULL,
        position     NVARCHAR(255) NOT NULL,
        description  NVARCHAR(MAX) NULL,
        start_date   NVARCHAR(20)  NULL,
        end_date     NVARCHAR(20)  NULL,
        is_current   BIT           DEFAULT 0,
        CONSTRAINT FK_EXP_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_EXP_cand ON ATS_CANDIDATOS_EXPERIENCIA(candidate_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATOS_DOCUMENTOS')
BEGIN
    CREATE TABLE ATS_CANDIDATOS_DOCUMENTOS (
        id            NVARCHAR(36)  PRIMARY KEY,
        candidate_id  NVARCHAR(36)  NOT NULL,
        document_type NVARCHAR(50)  NOT NULL DEFAULT 'cv',
        document_name NVARCHAR(255) NOT NULL,
        file_url      NVARCHAR(500) NOT NULL,
        uploaded_at   DATETIME2     DEFAULT GETUTCDATE(),
        uploaded_by   NVARCHAR(36)  NULL,
        CONSTRAINT FK_DOCS_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_DOCS_cand ON ATS_CANDIDATOS_DOCUMENTOS(candidate_id);
END
GO

-- =====================================================
-- TABLAS: Relaciones M:N Candidatos ↔ Catálogos
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATO_AREAS')
BEGIN
    CREATE TABLE ATS_CANDIDATO_AREAS (
        id                   NVARCHAR(36) PRIMARY KEY,
        candidate_id         NVARCHAR(36) NOT NULL,
        professional_area_id NVARCHAR(36) NOT NULL,
        tenant_id            NVARCHAR(36) NOT NULL DEFAULT 'default',
        created_at           DATETIME2    DEFAULT GETUTCDATE(),
        created_by           NVARCHAR(36) NULL,
        CONSTRAINT FK_CAND_AREA_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id) ON DELETE CASCADE,
        CONSTRAINT FK_CAND_AREA_area FOREIGN KEY (professional_area_id) REFERENCES ATS_AREAS_PROFESIONALES(id),
        CONSTRAINT UQ_CAND_AREA UNIQUE (candidate_id, professional_area_id)
    );
    CREATE INDEX IX_ATS_CAND_AREA_cand ON ATS_CANDIDATO_AREAS(candidate_id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CANDIDATO_IDIOMAS')
BEGIN
    CREATE TABLE ATS_CANDIDATO_IDIOMAS (
        id           NVARCHAR(36) PRIMARY KEY,
        candidate_id NVARCHAR(36) NOT NULL,
        language_id  NVARCHAR(36) NOT NULL,
        tenant_id    NVARCHAR(36) NOT NULL DEFAULT 'default',
        created_at   DATETIME2    DEFAULT GETUTCDATE(),
        created_by   NVARCHAR(36) NULL,
        CONSTRAINT FK_CAND_IDIOMA_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id) ON DELETE CASCADE,
        CONSTRAINT FK_CAND_IDIOMA_lang FOREIGN KEY (language_id) REFERENCES ATS_IDIOMAS(id),
        CONSTRAINT UQ_CAND_IDIOMA UNIQUE (candidate_id, language_id)
    );
    CREATE INDEX IX_ATS_CAND_IDIOMA_cand ON ATS_CANDIDATO_IDIOMAS(candidate_id);
END
GO

-- =====================================================
-- TABLA: ATS_APLICACIONES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_APLICACIONES')
BEGIN
    CREATE TABLE ATS_APLICACIONES (
        id            NVARCHAR(36)  PRIMARY KEY,
        tenant_id     NVARCHAR(36)  NOT NULL DEFAULT 'default',
        vacancy_id    NVARCHAR(36)  NOT NULL,
        candidate_id  NVARCHAR(36)  NOT NULL,
        current_stage NVARCHAR(50)  DEFAULT 'applied',
        score         DECIMAL(5,2)  NULL,
        is_active     BIT           DEFAULT 1,
        created_at    DATETIME2     DEFAULT GETUTCDATE(),
        created_by    NVARCHAR(36)  NULL,
        updated_at    DATETIME2     NULL,
        updated_by    NVARCHAR(36)  NULL,
        CONSTRAINT FK_APLIC_vac  FOREIGN KEY (vacancy_id)   REFERENCES ATS_VACANTES(id),
        CONSTRAINT FK_APLIC_cand FOREIGN KEY (candidate_id) REFERENCES ATS_CANDIDATOS(id),
        CONSTRAINT UQ_APLIC_vac_cand UNIQUE (vacancy_id, candidate_id)
    );
    CREATE INDEX IX_ATS_APLIC_tenant ON ATS_APLICACIONES(tenant_id);
    CREATE INDEX IX_ATS_APLIC_vac    ON ATS_APLICACIONES(vacancy_id);
    CREATE INDEX IX_ATS_APLIC_cand   ON ATS_APLICACIONES(candidate_id);
    CREATE INDEX IX_ATS_APLIC_stage  ON ATS_APLICACIONES(current_stage);
END
GO

-- =====================================================
-- TABLA: ATS_PIPELINE_HISTORIAL
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_PIPELINE_HISTORIAL')
BEGIN
    CREATE TABLE ATS_PIPELINE_HISTORIAL (
        id             NVARCHAR(36)  PRIMARY KEY,
        application_id NVARCHAR(36)  NOT NULL,
        from_stage     NVARCHAR(50)  NULL,
        to_stage       NVARCHAR(50)  NOT NULL,
        moved_by       NVARCHAR(36)  NULL,
        moved_by_name  NVARCHAR(255) NULL,
        notes          NVARCHAR(MAX) NULL,
        moved_at       DATETIME2     DEFAULT GETUTCDATE(),
        CONSTRAINT FK_PIPE_HIST_aplic FOREIGN KEY (application_id) REFERENCES ATS_APLICACIONES(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_PIPE_HIST_aplic ON ATS_PIPELINE_HISTORIAL(application_id);
END
GO

-- =====================================================
-- TABLA: ATS_ENTREVISTAS
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_ENTREVISTAS')
BEGIN
    CREATE TABLE ATS_ENTREVISTAS (
        id               NVARCHAR(36)  PRIMARY KEY,
        tenant_id        NVARCHAR(36)  NOT NULL DEFAULT 'default',
        application_id   NVARCHAR(36)  NOT NULL,
        scheduled_at     DATETIME2     NOT NULL,
        duration_minutes INT           DEFAULT 60,
        interview_type   NVARCHAR(50)  NOT NULL DEFAULT 'hr',
        location         NVARCHAR(255) NULL,
        meeting_link     NVARCHAR(500) NULL,
        status           NVARCHAR(50)  DEFAULT 'scheduled',
        notes            NVARCHAR(MAX) NULL,
        completion_notes NVARCHAR(MAX) NULL,
        closed_at        NVARCHAR(50)  NULL,
        closed_by        NVARCHAR(36)  NULL,
        created_at       DATETIME2     DEFAULT GETUTCDATE(),
        created_by       NVARCHAR(36)  NULL,
        updated_at       DATETIME2     NULL,
        updated_by       NVARCHAR(36)  NULL,
        CONSTRAINT FK_ENTREV_aplic FOREIGN KEY (application_id) REFERENCES ATS_APLICACIONES(id)
    );
    CREATE INDEX IX_ATS_ENTREV_tenant  ON ATS_ENTREVISTAS(tenant_id);
    CREATE INDEX IX_ATS_ENTREV_aplic   ON ATS_ENTREVISTAS(application_id);
    CREATE INDEX IX_ATS_ENTREV_sched   ON ATS_ENTREVISTAS(scheduled_at);
    CREATE INDEX IX_ATS_ENTREV_status  ON ATS_ENTREVISTAS(status);
END
GO

-- =====================================================
-- TABLA: ATS_ENTREVISTAS_EVALUADORES (evaluators[])
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_ENTREVISTAS_EVALUADORES')
BEGIN
    CREATE TABLE ATS_ENTREVISTAS_EVALUADORES (
        id           NVARCHAR(36) PRIMARY KEY,
        interview_id NVARCHAR(36) NOT NULL,
        evaluator_id NVARCHAR(36) NOT NULL,
        CONSTRAINT FK_EVAL_entrev FOREIGN KEY (interview_id) REFERENCES ATS_ENTREVISTAS(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_ENTREV_EVAL_int ON ATS_ENTREVISTAS_EVALUADORES(interview_id);
END
GO

-- =====================================================
-- TABLA: ATS_EVALUACIONES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_EVALUACIONES')
BEGIN
    CREATE TABLE ATS_EVALUACIONES (
        id            NVARCHAR(36)  PRIMARY KEY,
        tenant_id     NVARCHAR(36)  NOT NULL DEFAULT 'default',
        interview_id  NVARCHAR(36)  NOT NULL,
        evaluator_id  NVARCHAR(36)  NOT NULL,
        overall_score INT           NOT NULL,
        strengths     NVARCHAR(MAX) NULL,
        weaknesses    NVARCHAR(MAX) NULL,
        recommendation NVARCHAR(50) NOT NULL,
        comments      NVARCHAR(MAX) NULL,
        created_at    DATETIME2     DEFAULT GETUTCDATE(),
        created_by    NVARCHAR(36)  NULL,
        updated_at    DATETIME2     NULL,
        updated_by    NVARCHAR(36)  NULL,
        CONSTRAINT FK_EVAL_entrev2 FOREIGN KEY (interview_id) REFERENCES ATS_ENTREVISTAS(id)
    );
    CREATE INDEX IX_ATS_EVAL_tenant  ON ATS_EVALUACIONES(tenant_id);
    CREATE INDEX IX_ATS_EVAL_entrev  ON ATS_EVALUACIONES(interview_id);
END
GO

-- =====================================================
-- TABLA: ATS_EVALUACIONES_CRITERIOS (scores{})
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_EVALUACIONES_CRITERIOS')
BEGIN
    CREATE TABLE ATS_EVALUACIONES_CRITERIOS (
        id             NVARCHAR(36)  PRIMARY KEY,
        evaluation_id  NVARCHAR(36)  NOT NULL,
        criterion_name NVARCHAR(100) NOT NULL,
        score          INT           NOT NULL,
        CONSTRAINT FK_EVAL_CRIT_eval FOREIGN KEY (evaluation_id) REFERENCES ATS_EVALUACIONES(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_ATS_EVAL_CRIT_eval ON ATS_EVALUACIONES_CRITERIOS(evaluation_id);
END
GO

-- =====================================================
-- TABLA: ATS_OFERTAS
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_OFERTAS')
BEGIN
    CREATE TABLE ATS_OFERTAS (
        id               NVARCHAR(36)  PRIMARY KEY,
        tenant_id        NVARCHAR(36)  NOT NULL DEFAULT 'default',
        empresa_id       NVARCHAR(36)  NULL,
        application_id   NVARCHAR(36)  NOT NULL,
        candidate_id     NVARCHAR(36)  NOT NULL,
        vacancy_id       NVARCHAR(36)  NOT NULL,
        position_title   NVARCHAR(255) NOT NULL,
        base_salary      DECIMAL(18,2) NOT NULL,
        currency         NVARCHAR(10)  DEFAULT 'GTQ',
        bonus            DECIMAL(18,2) NULL,
        benefits         NVARCHAR(MAX) NULL,
        start_date       DATETIME2     NOT NULL,
        expiration_date  DATETIME2     NOT NULL,
        contract_type    NVARCHAR(50)  DEFAULT 'indefinite',
        additional_terms NVARCHAR(MAX) NULL,
        status           NVARCHAR(50)  DEFAULT 'draft',
        created_at       DATETIME2     DEFAULT GETUTCDATE(),
        created_by       NVARCHAR(36)  NULL,
        updated_at       DATETIME2     NULL,
        updated_by       NVARCHAR(36)  NULL,
        CONSTRAINT FK_OFERTA_aplic FOREIGN KEY (application_id) REFERENCES ATS_APLICACIONES(id),
        CONSTRAINT FK_OFERTA_cand  FOREIGN KEY (candidate_id)   REFERENCES ATS_CANDIDATOS(id),
        CONSTRAINT FK_OFERTA_vac   FOREIGN KEY (vacancy_id)     REFERENCES ATS_VACANTES(id)
    );
    CREATE INDEX IX_ATS_OFERTAS_tenant  ON ATS_OFERTAS(tenant_id);
    CREATE INDEX IX_ATS_OFERTAS_empresa ON ATS_OFERTAS(empresa_id);
    CREATE INDEX IX_ATS_OFERTAS_status  ON ATS_OFERTAS(status);
END
GO

-- =====================================================
-- TABLA: ATS_CONTRATACIONES
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_CONTRATACIONES')
BEGIN
    CREATE TABLE ATS_CONTRATACIONES (
        id                     NVARCHAR(36)  PRIMARY KEY,
        tenant_id              NVARCHAR(36)  NOT NULL DEFAULT 'default',
        empresa_id             NVARCHAR(36)  NULL,
        application_id         NVARCHAR(36)  NOT NULL,
        offer_id               NVARCHAR(36)  NOT NULL,
        candidate_id           NVARCHAR(36)  NOT NULL,
        vacancy_id             NVARCHAR(36)  NOT NULL,
        employee_number        NVARCHAR(50)  NOT NULL,
        department             NVARCHAR(100) NOT NULL,
        position               NVARCHAR(255) NOT NULL,
        start_date             DATETIME2     NOT NULL,
        contract_type          NVARCHAR(50)  NOT NULL,
        salary                 DECIMAL(18,2) NOT NULL,
        currency               NVARCHAR(10)  DEFAULT 'GTQ',
        supervisor_id          NVARCHAR(36)  NULL,
        employee_record_created BIT          DEFAULT 0,
        created_at             DATETIME2     DEFAULT GETUTCDATE(),
        created_by             NVARCHAR(36)  NULL,
        updated_at             DATETIME2     NULL,
        updated_by             NVARCHAR(36)  NULL,
        CONSTRAINT FK_CONTRAT_aplic FOREIGN KEY (application_id) REFERENCES ATS_APLICACIONES(id),
        CONSTRAINT FK_CONTRAT_offer FOREIGN KEY (offer_id)       REFERENCES ATS_OFERTAS(id),
        CONSTRAINT FK_CONTRAT_cand  FOREIGN KEY (candidate_id)   REFERENCES ATS_CANDIDATOS(id),
        CONSTRAINT FK_CONTRAT_vac   FOREIGN KEY (vacancy_id)     REFERENCES ATS_VACANTES(id),
        CONSTRAINT UQ_CONTRAT_emp_num UNIQUE (tenant_id, employee_number)
    );
    CREATE INDEX IX_ATS_CONTRAT_tenant  ON ATS_CONTRATACIONES(tenant_id);
    CREATE INDEX IX_ATS_CONTRAT_empresa ON ATS_CONTRATACIONES(empresa_id);
END
GO

-- =====================================================
-- TABLA: ATS_EMPLEADOS (espejo de empleados contratados)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ATS_EMPLEADOS')
BEGIN
    CREATE TABLE ATS_EMPLEADOS (
        id              NVARCHAR(36)  PRIMARY KEY,
        tenant_id       NVARCHAR(36)  NOT NULL DEFAULT 'default',
        empresa_id      NVARCHAR(36)  NULL,
        hiring_id       NVARCHAR(36)  NULL,
        candidate_id    NVARCHAR(36)  NULL,
        employee_number NVARCHAR(50)  NOT NULL,
        first_name      NVARCHAR(100) NOT NULL,
        last_name       NVARCHAR(100) NOT NULL,
        email           NVARCHAR(255) NOT NULL,
        phone           NVARCHAR(50)  NULL,
        department      NVARCHAR(100) NOT NULL,
        position        NVARCHAR(255) NOT NULL,
        start_date      DATETIME2     NOT NULL,
        salary          DECIMAL(18,2) NOT NULL,
        currency        NVARCHAR(10)  DEFAULT 'GTQ',
        contract_type   NVARCHAR(50)  NOT NULL,
        supervisor_id   NVARCHAR(36)  NULL,
        status          NVARCHAR(50)  DEFAULT 'active',
        created_at      DATETIME2     DEFAULT GETUTCDATE(),
        created_by      NVARCHAR(36)  NULL,
        updated_at      DATETIME2     NULL,
        updated_by      NVARCHAR(36)  NULL,
        CONSTRAINT UQ_EMP_num UNIQUE (tenant_id, employee_number)
    );
    CREATE INDEX IX_ATS_EMP_tenant  ON ATS_EMPLEADOS(tenant_id);
    CREATE INDEX IX_ATS_EMP_empresa ON ATS_EMPLEADOS(empresa_id);
END
GO

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Tenant por defecto
IF NOT EXISTS (SELECT 1 FROM ATS_TENANTS WHERE id = 'default')
BEGIN
    INSERT INTO ATS_TENANTS (id, tenant_code, company_name)
    VALUES ('default', 'default', 'Human Point Demo');
END
GO

-- Usuario admin por defecto (password: admin123)
IF NOT EXISTS (SELECT 1 FROM ATS_USERS WHERE email = 'admin@humanpoint.com')
BEGIN
    INSERT INTO ATS_USERS (id, tenant_id, email, password_hash, first_name, last_name, role)
    VALUES (
        LOWER(CONVERT(NVARCHAR(36), NEWID())),
        'default',
        'admin@humanpoint.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6o7yEzJ0.i',
        'Admin',
        'Human Point',
        'admin'
    );
END
GO

-- Niveles profesionales
IF NOT EXISTS (SELECT 1 FROM ATS_NIVELES_PROFESIONALES WHERE tenant_id = 'default')
BEGIN
    INSERT INTO ATS_NIVELES_PROFESIONALES (id, tenant_id, name, [order])
    VALUES
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Junior', 1),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Semi Senior', 2),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Senior', 3),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Manager', 4),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Director', 5);
END
GO

-- Áreas profesionales
IF NOT EXISTS (SELECT 1 FROM ATS_AREAS_PROFESIONALES WHERE tenant_id = 'default')
BEGIN
    INSERT INTO ATS_AREAS_PROFESIONALES (id, tenant_id, name)
    VALUES
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Finanzas'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Marketing'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'IT'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Ventas'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Operaciones'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Recursos Humanos'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Legal'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Administración');
END
GO

-- Idiomas
IF NOT EXISTS (SELECT 1 FROM ATS_IDIOMAS WHERE tenant_id = 'default')
BEGIN
    INSERT INTO ATS_IDIOMAS (id, tenant_id, name, level)
    VALUES
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Inglés',    'Básico'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Inglés',    'Intermedio'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Inglés',    'Avanzado'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Francés',   'Básico'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Francés',   'Intermedio'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Francés',   'Avanzado'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Portugués', 'Básico'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Portugués', 'Intermedio'),
        (LOWER(CONVERT(NVARCHAR(36), NEWID())), 'default', 'Alemán',    'Básico');
END
GO

PRINT 'Migration completada exitosamente.';
PRINT 'Tablas creadas: ATS_TENANTS, ATS_EMPRESAS, ATS_USERS, ATS_HR_PERSONAL,';
PRINT 'ATS_NIVELES_PROFESIONALES, ATS_AREAS_PROFESIONALES, ATS_IDIOMAS,';
PRINT 'ATS_REQUISICIONES, ATS_REQUISICIONES_APROBACIONES, ATS_VACANTES,';
PRINT 'ATS_CANDIDATOS, ATS_CANDIDATOS_SKILLS, ATS_CANDIDATOS_EDUCACION,';
PRINT 'ATS_CANDIDATOS_EXPERIENCIA, ATS_CANDIDATOS_DOCUMENTOS,';
PRINT 'ATS_CANDIDATO_AREAS, ATS_CANDIDATO_IDIOMAS,';
PRINT 'ATS_APLICACIONES, ATS_PIPELINE_HISTORIAL,';
PRINT 'ATS_ENTREVISTAS, ATS_ENTREVISTAS_EVALUADORES,';
PRINT 'ATS_EVALUACIONES, ATS_EVALUACIONES_CRITERIOS,';
PRINT 'ATS_OFERTAS, ATS_CONTRATACIONES, ATS_EMPLEADOS';
GO

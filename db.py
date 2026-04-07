"""
db.py — Capa de acceso a SQL Server para Human Point ATS
Reemplaza motor (MongoDB async driver)
Driver: aioodbc (async ODBC para SQL Server)
"""
import aioodbc
import os
import json
import logging
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# Pool global de conexiones
_pool: Optional[aioodbc.Pool] = None


def _build_dsn() -> str:
    server   = os.environ["SQL_SERVER"]
    database = os.environ["SQL_DATABASE"]
    username = os.environ.get("SQL_USERNAME", "")
    password = os.environ.get("SQL_PASSWORD", "")
    driver   = os.environ.get("SQL_DRIVER", "ODBC Driver 17 for SQL Server")

    if username and password:
        return (
            f"Driver={{{driver}}};"
            f"Server={server};"
            f"Database={database};"
            f"UID={username};"
            f"PWD={password};"
            f"TrustServerCertificate=yes;"
            f"Encrypt=yes;"
        )
    else:
        # Windows Authentication
        return (
            f"Driver={{{driver}}};"
            f"Server={server};"
            f"Database={database};"
            f"Trusted_Connection=yes;"
            f"TrustServerCertificate=yes;"
        )


async def init_pool() -> None:
    """Inicializa el pool de conexiones. Llamar en startup."""
    global _pool
    dsn = _build_dsn()
    _pool = await aioodbc.create_pool(
        dsn=dsn,
        minsize=2,
        maxsize=10,
        autocommit=False,
    )
    logger.info("SQL Server connection pool initialized")


async def close_pool() -> None:
    """Cierra el pool. Llamar en shutdown."""
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        logger.info("SQL Server connection pool closed")


@asynccontextmanager
async def get_conn():
    """Context manager para obtener una conexión del pool."""
    async with _pool.acquire() as conn:
        yield conn


# ──────────────────────────────────────────────────────────────
# Helpers de serialización
# ──────────────────────────────────────────────────────────────

def _row_to_dict(cursor, row) -> Dict[str, Any]:
    """Convierte una fila pyodbc a diccionario."""
    if row is None:
        return None
    cols = [col[0] for col in cursor.description]
    return dict(zip(cols, row))


def _rows_to_list(cursor, rows) -> List[Dict[str, Any]]:
    """Convierte lista de filas a lista de dicts."""
    cols = [col[0] for col in cursor.description]
    return [dict(zip(cols, row)) for row in rows]


# ──────────────────────────────────────────────────────────────
# CRUD genérico
# ──────────────────────────────────────────────────────────────

async def fetch_one(sql: str, params: tuple = ()) -> Optional[Dict]:
    """Ejecuta SELECT y retorna el primer resultado."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            row = await cur.fetchone()
            return _row_to_dict(cur, row)


async def fetch_all(sql: str, params: tuple = ()) -> List[Dict]:
    """Ejecuta SELECT y retorna todos los resultados."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            rows = await cur.fetchall()
            return _rows_to_list(cur, rows)


async def fetch_val(sql: str, params: tuple = ()) -> Any:
    """Retorna un valor escalar (COUNT, MAX, etc.)."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            row = await cur.fetchone()
            return row[0] if row else None


async def execute(sql: str, params: tuple = ()) -> int:
    """Ejecuta INSERT/UPDATE/DELETE. Retorna filas afectadas."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params)
            affected = cur.rowcount
            await conn.commit()
            return affected


async def execute_many(sql: str, params_list: List[tuple]) -> None:
    """Ejecuta la misma sentencia con múltiples parámetros (batch insert)."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.executemany(sql, params_list)
            await conn.commit()


async def execute_transaction(operations: List[tuple]) -> None:
    """
    Ejecuta múltiples sentencias en una sola transacción.
    operations = [(sql, params), (sql, params), ...]
    """
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            try:
                for sql, params in operations:
                    await cur.execute(sql, params)
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise


# ──────────────────────────────────────────────────────────────
# Helpers para paginación
# ──────────────────────────────────────────────────────────────

def paginate(sql: str, page: int, limit: int) -> str:
    """
    Agrega cláusula OFFSET/FETCH a una query SELECT ... ORDER BY ...
    El ORDER BY debe estar incluido en sql antes de llamar esto.
    """
    skip = (page - 1) * limit if page > 1 else 0
    return f"{sql} OFFSET {skip} ROWS FETCH NEXT {limit} ROWS ONLY"


# ──────────────────────────────────────────────────────────────
# Helpers para listas (skills, educación, experiencia, docs)
# ──────────────────────────────────────────────────────────────

async def get_candidate_skills(candidate_id: str) -> List[str]:
    rows = await fetch_all(
        "SELECT skill_name FROM ATS_CANDIDATOS_SKILLS WHERE candidate_id = ?",
        (candidate_id,)
    )
    return [r["skill_name"] for r in rows]


async def replace_candidate_skills(candidate_id: str, skills: List[str], conn=None) -> None:
    """Borra y re-inserta todas las skills del candidato (dentro de transacción)."""
    import uuid
    ops = [("DELETE FROM ATS_CANDIDATOS_SKILLS WHERE candidate_id = ?", (candidate_id,))]
    for s in skills:
        ops.append((
            "INSERT INTO ATS_CANDIDATOS_SKILLS (id, candidate_id, skill_name) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), candidate_id, s)
        ))
    await execute_transaction(ops)


async def get_candidate_education(candidate_id: str) -> List[Dict]:
    return await fetch_all(
        "SELECT * FROM ATS_CANDIDATOS_EDUCACION WHERE candidate_id = ? ORDER BY id",
        (candidate_id,)
    )


async def get_candidate_experience(candidate_id: str) -> List[Dict]:
    return await fetch_all(
        "SELECT * FROM ATS_CANDIDATOS_EXPERIENCIA WHERE candidate_id = ? ORDER BY is_current DESC, start_date DESC",
        (candidate_id,)
    )


async def get_candidate_documents(candidate_id: str) -> List[Dict]:
    return await fetch_all(
        "SELECT * FROM ATS_CANDIDATOS_DOCUMENTOS WHERE candidate_id = ? ORDER BY uploaded_at DESC",
        (candidate_id,)
    )


async def get_candidate_areas(candidate_id: str) -> List[Dict]:
    return await fetch_all(
        """SELECT ca.id, ca.candidate_id, ca.professional_area_id,
                  ap.name AS area_name
           FROM ATS_CANDIDATO_AREAS ca
           LEFT JOIN ATS_AREAS_PROFESIONALES ap ON ap.id = ca.professional_area_id
           WHERE ca.candidate_id = ?""",
        (candidate_id,)
    )


async def get_candidate_languages(candidate_id: str) -> List[Dict]:
    return await fetch_all(
        """SELECT cl.id, cl.candidate_id, cl.language_id,
                  i.name AS language_name, i.level AS language_level
           FROM ATS_CANDIDATO_IDIOMAS cl
           LEFT JOIN ATS_IDIOMAS i ON i.id = cl.language_id
           WHERE cl.candidate_id = ?""",
        (candidate_id,)
    )


async def get_interview_evaluators(interview_id: str) -> List[Dict]:
    rows = await fetch_all(
        """SELECT ee.evaluator_id,
                  COALESCE(
                      NULLIF(LTRIM(RTRIM(COALESCE(h.first_name,'') + ' ' + COALESCE(h.last_name,''))), ''),
                      h.name,
                      ee.evaluator_id
                  ) AS evaluator_name,
                  h.position AS evaluator_position
           FROM ATS_ENTREVISTAS_EVALUADORES ee
           LEFT JOIN ATS_HR_PERSONAL h ON h.id = ee.evaluator_id
           WHERE ee.interview_id = ?""",
        (interview_id,)
    )
    return rows


async def get_evaluation_scores(evaluation_id: str) -> Dict[str, int]:
    rows = await fetch_all(
        "SELECT criterion_name, score FROM ATS_EVALUACIONES_CRITERIOS WHERE evaluation_id = ?",
        (evaluation_id,)
    )
    return {r["criterion_name"]: r["score"] for r in rows}


async def get_approval_chain(requisition_id: str) -> List[Dict]:
    return await fetch_all(
        """SELECT id, approver_id, approver_name, action, comments, approved_at
           FROM ATS_REQUISICIONES_APROBACIONES
           WHERE requisition_id = ?
           ORDER BY approved_at""",
        (requisition_id,)
    )


async def get_pipeline_history(application_id: str) -> List[Dict]:
    return await fetch_all(
        """SELECT id, from_stage, to_stage, moved_by, moved_by_name, notes, moved_at
           FROM ATS_PIPELINE_HISTORIAL
           WHERE application_id = ?
           ORDER BY moved_at""",
        (application_id,)
    )

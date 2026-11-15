"""Find or soft-delete exact duplicate active Microsoft Teams assignments."""

import argparse
import asyncio
import json

from sqlalchemy import text

from worker.database import engine


_RANKED = """
WITH ranked AS (
    SELECT
        a.id,
        c.name AS course_name,
        a.title,
        a.due_at,
        a.external_assignment_id,
        a.last_synced_at,
        count(*) OVER duplicate_group AS copies,
        row_number() OVER duplicate_group AS row_number
    FROM assignments AS a
    JOIN courses AS c ON c.id = a.course_id
    JOIN platforms AS p ON p.id = c.platform_id
    WHERE p.name = :platform
      AND a.is_deleted IS FALSE
      AND c.is_deleted IS FALSE
    WINDOW duplicate_group AS (
        PARTITION BY a.course_id, lower(trim(a.title)), a.due_at,
            coalesce(a.description, ''), coalesce(a.source_url, '')
        ORDER BY a.last_synced_at DESC, a.id DESC
    )
)
"""


async def main(apply: bool) -> None:
    async with engine.begin() as connection:
        if apply:
            duplicate_result = await connection.execute(text(_RANKED + """
                UPDATE assignments AS a
                SET is_deleted = TRUE
                FROM ranked AS r
                WHERE a.id = r.id AND r.copies > 1 AND r.row_number > 1
                RETURNING a.id
            """), {"platform": "microsoft_teams"})
            archived_result = await connection.execute(text("""
                UPDATE assignments AS a
                SET is_deleted = TRUE
                FROM courses AS c, platforms AS p
                WHERE a.course_id = c.id
                  AND c.platform_id = p.id
                  AND p.name = :platform
                  AND c.is_deleted IS TRUE
                  AND a.is_deleted IS FALSE
                RETURNING a.id
            """), {"platform": "microsoft_teams"})
            print(json.dumps({
                "soft_deleted_duplicate_rows": len(duplicate_result.all()),
                "soft_deleted_assignments_from_archived_courses": len(archived_result.all()),
            }))
            return

        result = await connection.execute(text(_RANKED + """
            SELECT course_name, title, due_at, copies,
                array_agg(external_assignment_id ORDER BY last_synced_at DESC) AS source_ids
            FROM ranked
            WHERE copies > 1
            GROUP BY course_name, title, due_at, copies
            ORDER BY course_name, title
        """), {"platform": "microsoft_teams"})
        active_duplicates = [dict(row) for row in result.mappings().all()]
        courses = await connection.execute(text("""
            SELECT c.id, c.user_id, c.external_course_id, c.name, c.is_deleted,
                count(a.id) FILTER (WHERE a.is_deleted IS FALSE) AS active_assignments
            FROM courses AS c
            JOIN platforms AS p ON p.id = c.platform_id
            LEFT JOIN assignments AS a ON a.course_id = c.id
            WHERE p.name = :platform
            GROUP BY c.id, c.user_id, c.external_course_id, c.name, c.is_deleted
            ORDER BY c.user_id, lower(trim(c.name)), c.is_deleted, c.external_course_id
        """), {"platform": "microsoft_teams"})
        print(json.dumps({
            "active_exact_duplicate_assignments": active_duplicates,
            "teams_courses_including_archived": [dict(row) for row in courses.mappings().all()],
        }, default=str, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="soft-delete extra duplicate rows")
    args = parser.parse_args()
    asyncio.run(main(args.apply))

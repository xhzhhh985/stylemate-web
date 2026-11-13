import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError


BACKEND_DIR = Path(__file__).resolve().parents[1]


class UserMigrationTest(unittest.TestCase):
    def test_fresh_database_has_users_profiles_and_unique_username(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            database_path = Path(temporary_dir) / "test_stylemate.db"
            database_url = f"sqlite:///{database_path.as_posix()}"
            environment = {**os.environ, "DATABASE_URL": database_url}
            subprocess.run(
                [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
                cwd=BACKEND_DIR,
                env=environment,
                check=True,
                capture_output=True,
                text=True,
            )

            engine = create_engine(database_url)
            try:
                tables = set(inspect(engine).get_table_names())
                self.assertTrue({"users", "user_profiles", "alembic_version"} <= tables)
                columns = {column["name"] for column in inspect(engine).get_columns("users")}
                self.assertIn("password_hash", columns)
                self.assertNotIn("password", columns)

                with engine.connect() as connection:
                    transaction = connection.begin()
                    try:
                        connection.execute(
                            text("INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)"),
                            {"username": "alice", "password_hash": "stored-hash-placeholder"},
                        )
                        with self.assertRaises(IntegrityError):
                            connection.execute(
                                text("INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)"),
                                {"username": "alice", "password_hash": "another-hash-placeholder"},
                            )
                    finally:
                        transaction.rollback()
            finally:
                engine.dispose()


if __name__ == "__main__":
    unittest.main()

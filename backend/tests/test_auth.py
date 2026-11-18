import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app import images as image_module
from app.database import Base, get_db
from app.main import app
from app.models import User


PNG_ONE_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="


class AuthApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        database_path = Path(self.directory.name) / "auth.db"
        self.previous_upload_dir = image_module.upload_dir
        image_module.upload_dir = Path(self.directory.name) / "uploads"
        self.engine = create_engine(f"sqlite:///{database_path.as_posix()}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)

        def test_db():
            with self.session_factory() as session:
                yield session

        app.dependency_overrides[get_db] = test_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()
        image_module.upload_dir = self.previous_upload_dir
        self.engine.dispose()
        self.directory.cleanup()

    def test_register_login_profile_and_logout(self) -> None:
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)

        created = self.client.post("/api/v1/auth/register", json={
            "username": "Alice_1", "password": "correct-password-123", "nickname": "小林"
        })
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["username"], "alice_1")
        self.assertEqual(created.json()["nickname"], "小林")
        self.assertNotIn("password_hash", created.json())
        self.assertIn("httponly", created.headers["set-cookie"].lower())
        self.assertEqual(self.client.get("/api/v1/auth/me").json()["id"], created.json()["id"])

        with Session(self.engine) as session:
            user = session.scalar(select(User).where(User.username == "alice_1"))
            self.assertIsNotNone(user)
            self.assertNotEqual(user.password_hash, "correct-password-123")
            self.assertTrue(PasswordHash.recommended().verify("correct-password-123", user.password_hash))

        updated = self.client.patch("/api/v1/auth/me", json={"nickname": "小林同学"})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["nickname"], "小林同学")

        self.assertEqual(self.client.post("/api/v1/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(self.client.post("/api/v1/auth/login", json={"username": "ALICE_1", "password": "wrong"}).status_code, 401)
        logged_in = self.client.post("/api/v1/auth/login", json={"username": "ALICE_1", "password": "correct-password-123"})
        self.assertEqual(logged_in.status_code, 200)
        self.assertEqual(logged_in.json()["nickname"], "小林同学")

    def test_duplicate_username_and_validation(self) -> None:
        account = {"username": "demo_user", "password": "secure-password-123", "nickname": "用户"}
        self.assertEqual(self.client.post("/api/v1/auth/register", json=account).status_code, 201)
        self.assertEqual(self.client.post("/api/v1/auth/register", json={**account, "username": "DEMO_USER"}).status_code, 409)
        self.assertEqual(self.client.post("/api/v1/auth/register", json={**account, "username": "no"}).status_code, 422)
        self.assertEqual(self.client.post("/api/v1/auth/register", json={**account, "username": "another", "password": "short"}).status_code, 422)

    def test_avatar_upload_replace_remove_and_account_isolation(self) -> None:
        self.assertEqual(self.client.put("/api/v1/auth/me/avatar", json={"imageUrl": PNG_ONE_PIXEL}).status_code, 401)
        account = {"username": "avatar_owner", "password": "secure-password-123", "nickname": "头像用户"}
        self.client.post("/api/v1/auth/register", json=account)
        self.assertIsNone(self.client.get("/api/v1/auth/me").json()["avatarUrl"])
        invalid = self.client.put("/api/v1/auth/me/avatar", json={"imageUrl": "data:image/png;base64,ZmFrZQ=="})
        self.assertEqual(invalid.status_code, 422)
        self.assertIsNone(self.client.get("/api/v1/auth/me").json()["avatarUrl"])

        uploaded = self.client.put("/api/v1/auth/me/avatar", json={"imageUrl": PNG_ONE_PIXEL})
        self.assertEqual(uploaded.status_code, 200)
        first_url = uploaded.json()["avatarUrl"]
        self.assertTrue(first_url.startswith("/api/v1/community/images/"))
        self.assertEqual(self.client.get(first_url).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me").json()["avatarUrl"], first_url)

        with TestClient(app) as another_client:
            another_client.post("/api/v1/auth/register", json={
                "username": "another_user", "password": "secure-password-123", "nickname": "其他用户"
            })
            self.assertIsNone(another_client.get("/api/v1/auth/me").json()["avatarUrl"])

        replaced = self.client.put("/api/v1/auth/me/avatar", json={"imageUrl": PNG_ONE_PIXEL})
        self.assertEqual(replaced.status_code, 200)
        second_url = replaced.json()["avatarUrl"]
        self.assertNotEqual(first_url, second_url)
        self.assertEqual(self.client.get(first_url).status_code, 404)
        self.assertEqual(self.client.get(second_url).status_code, 200)
        removed = self.client.delete("/api/v1/auth/me/avatar")
        self.assertEqual(removed.status_code, 200)
        self.assertIsNone(removed.json()["avatarUrl"])
        self.assertEqual(self.client.get(second_url).status_code, 404)


if __name__ == "__main__":
    unittest.main()

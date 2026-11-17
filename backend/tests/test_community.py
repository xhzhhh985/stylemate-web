import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import community as community_module
from app.database import Base, get_db
from app.main import app


PNG_ONE_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="


class CommunityApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        root = Path(self.directory.name)
        self.previous_upload_dir = community_module.upload_dir
        community_module.upload_dir = root / "uploads"
        self.engine = create_engine(f"sqlite:///{(root / 'community.db').as_posix()}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        session_factory = sessionmaker(bind=self.engine)

        def test_db():
            with session_factory() as session:
                yield session

        app.dependency_overrides[get_db] = test_db
        self.author = TestClient(app)
        self.reader = TestClient(app)

    def tearDown(self) -> None:
        self.author.close()
        self.reader.close()
        app.dependency_overrides.clear()
        community_module.upload_dir = self.previous_upload_dir
        self.engine.dispose()
        self.directory.cleanup()

    def test_second_account_sees_first_accounts_published_outfit_and_image(self) -> None:
        outfit = {
            "title": "秋日绿色通勤", "scene": "上班", "season": "秋", "color": "绿", "style": "通勤",
            "description": "绿色外套配米白裤", "imageUrl": PNG_ONE_PIXEL, "garments": [],
        }
        self.assertEqual(self.reader.post("/api/v1/community/outfits", json=outfit).status_code, 401)
        first = self.author.post("/api/v1/auth/register", json={"username": "author_1", "password": "secure-password", "nickname": "小林"})
        self.assertEqual(first.status_code, 201)
        created = self.author.post("/api/v1/community/outfits", json=outfit)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["author"], "小林")
        self.assertEqual(created.json()["ownerId"], first.json()["id"])
        self.assertTrue(created.json()["imageUrl"].startswith("/api/v1/community/images/"))

        second = self.reader.post("/api/v1/auth/register", json={"username": "reader_2", "password": "secure-password", "nickname": "小夏"})
        self.assertEqual(second.status_code, 201)
        listed = self.reader.get("/api/v1/community/outfits")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)
        self.assertEqual(listed.json()[0]["title"], "秋日绿色通勤")
        self.assertEqual(listed.json()[0]["author"], "小林")
        self.assertEqual(self.reader.get(listed.json()[0]["imageUrl"]).status_code, 200)

        self.author.patch("/api/v1/auth/me", json={"nickname": "小林同学"})
        self.assertEqual(self.reader.get("/api/v1/community/outfits").json()[0]["author"], "小林同学")

    def test_invalid_image_does_not_create_post(self) -> None:
        self.author.post("/api/v1/auth/register", json={"username": "author_1", "password": "secure-password", "nickname": "小林"})
        result = self.author.post("/api/v1/community/outfits", json={
            "title": "错误图片", "scene": "日常", "season": "春", "imageUrl": "data:image/png;base64,ZmFrZQ==", "garments": []
        })
        self.assertEqual(result.status_code, 422)
        self.assertEqual(self.author.get("/api/v1/community/outfits").json(), [])


if __name__ == "__main__":
    unittest.main()

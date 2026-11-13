"""Create user accounts and private profiles."""

from alembic import op
import sqlalchemy as sa


revision = "0001_users_profiles"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("nickname", sa.String(length=50), nullable=False),
        sa.Column("avatar_url", sa.String(length=500)),
        sa.Column("height_cm", sa.Integer()),
        sa.Column("weight_kg", sa.Numeric(precision=5, scale=1)),
        sa.Column("preferred_styles", sa.JSON(), server_default="[]", nullable=False),
        sa.CheckConstraint("height_cm BETWEEN 50 AND 250", name="ck_user_profiles_height_cm"),
        sa.CheckConstraint("weight_kg BETWEEN 10 AND 300", name="ck_user_profiles_weight_kg"),
    )


def downgrade() -> None:
    op.drop_table("user_profiles")
    op.drop_table("users")

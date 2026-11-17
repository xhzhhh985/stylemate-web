"""Store published outfits for all users."""

from alembic import op
import sqlalchemy as sa


revision = "0002_community_outfits"
down_revision = "0001_users_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "community_outfits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=50), nullable=False),
        sa.Column("scene", sa.String(length=30), nullable=False),
        sa.Column("season", sa.String(length=10), nullable=False),
        sa.Column("color", sa.String(length=20)),
        sa.Column("style", sa.String(length=30)),
        sa.Column("description", sa.String(length=300), nullable=False),
        sa.Column("image_url", sa.String(length=500)),
        sa.Column("garments", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
    )
    op.create_index("ix_community_outfits_user_id", "community_outfits", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_community_outfits_user_id", table_name="community_outfits")
    op.drop_table("community_outfits")

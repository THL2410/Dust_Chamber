import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("refresh_tokens_pkey", ["id"], { unique: true })
@Index("refresh_tokens_token_hash_key", ["tokenHash"], { unique: true })
@Index("idx_refresh_tokens_user", ["userId"], {})
@Entity("refresh_tokens", { schema: "public" })
export class RefreshTokens {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "user_id" })
  userId: number;

  @Column("character varying", {
    name: "token_hash",
    unique: true,
    length: 255,
  })
  tokenHash: string;

  @Column("timestamp with time zone", { name: "expires_at" })
  expiresAt: Date;

  @Column("timestamp with time zone", { name: "revoked_at", nullable: true })
  revokedAt: Date | null;

  @Column("character varying", {
    name: "user_agent",
    nullable: true,
    length: 255,
  })
  userAgent: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Users, (users) => users.refreshTokens, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}

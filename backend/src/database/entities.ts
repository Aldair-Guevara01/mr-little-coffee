import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', unique: true, length: 80 }) slug!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
}
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', unique: true, length: 120 }) slug!: string;
  @Column({ type: 'varchar', length: 150 }) name!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'varchar', length: 300 }) image!: string;
  @Column({ type: 'uuid', name: 'category_id' }) categoryId!: string;
  @ManyToOne(() => Category, { nullable: false }) @JoinColumn({ name: 'category_id' }) category!: Category;
  @Column({ type: 'varchar', length: 80, nullable: true }) label!: string | null;
  @Column({ type: 'boolean', default: false }) featured!: boolean;
  @Column({ type: 'boolean', default: true }) active!: boolean;
  @Column({ type: 'integer', name: 'price_cents', nullable: true }) priceCents!: number | null;
  @Column({ type: 'integer', name: 'display_order', default: 0 }) displayOrder!: number;
}
@Entity('events')
export class CoffeeEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', unique: true, length: 100, name: 'seed_key', nullable: true }) seedKey!: string | null;
  @Column({ type: 'varchar', length: 150 }) title!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'timestamptz', name: 'starts_at' }) startsAt!: Date;
  @Column({ type: 'varchar', length: 300, nullable: true }) image!: string | null;
  @Column({ type: 'boolean', default: false }) published!: boolean;
}
@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'varchar', length: 254 }) email!: string;
  @Column({ type: 'varchar', length: 150, nullable: true }) subject!: string | null;
  @Column({ type: 'text' }) message!: string;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt!: Date;
}
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'varchar', unique: true, length: 254 }) email!: string;
  @Column({ type: 'varchar', length: 100, name: 'password_hash', select: false }) passwordHash!: string;
  @Column({ type: 'varchar', length: 25, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'customer' }) role!: 'customer' | 'admin';
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt!: Date;
}
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ type: 'uuid', name: 'user_id' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ type: 'timestamptz', name: 'expires_at' }) expiresAt!: Date;
  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true }) revokedAt!: Date | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt!: Date;
}
@Entity('reservation_slots')
export class ReservationSlot {
  @PrimaryColumn({ type: 'timestamptz', name: 'starts_at' }) startsAt!: Date;
  @Column({ type: 'integer' }) capacity!: number;
  @Column({ type: 'integer', default: 0 }) booked!: number;
}
@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId!: string;
  @ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ type: 'timestamptz', name: 'starts_at' }) startsAt!: Date;
  @ManyToOne(() => ReservationSlot) @JoinColumn({ name: 'starts_at', referencedColumnName: 'startsAt' }) slot!: ReservationSlot;
  @Column({ type: 'integer' }) people!: number;
  @Column({ type: 'varchar', length: 20, default: 'confirmed' }) status!: 'confirmed' | 'cancelled';
  @Column({ type: 'uuid', name: 'idempotency_key' }) idempotencyKey!: string;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt!: Date;
  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true }) cancelledAt!: Date | null;
}
export const entities = [Category, Product, CoffeeEvent, ContactMessage, User, Session, ReservationSlot, Reservation];

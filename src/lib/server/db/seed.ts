// Development seed script — all data is owned by a single hardcoded user ID.
// This is intentional for local development only. Do not use in production.
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
	console.log('Seeding database...');

	const [client1, client2, client3, client4, client5] = await db
		.insert(schema.clients)
		.values([
			{
				name: 'Acme Corporation',
				email: 'contact@acmecorp.com',
				phone: '+1 555-0101',
				notes: 'Long-term client, prefers email communication',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				name: 'Globex Industries',
				email: 'info@globexind.com',
				phone: '+1 555-0102',
				notes: 'New client, referred by Acme Corp',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				name: 'Initech LLC',
				email: 'hello@initech.io',
				phone: '+1 555-0103',
				notes: '',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				name: 'Umbrella Group',
				email: 'biz@umbrellagroup.com',
				phone: '+1 555-0104',
				notes: 'Seasonal projects, usually Q2 and Q4',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				name: 'Stark Solutions',
				email: 'proj@starksolutions.dev',
				phone: '+1 555-0105',
				notes: 'High-priority client',
				userId: '00000000-0000-0000-0000-000000000001'
			}
		])
		.returning();

	const projects = await db
		.insert(schema.projects)
		.values([
			{
				clientId: client1.id,
				title: 'Website Redesign',
				totalAmount: 15000,
				paidAmount: 10000,
				invoiceStatus: 'invoiced',
				paymentStatus: 'partial_payment',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				clientId: client1.id,
				title: 'Mobile App MVP',
				totalAmount: 45000,
				paidAmount: 0,
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				clientId: client2.id,
				title: 'Brand Identity Package',
				totalAmount: 8000,
				paidAmount: 8000,
				invoiceStatus: 'invoiced',
				paymentStatus: 'paid',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				clientId: client3.id,
				title: 'E-commerce Platform',
				totalAmount: 32000,
				paidAmount: 16000,
				invoiceStatus: 'invoiced',
				paymentStatus: 'partial_payment',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				clientId: client4.id,
				title: 'Dashboard Analytics Tool',
				totalAmount: 22000,
				paidAmount: 22000,
				invoiceStatus: 'invoiced',
				paymentStatus: 'paid',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				clientId: client5.id,
				title: 'API Integration Suite',
				totalAmount: 18000,
				paidAmount: 0,
				invoiceStatus: 'for_invoice',
				paymentStatus: 'not_paid',
				userId: '00000000-0000-0000-0000-000000000001'
			},
			{
				clientId: client5.id,
				title: 'Consulting Retainer - Q1',
				totalAmount: 6000,
				paidAmount: 6000,
				invoiceStatus: 'no_invoice',
				paymentStatus: 'paid',
				userId: '00000000-0000-0000-0000-000000000001'
			}
		])
		.returning();

	await db.insert(schema.payments).values([
		{
			projectId: projects[0].id,
			amount: 5000,
			date: new Date('2025-01-15'),
			note: 'First milestone payment',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[0].id,
			amount: 5000,
			date: new Date('2025-03-01'),
			note: 'Second milestone payment',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[1].id,
			amount: 5000,
			date: new Date('2025-02-01'),
			note: 'Deposit',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[2].id,
			amount: 8000,
			date: new Date('2025-02-20'),
			note: 'Full payment received',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[3].id,
			amount: 16000,
			date: new Date('2025-03-10'),
			note: 'Phase 1 payment',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[4].id,
			amount: 11000,
			date: new Date('2025-04-01'),
			note: 'First installment',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[4].id,
			amount: 11000,
			date: new Date('2025-05-01'),
			note: 'Final installment',
			userId: '00000000-0000-0000-0000-000000000001'
		},
		{
			projectId: projects[6].id,
			amount: 6000,
			date: new Date('2025-01-01'),
			note: 'Q1 retainer paid',
			userId: '00000000-0000-0000-0000-000000000001'
		}
	]);

	console.log('Seeding complete!');
	await client.end();
}

seed().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});

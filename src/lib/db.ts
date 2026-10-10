import Dexie, { type Table } from 'dexie';
import type { Home, Loan, PaymentSchedule, Document, HouseholdSettings } from './types';

class HomePurchaseDB extends Dexie {
	homes!: Table<Home, string>;
	loans!: Table<Loan, string>;
	paymentSchedules!: Table<PaymentSchedule, string>;
	documents!: Table<Document, string>;
	settings!: Table<HouseholdSettings, string>;

	constructor() {
		super('home-purchase-db');
		this.version(1).stores({
			homes: 'id, householdId, updatedAt',
			loans: 'id, householdId, homeId, updatedAt',
			paymentSchedules: 'id, householdId, homeId, loanId, dueDate, status, updatedAt',
			documents: 'id, householdId, relatedType, relatedId',
			settings: 'householdId'
		});
	}
}

export const db = new HomePurchaseDB();

export async function getHouseholdData(householdId: string) {
	const [homes, loans, paymentSchedules, documents, settings] = await Promise.all([
		db.homes.where('householdId').equals(householdId).toArray(),
		db.loans.where('householdId').equals(householdId).toArray(),
		db.paymentSchedules.where('householdId').equals(householdId).toArray(),
		db.documents.where('householdId').equals(householdId).toArray(),
		db.settings.where('householdId').equals(householdId).first()
	]);
	return { homes, loans, paymentSchedules, documents, settings: settings ?? null };
}

export async function importHouseholdData(payload: {
	homes: Home[];
	loans: Loan[];
	paymentSchedules: PaymentSchedule[];
	documents: Document[];
	settings?: HouseholdSettings;
}) {
	await db.transaction('rw', db.homes, db.loans, db.paymentSchedules, db.documents, db.settings, async () => {
		await db.homes.bulkPut(payload.homes);
		await db.loans.bulkPut(payload.loans);
		await db.paymentSchedules.bulkPut(payload.paymentSchedules);
		await db.documents.bulkPut(payload.documents);
		if (payload.settings) {
			await db.settings.put(payload.settings);
		}
	});
}

export async function clearHouseholdData(householdId: string) {
	await db.transaction('rw', db.homes, db.loans, db.paymentSchedules, db.documents, db.settings, async () => {
		await db.homes.where('householdId').equals(householdId).delete();
		await db.loans.where('householdId').equals(householdId).delete();
		await db.paymentSchedules.where('householdId').equals(householdId).delete();
		await db.documents.where('householdId').equals(householdId).delete();
		await db.settings.where('householdId').equals(householdId).delete();
	});
}

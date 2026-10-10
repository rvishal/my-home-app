import { db } from '../db';
import { supabase } from '../supabase';
import type { Home, Loan, PaymentSchedule, Document, HouseholdSettings } from '../types';

function createDataStore() {
	let homes = $state<Home[]>([]);
	let loans = $state<Loan[]>([]);
	let schedules = $state<PaymentSchedule[]>([]);
	let documents = $state<Document[]>([]);
	let settings = $state<HouseholdSettings | null>(null);
	let householdId = $state<string | null>(null);

	async function load(hhId: string) {
		householdId = hhId;
		const [h, l, s, d, st] = await Promise.all([
			db.homes.where('householdId').equals(hhId).toArray(),
			db.loans.where('householdId').equals(hhId).toArray(),
			db.paymentSchedules.where('householdId').equals(hhId).toArray(),
			db.documents.where('householdId').equals(hhId).toArray(),
			db.settings.where('householdId').equals(hhId).first()
		]);
		homes = h;
		loans = l;
		schedules = s;
		documents = d;
		settings = st ?? null;
	}

	async function addHome(home: Home) {
		await db.homes.put(home);
		if (householdId) await load(householdId);
	}

	async function updateHome(home: Home) {
		home.updatedAt = new Date().toISOString();
		await db.homes.put(home);
		if (householdId) await load(householdId);
	}

	async function deleteHome(id: string) {
		await db.homes.delete(id);
		await db.loans.where('homeId').equals(id).delete();
		await db.paymentSchedules.where('homeId').equals(id).delete();
		await db.documents.where('relatedId').equals(id).delete();
		if (householdId) await load(householdId);
	}

	async function addLoan(loan: Loan) {
		await db.loans.put(loan);
		if (householdId) await load(householdId);
	}

	async function updateLoan(loan: Loan) {
		loan.updatedAt = new Date().toISOString();
		await db.loans.put(loan);
		if (householdId) await load(householdId);
	}

	async function deleteLoan(id: string) {
		await db.loans.delete(id);
		await db.paymentSchedules.where('loanId').equals(id).delete();
		await db.documents.where('relatedId').equals(id).delete();
		if (householdId) await load(householdId);
	}

	async function syncCalendarEvent(schedule: PaymentSchedule) {
		try {
			await supabase.from('calendar_events').upsert({
				household_id: schedule.householdId,
				schedule_id: schedule.id,
				title: schedule.title,
				amount: schedule.amount,
				due_date: schedule.dueDate,
				status: schedule.status,
				notes: schedule.notes,
				updated_at: new Date().toISOString()
			});
		} catch {
			// silently fail if offline
		}
	}

	async function deleteCalendarEvent(scheduleId: string) {
		try {
			await supabase.from('calendar_events').delete().eq('schedule_id', scheduleId);
		} catch {
			// silently fail if offline
		}
	}

	async function addSchedule(schedule: PaymentSchedule) {
		await db.paymentSchedules.put(schedule);
		await syncCalendarEvent(schedule);
		if (householdId) await load(householdId);
	}

	async function updateSchedule(schedule: PaymentSchedule) {
		schedule.updatedAt = new Date().toISOString();
		await db.paymentSchedules.put(schedule);
		await syncCalendarEvent(schedule);
		if (householdId) await load(householdId);
	}

	async function deleteSchedule(id: string) {
		await db.paymentSchedules.delete(id);
		await deleteCalendarEvent(id);
		if (householdId) await load(householdId);
	}

	async function updateSettings(partial: Partial<HouseholdSettings>) {
		if (!settings) return;
		const next = { ...settings, ...partial };
		await db.settings.put(next);
		settings = next;
	}

	function clear() {
		homes = [];
		loans = [];
		schedules = [];
		documents = [];
		settings = null;
		householdId = null;
	}

	return {
		get homes() {
			return homes;
		},
		get loans() {
			return loans;
		},
		get schedules() {
			return schedules;
		},
		get documents() {
			return documents;
		},
		get settings() {
			return settings;
		},
		load,
		addHome,
		updateHome,
		deleteHome,
		addLoan,
		updateLoan,
		deleteLoan,
		addSchedule,
		updateSchedule,
		deleteSchedule,
		updateSettings,
		clear
	};
}

export const dataStore = createDataStore();

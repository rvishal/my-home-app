export interface Document {
	id: string;
	householdId: string;
	relatedType: 'home' | 'loan' | 'schedule';
	relatedId: string;
	title: string;
	fileUrl: string;
	mimeType: string;
	createdAt: string;
}

export interface Home {
	id: string;
	householdId: string;
	name: string;
	address: string;
	builderName: string;
	builderContact: string;
	purchasePrice: number;
	agreementValue: number;
	registrationCost: number;
	gstAmount: number;
	otherCosts: number;
	possessionDate: string;
	floorPlan: string;
	status: 'booking' | 'construction' | 'ready' | 'registered';
	notes: string;
	documents: Document[];
	createdAt: string;
	updatedAt: string;
}

export interface Disbursement {
	date: string;
	amount: number;
	status: 'pending' | 'disbursed';
}

export interface Loan {
	id: string;
	householdId: string;
	homeId: string;
	bankName: string;
	loanAmount: number;
	interestRate: number;
	tenureMonths: number;
	emiAmount: number;
	emiDueDay: number;
	sanctionDate: string;
	disbursementSchedule: Disbursement[];
	coApplicants: string[];
	documents: Document[];
	notes: string;
	createdAt: string;
	updatedAt: string;
}

export type ScheduleType = 'builder' | 'bank_emi' | 'custom';

export interface PaymentSchedule {
	id: string;
	householdId: string;
	homeId?: string;
	loanId?: string;
	title: string;
	type: ScheduleType;
	amount: number;
	dueDate: string;
	recurrence: 'none' | 'monthly' | 'quarterly';
	status: 'pending' | 'paid' | 'overdue';
	reminderDaysBefore: number[];
	paidDate?: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
}

export interface HouseholdSettings {
	householdId: string;
	name: string;
	backupEnabled: boolean;
	calendarToken: string;
	pushSubscription?: object;
	emailReminders: boolean;
	browserReminders: boolean;
	telegramBotToken: string;
	telegramChatId: string;
	telegramRemindersEnabled: boolean;
}

export interface HouseholdMember {
	id: string;
	email: string;
	role: 'owner' | 'member';
	joinedAt: string;
}

export interface HouseholdInvite {
	token: string;
	householdId: string;
	createdBy: string;
	expiresAt?: string;
	usedBy?: string;
}

export type AppUser = {
	id: string;
	email: string;
};

export interface AppState {
	user: AppUser | null;
	household: { id: string; name: string; role: 'owner' | 'member' } | null;
	isLoading: boolean;
}

import { format, addMonths, startOfMonth, setDate, isBefore, isAfter, isToday, parseISO } from 'date-fns';
import type { PaymentSchedule, Loan, Home, ScheduleType } from './types';
import { generateId } from './crypto';

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatDate(date: string | Date): string {
	return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy');
}

export function formatDateISO(date: Date): string {
	return format(date, 'yyyy-MM-dd');
}

export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
	if (principal <= 0 || tenureMonths <= 0 || annualRate < 0) return 0;
	const monthlyRate = annualRate / 12 / 100;
	if (monthlyRate === 0) return principal / tenureMonths;
	const emi =
		(principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
		(Math.pow(1 + monthlyRate, tenureMonths) - 1);
	return Math.round(emi);
}

export function generateAmortizationSchedule(
	principal: number,
	annualRate: number,
	emi: number,
	startDate: Date,
	count: number
) {
	const schedule = [];
	let balance = principal;
	const monthlyRate = annualRate / 12 / 100;
	let currentDate = startOfMonth(addMonths(startDate, 1));
	for (let i = 0; i < count; i++) {
		const interest = Math.round(balance * monthlyRate);
		const principalPaid = Math.round(emi - interest);
		balance = Math.max(0, balance - principalPaid);
		schedule.push({
			month: i + 1,
			date: formatDateISO(setDate(currentDate, Math.min(startDate.getDate(), 28))),
			emi,
			principal: principalPaid,
			interest,
			balance
		});
		currentDate = addMonths(currentDate, 1);
	}
	return schedule;
}

export function generateEMISchedules(
	loan: Loan,
	householdId: string,
	fromDate: Date = new Date()
): PaymentSchedule[] {
	const start = parseISO(loan.sanctionDate);
	const emi = loan.emiAmount || calculateEMI(loan.loanAmount, loan.interestRate, loan.tenureMonths);
	const schedules: PaymentSchedule[] = [];
	let current = startOfMonth(addMonths(fromDate, 1));
	for (let i = 0; i < loan.tenureMonths; i++) {
		const dueDate = setDate(current, Math.min(loan.emiDueDay || 1, 28));
		schedules.push({
			id: generateId(),
			householdId,
			loanId: loan.id,
			title: `${loan.bankName} EMI ${i + 1}`,
			type: 'bank_emi' as ScheduleType,
			amount: emi,
			dueDate: formatDateISO(dueDate),
			recurrence: 'monthly',
			status: isBefore(parseISO(formatDateISO(dueDate)), new Date()) ? 'overdue' : 'pending',
			reminderDaysBefore: [7, 1],
			notes: '',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
		current = addMonths(current, 1);
	}
	return schedules;
}

export function getScheduleStatus(dueDate: string, paid: boolean): PaymentSchedule['status'] {
	if (paid) return 'paid';
	const date = parseISO(dueDate);
	if (isBefore(date, new Date()) && !isToday(date)) return 'overdue';
	return 'pending';
}

export function upcomingSchedules(
	schedules: PaymentSchedule[],
	days: number = 30
): PaymentSchedule[] {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() + days);
	return schedules
		.filter((s) => s.status !== 'paid')
		.filter((s) => {
			const d = parseISO(s.dueDate);
			return isBefore(d, cutoff) || isToday(d);
		})
		.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
}

export function overdueSchedules(schedules: PaymentSchedule[]): PaymentSchedule[] {
	return schedules
		.filter((s) => s.status === 'overdue')
		.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
}

export function totalAssetValue(homes: Home[]): number {
	return homes.reduce((sum, h) => sum + (h.purchasePrice || 0), 0);
}

export function totalLoanAmount(loans: Loan[]): number {
	return loans.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
}

export function totalOutstanding(loans: Loan[], schedules: PaymentSchedule[]): number {
	let paid = 0;
	for (const l of loans) {
		const emi = l.emiAmount || calculateEMI(l.loanAmount, l.interestRate, l.tenureMonths);
		const paidCount = schedules.filter(
			(s) => s.loanId === l.id && s.type === 'bank_emi' && s.status === 'paid'
		).length;
		paid += paidCount * emi;
	}
	return totalLoanAmount(loans) - paid;
}

export function generateICS(homeName: string, schedules: PaymentSchedule[]): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//My Home App//EN',
		`X-WR-CALNAME:My Home - ${homeName}`,
		'METHOD:PUBLISH'
	];
	for (const s of schedules) {
		const date = s.dueDate.replace(/-/g, '');
		lines.push('BEGIN:VEVENT');
		lines.push(`UID:${s.id}@myhomeapp`);
		lines.push(`DTSTAMP:${format(new Date(), 'yyyyMMddHHmmss')}`);
		lines.push(`DTSTART;VALUE=DATE:${date}`);
		lines.push(`SUMMARY:${s.title} - ${formatCurrency(s.amount)}`);
		lines.push(`DESCRIPTION:${s.type} payment. Status: ${s.status}. Notes: ${s.notes || 'none'}`);
		lines.push(`TRANSP:TRANSPARENT`);
		lines.push('END:VEVENT');
	}
	lines.push('END:VCALENDAR');
	return lines.join('\r\n');
}

import type { Home, Loan, PaymentSchedule } from './types';
import { formatCurrency, formatDate } from './utils';

export async function sendTelegram(
	botToken: string,
	chatId: string,
	message: string,
	file?: string
) {
	const res = await fetch('/api/telegram', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ botToken, chatId, message, file })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message || 'Failed to send Telegram message');
	}
	return res.json();
}

export function formatHomeMessage(home: Home): string {
	return [
		`*Home: ${home.name}*`,
		`Address: ${home.address || '—'}`,
		`Builder: ${home.builderName || '—'}`,
		`Purchase price: ${formatCurrency(home.purchasePrice)}`,
		`Possession: ${formatDate(home.possessionDate)}`,
		`Status: ${home.status}`
	].join('\n');
}

export function formatLoanMessage(loan: Loan, homeName?: string): string {
	return [
		`*Loan: ${loan.bankName}*`,
		homeName ? `Home: ${homeName}` : '',
		`Amount: ${formatCurrency(loan.loanAmount)}`,
		`Interest: ${loan.interestRate}%`,
		`Tenure: ${loan.tenureMonths} months`,
		`EMI: ${formatCurrency(loan.emiAmount)}`
	]
		.filter(Boolean)
		.join('\n');
}

export function formatScheduleMessage(schedule: PaymentSchedule): string {
	return [
		`*Schedule: ${schedule.title}*`,
		`Amount: ${formatCurrency(schedule.amount)}`,
		`Due: ${formatDate(schedule.dueDate)}`,
		`Status: ${schedule.status}`,
		schedule.notes ? `Notes: ${schedule.notes}` : ''
	]
		.filter(Boolean)
		.join('\n');
}

export function formatReminderMessage(schedules: PaymentSchedule[]): string {
	if (schedules.length === 0) return 'No upcoming payments.';
	const lines = schedules.map(
		(s) => `• ${s.title} — ${formatCurrency(s.amount)} due ${formatDate(s.dueDate)}`
	);
	return [`*Upcoming payments*`, ...lines].join('\n');
}

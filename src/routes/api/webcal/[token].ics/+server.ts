import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$app/env/private';

function escapeICS(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET({ params }) {
	const token = params.token;
	if (!token) {
		error(400, 'Missing token');
	}

	const serviceSupabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	const { data: household, error: hhError } = await serviceSupabase
		.from('households')
		.select('id, name')
		.eq('calendar_token', token)
		.single();

	if (hhError || !household) {
		error(404, 'Calendar not found');
	}

	const { data: events, error: eventsError } = await serviceSupabase
		.from('calendar_events')
		.select('*')
		.eq('household_id', household.id)
		.order('due_date', { ascending: true });

	if (eventsError) {
		error(500, 'Failed to load events');
	}

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//My Home App//EN',
		`X-WR-CALNAME:My Home - ${escapeICS(household.name)}`,
		'METHOD:PUBLISH'
	];

	for (const e of events || []) {
		const date = (e.due_date as string).replace(/-/g, '');
		lines.push('BEGIN:VEVENT');
		lines.push(`UID:${e.schedule_id}@myhomeapp`);
		lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
		lines.push(`DTSTART;VALUE=DATE:${date}`);
		lines.push(`SUMMARY:${escapeICS(e.title)} - ₹${e.amount}`);
		lines.push(`DESCRIPTION:${escapeICS(e.notes || '')}`);
		lines.push(`TRANSP:TRANSPARENT`);
		lines.push('END:VEVENT');
	}
	lines.push('END:VCALENDAR');

	return new Response(lines.join('\r\n'), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="my-home-calendar.ics"'
		}
	});
}

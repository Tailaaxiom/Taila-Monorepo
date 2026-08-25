// src/lib/types/appointment.ts
import { Database } from './database.types';
export type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
export type Appointment = AppointmentRow;
export function parseAppointment(row: AppointmentRow): Appointment { return row; }
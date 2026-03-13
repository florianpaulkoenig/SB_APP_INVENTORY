// ---------------------------------------------------------------------------
// NOA Inventory -- Annual Schedule PDF
// Landscape table of weekly schedule events with color-coded type dots.
// ---------------------------------------------------------------------------

import { Document, Page, View, Text } from '@react-pdf/renderer';
import styles, { PDF_COLORS } from './PDFStyles';
import { PDFHeader } from './PDFHeader';
import { COMPANY_NAME } from '../../lib/constants';
import type { ScheduleEvent, ScheduleEventType } from '../../hooks/useAnnualSchedule';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeekGroup {
  weekNumber: number;
  monday: Date;
  events: ScheduleEvent[];
}

export interface SchedulePDFProps {
  events: ScheduleEvent[];
  year: number;
  weekGroups: WeekGroup[];
}

// ---------------------------------------------------------------------------
// Color map -- hex equivalents of tailwind palette for PDF rendering
// ---------------------------------------------------------------------------

const TYPE_HEX: Record<ScheduleEventType, string> = {
  exhibition: '#6366f1',
  art_fair: '#a855f7',
  solo_show: '#10b981',
  group_show: '#f59e0b',
  production_order: '#3b82f6',
  project: '#f43f5e',
};

const TYPE_LABELS: Record<ScheduleEventType, string> = {
  exhibition: 'Exhibition',
  art_fair: 'Art Fair',
  solo_show: 'Solo Show',
  group_show: 'Group Show',
  production_order: 'Production',
  project: 'Project',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: Date): string {
  return format(d, 'dd.MM.yyyy');
}

function fmtDateRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) return fmtDate(start);
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'dd.MM')} \u2013 ${format(end, 'dd.MM.yyyy')}`;
  }
  return `${fmtDate(start)} \u2013 ${fmtDate(end)}`;
}

// ---------------------------------------------------------------------------
// Column widths
// ---------------------------------------------------------------------------

const COL_KW = '5%';
const COL_MONDAY = '9%';
const COL_DATES = '12%';
const COL_PARTNER = '13%';
const COL_VENUE = '13%';
const COL_TITLE = '18%';
const COL_CITY = '10%';
const COL_COUNTRY = '8%';
const COL_NOTES = '12%';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SchedulePDF({ year, weekGroups }: SchedulePDFProps) {
  const today = new Date().toLocaleDateString('en-GB');
  const allTypes = Object.keys(TYPE_HEX) as ScheduleEventType[];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <PDFHeader
          title={`Annual Schedule ${year}`}
          subtitle={`Generated on ${today}`}
          companyName={COMPANY_NAME}
        />

        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          {allTypes.map((type) => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: TYPE_HEX[type],
                }}
              />
              <Text style={{ fontFamily: 'AnzianoPro', fontSize: 7, color: PDF_COLORS.primary700 }}>
                {TYPE_LABELS[type]}
              </Text>
            </View>
          ))}
        </View>

        {/* Table header */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: PDF_COLORS.primary900,
            paddingVertical: 5,
            paddingHorizontal: 6,
          }}
        >
          <Text style={[styles.tableHeaderCell, { width: COL_KW }]}>KW</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_MONDAY }]}>Monday</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_DATES }]}>Dates</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_PARTNER }]}>Partner</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_VENUE }]}>Venue</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_TITLE }]}>Title</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_CITY }]}>City</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_COUNTRY }]}>Country</Text>
          <Text style={[styles.tableHeaderCell, { width: COL_NOTES }]}>Notes</Text>
        </View>

        {/* Table rows */}
        {weekGroups.map((group) => {
          if (group.events.length === 0) {
            // Empty week row
            return (
              <View
                key={`week-${group.monday.getTime()}`}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                  borderBottomWidth: 0.5,
                  borderBottomColor: PDF_COLORS.border,
                }}
              >
                <Text style={[styles.tableCell, { width: COL_KW, fontWeight: 'bold' as const }]}>
                  {group.weekNumber}
                </Text>
                <Text style={[styles.tableCell, { width: COL_MONDAY }]}>
                  {fmtDate(group.monday)}
                </Text>
                <Text style={[styles.tableCell, { width: '79%', color: PDF_COLORS.primary400 }]}>
                  {'\u2014'}
                </Text>
              </View>
            );
          }

          return group.events.map((event, idx) => (
            <View
              key={`${group.monday.getTime()}-${event.id}`}
              wrap={false}
              style={{
                flexDirection: 'row',
                paddingVertical: 4,
                paddingHorizontal: 6,
                borderBottomWidth: 0.5,
                borderBottomColor: idx === 0 ? PDF_COLORS.border : '#e5e5e5',
                backgroundColor: idx % 2 === 1 ? '#fafafa' : PDF_COLORS.white,
              }}
            >
              {/* KW -- only on first event of the week */}
              <Text style={[styles.tableCell, { width: COL_KW, fontWeight: 'bold' as const }]}>
                {idx === 0 ? String(group.weekNumber) : ''}
              </Text>

              {/* Monday -- only on first event */}
              <Text style={[styles.tableCell, { width: COL_MONDAY }]}>
                {idx === 0 ? fmtDate(group.monday) : ''}
              </Text>

              {/* Dates */}
              <Text style={[styles.tableCell, { width: COL_DATES }]}>
                {fmtDateRange(event.startDate, event.endDate)}
              </Text>

              {/* Partner */}
              <Text style={[styles.tableCell, { width: COL_PARTNER }]}>
                {event.partner || '\u2014'}
              </Text>

              {/* Venue */}
              <Text style={[styles.tableCell, { width: COL_VENUE }]}>
                {event.venue || '\u2014'}
              </Text>

              {/* Title with color dot */}
              <View style={{ width: COL_TITLE, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: TYPE_HEX[event.type] || '#999999',
                  }}
                />
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {event.title}
                </Text>
              </View>

              {/* City */}
              <Text style={[styles.tableCell, { width: COL_CITY }]}>
                {event.city || '\u2014'}
              </Text>

              {/* Country */}
              <Text style={[styles.tableCell, { width: COL_COUNTRY }]}>
                {event.country || '\u2014'}
              </Text>

              {/* Notes */}
              <Text style={[styles.tableCell, { width: COL_NOTES }]}>
                {event.notes || '\u2014'}
              </Text>
            </View>
          ));
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {`Generated on ${today}`}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

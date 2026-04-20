import React, { useState, useEffect } from 'react';
import '../../utils/syncfusionScheduleRuntime';
import { ScheduleComponent, ViewsDirective, ViewDirective, Day, Week, Month, Agenda, Inject } from '@syncfusion/ej2-react-schedule';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import LoadingSpinner from '../LoadingSpinner';
import './ReservationCalendar.css';

const PARTY_SIZE_COLORS = {
  small: { bg: '#4CAF50', text: '#ffffff', label: '1-4 guests' },      // Green
  medium: { bg: '#FFC107', text: '#000000', label: '5-8 guests' },      // Amber
  large: { bg: '#F44336', text: '#ffffff', label: '9+ guests' }         // Red
};

function getPartySizeCategory(partySize) {
  if (partySize <= 4) return 'small';
  if (partySize <= 8) return 'medium';
  return 'large';
}

export default function ReservationCalendar({ restaurantId, selectedDate, fullScreen = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('Week');

  useEffect(() => {
    if (!restaurantId) return;

    // Real-time listener for reservations
    const q = query(
      collection(db, 'restaurants', restaurantId, 'reservations'),
      where('status', '==', 'confirmed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calendarEvents = [];

      snapshot.docs.forEach(doc => {
        const reservation = doc.data();
        const { dateTime, date, time, customerName, partySize, customerPhone, specialRequests } = reservation;

        // Use new dateTime field if available (proper Timestamp), otherwise parse strings
        let eventDate;
        if (dateTime && dateTime.toDate) {
          eventDate = dateTime.toDate();
        } else if (date && time) {
          eventDate = parseReservationDateTime(date, time);
        } else {
          return; // Skip if no date info
        }

        if (!eventDate) return;

        const partyCategory = getPartySizeCategory(partySize || 1);
        const colors = PARTY_SIZE_COLORS[partyCategory];

        calendarEvents.push({
          Id: doc.id,
          Subject: `${customerName} (${partySize} guests)`,
          StartTime: eventDate,
          EndTime: new Date(eventDate.getTime() + 90 * 60000), // 90 min duration
          Description: `Phone: ${customerPhone}\n${specialRequests ? 'Special Requests: ' + specialRequests : ''}`,
          CategoryColor: colors.bg,
          PartySize: partySize,
          CustomerName: customerName,
          CustomerPhone: customerPhone,
          SpecialRequests: specialRequests,
          ResourceIdInfos: [{ groupName: 'Party Size', id: partyCategory }]
        });
      });

      setEvents(calendarEvents);
      setLoading(false);
    });

    return unsubscribe;
  }, [restaurantId]);

  const handleEventClick = (args) => {
    if (args.event) {
      // Could open a modal with full details or edit form
      console.log('Reservation clicked:', args.event);
    }
  };

  const eventTemplate = (props) => {
    const partyCategory = getPartySizeCategory(props.PartySize || 1);
    const colors = PARTY_SIZE_COLORS[partyCategory];

    return (
      <div className="reservation-event" style={{ backgroundColor: colors.bg, color: colors.text }}>
        <div className="event-title">{props.CustomerName}</div>
        <div className="event-size">👥 {props.PartySize} guests</div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`reservation-calendar ${fullScreen ? 'full-screen' : ''}`}>
      <div className="calendar-header">
        <h2>📅 Reservations Calendar</h2>
        <div className="legend">
          {Object.entries(PARTY_SIZE_COLORS).map(([key, colors]) => (
            <div key={key} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: colors.bg }}
              ></div>
              <span>{colors.label}</span>
            </div>
          ))}
        </div>
      </div>

      <ScheduleComponent
        width="100%"
        height={fullScreen ? '100vh' : '600px'}
        selectedDate={selectedDate}
        eventSettings={{
          dataSource: events,
          fields: {
            id: 'Id',
            subject: 'Subject',
            startTime: 'StartTime',
            endTime: 'EndTime',
            description: 'Description',
            isAllDay: 'IsAllDay'
          },
          template: eventTemplate
        }}
        actionComplete={(args) => {
          if (args.requestType === 'eventCreate' || args.requestType === 'eventChange') {
            handleEventClick(args);
          }
        }}
        popupOpen={(args) => {
          // Prevent editing in popup, show custom panel instead
          if (args.type === 'Editor') {
            args.cancel = true;
            console.log('Clicked reservation:', args.data);
          }
        }}
        currentView={currentView}
        views={['Day', 'Week', 'Month', 'Agenda']}
      >
        <Inject services={[Day, Week, Month, Agenda]} />
      </ScheduleComponent>
    </div>
  );
}

// Helper function to parse reservation date/time strings
function parseReservationDateTime(dateStr, timeStr) {
  try {
    // Handle various date formats
    let date;

    // If it's already a timestamp
    if (dateStr instanceof Timestamp) {
      date = dateStr.toDate();
    }
    // Handle "December 12th" or "Saturday" format
    else if (typeof dateStr === 'string') {
      // Try to parse natural language date
      const dateObj = new Date();
      
      if (dateStr.toLowerCase().includes('tomorrow')) {
        dateObj.setDate(dateObj.getDate() + 1);
      } else if (dateStr.toLowerCase().includes('today')) {
        // Use today
      } else {
        // Try to parse month/day
        const monthMatch = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);
        const dayMatch = dateStr.match(/(\d{1,2})/);

        if (monthMatch && dayMatch) {
          const months = {
            january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
          };
          const month = months[monthMatch[0].toLowerCase()];
          const day = parseInt(dayMatch[1]);
          dateObj.setMonth(month);
          dateObj.setDate(day);
        }
      }

      date = dateObj;
    } else {
      return null;
    }

    // Parse time (e.g., "7 p.m.", "7 PM", "19:00")
    let hours = 12, minutes = 0;

    if (timeStr) {
      const timeLower = timeStr.toLowerCase();
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?(?:\s*(a\.?m\.?|p\.?m\.?))?/i);

      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

        // Handle AM/PM
        if (timeMatch[3]) {
          const meridiem = timeMatch[3].toLowerCase().replace(/\./g, '');
          if (meridiem === 'pm' && hours !== 12) {
            hours += 12;
          } else if (meridiem === 'am' && hours === 12) {
            hours = 0;
          }
        }
      }
    }

    date.setHours(hours, minutes, 0, 0);
    return date;
  } catch (err) {
    console.error('Error parsing reservation date/time:', err);
    return null;
  }
}

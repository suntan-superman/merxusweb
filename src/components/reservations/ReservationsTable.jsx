import { useMemo, useRef } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  ExcelExport,
  PdfExport,
  Inject,
  Search,
  Resize,
} from '@syncfusion/ej2-react-grids';
import ReservationStatusBadge from './ReservationStatusBadge';

const GRID_STORAGE_KEY = 'merxus_reservations_grid_columns';

export default function ReservationsTable({
  reservations,
  onReservationClick,
  onStatusChange,
  updatingId,
}) {
  // Transform reservations data for the grid
  const gridData = useMemo(() => {
    if (!reservations) return [];
    return reservations.map((reservation) => ({
      ...reservation,
      formattedPhone: formatPhone(reservation.customerPhone),
      dateTime: `${reservation.date || 'Date TBD'} at ${reservation.time || 'Time TBD'}`,
      partySizeDisplay: reservation.partySize || '–',
      sourceLabel: getSourceLabel(reservation.source),
      createdAtFormatted: formatCreatedAt(reservation.createdAt),
    }));
  }, [reservations]);

  if (!reservations || reservations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No reservations to display.
      </div>
    );
  }

  const gridRef = useRef(null);

  // Load saved column widths from localStorage
  const savedColumns = useMemo(() => {
    try {
      const saved = localStorage.getItem(GRID_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  // Save column widths when they change
  const handleResizeStop = (args) => {
    if (gridRef.current) {
      const columns = gridRef.current.columns;
      const widths = {};
      columns.forEach((col) => {
        if (col.field) {
          widths[col.field] = col.width;
        }
      });
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(widths));
    }
  };

  // Get column width from saved or default
  const getColumnWidth = (field, defaultWidth) => {
    return savedColumns?.[field] || defaultWidth;
  };

  // Grid toolbar items
  const toolbarOptions = ['Search', 'ExcelExport', 'PdfExport'];

  // Filter settings for Excel-like filtering
  const filterSettings = {
    type: 'Excel',
  };

  // Page settings
  const pageSettings = {
    pageSize: 25,
    pageSizes: [10, 25, 50, 100],
  };

  // Handle row click
  const handleRowSelected = (args) => {
    if (args.data && onReservationClick) {
      const originalReservation = reservations.find((r) => r.id === args.data.id);
      if (originalReservation) {
        onReservationClick(originalReservation);
      }
    }
  };

  // Handle toolbar click for export
  const handleToolbarClick = (args) => {
    if (args.item.id?.includes('excelexport')) {
      gridRef.current?.excelExport({
        fileName: `reservations-${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    } else if (args.item.id?.includes('pdfexport')) {
      gridRef.current?.pdfExport({
        fileName: `reservations-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }
  };

  // Custom cell templates
  const guestTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="font-medium text-gray-900 text-sm truncate">
        {props.customerName || 'Unknown Guest'}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">{props.formattedPhone}</div>
    </div>
  );

  const dateTimeTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="text-sm font-medium text-gray-900">
        📅 {props.date || 'Date TBD'}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">
        🕐 {props.time || 'Time TBD'}
      </div>
    </div>
  );

  const partySizeTemplate = (props) => (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-base">👥</span>
      <span className="text-sm font-medium text-gray-900">
        {props.partySize || '–'}
      </span>
    </div>
  );

  const sourceTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="text-xs text-gray-700">{props.sourceLabel}</div>
      <div className="text-[10px] text-gray-400 mt-1">
        {props.createdAtFormatted}
      </div>
    </div>
  );

  const statusTemplate = (props) => (
    <ReservationStatusBadge status={props.status} />
  );

  const actionsTemplate = (props) => (
    <div onClick={(e) => e.stopPropagation()}>
      <StatusButtonGroup
        reservation={props}
        isUpdating={updatingId === props.id}
        onStatusChange={onStatusChange}
        reservations={reservations}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <GridComponent
        ref={gridRef}
        dataSource={gridData}
        allowPaging={true}
        allowSorting={true}
        allowFiltering={true}
        allowResizing={true}
        allowExcelExport={true}
        allowPdfExport={true}
        filterSettings={filterSettings}
        pageSettings={pageSettings}
        toolbar={toolbarOptions}
        toolbarClick={handleToolbarClick}
        rowSelected={handleRowSelected}
        resizeStop={handleResizeStop}
        enableHover={true}
        height="auto"
        rowHeight={65}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="customerName"
            headerText="Guest"
            width={getColumnWidth('customerName', 180)}
            minWidth={140}
            template={guestTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="date"
            headerText="Date & Time"
            width={getColumnWidth('date', 160)}
            minWidth={130}
            template={dateTimeTemplate}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="partySize"
            headerText="Party Size"
            width={getColumnWidth('partySize', 110)}
            minWidth={90}
            template={partySizeTemplate}
            allowFiltering={true}
            textAlign="Center"
          />
          <ColumnDirective
            field="source"
            headerText="Source"
            width={getColumnWidth('source', 130)}
            minWidth={100}
            template={sourceTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="status"
            headerText="Status"
            width={getColumnWidth('status', 120)}
            minWidth={100}
            template={statusTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            headerText="Actions"
            width={getColumnWidth('actions', 170)}
            minWidth={140}
            template={actionsTemplate}
            allowFiltering={false}
            allowSorting={false}
            textAlign="Right"
          />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport, PdfExport, Search, Resize]} />
      </GridComponent>
    </div>
  );
}

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatCreatedAt(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSourceLabel(source) {
  switch (source) {
    case 'phone_ai':
      return '🤖 AI Phone';
    case 'online':
      return '🌐 Online';
    case 'walk_in':
      return '🚶 Walk-in';
    default:
      return source || 'Unknown';
  }
}

function StatusButtonGroup({ reservation, isUpdating, onStatusChange, reservations }) {
  const actions = getAvailableActions(reservation.status);
  if (actions.length === 0) {
    return null;
  }

  // Find original reservation for status change
  const originalReservation = reservations?.find((r) => r.id === reservation.id) || reservation;

  return (
    <div className="flex gap-1 justify-end">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={isUpdating}
          onClick={() => onStatusChange?.(originalReservation, action.status)}
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            isUpdating
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : action.primary
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isUpdating ? '…' : action.label}
        </button>
      ))}
    </div>
  );
}

function getAvailableActions(status) {
  switch (status) {
    case 'pending':
      return [
        { status: 'confirmed', label: 'Confirm', primary: true },
        { status: 'cancelled', label: 'Cancel', primary: false },
      ];
    case 'confirmed':
      return [
        { status: 'completed', label: 'Seated', primary: true },
        { status: 'no_show', label: 'No Show', primary: false },
      ];
    default:
      return [];
  }
}

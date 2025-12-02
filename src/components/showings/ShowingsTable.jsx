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

const GRID_STORAGE_KEY = 'merxus_estate_showings_grid_columns';

export default function ShowingsTable({ showings, onEdit, onDelete, onStatusChange }) {
  const gridData = useMemo(() => {
    if (!showings) return [];
    return showings.map((showing) => ({
      ...showing,
      formattedDate: formatDate(showing.scheduled_date || showing.createdAt),
      formattedTime: formatTime(showing.scheduled_time || showing.start_time),
      formattedAddress: formatAddress(showing),
      statusBadge: showing.status || 'scheduled',
    }));
  }, [showings]);

  if (!showings || showings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No showings scheduled.
      </div>
    );
  }

  const gridRef = useRef(null);

  const savedColumns = useMemo(() => {
    try {
      const saved = localStorage.getItem(GRID_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

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

  const toolbarOptions = ['Search', 'ExcelExport', 'PdfExport'];
  const filterSettings = { type: 'Excel' };
  const pageSettings = { pageSize: 25, pageSizes: [10, 25, 50, 100] };

  const handleToolbarClick = (args) => {
    if (args.item.id?.includes('excelexport')) {
      gridRef.current?.excelExport({
        fileName: `showings-${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    } else if (args.item.id?.includes('pdfexport')) {
      gridRef.current?.pdfExport({
        fileName: `showings-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }
  };

  const getColumnWidth = (field, defaultWidth) => {
    return savedColumns?.[field] || defaultWidth;
  };

  const addressTemplate = (props) => (
    <div className="text-sm text-gray-900 font-medium">
      {props.formattedAddress}
    </div>
  );

  const dateTimeTemplate = (props) => (
    <div className="leading-tight">
      <div className="text-sm text-gray-900 font-medium">{props.formattedDate}</div>
      <div className="text-xs text-gray-500">{props.formattedTime}</div>
    </div>
  );

  const contactTemplate = (props) => (
    <div className="leading-tight">
      <div className="text-sm text-gray-900">{props.contact_name || 'N/A'}</div>
      <div className="text-xs text-gray-500">{props.contact_phone || ''}</div>
    </div>
  );

  const statusTemplate = (props) => {
    const status = props.statusBadge || 'scheduled';
    const classes = {
      scheduled: 'inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium',
      confirmed: 'inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium',
      cancelled: 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium',
      completed: 'inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs font-medium',
    };
    return (
      <span className={classes[status] || classes.scheduled}>
        {status}
      </span>
    );
  };

  const actionsTemplate = (props) => (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onEdit && onEdit(props)}
        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete && onDelete(props)}
        className="text-red-600 hover:text-red-700 text-sm font-medium"
      >
        Delete
      </button>
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
        resizeStop={handleResizeStop}
        enableHover={true}
        height="auto"
        rowHeight={70}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="formattedAddress"
            headerText="Property"
            width={getColumnWidth('formattedAddress', 250)}
            minWidth={200}
            template={addressTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedDate"
            headerText="Date & Time"
            width={getColumnWidth('formattedDate', 180)}
            minWidth={150}
            template={dateTimeTemplate}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="contact_name"
            headerText="Contact"
            width={getColumnWidth('contact_name', 180)}
            minWidth={150}
            template={contactTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="statusBadge"
            headerText="Status"
            width={getColumnWidth('statusBadge', 120)}
            minWidth={100}
            template={statusTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="notes"
            headerText="Notes"
            width={getColumnWidth('notes', 200)}
            minWidth={150}
            allowFiltering={true}
          />
          <ColumnDirective
            field="actions"
            headerText="Actions"
            width={getColumnWidth('actions', 120)}
            minWidth={100}
            template={actionsTemplate}
            allowFiltering={false}
            allowSorting={false}
          />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport, PdfExport, Search, Resize]} />
      </GridComponent>
    </div>
  );
}

function formatAddress(showing) {
  if (showing.listing_address) {
    return showing.listing_address;
  }
  if (showing.address) {
    const parts = [showing.address];
    if (showing.city) parts.push(showing.city);
    if (showing.state) parts.push(showing.state);
    return parts.join(', ');
  }
  return showing.listing_id || 'Address not provided';
}

function formatDate(dateField) {
  if (!dateField) return 'N/A';
  try {
    let date;
    if (typeof dateField.toDate === 'function') {
      date = dateField.toDate();
    } else if (dateField.seconds) {
      date = new Date(dateField.seconds * 1000);
    } else if (dateField._seconds) {
      date = new Date(dateField._seconds * 1000);
    } else {
      date = new Date(dateField);
    }
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Invalid Date';
  }
}

function formatTime(timeField) {
  if (!timeField) return 'Time TBD';
  if (typeof timeField === 'string') {
    // Try to parse time string
    const time = timeField.match(/(\d{1,2}):(\d{2})/);
    if (time) {
      const hour = parseInt(time[1], 10);
      const minute = time[2];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute} ${ampm}`;
    }
    return timeField;
  }
  return 'Time TBD';
}


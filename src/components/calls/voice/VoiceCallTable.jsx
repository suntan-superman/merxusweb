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

const GRID_STORAGE_KEY = 'merxus_voice_calls_grid_columns';

export default function VoiceCallTable({ calls, onCallClick }) {
  // Transform calls data for the grid
  const gridData = useMemo(() => {
    if (!calls) return [];
    return calls.map((call) => {
      // Handle Firestore Timestamps
      const startedAt = call.startedAt?.toDate ? call.startedAt.toDate() : 
                       (call.startedAt?.seconds ? new Date(call.startedAt.seconds * 1000) : 
                       (call.startedAt ? new Date(call.startedAt) : null));
      const createdAt = call.createdAt?.toDate ? call.createdAt.toDate() : 
                        (call.createdAt?.seconds ? new Date(call.createdAt.seconds * 1000) : 
                        (call.createdAt ? new Date(call.createdAt) : null));
      
      // Extract customer name from parsed data or direct field
      let customerName = call.customerName;
      if (!customerName && call.parsedMessage?.name) {
        customerName = call.parsedMessage.name;
      }
      if (!customerName && call.parsedOrder?.name) {
        customerName = call.parsedOrder.name;
      }
      if (!customerName && call.parsedReservation?.name) {
        customerName = call.parsedReservation.name;
      }
      
      // Extract customer phone from parsed data or direct field
      let customerPhone = call.customerPhone;
      if (!customerPhone && call.parsedMessage?.phone) {
        customerPhone = call.parsedMessage.phone;
      }
      if (!customerPhone && call.parsedOrder?.phone) {
        customerPhone = call.parsedOrder.phone;
      }
      if (!customerPhone && call.parsedReservation?.phone) {
        customerPhone = call.parsedReservation.phone;
      }
      
      return {
        ...call,
        formattedDate: formatDateTime(startedAt || createdAt),
        formattedDuration: formatDuration(call.durationSec),
        callerInfo: {
          name: customerName || 'Unknown',
          phone: customerPhone || call.from || '',
        },
        importanceBadge: call.importance || 'normal',
        transcriptSummary: call.transcriptSummary || 'No summary available',
      };
    });
  }, [calls]);

  if (!calls || calls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No calls to display.
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
    if (args.data && onCallClick) {
      // Find the original call object
      const originalCall = calls.find((c) => c.id === args.data.id);
      if (originalCall) {
        onCallClick(originalCall);
      }
    }
  };

  // Handle toolbar click for export
  const handleToolbarClick = (args) => {
    if (args.item.id?.includes('excelexport')) {
      gridRef.current?.excelExport({
        fileName: `calls-${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    } else if (args.item.id?.includes('pdfexport')) {
      gridRef.current?.pdfExport({
        fileName: `calls-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }
  };

  // Get column width from saved or default
  const getColumnWidth = (field, defaultWidth) => {
    return savedColumns?.[field] || defaultWidth;
  };

  // Custom cell templates
  const callerTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="text-sm text-gray-900 truncate">{props.callerInfo?.name || 'Unknown'}</div>
      <div className="text-[11px] text-gray-400 mt-1">{formatPhone(props.callerInfo?.phone)}</div>
    </div>
  );

  const typeTemplate = (props) => (
    <div className="leading-tight">
      <div className="capitalize text-gray-700 text-sm">{props.type || 'call'}</div>
    </div>
  );

  const importanceTemplate = (props) => {
    const importance = props.importanceBadge || 'normal';
    const classes = {
      critical: 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium',
      high: 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium',
      normal: 'inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-medium',
    };
    return (
      <span className={classes[importance] || classes.normal}>
        {importance}
      </span>
    );
  };

  const summaryTemplate = (props) => (
    <div className="text-xs text-gray-700 max-w-md truncate">
      {props.transcriptSummary || props.summary || 'No summary available'}
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
        rowHeight={60}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="callerInfo"
            headerText="Caller"
            width={getColumnWidth('callerInfo', 180)}
            minWidth={120}
            template={callerTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="type"
            headerText="Type"
            width={getColumnWidth('type', 100)}
            minWidth={80}
            template={typeTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedDate"
            headerText="When"
            width={getColumnWidth('formattedDate', 160)}
            minWidth={120}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="formattedDuration"
            headerText="Duration"
            width={getColumnWidth('formattedDuration', 100)}
            minWidth={80}
            allowFiltering={true}
          />
          <ColumnDirective
            field="importanceBadge"
            headerText="Importance"
            width={getColumnWidth('importanceBadge', 120)}
            minWidth={100}
            template={importanceTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="transcriptSummary"
            headerText="Summary"
            width={getColumnWidth('transcriptSummary', 300)}
            minWidth={200}
            template={summaryTemplate}
            allowFiltering={true}
          />
        </ColumnsDirective>
        <Inject services={[Page, Sort, Filter, Toolbar, ExcelExport, PdfExport, Search, Resize]} />
      </GridComponent>
    </div>
  );
}

function formatDateTime(date) {
  if (!date) return '';
  
  // Handle Firestore Timestamp objects
  let dateObj;
  if (date.toDate) {
    dateObj = date.toDate();
  } else if (date.seconds) {
    dateObj = new Date(date.seconds * 1000);
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return '';
  }
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  return dateObj.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatPhone(phone) {
  if (!phone) return '';
  // Format phone number: +15551234567 -> (555) 123-4567
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}


import { useMemo, useRef } from 'react';
import '../../../utils/syncfusionRuntime';
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
import { formatPhoneDisplay } from '../../../utils/phoneFormatter';

const GRID_STORAGE_KEY = 'merxus_voice_calls_grid_columns';

function buildSpeechBadge(call) {
  const speech = call?.speechSession;
  if (!speech) {
    return {
      label: '—',
      tone: 'bg-slate-100 text-slate-600',
      detail: 'No telemetry',
    };
  }

  if (speech.fallbackTriggered) {
    return {
      label: 'Fallback',
      tone: 'bg-amber-100 text-amber-800',
      detail: speech.fallbackReason || speech.effectiveProvider || 'standard',
    };
  }

  if (speech.healthGated) {
    return {
      label: 'Health Gate',
      tone: 'bg-red-100 text-red-800',
      detail: speech.healthGateReason || speech.effectiveProvider || 'rerouted',
    };
  }

  if (speech.effectiveStrategy === 'standard') {
    return {
      label: 'Standard',
      tone: 'bg-blue-100 text-blue-800',
      detail: speech.effectiveProvider || 'pipeline',
    };
  }

  return {
    label: 'Realtime',
    tone: 'bg-emerald-100 text-emerald-800',
    detail: speech.effectiveProvider || speech.realtimeProvider || 'active',
  };
}

export default function VoiceCallTable({ calls, onCallClick }) {
  // Transform calls data for the grid
  const gridData = useMemo(() => {
    if (!calls) return [];
    return calls.map((call) => {
      // Handle Firestore Timestamps - try multiple field names
      let dateObj = null;
      
      // Try endedAt first (most common in callSessions)
      if (call.endedAt) {
        dateObj = call.endedAt?.toDate ? call.endedAt.toDate() : 
                 (call.endedAt?.seconds ? new Date(call.endedAt.seconds * 1000) : 
                 (call.endedAt instanceof Date ? call.endedAt : null));
      }
      
      // Fall back to startedAt
      if (!dateObj && call.startedAt) {
        dateObj = call.startedAt?.toDate ? call.startedAt.toDate() : 
                 (call.startedAt?.seconds ? new Date(call.startedAt.seconds * 1000) : 
                 (call.startedAt instanceof Date ? call.startedAt : null));
      }
      
      // Fall back to createdAt
      if (!dateObj && call.createdAt) {
        dateObj = call.createdAt?.toDate ? call.createdAt.toDate() : 
                 (call.createdAt?.seconds ? new Date(call.createdAt.seconds * 1000) : 
                 (call.createdAt instanceof Date ? call.createdAt : null));
      }
      
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
        formattedDate: formatDateTime(dateObj),
        formattedDuration: formatDuration(call.durationSec),
        callerInfo: {
          name: customerName || 'Unknown',
          phone: customerPhone || call.from || '',
        },
        importanceBadge: call.importance || 'normal',
        speechBadge: buildSpeechBadge(call),
        transcriptSummary: call.transcriptSummary || 'No summary available',
      };
    });
  }, [calls]);

  if (!calls || calls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
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
    <div className="py-1 leading-tight">
      <div className="truncate text-sm text-gray-900 dark:text-slate-100">{props.callerInfo?.name || 'Unknown'}</div>
      <div className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">{formatPhoneDisplay(props.callerInfo?.phone)}</div>
    </div>
  );

  const typeTemplate = (props) => (
    <div className="leading-tight">
      <div className="text-sm capitalize text-gray-700 dark:text-slate-300">{props.type || 'call'}</div>
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
    <div className="max-w-md truncate text-xs text-gray-700 dark:text-slate-300">
      {props.transcriptSummary || props.summary || 'No summary available'}
    </div>
  );

  const speechTemplate = (props) => (
    <div className="py-1 leading-tight">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${props.speechBadge?.tone || 'bg-slate-100 text-slate-600'}`}>
        {props.speechBadge?.label || '—'}
      </span>
      <div className="mt-1 truncate text-[11px] text-gray-500 dark:text-slate-400">{props.speechBadge?.detail || 'No telemetry'}</div>
    </div>
  );

  const headerTemplate = (props) => (
    <div style={{ fontSize: '14px', fontWeight: 'bold', padding: '12px 8px' }}>
      {props.headerText}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <style>{`
        .voice-call-grid .e-headercell {
          font-size: 16px !important;
          font-weight: 700 !important;
          padding: 12px 8px !important;
        }
      `}</style>
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
        cssClass="voice-call-grid"
      >
        <ColumnsDirective>
          <ColumnDirective
            field="callerInfo"
            headerText="Call"
            headerTemplate={headerTemplate}
            width={getColumnWidth('callerInfo', 180)}
            minWidth={120}
            template={callerTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="type"
            headerText="Type"
            headerTemplate={headerTemplate}
            width={getColumnWidth('type', 100)}
            minWidth={80}
            template={typeTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedDate"
            headerText="When"
            headerTemplate={headerTemplate}
            width={getColumnWidth('formattedDate', 160)}
            minWidth={120}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="formattedDuration"
            headerText="Duration"
            headerTemplate={headerTemplate}
            width={getColumnWidth('formattedDuration', 100)}
            minWidth={80}
            allowFiltering={true}
          />
          <ColumnDirective
            field="importanceBadge"
            headerText="Importance"
            headerTemplate={headerTemplate}
            width={getColumnWidth('importanceBadge', 120)}
            minWidth={100}
            template={importanceTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="speechBadge"
            headerText="Speech"
            headerTemplate={headerTemplate}
            width={getColumnWidth('speechBadge', 140)}
            minWidth={120}
            template={speechTemplate}
            allowFiltering={false}
          />
          <ColumnDirective
            field="transcriptSummary"
            headerText="Summary"
            headerTemplate={headerTemplate}
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

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

const GRID_STORAGE_KEY = 'merxus_estate_leads_grid_columns';

export default function LeadsTable({ leads, flyerLogs = [], onEdit, onStatusChange }) {
  const gridData = useMemo(() => {
    if (!leads) return [];

    const flyerByLead = {};
    flyerLogs.forEach((log) => {
      const leadId = log.leadId;
      if (!leadId) return;
      const ts = log.sentAt?.toMillis?.() || 0;
      if (!flyerByLead[leadId] || ts > flyerByLead[leadId].ts) {
        flyerByLead[leadId] = {
          status: log.status || 'sent',
          isTest: !!log.isTest,
          sentAt: log.sentAt,
          ts,
        };
      }
    });

    return leads.map((lead) => {
      const flyerLog = flyerByLead[lead.id] || null;
      return {
        ...lead,
        formattedDate: formatDate(lead.captured_at || lead.createdAt),
        formattedPhone: formatPhone(lead.caller_phone),
        interestedListingsCount: lead.interested_listing_ids?.length || 0,
        priorityBadge: lead.priority || 'warm',
        flyerStatus: flyerLog?.status || null,
        flyerSentAt: flyerLog?.sentAt || null,
        flyerIsTest: flyerLog?.isTest || false,
      };
    });
  }, [leads, flyerLogs]);

  if (!leads || leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No leads to display.
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
        fileName: `leads-${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    } else if (args.item.id?.includes('pdfexport')) {
      gridRef.current?.pdfExport({
        fileName: `leads-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }
  };

  const getColumnWidth = (field, defaultWidth) => {
    return savedColumns?.[field] || defaultWidth;
  };

  const nameTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="text-sm text-gray-900 font-medium">{props.caller_name || 'Unknown'}</div>
      {props.caller_email && (
        <div className="text-[11px] text-gray-400 mt-1">{props.caller_email}</div>
      )}
    </div>
  );

  const priorityTemplate = (props) => {
    const priority = props.priorityBadge || 'warm';
    const classes = {
      hot: 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium',
      warm: 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium',
      cold: 'inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs font-medium',
    };
    return (
      <span className={classes[priority] || classes.warm}>
        {priority}
      </span>
    );
  };

  const qualificationTemplate = (props) => (
    <div className="text-xs text-gray-600 space-y-1">
      {props.is_preapproved !== undefined && (
        <div>
          {props.is_preapproved ? '✓ Pre-approved' : '✗ Not pre-approved'}
        </div>
      )}
      {props.has_agent !== undefined && (
        <div>
          {props.has_agent ? 'Has agent' : 'No agent'}
        </div>
      )}
    </div>
  );

  const flyerTemplate = (props) => {
    if (!props.flyerStatus) {
      return <span className="text-xs text-gray-500">No sends</span>;
    }
    const badgeClass =
      props.flyerStatus === 'sent'
        ? 'inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium'
        : 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium';
    return (
      <div className="flex flex-col text-xs text-gray-700 gap-1">
        <span className={badgeClass}>
          {props.flyerStatus}
          {props.flyerIsTest ? ' (test)' : ''}
        </span>
        {props.flyerSentAt?.toDate && (
          <span className="text-[11px] text-gray-500">
            {formatDate(props.flyerSentAt)}
          </span>
        )}
      </div>
    );
  };

  const listingsTemplate = (props) => (
    <div className="text-sm text-gray-900">
      {props.interestedListingsCount > 0 ? (
        <span className="font-medium">{props.interestedListingsCount} listing(s)</span>
      ) : (
        <span className="text-gray-400">None</span>
      )}
    </div>
  );

  const actionsTemplate = (props) => (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onEdit && onEdit(props)}
        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        View
      </button>
      <select
        value={props.priorityBadge || 'warm'}
        onChange={(e) => onStatusChange && onStatusChange(props, e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="hot">Hot</option>
        <option value="warm">Warm</option>
        <option value="cold">Cold</option>
      </select>
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
            field="caller_name"
            headerText="Name"
            width={getColumnWidth('caller_name', 200)}
            minWidth={150}
            template={nameTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedPhone"
            headerText="Phone"
            width={getColumnWidth('formattedPhone', 140)}
            minWidth={120}
            allowFiltering={true}
          />
          <ColumnDirective
            field="priorityBadge"
            headerText="Priority"
            width={getColumnWidth('priorityBadge', 100)}
            minWidth={80}
            template={priorityTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="qualification"
            headerText="Qualification"
            width={getColumnWidth('qualification', 150)}
            minWidth={120}
            template={qualificationTemplate}
            allowFiltering={false}
          />
          <ColumnDirective
            field="interestedListingsCount"
            headerText="Listings"
            width={getColumnWidth('interestedListingsCount', 100)}
            minWidth={80}
            template={listingsTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="source"
            headerText="Source"
            width={getColumnWidth('source', 120)}
            minWidth={100}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedDate"
            headerText="Captured"
            width={getColumnWidth('formattedDate', 140)}
            minWidth={120}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="flyerStatus"
            headerText="Flyer"
            width={getColumnWidth('flyerStatus', 120)}
            minWidth={100}
            template={flyerTemplate}
            allowFiltering={false}
          />
          <ColumnDirective
            field="actions"
            headerText="Actions"
            width={getColumnWidth('actions', 150)}
            minWidth={120}
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
    return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return 'Invalid Date';
  }
}

function formatPhone(phone) {
  if (!phone) return 'N/A';
  // Basic phone formatting
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}


import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
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

const GRID_STORAGE_KEY = 'merxus_estate_listings_grid_columns';

export default function ListingsTable({
  listings,
  flyerLogs = [],
  onEdit,
  onDelete,
  onStatusChange,
  onTestSend,
}) {
  const gridData = useMemo(() => {
    if (!listings) return [];

    // Map latest flyer log by listingId
    const flyerByListing = {};
    flyerLogs.forEach((log) => {
      if (!log.listingId) return;
      const ts = log.sentAt?.toMillis?.() || 0;
      if (!flyerByListing[log.listingId] || ts > flyerByListing[log.listingId].ts) {
        flyerByListing[log.listingId] = {
          status: log.status || 'sent',
          isTest: !!log.isTest,
          sentAt: log.sentAt,
          ts,
        };
      }
    });

    return listings.map((listing) => {
      const flyerLog = flyerByListing[listing.id] || null;
      return {
        ...listing,
        formattedPrice: listing.price ? `$${listing.price.toLocaleString()}` : 'N/A',
        formattedAddress: formatAddress(listing),
        formattedDate: formatDate(listing.createdAt),
        statusBadge: listing.status || 'active',
        flyerStatus: flyerLog?.status || null,
        flyerSentAt: flyerLog?.sentAt || null,
        flyerIsTest: flyerLog?.isTest || false,
      };
    });
  }, [listings, flyerLogs]);

  if (!listings || listings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        No listings to display.
      </div>
    );
  }

  const gridRef = useRef(null);

  // Load saved column widths
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
        fileName: `listings-${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    } else if (args.item.id?.includes('pdfexport')) {
      gridRef.current?.pdfExport({
        fileName: `listings-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }
  };

  const getColumnWidth = (field, defaultWidth) => {
    return savedColumns?.[field] || defaultWidth;
  };

  // Custom cell templates
  const addressTemplate = (props) => (
    <div className="leading-tight py-1">
      <div className="text-sm text-gray-900 font-medium">{props.formattedAddress}</div>
      {props.mls_id && (
        <div className="text-[11px] text-gray-400 mt-1">MLS: {props.mls_id}</div>
      )}
    </div>
  );

  const priceTemplate = (props) => (
    <div className="text-sm font-semibold text-gray-900">
      {props.formattedPrice}
    </div>
  );

  const detailsTemplate = (props) => (
    <div className="text-xs text-gray-600">
      {props.beds || 'N/A'} bed • {props.baths || 'N/A'} bath • {props.sq_ft ? `${props.sq_ft.toLocaleString()} sq ft` : 'N/A'}
    </div>
  );

  const statusTemplate = (props) => {
    const status = props.statusBadge || 'active';
    const classes = {
      active: 'inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-medium',
      pending: 'inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium',
      contingent: 'inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium',
      sold: 'inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs font-medium',
      withdrawn: 'inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-medium',
    };
    return (
      <span className={classes[status] || classes.active}>
        {status}
      </span>
    );
  };

  const actionsTemplate = (props) => (
    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <Link
          to={`/estate/listings/${props.id}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View
        </Link>
        <button
          onClick={() => onEdit && onEdit(props)}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Edit
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onTestSend && onTestSend(props)}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          Test send
        </button>
        <button
          onClick={() => onDelete && onDelete(props)}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Delete
        </button>
      </div>
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
            headerText="Address"
            width={getColumnWidth('formattedAddress', 250)}
            minWidth={200}
            template={addressTemplate}
            allowFiltering={true}
          />
          <ColumnDirective
            field="formattedPrice"
            headerText="Price"
            width={getColumnWidth('formattedPrice', 120)}
            minWidth={100}
            template={priceTemplate}
            allowFiltering={true}
            allowSorting={true}
          />
          <ColumnDirective
            field="details"
            headerText="Details"
            width={getColumnWidth('details', 180)}
            minWidth={150}
            template={detailsTemplate}
            allowFiltering={false}
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
            field="formattedDate"
            headerText="Added"
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
            width={getColumnWidth('actions', 140)}
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

function formatAddress(listing) {
  const parts = [];
  if (listing.address) parts.push(listing.address);
  if (listing.city) parts.push(listing.city);
  if (listing.state) parts.push(listing.state);
  if (listing.zip) parts.push(listing.zip);
  return parts.join(', ') || 'Address not provided';
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
    return date.toLocaleDateString([], { dateStyle: 'short' });
  } catch {
    return 'Invalid Date';
  }
}

